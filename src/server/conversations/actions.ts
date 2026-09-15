"use server";

import { and, desc, eq, ilike, isNull, lt, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { conversationParticipants, conversationReads, conversations, hallItems, messages, messageMentions, notifications, profiles, users } from "@/server/db/schema";
import { hallScope, lockHallScope } from "@/server/hall/service";
import { acceptedSendReceipt, changeOwnMessage, requireLiveReply, setMessageReaction } from "./service";
import type { ReactionSummary } from "@/lib/reaction-contract";
import { publishMessageChanged, publishConversationActivity, publishUserActivity } from "@/server/realtime/provider";
import { acknowledgeChat, acknowledgeDestination } from "@/server/attention/service";
import { clearManualUnread } from "./preferences";
import { validateMentionTargets } from "./mentions";
import { adjustMentions, type MentionSpan } from "@/lib/mentions";
import { contextualName, conversationRoomId } from "@/server/profiles/context-name";
import { normalizeTidLookup } from "@/lib/tid-contract";

export type PersistentMessage = {
  id: string;
  author: string;
  authorId: string;
  body: string;
  createdAt: string;
  mine: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  replyToId: string | null;
  replyTo: string | null;
  reactionSummary: ReactionSummary[];
};

export async function listMessagesAction(
  conversationId: string,
  before?: { createdAt: string; id: string },
) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  await hallScope(db, actor, conversationId);
  const roomId = conversationRoomId(conversationId);
  const reactionName = contextualName(actor.userId, roomId, sql`p.user_id`, sql`p.display_name`);
  const boundary = before
    ? or(
        lt(messages.createdAt, new Date(before.createdAt)),
        and(eq(messages.createdAt, new Date(before.createdAt)), lt(messages.id, before.id)),
      )
    : undefined;
  const rows = await db
    .select({ id: messages.id, author: contextualName(actor.userId, roomId, sql`${messages.authorId}`, sql`${profiles.displayName}`), authorId: messages.authorId, body: messages.body, createdAt: messages.createdAt,
      editedAt: messages.editedAt, deletedAt: messages.deletedAt, replyToId: messages.replyToId,
      replyTo: sql<string | null>`(select left(m.body, 240) from messages m where m.id = ${messages.replyToId} and m.conversation_id = ${conversationId} and m.deleted_at is null)`,
      reactionSummary: sql<ReactionSummary[]>`coalesce((select json_agg(r order by r.emoji) from (select emoji, count(*)::int as count, bool_or(mr.user_id = ${actor.userId}) as mine, array_agg(${reactionName} order by ${reactionName}) as participants from message_reactions mr join profiles p on p.user_id = mr.user_id where message_id = ${messages.id} group by emoji) r), '[]'::json)`,
    })
    .from(messages)
    .innerJoin(profiles, eq(profiles.userId, messages.authorId))
    .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt), boundary))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(51);
  const page = rows.slice(0, 50).reverse();
  return {
    messages: page.map((message) => ({ ...message, replyToId: message.replyTo ? message.replyToId : null, editedAt: message.editedAt?.toISOString() ?? null, deletedAt: null, createdAt: message.createdAt.toISOString(), mine: message.authorId === actor.userId })) satisfies PersistentMessage[],
    nextCursor: rows.length > 50 && page[0] ? { createdAt: page[0].createdAt.toISOString(), id: page[0].id } : null,
  };
}

export async function sendMessageAction(input: { id: string; conversationId: string; body: string; replyToId?: string; traceId?: string; mentions?: MentionSpan[] }) {
  const started = performance.now();
  const actor = await requireCurrentActor();
  const authenticated = performance.now();
  const body = input.body.trim();
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Invalid message id.");
  if (!body || body.length > 8_000) throw new Error("Enter a message up to 8,000 characters.");
  const db = getDatabase();
  const transactionStarted = performance.now();
  let authorized = transactionStarted;
  const created = await db.transaction(async (tx) => {
  await lockHallScope(tx, actor, input.conversationId);
  authorized = performance.now();
  // A lost acknowledgement stays idempotent even if its source was later deleted.
  const accepted = await acceptedSendReceipt(tx, actor, input.conversationId, input.id);
  if (accepted) {
    if (accepted.authorId !== actor.userId || accepted.conversationId !== input.conversationId) throw new Error("Message id unavailable.");
    return accepted;
  }
  const mentions = await validateMentionTargets(tx, input.conversationId, body, adjustMentions(input.body, body, input.mentions ?? []));
  if (input.replyToId) await requireLiveReply(tx, input.conversationId, input.replyToId);
  const [created] = await tx
    .insert(messages)
    .values({ id: input.id, conversationId: input.conversationId, authorId: actor.userId, body, replyToId: input.replyToId })
    .onConflictDoNothing()
    .returning({ createdAt: messages.createdAt, removed: sql<boolean>`false` });
  if (created) {
    if (mentions.length) await tx.insert(messageMentions).values(mentions.map((mention) => ({ ...mention, messageId: input.id })));
    const recipients = await tx
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, input.conversationId), ne(conversationParticipants.userId, actor.userId)));
    if (recipients.length) {
      await tx.insert(notifications).values(recipients.map(({ userId }) => ({
        userId,
        actorId: actor.userId,
        conversationId: input.conversationId,
        messageId: input.id,
        type: "message",
        isMention: mentions.some((mention) => mention.userId === userId),
      })));
    }
  } else {
    const existing = await acceptedSendReceipt(tx, actor, input.conversationId, input.id);
    if (!existing || existing.authorId !== actor.userId || existing.conversationId !== input.conversationId) throw new Error("Message id unavailable.");
    return existing;
  }
  return created;
  });
  const committed = performance.now(), committedAt = Date.now();
  revalidatePath("/app");
  const publishing = performance.now();
  const trace = input.traceId && /^[0-9a-f-]{36}$/i.test(input.traceId) ? { id: input.traceId, committedAt, publishedAt: Date.now() } : undefined;
  await Promise.all([publishMessageChanged(input.conversationId, trace), publishConversationActivity(input.conversationId, "chat")]);
  return { id: input.id, removed: created.removed, createdAt: created.createdAt.toISOString(), timing: {
    authMs: authenticated - started, authorizationMs: authorized - transactionStarted,
    transactionMs: committed - transactionStarted, publishMs: performance.now() - publishing,
    totalMs: performance.now() - started,
  } };
}

