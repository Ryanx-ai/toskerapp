import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "../auth/actor";
import { AuthorizationDeniedError } from "../auth/authorize";
import type { ToskerDatabase, ToskerTransaction } from "../db/client";
import { conversations, inviteRateLimits, locationLatest, locationShares, profiles, users } from "../db/schema";
import { authorizedContext, lockPinScope, scopeForConversation } from "../map-pins/scope";
import { lockActorTokens } from "../realtime/access-lock";
import { assertRealtimeSession } from "../realtime/session";
import { localArea } from "../maps/area";
import { getPlaceProvider, reservePlaceRequest } from "../maps/provider";
import { contextualName } from "../profiles/context-name";
import { approvedAvatarUrl } from "@/lib/identity-visual";
import { isConversationId } from "@/lib/realtime-contract";
import { LOCATION_VIEW_MS, validSnapshotPoint, type LatestLocationSnapshot, type LocationCurrentView, type LocationLease, type LocationPrecision } from "@/lib/shared-location-contract";
import { LocationRevisionConflict } from "./latest-service";
import { lockLocalLocationActors, lockLocationReadContext } from "./read-scope";
import { notifyLocationChanged } from "./notifications";
import { armCleanup, assertDurableAdmission, lockDurableCleanup, reserveCleanup, type CleanupPublisher } from "./durable-cleanup";
import { CleanupPolicyError } from "./cleanup-policy";

type Dependencies={session:typeof assertRealtimeSession;notify:typeof notifyLocationChanged;
  capacity:()=>boolean;publisher?:CleanupPublisher;area:(p:{latitude:number;longitude:number;accuracy:number},userId:string,signal:AbortSignal)=>Promise<{label:string;source:"ura"|"geoapify"}>};
const lease=(r:typeof locationShares.$inferSelect):LocationLease=>({id:r.id,userId:r.userId,conversationId:r.conversationId,precision:r.precision as LocationPrecision,expiresAt:r.expiresAt.getTime()});
const snapshot=(c:typeof locationShares.$inferSelect,r:typeof locationLatest.$inferSelect):LatestLocationSnapshot=>({...lease(c),sentAt:r.acceptedAt.getTime(),revision:r.revision,label:r.label,source:r.source as "ura"|"geoapify",
  ...(r.precision==="precise"?{point:{latitude:r.latitude!,longitude:r.longitude!,accuracy:r.accuracy!}}:{})});
async function context(tx:ToskerTransaction,actor:AuthenticatedActor,id:string){
  const scope=await scopeForConversation(tx,actor,id);
  if((await lockPinScope(tx,actor,scope,"share")).sandbox)throw new AuthorizationDeniedError();
}
async function rate(tx:ToskerTransaction,userId:string,operation:string){
  const [r]=await tx.insert(inviteRateLimits).values({userId,operation,windowStart:new Date(),attempts:1}).onConflictDoUpdate({target:[inviteRateLimits.userId,inviteRateLimits.operation],set:{
    windowStart:sql`case when ${inviteRateLimits.windowStart}<now()-interval '1 minute' then now() else ${inviteRateLimits.windowStart} end`,
    attempts:sql`case when ${inviteRateLimits.windowStart}<now()-interval '1 minute' then 1 else ${inviteRateLimits.attempts}+1 end`,
  }}).returning({attempts:inviteRateLimits.attempts});if(r.attempts>6)throw new CleanupPolicyError();
}

/** Candidate stays unwired until hosted retention, capacity and full A/B pass.
 * No history, background geolocation, location events, or provider coupling. */
