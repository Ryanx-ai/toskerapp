import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase } from "@/server/db/client";
import { messages, messageReactions } from "@/server/db/schema";
import { lockHallScope } from "@/server/hall/service";
import { validateEmoji } from "@/server/emoji";

export async function setMessageReaction(db: ToskerDatabase, actor: AuthenticatedActor, input: { conversationId: string; messageId: string; emoji: string; active: boolean }) {
  validateEmoji(input.emoji);
  if (typeof input.active !== "boolean") throw new Error("Invalid reaction state.");
  await db.transaction(async (tx) => {
    await lockHallScope(tx, actor, input.conversationId);
    const [message] = await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.id, input.messageId), eq(messages.conversationId, input.conversationId), isNull(messages.deletedAt))).for("update");
    if (!message) throw new AuthorizationDeniedError("Message unavailable.");
    if (input.active) await tx.insert(messageReactions).values({ messageId: input.messageId, userId: actor.userId, emoji: input.emoji }).onConflictDoNothing();
    else await tx.delete(messageReactions).where(and(eq(messageReactions.messageId, input.messageId), eq(messageReactions.userId, actor.userId), eq(messageReactions.emoji, input.emoji)));
  });
}

export async function changeOwnMessage(db: ToskerDatabase, actor: AuthenticatedActor, input: { conversationId: string; messageId: string; body?: string; remove?: boolean }) {
  const body = input.body?.trim();
  if (!input.remove && (!body || body.length > 8000)) throw new Error("Enter a message up to 8,000 characters.");
  await db.transaction(async (tx) => {
    await lockHallScope(tx, actor, input.conversationId);
    const [message] = await tx.select().from(messages).where(and(eq(messages.id, input.messageId), eq(messages.conversationId, input.conversationId), eq(messages.authorId, actor.userId))).for("update");
    if (!message) throw new AuthorizationDeniedError("Only the author can change this message.");
    if (message.deletedAt) { if (input.remove) return; throw new Error("Message deleted."); }
    await tx.update(messages).set(input.remove ? { body: "", deletedAt: new Date() } : { body: body!, editedAt: new Date() }).where(eq(messages.id, input.messageId));
    if (input.remove) await tx.delete(messageReactions).where(eq(messageReactions.messageId, input.messageId));
  });
}
