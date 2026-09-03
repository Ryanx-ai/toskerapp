"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireConversationParticipant, requireRoomMember } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { conversations, hallItems, messages, notifications, profiles, roomCapabilities, roomMemberships } from "@/server/db/schema";

const allowedCapabilities = new Set(["Poll", "Schedule", "Map", "Board"]);

async function roomForConversation(conversationId: string) {
  const db = getDatabase();
  const [conversation] = await db.select({ roomId: conversations.roomId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation?.roomId) throw new Error("Room Hall is required.");
  return { db, roomId: conversation.roomId };
}

export async function listHallItemsAction(conversationId: string) {
  const actor = await requireCurrentActor();
  const { db, roomId } = await roomForConversation(conversationId);
  await requireRoomMember(db, actor, roomId);
  const rows = await db
    .select({ id: hallItems.id, kind: hallItems.kind, title: hallItems.title, body: hallItems.body, sourceBody: messages.body, sourceMessageId: hallItems.sourceMessageId, author: profiles.displayName, createdAt: hallItems.createdAt })
    .from(hallItems)
    .innerJoin(profiles, eq(profiles.userId, hallItems.authorId))
    .leftJoin(messages, eq(messages.id, hallItems.sourceMessageId))
    .where(eq(hallItems.roomId, roomId))
    .orderBy(asc(hallItems.createdAt));
  return rows.map((item) => ({ ...item, body: item.body ?? item.sourceBody ?? "", createdAt: item.createdAt.toISOString() }));
}

export async function createHallNoteAction(input: { conversationId: string; title: string; body: string }) {
  const actor = await requireCurrentActor();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 80 || body.length > 4_000) throw new Error("Enter a valid Hall note.");
  const { db, roomId } = await roomForConversation(input.conversationId);
  await requireRoomMember(db, actor, roomId);
  await db.transaction(async (tx) => {
    await tx.insert(hallItems).values({ roomId, kind: "note", authorId: actor.userId, title, body });
    const recipients = await tx.select({ userId: roomMemberships.userId }).from(roomMemberships).where(and(eq(roomMemberships.roomId, roomId), ne(roomMemberships.userId, actor.userId)));
    if (recipients.length) await tx.insert(notifications).values(recipients.map(({ userId }) => ({ userId, actorId: actor.userId, roomId, type: "hall_note" })));
  });
  revalidatePath("/");
}

export async function pinMessageToHallAction(input: { conversationId: string; messageId: string }) {
  const actor = await requireCurrentActor();
  const { db, roomId } = await roomForConversation(input.conversationId);
  await requireConversationParticipant(db, actor, input.conversationId);
  const [message] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.id, input.messageId), eq(messages.conversationId, input.conversationId))).limit(1);
  if (!message) throw new Error("Message not found in this Room.");
  await db.insert(hallItems).values({ roomId, kind: "pinned_message", authorId: actor.userId, title: "Pinned from Chat", sourceMessageId: message.id }).onConflictDoNothing();
  revalidatePath("/");
}

export async function installRoomCapabilityAction(input: { conversationId: string; capability: string }) {
  const actor = await requireCurrentActor();
  if (!allowedCapabilities.has(input.capability)) throw new Error("Unsupported Gizmo.");
  const { db, roomId } = await roomForConversation(input.conversationId);
  await requireRoomMember(db, actor, roomId);
  const [created] = await db.insert(roomCapabilities).values({ roomId, capabilityKey: input.capability, installedById: actor.userId }).onConflictDoNothing().returning({ capability: roomCapabilities.capabilityKey });
  revalidatePath("/");
  return { installed: Boolean(created) };
}

export async function listNotificationsAction() {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const rows = await db.select({ id: notifications.id, type: notifications.type, roomId: notifications.roomId, createdAt: notifications.createdAt, readAt: notifications.readAt }).from(notifications).where(eq(notifications.userId, actor.userId)).orderBy(asc(notifications.createdAt));
  return rows.reverse().map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null }));
}