export function durableLocationService(db:ToskerDatabase,overrides:Partial<Dependencies>={}){
  const deps:Dependencies={session:assertRealtimeSession,notify:notifyLocationChanged,capacity:()=>false,
    area:async(point,userId,signal)=>{
      const local=await localArea(point.latitude,point.longitude);if(local)return{label:local,source:"ura"};
      await reservePlaceRequest(db,userId);const label=await getPlaceProvider().area(point.latitude,point.longitude,signal);
      if(!label)throw new Error("Area unavailable.");return{label,source:"geoapify"};
    },...overrides};
  const notify=async(ids:string[])=>{await Promise.allSettled([...new Set(ids)].map(id=>deps.notify(id)));};
  const capacity=()=>{if(!deps.capacity())throw new CleanupPolicyError();};
  async function current(tx:ToskerTransaction,actor:AuthenticatedActor,sessionId:string,id:string){
    await lockActorTokens(tx,actor.userId);await deps.session(actor,sessionId);
    const owned=and(eq(locationShares.id,id),eq(locationShares.userId,actor.userId),eq(locationShares.sessionId,sessionId),sql`${locationShares.expiresAt}>clock_timestamp()`);
    const [discovered]=await tx.select().from(locationShares).where(owned);
    if(!discovered)throw new AuthorizationDeniedError();
    // Parent/context before consent, matching deletion's lock order. Discovery
    // is not authorization: re-read after the context fence with a fresh clock.
    await context(tx,actor,discovered.conversationId);
    const [row]=await tx.select().from(locationShares).where(owned).for("key share");
    if(!row||row.conversationId!==discovered.conversationId)throw new AuthorizationDeniedError();
    await lockDurableCleanup(tx,row.id,row.expiresAt);return row;
  }
  return{
    async begin(actor:AuthenticatedActor,sessionId:string,conversationId:string,precision:LocationPrecision,signal:AbortSignal){
      if(!isConversationId(conversationId)||!["area","precise"].includes(precision))throw new TypeError();capacity();
      const reservation=await db.transaction(async tx=>{
        await lockActorTokens(tx,actor.userId);await deps.session(actor,sessionId);await context(tx,actor,conversationId);
        await rate(tx,actor.userId,"location-consent");return reserveCleanup(tx);
      });
      await armCleanup(db,reservation,signal,deps.publisher);
      const result=await db.transaction(async tx=>{
        await lockActorTokens(tx,actor.userId);await deps.session(actor,sessionId);await context(tx,actor,conversationId);
        const audience=(await tx.execute(sql`select u.id from conversations c cross join users u where c.id=${conversationId}::uuid and ${authorizedContext(sql`u.id`)} limit 51`)).rows;
        if(!audience.length||audience.length>50)throw new AuthorizationDeniedError();
        await assertDurableAdmission(tx,reservation,deps.capacity());if(signal.aborted)throw new CleanupPolicyError();
        const old=await tx.delete(locationShares).where(eq(locationShares.userId,actor.userId)).returning({conversationId:locationShares.conversationId});
        const [row]=await tx.insert(locationShares).values({id:reservation.id,userId:actor.userId,sessionId,conversationId,precision,
          createdAt:reservation.createdAt,expiresAt:reservation.expiresAt}).returning();
        return{value:{...lease(row),audienceCount:audience.length-1},contexts:old.map(r=>r.conversationId)};
      });await notify(result.contexts);return result.value;
    },
    async send(actor:AuthenticatedActor,sessionId:string,id:string,point:unknown,expectedRevision:number,requestId:string,signal:AbortSignal){
      if(!isConversationId(id)||!isConversationId(requestId)||!validSnapshotPoint(point)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new TypeError();capacity();
      const fix=point;
      const previous=await db.transaction(async tx=>{
        const consent=await current(tx,actor,sessionId,id);
        const [row]=await tx.select().from(locationLatest).where(eq(locationLatest.leaseId,id));
        if(row?.requestId===requestId&&row.revision===expectedRevision+1)return snapshot(consent,row);
        if((row?.revision??0)!==expectedRevision)throw new LocationRevisionConflict();
        await rate(tx,actor.userId,"location-snapshot");
      });if(previous)return previous;
      const area=await deps.area(fix,actor.userId,signal);if(signal.aborted)throw new Error("Cancelled.");
      const result=await db.transaction(async tx=>{
        const consent=await current(tx,actor,sessionId,id);
        const [old]=await tx.select().from(locationLatest).where(eq(locationLatest.leaseId,id));
        if(old?.requestId===requestId&&old.revision===expectedRevision+1)return snapshot(consent,old);
        if((old?.revision??0)!==expectedRevision)throw new LocationRevisionConflict();
        if(signal.aborted)throw new Error("Cancelled.");capacity();
        const acceptedAt=new Date(String((await tx.execute(sql`select clock_timestamp() accepted_at`)).rows[0].accepted_at));
        const data={workerRunId:null,cleanupArmed:true,precision:consent.precision,expiresAt:consent.expiresAt,acceptedAt,revision:expectedRevision+1,requestId,...area,
          latitude:consent.precision==="precise"?fix.latitude:null,longitude:consent.precision==="precise"?fix.longitude:null,accuracy:consent.precision==="precise"?fix.accuracy:null};
        const [row]=old?await tx.update(locationLatest).set(data).where(and(eq(locationLatest.leaseId,id),eq(locationLatest.revision,expectedRevision))).returning()
          :await tx.insert(locationLatest).values({leaseId:id,...data}).returning();
        if(!row)throw new LocationRevisionConflict();return snapshot(consent,row);
      });await notify([result.conversationId]);return result;
    },
    async stop(actor:AuthenticatedActor,sessionId:string,id:string){
      if(!isConversationId(id))throw new TypeError();
      const retired=await db.transaction(async tx=>{
        await lockActorTokens(tx,actor.userId);await deps.session(actor,sessionId);
        return tx.delete(locationShares).where(and(eq(locationShares.id,id),eq(locationShares.userId,actor.userId),eq(locationShares.sessionId,sessionId))).returning({conversationId:locationShares.conversationId});
      });await notify(retired.map(r=>r.conversationId));
    },
    async read(actor:AuthenticatedActor,sessionId:string,conversationId:string):Promise<LocationCurrentView>{
      if(!isConversationId(conversationId))throw new TypeError();capacity();
      return db.transaction(async tx=>{
        await tx.execute(sql`set local statement_timeout='4s'`);await tx.execute(sql`set local lock_timeout='2s'`);
        // Discover a bounded source set, lock it in sorted order, then re-query
        // exact authorization. A newly arriving source waits for the next read.
        const candidates=await tx.select({userId:locationShares.userId}).from(locationShares).where(eq(locationShares.conversationId,conversationId)).limit(51);
        if(candidates.length>50)throw new AuthorizationDeniedError();
        const ids=[...new Set([actor.userId,...candidates.map(r=>r.userId)])];
        await lockLocalLocationActors(tx,ids);await deps.session(actor,sessionId);await lockLocationReadContext(tx,conversationId);
        const rows=await tx.select({consent:locationShares,payload:locationLatest,user:users,profileUserId:profiles.userId,
          displayName:contextualName(actor.userId,sql`${conversations.roomId}`,sql`${users.id}`,sql`${profiles.displayName}`),avatarUrl:profiles.avatarUrl}).from(conversations)
          .leftJoin(locationShares,and(eq(locationShares.conversationId,conversations.id),inArray(locationShares.userId,ids),sql`${locationShares.userId}<>${actor.userId}::uuid`,
            sql`${locationShares.expiresAt}>clock_timestamp()`,sql`exists(select 1 from conversations c where c.id=${locationShares.conversationId} and ${authorizedContext(sql`${locationShares.userId}`)})`))
          .leftJoin(locationLatest,and(eq(locationLatest.leaseId,locationShares.id),eq(locationLatest.cleanupArmed,true),sql`${locationLatest.workerRunId} is null`))
          .leftJoin(users,eq(users.id,locationShares.userId)).leftJoin(profiles,eq(profiles.userId,users.id))
          .where(and(eq(conversations.id,conversationId),sql`exists(select 1 from conversations c where c.id=${conversations.id} and ${authorizedContext(sql`${actor.userId}::uuid`)})`));
        if(!rows.length)throw new AuthorizationDeniedError();
        const peers:LocationCurrentView["peers"]=[];
        for(const row of rows){
          if(!row.consent||!row.payload||!row.user||!row.profileUserId)continue;
          try{await deps.session({userId:row.user.id,authProvider:row.user.authProvider,authSubject:row.user.authSubject},row.consent.sessionId);
            if(row.consent.expiresAt.getTime()>Date.now())peers.push({snapshot:snapshot(row.consent,row.payload),identity:{userId:row.user.id,displayName:row.displayName,avatarUrl:approvedAvatarUrl(row.avatarUrl)}});
          }catch{/* Unverifiable sender is omitted, never cached. */}
        }
        const serverNow=Date.now();return{serverNow,validForMs:Math.max(0,Math.min(LOCATION_VIEW_MS,...peers.map(p=>p.snapshot.expiresAt-serverNow))),peers:peers.filter(p=>p.snapshot.expiresAt>serverNow)};
      });
    },
  };
}
