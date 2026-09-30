import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError, requireRoomMember } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerTransaction } from "@/server/db/client";
import { rooms, subrooms, subroomAccess, conversations, conversationParticipants, connections, tripPlans } from "@/server/db/schema";
import { isConversationId } from "@/lib/realtime-contract";

/** Membership/visibility mutations also lock the parent. Authorization is never inherited from a cached UI. */
export async function lockTripScope(tx: ToskerTransaction, actor: AuthenticatedActor, scope: string, mode: "share" | "update") {
  if (typeof scope !== "string") throw new AuthorizationDeniedError();
  const [slug, child, extra] = scope.split("--");
  if (!slug || scope.length > 150 || extra !== undefined || (child !== undefined && !isConversationId(child))) throw new AuthorizationDeniedError();
  if (slug === "personal") {
    if (!child) throw new AuthorizationDeniedError();
    const [chat] = await tx.select().from(conversations).where(and(eq(conversations.id, child), eq(conversations.kind, "personal"), isNull(conversations.roomId), isNull(conversations.subroomId))).for(mode);
    if (!chat) throw new AuthorizationDeniedError();
    // Row locks serialize participant deletion and relationship removal with each operation.
    const participants = await tx.select({ id: conversationParticipants.userId }).from(conversationParticipants).where(eq(conversationParticipants.conversationId, child)).for("share");
    if (participants.length !== 2 || !participants.some(p => p.id === actor.userId)) throw new AuthorizationDeniedError();
    const pair = participants.map(p => p.id).sort().join(":");
    if (chat.directKey !== pair) throw new AuthorizationDeniedError();
    const [relationship] = await tx.select({ id: connections.id }).from(connections).where(and(eq(connections.pairKey, pair), eq(connections.status, "accepted"))).for("share");
    if (!relationship) throw new AuthorizationDeniedError();
    return { roomId: null, subroomId: null, personalConversationId: child, conversationId: child };
  }
  const [room] = await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.slug, slug)).for(mode);
  if (!room) throw new AuthorizationDeniedError();
  const member = await requireRoomMember(tx, actor, room.id);
  if (child) {
    const [subroom] = await tx.select().from(subrooms).where(and(eq(subrooms.id, child), eq(subrooms.roomId, room.id))).for("share");
    if (!subroom) throw new AuthorizationDeniedError();
    const [grant] = await tx.select({ id: subroomAccess.userId }).from(subroomAccess).where(and(eq(subroomAccess.subroomId, child), eq(subroomAccess.userId, actor.userId)));
    if (subroom.visibility !== "everyone" && !(subroom.visibility === "owners" && member.role === "owner") && !grant) throw new AuthorizationDeniedError();
  }
  const [chat] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.roomId, room.id), child ? eq(conversations.subroomId, child) : and(isNull(conversations.subroomId), eq(conversations.isPrimary, true)))).limit(1);
  if (!chat) throw new AuthorizationDeniedError();
  return { roomId: room.id, subroomId: child ?? null, personalConversationId: null, conversationId: chat.id };
}
export const tripScopeWhere = (scope: { roomId: string | null; subroomId: string | null; personalConversationId: string | null }) => scope.personalConversationId ? eq(tripPlans.personalConversationId, scope.personalConversationId) : and(eq(tripPlans.roomId, scope.roomId!), scope.subroomId ? eq(tripPlans.subroomId, scope.subroomId) : isNull(tripPlans.subroomId));
export const authorizeTripScope = (db: ToskerDatabase, actor: AuthenticatedActor, scope: string) => db.transaction(tx => lockTripScope(tx, actor, scope, "share"));
