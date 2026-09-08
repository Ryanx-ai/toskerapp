"use server";

import { and, desc, eq, ilike, isNull, lt, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { conversationParticipants, conversationReads, conversations, messages, notifications, profiles, users } from "@/server/db/schema";
import { hallScope, lockHallScope } from "@/server/hall/service";
import { changeOwnMessage, setMessageReaction } from "./service";
import type { ReactionSummary } from "@/lib/reaction-contract";
import { publishMessageChanged, publishConversationActivity, publishUserActivity } from "@/server/realtime/provider";
import { acknowledgeChat, acknowledgeDestination } from "@/server/attention/service";

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
  const boundary = before
    ? or(
        lt(messages.createdAt, new Date(before.createdAt)),
        and(eq(messages.createdAt, new Date(before.createdAt)), lt(messages.id, before.id)),
      )
    : undefined;
  const rows = await db
    .select({ id: messages.id, author: profiles.displayName, authorId: messages.authorId, body: messages.body, createdAt: messages.createdAt,
      editedAt: messages.editedAt, deletedAt: messages.deletedAt, replyToId: messages.replyToId,
      replyTo: sql<string | null>`(select case when m.deleted_at is not null then 'Message deleted' else left(m.body, 240) end from messages m where m.id = ${messages.replyToId} and m.conversation_id = ${conversationId})`,
      reactionSummary: sql<ReactionSummary[]>`coalesce((select json_agg(r order by r.emoji) from (select emoji, count(*)::int as count, bool_or(mr.user_id = ${actor.userId}) as mine, array_agg(p.display_name order by p.display_name) as participants from message_reactions mr join profiles p on p.user_id = mr.user_id where message_id = ${messages.id} group by emoji) r), '[]'::json)`,
    })
    .from(messages)
    .innerJoin(profiles, eq(profiles.userId, messages.authorId))
    .where(boundary ? and(eq(messages.conversationId, conversationId), boundary) : eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(51);
  const page = rows.slice(0, 50).reverse();
  return {
    messages: page.map((message) => ({ ...message, body: message.deletedAt ? "Message deleted" : message.body, editedAt: message.editedAt?.toISOString() ?? null, deletedAt: message.deletedAt?.toISOString() ?? null, createdAt: message.createdAt.toISOString(), mine: message.authorId === actor.userId })) satisfies PersistentMessage[],
    nextCursor: rows.length > 50 && page[0] ? { createdAt: page[0].createdAt.toISOString(), id: page[0].id } : null,
  };
}

export async function sendMessageAction(input: { id: string; conversationId: string; body: string; replyToId?: string }) {
  const actor = await requireCurrentActor();
  const body = input.body.trim();
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Invalid message id.");
  if (!body || body.length > 8_000) throw new Error("Enter a message up to 8,000 characters.");
  const db = getDatabase();
  const created = await db.transaction(async (tx) => {
  await lockHallScope(tx, actor, input.conversationId);
  // A lost acknowledgement stays idempotent even if its source was later deleted.
  const [accepted] = await tx.select({ authorId: messages.authorId, conversationId: messages.conversationId, createdAt: messages.createdAt }).from(messages).where(eq(messages.id, input.id));
  if (accepted) {
    if (accepted.authorId !== actor.userId || accepted.conversationId !== input.conversationId) throw new Error("Message id unavailable.");
    return accepted;
  }
  if (input.replyToId) {
    const [reply] = await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.id, input.replyToId), eq(messages.conversationId, input.conversationId), isNull(messages.deletedAt))).for("share");
    if (!reply) throw new Error("Reply target unavailable in this conversation.");
  }
  const [created] = await tx
    .insert(messages)
    .values({ id: input.id, conversationId: input.conversationId, authorId: actor.userId, body, replyToId: input.replyToId })
    .onConflictDoNothing()
    .returning({ createdAt: messages.createdAt });
  if (created) {
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
      })));
    }
  } else {
    const [existing] = await tx.select({ authorId: messages.authorId, conversationId: messages.conversationId, createdAt: messages.createdAt })
      .from(messages).where(eq(messages.id, input.id)).limit(1);
    if (!existing || existing.authorId !== actor.userId || existing.conversationId !== input.conversationId) throw new Error("Message id unavailable.");
    return existing;
  }
  return created;
  });
  revalidatePath("/app");
  await Promise.all([publishMessageChanged(input.conversationId), publishConversationActivity(input.conversationId, "chat")]);
  return { id: input.id, createdAt: created?.createdAt.toISOString() ?? null };
}

export async function markConversationReadAction(conversationId: string, surface: "chat" | "hall" = "chat", throughMessageId?: string, activityIds: string[] = []) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  await hallScope(db, actor, conversationId);
  if (surface === "hall") {
    await acknowledgeDestination(db, actor, activityIds, conversationId);
    if (activityIds.length) await publishUserActivity(actor.userId);
    return;
  }
  if (surface === "chat") await db.insert(conversationReads)
    .values({ conversationId, userId: actor.userId, lastReadAt: new Date() })
    .onConflictDoUpdate({
      target: [conversationReads.conversationId, conversationReads.userId],
      set: { lastReadAt: new Date() },
    });
  if (!throughMessageId) return;
  await acknowledgeChat(db, actor, conversationId, throughMessageId);
  await publishUserActivity(actor.userId);
}

export async function setMessageReactionAction(input: { conversationId: string; messageId: string; emoji: string; active: boolean }) {
  await setMessageReaction(getDatabase(), await requireCurrentActor(), input);
  await publishMessageChanged(input.conversationId);
}

export async function changeOwnMessageAction(input: { conversationId: string; messageId: string; body?: string; remove?: boolean }) {
  await changeOwnMessage(getDatabase(), await requireCurrentActor(), input);
  await publishMessageChanged(input.conversationId);
}

export async function findPeopleAction(query: string, includeSelf = false) {
  const actor = await requireCurrentActor();
  const term = query.trim().replace(/^@/, "").slice(0, 80);
  if (term.length < 2) return [];
  const db = getDatabase();
  return db
    .select({ userId: users.id, displayName: profiles.displayName, username: profiles.username, tid: users.tid })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(includeSelf ? undefined : ne(users.id, actor.userId), or(ilike(profiles.displayName, `%${term}%`), ilike(profiles.username, `%${term}%`), ilike(users.tid, `%${term}%`))))
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
