import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerReader } from "@/server/db/client";
import { messages, messageReactions, messageMentions, notifications, hallItems } from "@/server/db/schema";
import { lockHallScope } from "@/server/hall/service";
import { validateEmoji } from "@/server/emoji";
import { adjustMentions } from "@/lib/mentions";

/** Hold the source through send commit so Nuke either follows the reply or wins. */
export async function requireLiveReply(tx: ToskerReader, conversationId: string, id: string) {
  const [reply] = await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.id, id), eq(messages.conversationId, conversationId), isNull(messages.deletedAt))).for("share");
  if (!reply) throw new Error("Reply target unavailable in this conversation.");
}

/** Called under the existing authorized send transaction; no body is returned. */
export async function acceptedSendReceipt(tx: ToskerReader, actor: AuthenticatedActor, conversationId: string, id: string) {
  const [receipt] = await tx.select({ authorId: messages.authorId, conversationId: messages.conversationId, createdAt: messages.createdAt, removed: sql<boolean>`${messages.deletedAt} is not null` }).from(messages).where(eq(messages.id, id)).for("share");
  if (receipt && (receipt.authorId !== actor.userId || receipt.conversationId !== conversationId)) throw new AuthorizationDeniedError("Message id unavailable.");
  return receipt;
}

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
    if (message.deletedAt && !input.remove) throw new Error("That change couldn't be completed.");
    if (input.remove) {
      // Retain only the receipt needed by authorization, cursors and send retries.
      // Repeat cleanup also handles legacy soft-deleted records; no recovery payload.
      await tx.delete(hallItems).where(eq(hallItems.sourceMessageId, message.id));
      await tx.delete(notifications).where(eq(notifications.messageId, message.id));
      await tx.delete(messageMentions).where(eq(messageMentions.messageId, message.id));
      await tx.delete(messageReactions).where(eq(messageReactions.messageId, message.id));
      await tx.update(messages).set({ body: "", replyToId: null, editedAt: null, deletedAt: message.deletedAt ?? new Date() }).where(eq(messages.id, message.id));
      return;
    }
    const previousMentions = await tx.select().from(messageMentions).where(eq(messageMentions.messageId, message.id));
    const retainedMentions = adjustMentions(message.body, body!, previousMentions);
    if (previousMentions.length) {
      await tx.delete(messageMentions).where(eq(messageMentions.messageId, message.id));
      if (retainedMentions.length) await tx.insert(messageMentions).values(retainedMentions.map((mention) => ({ ...mention, messageId: message.id })));
      // Editing never creates attention, and deleted targeting must not remain a mention.
      for (const mention of previousMentions) if (!retainedMentions.some((retained) => retained.userId === mention.userId)) await tx.update(notifications).set({ isMention: false }).where(and(eq(notifications.messageId, message.id), eq(notifications.userId, mention.userId)));
    }
    await tx.update(messages).set({ body: body!, editedAt: new Date() }).where(eq(messages.id, input.messageId));
  });
}
