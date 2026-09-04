"use server";

import { and, asc, eq, isNull, max, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireConversationParticipant, requireRoomMember } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { conversations, hallItems, messages, notifications, profiles, roomCapabilities, roomMemberships, rooms } from "@/server/db/schema";

const allowedCapabilities = new Set(["Poll", "Schedule", "Map", "Board"]);

async function roomForConversation(conversationId: string) {
  const db = getDatabase();
  const [conversation] = await db.select({ roomId: conversations.roomId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation) throw new Error("Conversation not found.");
  return { db, roomId: conversation.roomId };
}

export async function listHallItemsAction(conversationId: string) {
  const actor = await requireCurrentActor();
  const { db, roomId } = await roomForConversation(conversationId);
  await requireConversationParticipant(db, actor, conversationId);
  if (roomId) await requireRoomMember(db, actor, roomId);
  const rows = await db
    .select({ id: hallItems.id, kind: hallItems.kind, title: hallItems.title, body: hallItems.body, sourceBody: messages.body, sourceMessageId: hallItems.sourceMessageId, author: profiles.displayName, createdAt: hallItems.createdAt, color: hallItems.color, position: hallItems.position, archivedAt: hallItems.archivedAt })
    .from(hallItems)
    .innerJoin(profiles, eq(profiles.userId, hallItems.authorId))
    .leftJoin(messages, eq(messages.id, hallItems.sourceMessageId))
    .where(and(isNull(hallItems.archivedAt), roomId ? or(eq(hallItems.conversationId, conversationId), and(isNull(hallItems.conversationId), eq(hallItems.roomId, roomId))) : eq(hallItems.conversationId, conversationId)))
    .orderBy(asc(hallItems.position), asc(hallItems.createdAt));
  return rows.map((item) => ({ ...item, body: item.body ?? item.sourceBody ?? "", createdAt: item.createdAt.toISOString(), archivedAt: item.archivedAt?.toISOString() ?? null }));
}

export async function createHallNoteAction(input: { conversationId: string; title: string; body: string }) {
  const actor = await requireCurrentActor();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 80 || body.length > 4_000) throw new Error("Enter a valid Hall note.");
  const { db, roomId } = await roomForConversation(input.conversationId);
  await requireConversationParticipant(db, actor, input.conversationId);
  if (roomId) await requireRoomMember(db, actor, roomId);
  await db.transaction(async (tx) => {
    const [{ nextPosition }] = await tx.select({ nextPosition: max(hallItems.position) }).from(hallItems).where(roomId ? or(eq(hallItems.conversationId, input.conversationId), and(isNull(hallItems.conversationId), eq(hallItems.roomId, roomId))) : eq(hallItems.conversationId, input.conversationId));
    await tx.insert(hallItems).values({ roomId, conversationId: input.conversationId, kind: "note", authorId: actor.userId, title, body, position: (nextPosition ?? -1) + 1 });
    if (roomId) {
      const recipients = await tx.select({ userId: roomMemberships.userId }).from(roomMemberships).where(and(eq(roomMemberships.roomId, roomId), ne(roomMemberships.userId, actor.userId)));
      if (recipients.length) await tx.insert(notifications).values(recipients.map(({ userId }) => ({ userId, actorId: actor.userId, roomId, conversationId: input.conversationId, type: "hall_note" })));
    }
  });
  revalidatePath("/");
}

export async function pinMessageToHallAction(input: { conversationId: string; messageId: string }) {
  const actor = await requireCurrentActor();
  const { db, roomId } = await roomForConversation(input.conversationId);
  await requireConversationParticipant(db, actor, input.conversationId);
  const [message] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.id, input.messageId), eq(messages.conversationId, input.conversationId))).limit(1);
  if (!message) throw new Error("Message not found in this Room.");
  const [created] = await db.insert(hallItems).values({ roomId, conversationId: input.conversationId, kind: "pinned_message", authorId: actor.userId, title: "Pinned from Chat", sourceMessageId: message.id }).onConflictDoNothing().returning({ id: hallItems.id });
  if (created && roomId) {
    const recipients = await db.select({ userId: roomMemberships.userId }).from(roomMemberships).where(and(eq(roomMemberships.roomId, roomId), ne(roomMemberships.userId, actor.userId)));
    if (recipients.length) await db.insert(notifications).values(recipients.map(({ userId }) => ({ userId, actorId: actor.userId, roomId, conversationId: input.conversationId, type: "hall_pin" })));
  }
  revalidatePath("/");
}

