"use server";

import { and, asc, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { AuthorizationDeniedError, requireRoomMember } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { connections, conversations, hallItems, messages, notifications, profiles, roomCapabilities, rooms } from "@/server/db/schema";
import { addHallComment, editHallNote, hallScope, listHallComments, moveHallItem, setCommentReaction, setHallReaction } from "@/server/hall/service";
import type { HallReaction } from "@/lib/hall-contract";
import { publishConversationActivity, publishUserActivity } from "@/server/realtime/provider";
import { acknowledgeNotifications } from "@/server/attention/service";
import { changeHallLifecycle, createHallNote, ownsHallRoom, pinChatMessage } from "@/server/hall/lifecycle";

export async function listHallSnapshotAction(conversationId: string, archived = false) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  await hallScope(db, actor, conversationId);
  // Capture before fetching content: an arrival during the fetch remains unread.
  const seen = archived ? [] : await db.select({ id: notifications.id }).from(notifications).where(and(
    eq(notifications.userId, actor.userId), eq(notifications.conversationId, conversationId),
    sql`${notifications.type} in ('hall_note', 'hall_pin')`, isNull(notifications.destinationReadAt),
  )).limit(500);
  return { items: await listHallItemsAction(conversationId, archived), activityIds: seen.map((item) => item.id) };
}

const allowedCapabilities = new Set(["Poll", "Schedule", "Map", "Board"]);

