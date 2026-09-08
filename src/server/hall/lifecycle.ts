import "server-only";
import { and, eq, isNull, max, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerReader } from "@/server/db/client";
import { conversations, hallItems, messages, notifications, roomMemberships, rooms } from "@/server/db/schema";
import { hallNotificationRecipients } from "@/server/attention/service";
import { lockHallScope } from "./service";

/** Caller must first authorize this conversation, including its Subroom. */
export async function ownsHallRoom(db: ToskerReader, actor: AuthenticatedActor, conversationId: string) {
  const [membership] = await db.select({ role: roomMemberships.role }).from(conversations)
    .innerJoin(rooms, and(eq(rooms.id, conversations.roomId), eq(rooms.ownerId, actor.userId)))
    .innerJoin(roomMemberships, and(eq(roomMemberships.roomId, conversations.roomId), eq(roomMemberships.userId, actor.userId)))
    .where(eq(conversations.id, conversationId));
  return membership?.role === "owner";
}

export async function changeHallLifecycle(db: ToskerDatabase, actor: AuthenticatedActor, input: {
  conversationId: string; itemId: string; operation: "archive" | "restore" | "delete" | "unpin" | "color"; color?: string;
}) {
  if (!["archive", "restore", "delete", "unpin", "color"].includes(input.operation)) throw new Error("Invalid Hall operation.");
  await db.transaction(async (tx) => {
    const scope = await lockHallScope(tx, actor, input.conversationId);
    const [item] = await tx.select().from(hallItems).where(and(scope, eq(hallItems.id, input.itemId))).for("update");
    if (!item) throw new AuthorizationDeniedError("Item unavailable in this Hall.");
    if (input.operation === "unpin") {
      if (item.kind !== "pinned_message") throw new Error("Only a Chat reference can be unpinned.");
      // Shared-board reference only; never mutate the source Chat message.
      await tx.delete(hallItems).where(eq(hallItems.id, item.id));
      return;
    }
    if (item.kind !== "note") throw new Error("This action requires a native Hall note.");
    if (input.operation === "color") {
      if (item.archivedAt || !["neutral", "ivory", "gold", "pink", "green", "blue"].includes(input.color ?? "")) throw new Error("Invalid note color.");
      await tx.update(hallItems).set({ color: input.color!, updatedAt: new Date() }).where(eq(hallItems.id, item.id));
      return;
    }
    if (item.authorId !== actor.userId && !await ownsHallRoom(tx, actor, input.conversationId)) throw new AuthorizationDeniedError("Only the author or Room owner can manage this note.");
    if (input.operation === "delete") await tx.delete(hallItems).where(eq(hallItems.id, item.id));
    else await tx.update(hallItems).set({ archivedAt: input.operation === "archive" ? item.archivedAt ?? new Date() : null, updatedAt: new Date() }).where(eq(hallItems.id, item.id));
  });
}

export async function createHallNote(db: ToskerDatabase, actor: AuthenticatedActor, input: { id: string; conversationId: string; title: string; body: string }) {
  const title = input.title.trim(), body = input.body.trim();
  if (!/^[0-9a-f-]{36}$/i.test(input.id) || !title || title.length > 80 || body.length > 4000) throw new Error("Enter a valid Hall note.");
  await db.transaction(async (tx) => {
    const scope = await lockHallScope(tx, actor, input.conversationId);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.conversationId}))`);
    const [existing] = await tx.select().from(hallItems).where(eq(hallItems.id, input.id));
    if (existing) {
      if (existing.authorId !== actor.userId || existing.conversationId !== input.conversationId || existing.kind !== "note") throw new AuthorizationDeniedError("Note ID unavailable.");
      return; // Lost-response retry cannot duplicate a note or its notifications.
    }
    const [conversation] = await tx.select({ roomId: conversations.roomId }).from(conversations).where(eq(conversations.id, input.conversationId));
    const [{ position }] = await tx.select({ position: max(hallItems.position) }).from(hallItems).where(scope);
    await tx.insert(hallItems).values({ id: input.id, conversationId: input.conversationId, roomId: conversation.roomId, authorId: actor.userId, kind: "note", title, body, position: (position ?? -1) + 1 });
    if (conversation.roomId) {
      const recipients = await hallNotificationRecipients(tx, input.conversationId, actor.userId);
      if (recipients.length) await tx.insert(notifications).values(recipients.map(({ userId }) => ({ userId, actorId: actor.userId, roomId: conversation.roomId, conversationId: input.conversationId, type: "hall_note" })));
    }
  });
}

export async function pinChatMessage(db: ToskerDatabase, actor: AuthenticatedActor, input: { conversationId: string; messageId: string }) {
  await db.transaction(async (tx) => {
    await lockHallScope(tx, actor, input.conversationId);
    const [source] = await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.id, input.messageId), eq(messages.conversationId, input.conversationId), isNull(messages.deletedAt))).for("update");
    if (!source) throw new AuthorizationDeniedError("Message unavailable in this conversation.");
    const [conversation] = await tx.select({ roomId: conversations.roomId }).from(conversations).where(eq(conversations.id, input.conversationId));
    const [created] = await tx.insert(hallItems).values({ roomId: conversation.roomId, conversationId: input.conversationId, kind: "pinned_message", authorId: actor.userId, title: "Pinned from Chat", sourceMessageId: source.id }).onConflictDoNothing().returning({ id: hallItems.id });
    if (created && conversation.roomId) {
      const recipients = await hallNotificationRecipients(tx, input.conversationId, actor.userId);
      if (recipients.length) await tx.insert(notifications).values(recipients.map(({ userId }) => ({ userId, actorId: actor.userId, roomId: conversation.roomId, conversationId: input.conversationId, type: "hall_pin" })));
    }
  });
}