async function authorizeHallItem(conversationId: string, itemId: string) {
  const actor = await requireCurrentActor();
  const { db, roomId } = await roomForConversation(conversationId);
  await requireConversationParticipant(db, actor, conversationId);
  if (roomId) await requireRoomMember(db, actor, roomId);
  const [item] = await db.select({ id: hallItems.id, kind: hallItems.kind, roomId: hallItems.roomId, conversationId: hallItems.conversationId }).from(hallItems).where(and(eq(hallItems.id, itemId), roomId ? or(eq(hallItems.conversationId, conversationId), and(isNull(hallItems.conversationId), eq(hallItems.roomId, roomId))) : eq(hallItems.conversationId, conversationId))).limit(1);
  if (!item) throw new Error("Hall item not found.");
  return { actor, db, roomId, item };
}

export async function changeHallItemColorAction(input: { conversationId: string; itemId: string; color: string }) {
  const allowed = new Set(["neutral", "ivory", "gold", "pink", "green", "blue"]);
  if (!allowed.has(input.color)) throw new Error("Unsupported Hall color.");
  const { db } = await authorizeHallItem(input.conversationId, input.itemId);
  await db.update(hallItems).set({ color: input.color, updatedAt: new Date() }).where(eq(hallItems.id, input.itemId));
  revalidatePath("/");
}

export async function reorderHallItemAction(input: { conversationId: string; itemId: string; direction: "left" | "right" }) {
  const { db, roomId } = await authorizeHallItem(input.conversationId, input.itemId);
  const items = await db.select({ id: hallItems.id, position: hallItems.position }).from(hallItems).where(and(isNull(hallItems.archivedAt), roomId ? or(eq(hallItems.conversationId, input.conversationId), and(isNull(hallItems.conversationId), eq(hallItems.roomId, roomId))) : eq(hallItems.conversationId, input.conversationId))).orderBy(asc(hallItems.position), asc(hallItems.createdAt));
  const index = items.findIndex((item) => item.id === input.itemId);
  const targetIndex = input.direction === "left" ? index - 1 : index + 1;
  if (index < 0 || !items[targetIndex]) return;
  await db.transaction(async (tx) => {
    await tx.update(hallItems).set({ position: items[targetIndex].position, updatedAt: new Date() }).where(eq(hallItems.id, items[index].id));
    await tx.update(hallItems).set({ position: items[index].position, updatedAt: new Date() }).where(eq(hallItems.id, items[targetIndex].id));
  });
  revalidatePath("/");
}

export async function archiveHallNoteAction(input: { conversationId: string; itemId: string }) {
  const { db, item } = await authorizeHallItem(input.conversationId, input.itemId);
  if (item.kind !== "note") throw new Error("Only native notes can be archived.");
  await db.update(hallItems).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(hallItems.id, input.itemId));
  revalidatePath("/");
}

export async function nukeHallNoteAction(input: { conversationId: string; itemId: string }) {
  const { db, item } = await authorizeHallItem(input.conversationId, input.itemId);
  if (item.kind !== "note") throw new Error("Only native notes can be nuked.");
  await db.delete(hallItems).where(eq(hallItems.id, input.itemId));
  revalidatePath("/");
}

export async function unpinHallItemAction(input: { conversationId: string; itemId: string }) {
  const { db, item } = await authorizeHallItem(input.conversationId, input.itemId);
  if (item.kind !== "pinned_message") throw new Error("Only pinned messages can be unpinned.");
  await db.delete(hallItems).where(eq(hallItems.id, input.itemId));
  revalidatePath("/");
}

export async function installRoomCapabilityAction(input: { conversationId: string; capability: string }) {
  const actor = await requireCurrentActor();
  if (!allowedCapabilities.has(input.capability)) throw new Error("Unsupported Gizmo.");
  const { db, roomId } = await roomForConversation(input.conversationId);
  if (!roomId) throw new Error("Gizmos belong to Rooms.");
  await requireRoomMember(db, actor, roomId);
  const [created] = await db.insert(roomCapabilities).values({ roomId, capabilityKey: input.capability, installedById: actor.userId }).onConflictDoNothing().returning({ capability: roomCapabilities.capabilityKey });
  revalidatePath("/");
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
