"use server";

import { and, desc, eq, ilike, lt, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireConversationParticipant } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { conversationParticipants, conversations, messages, profiles, users } from "@/server/db/schema";

export type PersistentMessage = {
  id: string;
  author: string;
  authorId: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

export async function listMessagesAction(
  conversationId: string,
  before?: { createdAt: string; id: string },
) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  await requireConversationParticipant(db, actor, conversationId);
  const boundary = before
    ? or(
        lt(messages.createdAt, new Date(before.createdAt)),
        and(eq(messages.createdAt, new Date(before.createdAt)), lt(messages.id, before.id)),
      )
    : undefined;
  const rows = await db
    .select({ id: messages.id, author: profiles.displayName, authorId: messages.authorId, body: messages.body, createdAt: messages.createdAt })
    .from(messages)
    .innerJoin(profiles, eq(profiles.userId, messages.authorId))
    .where(boundary ? and(eq(messages.conversationId, conversationId), boundary) : eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(51);
  const page = rows.slice(0, 50).reverse();
  return {
    messages: page.map((message) => ({ ...message, createdAt: message.createdAt.toISOString(), mine: message.authorId === actor.userId })) satisfies PersistentMessage[],
    nextCursor: rows.length > 50 && page[0] ? { createdAt: page[0].createdAt.toISOString(), id: page[0].id } : null,
  };
}

export async function sendMessageAction(input: { id: string; conversationId: string; body: string }) {
  const actor = await requireCurrentActor();
  const body = input.body.trim();
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Invalid message id.");
  if (!body || body.length > 8_000) throw new Error("Enter a message up to 8,000 characters.");
  const db = getDatabase();
  await requireConversationParticipant(db, actor, input.conversationId);
  const [created] = await db
    .insert(messages)
    .values({ id: input.id, conversationId: input.conversationId, authorId: actor.userId, body })
    .onConflictDoNothing()
    .returning({ createdAt: messages.createdAt });
  revalidatePath("/");
  return { id: input.id, createdAt: created?.createdAt.toISOString() ?? null };
}

export async function findPeopleAction(query: string) {
  const actor = await requireCurrentActor();
  const term = query.trim().replace(/^@/, "").slice(0, 80);
  if (term.length < 2) return [];
  const db = getDatabase();
  return db
    .select({ userId: users.id, displayName: profiles.displayName, username: profiles.username, tid: users.tid })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(ne(users.id, actor.userId), or(ilike(profiles.displayName, `%${term}%`), ilike(profiles.username, `%${term}%`), ilike(users.tid, `%${term}%`))))
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
  revalidatePath("/");
  return { conversationId: conversation.id, slug: `chat-${conversation.id}` };
}
