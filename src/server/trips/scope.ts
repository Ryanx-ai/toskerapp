import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError, requireRoomMember } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerTransaction } from "@/server/db/client";
import { rooms, subrooms, subroomAccess, conversations, tripPlans } from "@/server/db/schema";
import { isConversationId } from "@/lib/realtime-contract";

/** Membership/visibility mutations also lock the parent. Authorization is never inherited from a cached UI. */
export async function lockTripScope(tx: ToskerTransaction, actor: AuthenticatedActor, scope: string, mode: "share" | "update") {
  const [slug, child, extra] = scope.split("--");
  if (!slug || scope.length > 150 || extra !== undefined || (child !== undefined && !isConversationId(child))) throw new AuthorizationDeniedError();
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
  return { roomId: room.id, subroomId: child ?? null, conversationId: chat.id };
}
export const tripScopeWhere = (scope: { roomId: string; subroomId: string | null }) => and(eq(tripPlans.roomId, scope.roomId), scope.subroomId ? eq(tripPlans.subroomId, scope.subroomId) : isNull(tripPlans.subroomId));
export const authorizeTripScope = (db: ToskerDatabase, actor: AuthenticatedActor, scope: string) => db.transaction(tx => lockTripScope(tx, actor, scope, "share"));
