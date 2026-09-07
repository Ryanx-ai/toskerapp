"use server";

import { and, asc, eq, isNull, max, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireRoomMember } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { conversationParticipants, conversations, hallItems, messages, notifications, profiles, roomCapabilities, rooms } from "@/server/db/schema";
import { addHallComment, editHallNote, hallScope, listHallComments, moveHallItem, setCommentReaction, setHallReaction } from "@/server/hall/service";
import type { HallReaction } from "@/lib/hall-contract";

const allowedCapabilities = new Set(["Poll", "Schedule", "Map", "Board"]);

async function roomForConversation(conversationId: string) {
  const db = getDatabase();
  const [conversation] = await db.select({ roomId: conversations.roomId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation) throw new Error("Conversation not found.");
  return { db, roomId: conversation.roomId };
}

export async function listHallItemsAction(conversationId: string) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const scope = await hallScope(db, actor, conversationId);
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
    .where(and(isNull(hallItems.archivedAt), scope))
    .orderBy(asc(hallItems.position), asc(hallItems.createdAt), asc(hallItems.id));
  return rows.map((item) => ({ ...item, sourceDeletedAt: undefined, body: item.sourceDeletedAt ? "Message deleted" : item.body ?? item.sourceBody ?? "", createdAt: item.createdAt.toISOString(), archivedAt: item.archivedAt?.toISOString() ?? null }));
}

export async function createHallNoteAction(input: { conversationId: string; title: string; body: string }) {
  const actor = await requireCurrentActor();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 80 || body.length > 4_000) throw new Error("Enter a valid Hall note.");
  const { db, roomId } = await roomForConversation(input.conversationId);
  const scope = await hallScope(db, actor, input.conversationId);
  await db.transaction(async (tx) => {
    const [{ nextPosition }] = await tx.select({ nextPosition: max(hallItems.position) }).from(hallItems).where(scope);
    await tx.insert(hallItems).values({ roomId, conversationId: input.conversationId, kind: "note", authorId: actor.userId, title, body, position: (nextPosition ?? -1) + 1 });
    if (roomId) {
      const recipients = await tx.select({ userId: conversationParticipants.userId }).from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, input.conversationId), ne(conversationParticipants.userId, actor.userId)));
      if (recipients.length) await tx.insert(notifications).values(recipients.map(({ userId }) => ({ userId, actorId: actor.userId, roomId, conversationId: input.conversationId, type: "hall_note" })));
    }
  });
  revalidatePath("/app");
}

export async function pinMessageToHallAction(input: { conversationId: string; messageId: string }) {
  const actor = await requireCurrentActor();
  const { db, roomId } = await roomForConversation(input.conversationId);
  await hallScope(db, actor, input.conversationId);
  const [message] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.id, input.messageId), eq(messages.conversationId, input.conversationId), isNull(messages.deletedAt))).limit(1);
  if (!message) throw new Error("Message not found in this Room.");
  const [created] = await db.insert(hallItems).values({ roomId, conversationId: input.conversationId, kind: "pinned_message", authorId: actor.userId, title: "Pinned from Chat", sourceMessageId: message.id }).onConflictDoNothing().returning({ id: hallItems.id });
  if (created && roomId) {
    const recipients = await db.select({ userId: conversationParticipants.userId }).from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, input.conversationId), ne(conversationParticipants.userId, actor.userId)));
    if (recipients.length) await db.insert(notifications).values(recipients.map(({ userId }) => ({ userId, actorId: actor.userId, roomId, conversationId: input.conversationId, type: "hall_pin" })));
  }
  revalidatePath("/app");
}

async function authorizeHallItem(conversationId: string, itemId: string) {
  const actor = await requireCurrentActor();
  const { db, roomId } = await roomForConversation(conversationId);
  const scope = await hallScope(db, actor, conversationId);
  const [item] = await db.select({ id: hallItems.id, kind: hallItems.kind, roomId: hallItems.roomId, conversationId: hallItems.conversationId }).from(hallItems).where(and(eq(hallItems.id, itemId), scope)).limit(1);
  if (!item) throw new Error("Hall item not found.");
  return { actor, db, roomId, item };
}

