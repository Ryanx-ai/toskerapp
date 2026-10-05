import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { mapPinReceipts } from "@/server/db/schema";
import { isConversationId } from "@/lib/realtime-contract";
import { mutateTrip, TripError, validateCandidate } from "@/server/trips/service";
import { authorizedContext, lockPinScope } from "./scope";
import { requirePin } from "./service";

export type PinTransfer = { sourceScope:string; targetScope:string; pinId:string; expectedPinRevision:number; routeId:string; expectedTripRevision:number; requestId:string };
export async function addPinToRoute(db: ToskerDatabase, actor: AuthenticatedActor, input: PinTransfer) {
  if (!input || ![input.sourceScope,input.targetScope].every(s=>typeof s === "string" && s.length<=150) || ![input.pinId,input.routeId,input.requestId].every(isConversationId) || !Number.isSafeInteger(input.expectedPinRevision) || input.expectedPinRevision<1 || !Number.isSafeInteger(input.expectedTripRevision) || input.expectedTripRevision<0 || input.targetScope.startsWith("sandbox--")) throw new TripError("invalid","Choose an available Route.");
  const payloadHash = createHash("sha256").update(JSON.stringify({type:"add-to-route",...input})).digest("hex");
  return db.transaction(async tx => {
    // Stable scope order; all permissions are locked again before copying any source data.
    const scopes = new Map<string,Awaited<ReturnType<typeof lockPinScope>>>();
    for (const scope of [...new Set([input.sourceScope,input.targetScope])].sort()) scopes.set(scope,await lockPinScope(tx,actor,scope,"update"));
    const source = scopes.get(input.sourceScope)!;
    const [receipt] = await tx.select().from(mapPinReceipts).where(and(eq(mapPinReceipts.conversationId,source.conversationId),eq(mapPinReceipts.actorId,actor.userId),eq(mapPinReceipts.requestId,input.requestId)));
    if (receipt) {
      if (receipt.payloadHash !== payloadHash) throw new TripError("retry-mismatch","This retry changed. Refresh the Map first.");
      return {resultId:receipt.resultId,replayed:true};
    }
    const [{n}] = await tx.select({n:count()}).from(mapPinReceipts).where(eq(mapPinReceipts.conversationId,source.conversationId));
    if (n>=10000) throw new TripError("limit","This Development Map reached its change limit.");
    const pin = await requirePin(tx,source.conversationId,input.pinId,input.expectedPinRevision);
    // Drizzle nested transaction is a savepoint on this same connection, not a second commit.
    const result = await mutateTrip(tx as unknown as ToskerDatabase,actor,{roomSlug:input.targetScope,expectedRevision:input.expectedTripRevision,requestId:input.requestId,command:{type:"add",routeId:input.routeId,candidate:validateCandidate({...pin,source:pin.source as "search"|"pin"})}});
    if (!result.resultId) throw new TripError("unavailable","The Route copy could not be confirmed.");
    await tx.insert(mapPinReceipts).values({conversationId:source.conversationId,actorId:actor.userId,requestId:input.requestId,payloadHash,resultId:result.resultId});
    return {resultId:result.resultId,replayed:false};
  });
}

/** Available target Routes are authorized server-side, including when opened from Sandbox. */
export async function pinRouteChoices(db:ToskerDatabase, actor:AuthenticatedActor) {
  const result = await db.execute(sql`select r.id,r.name,p.revision,c.kind,c.id as conversation_id,c.subroom_id,room.slug,coalesce(child.name,room.name,'Personal Chat') as context_name
    from trip_routes r join trip_plans p on p.id=r.plan_id
    join conversations c on (p.personal_conversation_id=c.id or (p.room_id=c.room_id and ((p.subroom_id is null and c.subroom_id is null and c.is_primary) or p.subroom_id=c.subroom_id)))
    left join rooms room on room.id=c.room_id left join subrooms child on child.id=c.subroom_id
    where r.archived_at is null and ${authorizedContext(sql`${actor.userId}::uuid`)} order by r.updated_at desc,r.id limit 100`);
  return result.rows.map(r=>({id:String(r.id),name:String(r.name),revision:Number(r.revision),contextName:String(r.context_name),scope:r.kind === "personal" ? `personal--${r.conversation_id}` : `${r.slug}${r.subroom_id?`--${r.subroom_id}`:""}`}));
}