async function roomForConversation(conversationId: string) {
  const db = getDatabase();
  const [conversation] = await db.select({ roomId: conversations.roomId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation) throw new Error("Conversation not found.");
  return { db, roomId: conversation.roomId };
}

export async function listHallItemsAction(conversationId: string, archived = false) {
  if (typeof archived !== "boolean") throw new Error("Invalid Hall view.");
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const scope = await hallScope(db, actor, conversationId);
  const owner = await ownsHallRoom(db, actor, conversationId);
  const rows = await db
    .select({ id: hallItems.id, kind: hallItems.kind, title: hallItems.title, body: hallItems.body, sourceBody: messages.body, sourceMessageId: hallItems.sourceMessageId, author: profiles.displayName, createdAt: hallItems.createdAt, color: hallItems.color, position: hallItems.position, archivedAt: hallItems.archivedAt,
      imagePath: hallItems.imagePath, imageAlt: hallItems.imageAlt, authorId: hallItems.authorId,
      sourceDeletedAt: messages.deletedAt,
      commentCount: sql<number>`(select count(*)::int from hall_comments where item_id = ${hallItems.id})`,
      reactions: sql<Array<{ reaction: HallReaction; count: number; mine: boolean }>>`coalesce((select json_agg(r) from (select reaction, count(*)::int as count, bool_or(user_id = ${actor.userId}) as mine from hall_reactions where item_id = ${hallItems.id} group by reaction) r), '[]'::json)`,
    })
    .from(hallItems)
    .innerJoin(profiles, eq(profiles.userId, hallItems.authorId))
    .leftJoin(messages, eq(messages.id, hallItems.sourceMessageId))
    .where(and(archived ? isNotNull(hallItems.archivedAt) : isNull(hallItems.archivedAt), scope))
    .orderBy(asc(hallItems.position), asc(hallItems.createdAt), asc(hallItems.id));
  return rows.map((item) => ({ ...item, canModerate: owner || item.authorId === actor.userId, sourceDeletedAt: undefined, body: item.sourceDeletedAt ? "Message deleted" : item.body ?? item.sourceBody ?? "", createdAt: item.createdAt.toISOString(), archivedAt: item.archivedAt?.toISOString() ?? null }));
}

export async function createHallNoteAction(input: { id: string; conversationId: string; title: string; body: string }) {
  await createHallNote(getDatabase(), await requireCurrentActor(), input);
  revalidatePath("/app");
  await publishConversationActivity(input.conversationId, "hall");
}

export async function pinMessageToHallAction(input: { conversationId: string; messageId: string }) {
  await pinChatMessage(getDatabase(), await requireCurrentActor(), input);
  revalidatePath("/app");
  await publishConversationActivity(input.conversationId, "hall");
}

export async function changeHallItemColorAction(input: { conversationId: string; itemId: string; color: string }) {
  await changeHallLifecycle(getDatabase(), await requireCurrentActor(), { ...input, operation: "color" });
  revalidatePath("/app");
  await publishConversationActivity(input.conversationId, "hall");
}

export async function reorderHallItemAction(input: { conversationId: string; itemId: string; direction?: "left" | "right"; targetId?: string }) {
  await moveHallItem(getDatabase(), await requireCurrentActor(), input);
  await publishConversationActivity(input.conversationId, "hall");
}

export async function listHallCommentsAction(conversationId: string, itemId: string, before?: string) {
  return listHallComments(getDatabase(), await requireCurrentActor(), conversationId, itemId, before);
}

export async function addHallCommentAction(input: { conversationId: string; itemId: string; body: string; id: string }) {
  await addHallComment(getDatabase(), await requireCurrentActor(), input);
  await publishConversationActivity(input.conversationId, "hall");
}

export async function setHallReactionAction(input: { conversationId: string; itemId: string; reaction: HallReaction; active: boolean }) {
  await setHallReaction(getDatabase(), await requireCurrentActor(), input);
  await publishConversationActivity(input.conversationId, "hall");
}

export async function setCommentReactionAction(input: { conversationId: string; itemId: string; commentId: string; emoji: string; active: boolean }) {
  await setCommentReaction(getDatabase(), await requireCurrentActor(), input);
  await publishConversationActivity(input.conversationId, "hall");
}

export async function editHallNoteAction(input: { conversationId: string; itemId: string; title: string; body: string }) {
  await editHallNote(getDatabase(), await requireCurrentActor(), input);
  await publishConversationActivity(input.conversationId, "hall");
}

export async function archiveHallNoteAction(input: { conversationId: string; itemId: string }) {
  await changeHallLifecycle(getDatabase(), await requireCurrentActor(), { ...input, operation: "archive" });
  revalidatePath("/app");
  await publishConversationActivity(input.conversationId, "hall");
}

export async function nukeHallNoteAction(input: { conversationId: string; itemId: string }) {
  await changeHallLifecycle(getDatabase(), await requireCurrentActor(), { ...input, operation: "delete" });
  revalidatePath("/app");
  await publishConversationActivity(input.conversationId, "hall");
}

export async function unpinHallItemAction(input: { conversationId: string; itemId: string }) {
  await changeHallLifecycle(getDatabase(), await requireCurrentActor(), { ...input, operation: "unpin" });
  revalidatePath("/app");
  await publishConversationActivity(input.conversationId, "hall");
}

export async function restoreHallNoteAction(input: { conversationId: string; itemId: string }) {
  await changeHallLifecycle(getDatabase(), await requireCurrentActor(), { ...input, operation: "restore" });
  revalidatePath("/app");
  await publishConversationActivity(input.conversationId, "hall");
}

export async function installRoomCapabilityAction(input: { conversationId: string; capability: string }) {
  const actor = await requireCurrentActor();
  if (!allowedCapabilities.has(input.capability)) throw new Error("Unsupported Gizmo.");
  const { db, roomId } = await roomForConversation(input.conversationId);
  if (!roomId) throw new Error("Gizmos belong to Rooms.");
  await requireRoomMember(db, actor, roomId);
  const [created] = await db.insert(roomCapabilities).values({ roomId, capabilityKey: input.capability, installedById: actor.userId }).onConflictDoNothing().returning({ capability: roomCapabilities.capabilityKey });
  revalidatePath("/app");
  return { installed: Boolean(created) };
}

export async function listNotificationsAction() {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const rows = await db.select({ id: notifications.id, type: notifications.type, isMention: notifications.isMention, roomId: notifications.roomId, conversationId: notifications.conversationId, messageId: notifications.messageId, actorId: notifications.actorId, actorName: profiles.displayName, messageBody: messages.body, conversationKind: conversations.kind, subroomId: conversations.subroomId, roomSlug: rooms.slug, roomName: rooms.name, conversationTitle: conversations.title, createdAt: notifications.createdAt, readAt: notifications.readAt, destinationReadAt: notifications.destinationReadAt }).from(notifications).leftJoin(profiles, eq(profiles.userId, notifications.actorId)).leftJoin(messages, eq(messages.id, notifications.messageId)).leftJoin(conversations, eq(conversations.id, notifications.conversationId)).leftJoin(rooms, eq(rooms.id, conversations.roomId)).where(eq(notifications.userId, actor.userId)).orderBy(asc(notifications.createdAt));
  const scopes = [...new Set(rows.flatMap((item) => item.conversationId ? [item.conversationId] : []))];
  // Notification history is not friendship state. Resolved/deleted requests must
  // never keep Friends lit; an older notification also cannot stand for a re-request.
  const pendingRequests = rows.some((item) => item.type === "connection_request")
    ? await db.select({ requesterId: connections.requesterId, createdAt: connections.createdAt }).from(connections)
      .where(and(eq(connections.addresseeId, actor.userId), eq(connections.status, "pending")))
    : [];
  const allowed = new Set(await Promise.all(scopes.map(async (id) => {
    try { await hallScope(db, actor, id); return id; } catch (error) { if (error instanceof AuthorizationDeniedError) return null; throw error; }
  })));
  return rows.filter((item) => !item.conversationId || allowed.has(item.conversationId)).reverse().map((item) => ({ ...item, requestPending: item.type === "connection_request" && pendingRequests.some((request) => request.requesterId === item.actorId && request.createdAt <= item.createdAt), muted: false, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null, destinationReadAt: item.destinationReadAt?.toISOString() ?? null }));
}

export async function markNotificationsReadAction(ids: string[]) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  await acknowledgeNotifications(db, actor, ids);
  if (ids.length) await publishUserActivity(actor.userId);
}
