import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerTransaction } from "@/server/db/client";
import { mapPins, mapPinPreferences, mapPinReceipts } from "@/server/db/schema";
import { isConversationId } from "@/lib/realtime-contract";
import { MAP_PIN_STATES, type MapPin, type MapPinPage, type PinMutation } from "@/lib/map-pin-contract";
import { isCoordinatePinTitle, nextCheckpointName } from "@/lib/trip-contract";
import { TripError, validateCandidate } from "@/server/trips/service";
import { authorizedContext, lockPinScope } from "./scope";

function invalid(): never { throw new TripError("invalid","Check this Pin and try again."); }
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function normalize(input: PinMutation): PinMutation {
  if (!input || typeof input.scope !== "string" || input.scope.length > 150 || !isConversationId(input.requestId) || !input.command) return invalid();
  const c = input.command, base = {scope:input.scope,requestId:input.requestId};
  if (c.type === "create" || c.type === "state") if (!MAP_PIN_STATES.some(s => s.key === c.state)) return invalid();
  if (c.type === "create") return {...base,command:{type:c.type,candidate:validateCandidate(c.candidate),state:c.state}};
  if (!isConversationId(c.pinId) || !Number.isSafeInteger(c.expectedRevision) || c.expectedRevision < 1) return invalid();
  if (c.type === "state") return {...base,command:{type:c.type,pinId:c.pinId,expectedRevision:c.expectedRevision,state:c.state}};
  if (c.type === "nuke") return {...base,command:{type:c.type,pinId:c.pinId,expectedRevision:c.expectedRevision}};
  if (c.type === "hide" && typeof c.hidden === "boolean" && Number.isSafeInteger(c.expectedPreferenceRevision) && c.expectedPreferenceRevision >= 0) return {...base,command:{type:c.type,pinId:c.pinId,expectedRevision:c.expectedRevision,expectedPreferenceRevision:c.expectedPreferenceRevision,hidden:c.hidden}};
  return invalid();
}

export async function requirePin(tx: ToskerTransaction, conversationId: string, pinId: string, expectedRevision: number) {
  const [pin] = await tx.select().from(mapPins).where(and(eq(mapPins.id,pinId),eq(mapPins.conversationId,conversationId))).for("update");
  if (!pin) throw new AuthorizationDeniedError();
  if (pin.revision !== expectedRevision) throw new TripError("conflict","This Pin changed. Review its latest state before trying again.");
  return pin;
}

export async function mutatePin(db: ToskerDatabase, actor: AuthenticatedActor, raw: PinMutation) {
  const input = normalize(raw), payloadHash = hash(input);
  return db.transaction(async tx => {
    const source = await lockPinScope(tx,actor,input.scope,"update");
    const receiptWhere = and(eq(mapPinReceipts.conversationId,source.conversationId),eq(mapPinReceipts.actorId,actor.userId),eq(mapPinReceipts.requestId,input.requestId));
    const [receipt] = await tx.select().from(mapPinReceipts).where(receiptWhere);
    if (receipt) {
      if (receipt.payloadHash !== payloadHash) throw new TripError("retry-mismatch","This retry differs from the saved request. Refresh this Map.");
      return {resultId:receipt.resultId,replayed:true};
    }
    const [{n:receipts}] = await tx.select({n:count()}).from(mapPinReceipts).where(eq(mapPinReceipts.conversationId,source.conversationId));
    if (receipts >= 10000) throw new TripError("limit","This Development Map reached its change limit.");
    const c = input.command;
    let resultId: string;
    if (c.type === "create") {
      const p = c.candidate;
      const placeKey = hash(p.provider && p.providerId ? [p.provider,p.providerId] : [Number(p.latitude.toFixed(6)),Number(p.longitude.toFixed(6))]);
      const [duplicate] = await tx.select({id:mapPins.id}).from(mapPins).where(and(eq(mapPins.conversationId,source.conversationId),eq(mapPins.placeKey,placeKey)));
      if (duplicate) resultId = duplicate.id; // Never silently overwrite a shared state on duplicate creation.
      else {
        const existing = await tx.select({title:mapPins.title}).from(mapPins).where(eq(mapPins.conversationId,source.conversationId)).limit(200);
        if (existing.length >= 200) throw new TripError("limit","Up to 200 Pins fit in this Development Map.");
        const title = p.source === "pin" && isCoordinatePinTitle(p.title) ? nextCheckpointName(existing) : p.title;
        const [pin] = await tx.insert(mapPins).values({...p,title,conversationId:source.conversationId,creatorId:actor.userId,state:c.state,placeKey}).returning({id:mapPins.id});
        resultId = pin.id;
      }
    } else {
      const pin = await requirePin(tx,source.conversationId,c.pinId,c.expectedRevision);
      resultId = pin.id;
      if (c.type === "state") await tx.update(mapPins).set({state:c.state,revision:pin.revision+1,updatedAt:new Date()}).where(eq(mapPins.id,pin.id));
      else if (c.type === "nuke") await tx.delete(mapPins).where(eq(mapPins.id,pin.id));
      else {
        if (source.sandbox) throw new TripError("invalid","Private Pins belong to your Sandbox. Use Nuke Pin to remove one.");
        const where = and(eq(mapPinPreferences.pinId,pin.id),eq(mapPinPreferences.userId,actor.userId));
        const [preference] = await tx.select().from(mapPinPreferences).where(where);
        if ((preference?.revision ?? 0) !== c.expectedPreferenceRevision) throw new TripError("conflict","Your Sandbox visibility changed. Refresh before trying again.");
        await tx.insert(mapPinPreferences).values({pinId:pin.id,userId:actor.userId,hidden:c.hidden}).onConflictDoUpdate({target:[mapPinPreferences.pinId,mapPinPreferences.userId],set:{hidden:c.hidden,revision:(preference?.revision ?? 0)+1,updatedAt:new Date()}});
      }
    }
    await tx.insert(mapPinReceipts).values({conversationId:source.conversationId,actorId:actor.userId,requestId:input.requestId,payloadHash,resultId});
    return {resultId,replayed:false};
  });
}