export async function markConversationReadAction(conversationId: string, surface: "chat" | "hall" = "chat", throughMessageId?: string, activityIds: string[] = [], observedManualId?: string | null) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  await hallScope(db, actor, conversationId);
  await clearManualUnread(db, actor, conversationId, surface, observedManualId);
  if (surface === "hall") {
    await acknowledgeDestination(db, actor, activityIds, conversationId);
    if (activityIds.length || observedManualId) await publishUserActivity(actor.userId);
    return;
  }
  if (surface === "chat") await db.insert(conversationReads)
    .values({ conversationId, userId: actor.userId, lastReadAt: new Date() })
    .onConflictDoUpdate({
      target: [conversationReads.conversationId, conversationReads.userId],
      set: { lastReadAt: new Date() },
    });
  if (!throughMessageId) { if (observedManualId) await publishUserActivity(actor.userId); return; }
  await acknowledgeChat(db, actor, conversationId, throughMessageId);
  await publishUserActivity(actor.userId);
}

export async function setMessageReactionAction(input: { conversationId: string; messageId: string; emoji: string; active: boolean }) {
  await setMessageReaction(getDatabase(), await requireCurrentActor(), input);
  await publishMessageChanged(input.conversationId);
}

export async function changeOwnMessageAction(input: { conversationId: string; messageId: string; body?: string; remove?: boolean }) {
  await changeOwnMessage(getDatabase(), await requireCurrentActor(), input);
  const pinned = input.remove ? true : (await getDatabase().select({ id: hallItems.id }).from(hallItems).where(and(eq(hallItems.sourceMessageId, input.messageId), eq(hallItems.conversationId, input.conversationId))).limit(1)).length > 0;
  // Refresh a retained reference after source edits too; this creates no unread/event row.
  await Promise.all([publishMessageChanged(input.conversationId), publishConversationActivity(input.conversationId, "chat"), ...(pinned ? [publishConversationActivity(input.conversationId, "hall")] : [])]);
}

export async function findPeopleAction(query: string, includeSelf = false) {
  const actor = await requireCurrentActor();
  const term = query.trim().replace(/^@/, "").slice(0, 80);
  const tid = normalizeTidLookup(query);
  if (term.length < 2) return [];
  const db = getDatabase();
  return db
    .select({ userId: users.id, displayName: profiles.displayName, username: profiles.username, tid: users.tid })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(includeSelf ? undefined : ne(users.id, actor.userId), or(ilike(profiles.displayName, `%${term}%`), ilike(profiles.username, `%${term}%`), tid ? eq(users.tid, tid) : undefined)))
    .limit(8);
}

export async function startPersonalConversationAction(targetUserId: string) {
  const actor = await requireCurrentActor();
  if (targetUserId === actor.userId) throw new Error("Use your Sandbox to message yourself.");
  const db = getDatabase();
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!target) throw new Error("That person could not be found.");
  const directKey = [actor.userId, target.id].sort().join(":");
  const conversation = await db.transaction(async (tx) => {
    let [item] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.kind, "personal"), eq(conversations.directKey, directKey))).limit(1);
    if (!item) {
      [item] = await tx.insert(conversations).values({ kind: "personal", directKey }).onConflictDoNothing().returning({ id: conversations.id });
    }
    if (!item) {
      [item] = await tx.select({ id: conversations.id }).from(conversations).where(eq(conversations.directKey, directKey)).limit(1);
    }
    if (!item) throw new Error("Could not start this conversation.");
    await tx.insert(conversationParticipants).values([
      { conversationId: item.id, userId: actor.userId },
      { conversationId: item.id, userId: target.id },
    ]).onConflictDoNothing();
    return item;
  });
  revalidatePath("/app");
  await Promise.all([publishUserActivity(actor.userId), publishUserActivity(target.id)]);
  return { conversationId: conversation.id, slug: `chat-${conversation.id}` };
}