export async function changeHallItemColorAction(input: { conversationId: string; itemId: string; color: string }) {
  const allowed = new Set(["neutral", "ivory", "gold", "pink", "green", "blue"]);
  if (!allowed.has(input.color)) throw new Error("Unsupported Hall color.");
  const { db } = await authorizeHallItem(input.conversationId, input.itemId);
  await db.update(hallItems).set({ color: input.color, updatedAt: new Date() }).where(eq(hallItems.id, input.itemId));
  revalidatePath("/app");
}

export async function reorderHallItemAction(input: { conversationId: string; itemId: string; direction?: "left" | "right"; targetId?: string }) {
  await moveHallItem(getDatabase(), await requireCurrentActor(), input);
}

export async function listHallCommentsAction(conversationId: string, itemId: string, before?: string) {
  return listHallComments(getDatabase(), await requireCurrentActor(), conversationId, itemId, before);
}

export async function addHallCommentAction(input: { conversationId: string; itemId: string; body: string; id: string }) {
  await addHallComment(getDatabase(), await requireCurrentActor(), input);
}

export async function setHallReactionAction(input: { conversationId: string; itemId: string; reaction: HallReaction; active: boolean }) {
  await setHallReaction(getDatabase(), await requireCurrentActor(), input);
}

export async function setCommentReactionAction(input: { conversationId: string; itemId: string; commentId: string; emoji: string; active: boolean }) {
  await setCommentReaction(getDatabase(), await requireCurrentActor(), input);
}

export async function editHallNoteAction(input: { conversationId: string; itemId: string; title: string; body: string }) {
  await editHallNote(getDatabase(), await requireCurrentActor(), input);
}

export async function archiveHallNoteAction(input: { conversationId: string; itemId: string }) {
  const { db, item } = await authorizeHallItem(input.conversationId, input.itemId);
  if (item.kind !== "note") throw new Error("Only native notes can be archived.");
  await db.update(hallItems).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(hallItems.id, input.itemId));
  revalidatePath("/app");
}

export async function nukeHallNoteAction(input: { conversationId: string; itemId: string }) {
  const { db, item } = await authorizeHallItem(input.conversationId, input.itemId);
  if (item.kind !== "note") throw new Error("Only native notes can be nuked.");
  await db.delete(hallItems).where(eq(hallItems.id, input.itemId));
  revalidatePath("/app");
}

export async function unpinHallItemAction(input: { conversationId: string; itemId: string }) {
  const { db, item } = await authorizeHallItem(input.conversationId, input.itemId);
  if (item.kind !== "pinned_message") throw new Error("Only pinned messages can be unpinned.");
  await db.delete(hallItems).where(eq(hallItems.id, input.itemId));
  revalidatePath("/app");
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
  const rows = await db.select({ id: notifications.id, type: notifications.type, roomId: notifications.roomId, conversationId: notifications.conversationId, messageId: notifications.messageId, actorId: notifications.actorId, actorName: profiles.displayName, messageBody: messages.body, conversationKind: conversations.kind, roomSlug: rooms.slug, createdAt: notifications.createdAt, readAt: notifications.readAt }).from(notifications).leftJoin(profiles, eq(profiles.userId, notifications.actorId)).leftJoin(messages, eq(messages.id, notifications.messageId)).leftJoin(conversations, eq(conversations.id, notifications.conversationId)).leftJoin(rooms, eq(rooms.id, conversations.roomId)).where(eq(notifications.userId, actor.userId)).orderBy(asc(notifications.createdAt));
  return rows.reverse().map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null }));
}

export async function markNotificationsReadAction() {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, actor.userId), isNull(notifications.readAt)));
}
