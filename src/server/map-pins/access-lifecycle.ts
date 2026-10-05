import "server-only";
import { and, eq } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError, requireRoomOwner } from "@/server/auth/authorize";
import type { ToskerDatabase } from "@/server/db/client";
import { connections, conversations, conversationParticipants, rooms, subrooms, subroomAccess } from "@/server/db/schema";
import { lockActorTokens } from "@/server/realtime/access-lock";
import { revokeActorRealtime, publishUserActivity } from "@/server/realtime/provider";

/** Server lifecycle boundary for relationship withdrawal. No new unfriend UI in FP4B.
 * Tokens must be revoked before commit; provider failure rolls back the withdrawal.
 */
export async function revokePinConnection(db:ToskerDatabase,actor:AuthenticatedActor,connectionId:string,revoke=revokeActorRealtime,notify=publishUserActivity) {
  const ids = await db.transaction(async tx => {
    const [before] = await tx.select().from(connections).where(eq(connections.id,connectionId));
    if (!before || ![before.requesterId,before.addresseeId].includes(actor.userId)) throw new AuthorizationDeniedError();
    const actors = [before.requesterId,before.addresseeId].sort();
    for (const id of actors) await lockActorTokens(tx,id);
    await tx.select({id:conversations.id}).from(conversations).where(and(eq(conversations.kind,"personal"),eq(conversations.directKey,before.pairKey))).for("update");
    const [connection] = await tx.select().from(connections).where(eq(connections.id,connectionId)).for("update");
    if (!connection) throw new AuthorizationDeniedError();
    await tx.delete(connections).where(eq(connections.id,connectionId));
    for (const id of actors) await revoke(id);
    return actors;
  });
  await Promise.all(ids.map(id=>notify(id)));
}

/** Selected Subroom grant withdrawal; parent membership/other users' Pins are untouched. */
export async function revokePinSubroomAccess(db:ToskerDatabase,actor:AuthenticatedActor,subroomId:string,userId:string,revoke=revokeActorRealtime,notify=publishUserActivity) {
  await db.transaction(async tx => {
    await lockActorTokens(tx,userId);
    const [before] = await tx.select().from(subrooms).where(eq(subrooms.id,subroomId));
    if (!before) throw new AuthorizationDeniedError();
    await tx.select({id:rooms.id}).from(rooms).where(eq(rooms.id,before.roomId)).for("update");
    await requireRoomOwner(tx,actor,before.roomId);
    const [child] = await tx.select().from(subrooms).where(eq(subrooms.id,subroomId)).for("update");
    if (!child || child.visibility !== "selected") throw new AuthorizationDeniedError();
    const chats = await tx.select({id:conversations.id}).from(conversations).where(eq(conversations.subroomId,subroomId));
    await tx.delete(subroomAccess).where(and(eq(subroomAccess.subroomId,subroomId),eq(subroomAccess.userId,userId)));
    for (const chat of chats) await tx.delete(conversationParticipants).where(and(eq(conversationParticipants.conversationId,chat.id),eq(conversationParticipants.userId,userId)));
    await revoke(userId);
  });
  await notify(userId);
}
