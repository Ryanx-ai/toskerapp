import "server-only";

import { and, eq, inArray, isNull, isNotNull, ne, or, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { conversationParticipants, conversations, notifications, roomMemberships, subroomAccess, subrooms } from "@/server/db/schema";
import { hallScope } from "@/server/hall/service";

/** Room Hall recipients must still have membership and current Subroom access.
 * A stale participant row alone must never generate a notification. */
export async function hallNotificationRecipients(db: Pick<ToskerDatabase, "select">, conversationId: string, authorId: string) {
  return db.select({ userId: conversationParticipants.userId }).from(conversationParticipants)
    .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
    .innerJoin(roomMemberships, and(eq(roomMemberships.roomId, conversations.roomId), eq(roomMemberships.userId, conversationParticipants.userId)))
    .leftJoin(subrooms, eq(subrooms.id, conversations.subroomId))
    .leftJoin(subroomAccess, and(eq(subroomAccess.subroomId, subrooms.id), eq(subroomAccess.userId, conversationParticipants.userId)))
    .where(and(eq(conversationParticipants.conversationId, conversationId), ne(conversationParticipants.userId, authorId),
      or(isNull(conversations.subroomId), eq(subrooms.visibility, "everyone"), isNotNull(subroomAccess.userId), and(eq(subrooms.visibility, "owners"), eq(roomMemberships.role, "owner")))));
}

function seenIds(ids: string[]) {
  if (!Array.isArray(ids) || ids.length > 500 || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("Invalid activity boundary.");
  return [...new Set(ids)];
}

/** Acknowledgement of the list never implies the destination was viewed. */
export async function acknowledgeNotifications(db: ToskerDatabase, actor: AuthenticatedActor, ids: string[]) {
  const seen = seenIds(ids);
  if (!seen.length) return;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, actor.userId), inArray(notifications.id, seen), isNull(notifications.readAt)));
}

/** Exact rendered snapshot, actor and surface: later arrivals stay unread. */
export async function acknowledgeDestination(db: ToskerDatabase, actor: AuthenticatedActor, ids: string[], conversationId?: string) {
  const seen = seenIds(ids);
  if (!seen.length) return;
  if (conversationId) await hallScope(db, actor, conversationId);
  const now = new Date();
  await db.update(notifications).set({ readAt: now, destinationReadAt: now }).where(and(
    eq(notifications.userId, actor.userId), inArray(notifications.id, seen),
    conversationId ? eq(notifications.conversationId, conversationId) : undefined,
    inArray(notifications.type, conversationId ? ["hall_note", "hall_pin"] : ["connection_request"]),
    isNull(notifications.destinationReadAt),
  ));
}

export async function acknowledgeChat(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, throughMessageId: string) {
  await hallScope(db, actor, conversationId);
  const now = new Date();
  await db.update(notifications).set({ readAt: now, destinationReadAt: now }).where(and(
    eq(notifications.userId, actor.userId), eq(notifications.conversationId, conversationId), eq(notifications.type, "message"),
    sql`exists (select 1 from messages seen, messages boundary where seen.id = ${notifications.messageId} and boundary.id = ${throughMessageId} and boundary.conversation_id = ${conversationId} and (seen.created_at, seen.id) <= (boundary.created_at, boundary.id))`,
  ));
}