/** Every page reauthorizes. Cursor has no trusted ownership semantics and cannot fetch a private row. */
export async function readPins(db: ToskerDatabase, actor: AuthenticatedActor, scope: string, cursor?: string): Promise<MapPinPage> {
  if (cursor && (!isConversationId(cursor.split("|")[1]) || !/^\d{4}-\d\d-\d\dT/.test(cursor.split("|")[0]) || !Number.isFinite(Date.parse(cursor.split("|")[0])) || cursor.length > 100)) return invalid();
  return db.transaction(async tx => {
    const source = await lockPinScope(tx,actor,scope,"share");
    const auth = authorizedContext(sql`${actor.userId}::uuid`);
    const page = await tx.execute(sql`select p.*,to_char(p.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as cursor_at,coalesce(pref.hidden,false) as hidden,coalesce(pref.revision,0) as preference_revision
      from map_pins p join conversations c on c.id=p.conversation_id
      left join map_pin_preferences pref on pref.pin_id=p.id and pref.user_id=${actor.userId}::uuid
      where ${auth} and ${source.sandbox ? sql`coalesce(pref.hidden,false)=false` : sql`p.conversation_id=${source.conversationId}::uuid`}
      ${cursor ? sql`and (p.created_at,p.id)<(${cursor.split("|")[0]}::timestamptz,${cursor.split("|")[1]}::uuid)` : sql``}
      order by p.created_at desc,p.id desc limit 101`);
    const rows = page.rows.slice(0,100);
    if (!rows.length) return {pins:[],next:null};
    const ids = [...new Set(rows.map(r => String(r.conversation_id)))];
    // One bounded batch for all context names and current participants, never per Pin calls.
    // Repeat viewer authorization after the first query so revocation cannot attach stale provenance.
    const contexts = await tx.execute(sql`select c.id,c.kind,c.owner_id,c.subroom_id,r.slug,
      coalesce(s.name,r.name,'') as name,
      coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',pr.display_name) order by pr.display_name,u.id) filter(where u.id is not null),'[]'::jsonb) as people
      from conversations c left join rooms r on r.id=c.room_id left join subrooms s on s.id=c.subroom_id
      left join users u on ${authorizedContext(sql`u.id`)}
      left join profiles pr on pr.user_id=u.id
      where c.id in (${sql.join(ids.map(id=>sql`${id}::uuid`),sql`,`)}) and ${auth}
      group by c.id,r.slug,r.name,s.name`);
    const byId = new Map(contexts.rows.map(c => [String(c.id),c]));
    const pins: MapPin[] = rows.flatMap(r => {
      const c = byId.get(String(r.conversation_id)); if (!c) return [];
      const people = (c.people as {id:string;name:string}[]).filter(p=>p.id!==actor.userId).map(p=>p.name);
      const contextKind = c.kind === "room" && c.subroom_id ? "subroom" : c.kind as MapPin["contextKind"];
      return [{id:String(r.id),conversationId:String(c.id),creatorId:String(r.creator_id),scope:c.kind === "sandbox" ? `sandbox--${c.id}` : c.kind === "personal" ? `personal--${c.id}` : `${c.slug}${c.subroom_id ? `--${c.subroom_id}` : ""}`,
        state:r.state as MapPin["state"],revision:Number(r.revision),title:String(r.title),latitude:Number(r.latitude),longitude:Number(r.longitude),source:r.source as MapPin["source"],provider:r.provider as string|null,providerId:r.provider_id as string|null,address:String(r.address),attribution:String(r.attribution),license:String(r.license),
        createdAt:new Date(String(r.created_at)).toISOString(),updatedAt:new Date(String(r.updated_at)).toISOString(),contextKind,contextName:c.kind === "sandbox" ? "Your Sandbox" : c.kind === "personal" ? `Personal Chat with ${people.join(", ")}` : String(c.name),people,hidden:!!r.hidden,preferenceRevision:Number(r.preference_revision)}];
    });
    const last = rows.at(-1)!;
    return {pins,next:page.rows.length > 100 ? `${last.cursor_at}|${last.id}` : null};
  });
}

export async function pinAudience(db: ToskerDatabase, actor: AuthenticatedActor, scope: string) {
  return db.transaction(async tx => {
    const source = await lockPinScope(tx,actor,scope,"share");
    const result = await tx.execute(sql`select u.id from conversations c join users u on ${authorizedContext(sql`u.id`)} where c.id=${source.conversationId}::uuid`);
    return {conversationId:source.conversationId,userIds:result.rows.map(r=>String(r.id))};
  });
}
