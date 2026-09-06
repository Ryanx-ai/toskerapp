import "server-only";

import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError, requireConversationParticipant, requireRoomMember } from "@/server/auth/authorize";
import type { ToskerDatabase } from "@/server/db/client";
import { conversations, hallComments, hallItems, hallReactions, profiles, subroomAccess, subrooms } from "@/server/db/schema";
import { HALL_REACTIONS, type HallReaction } from "@/lib/hall-contract";

export async function hallScope(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string) {
  await requireConversationParticipant(db, actor, conversationId);
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation) throw new AuthorizationDeniedError("Conversation not found.");
  const membership = conversation.roomId ? await requireRoomMember(db, actor, conversation.roomId) : null;
  if (conversation.subroomId) {
    const [access] = await db.select({ id: subrooms.id }).from(subrooms)
      .leftJoin(subroomAccess, and(eq(subroomAccess.subroomId, subrooms.id), eq(subroomAccess.userId, actor.userId)))
      .where(and(eq(subrooms.id, conversation.subroomId), or(eq(subrooms.visibility, "everyone"), eq(subroomAccess.userId, actor.userId), membership?.role === "owner" ? eq(subrooms.visibility, "owners") : undefined))).limit(1);
    if (!access) throw new AuthorizationDeniedError("Subroom access is required.");
  }
  // Legacy Room-only notes belong to the primary Room Hall, never a Subroom.
  return conversation.roomId && !conversation.subroomId
    ? or(eq(hallItems.conversationId, conversationId), and(isNull(hallItems.conversationId), eq(hallItems.roomId, conversation.roomId)))!
    : eq(hallItems.conversationId, conversationId);
}

export async function requireHallNote(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, itemId: string) {
  const scope = await hallScope(db, actor, conversationId);
  const [item] = await db.select({ id: hallItems.id }).from(hallItems)
    .where(and(scope, eq(hallItems.id, itemId), eq(hallItems.kind, "note"), isNull(hallItems.archivedAt))).limit(1);
  if (!item) throw new AuthorizationDeniedError("Note not found in this Hall.");
  return item;
}

export async function listHallComments(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, itemId: string, before?: string) {
  await requireHallNote(db, actor, conversationId, itemId);
  const rows = await db.select({ id: hallComments.id, body: hallComments.body, createdAt: hallComments.createdAt, author: profiles.displayName, authorId: hallComments.authorId })
    .from(hallComments).innerJoin(profiles, eq(profiles.userId, hallComments.authorId))
    .where(and(eq(hallComments.itemId, itemId), before ? sql`(${hallComments.createdAt}, ${hallComments.id}) < (select created_at, id from hall_comments where id = ${before} and item_id = ${itemId})` : undefined))
    .orderBy(sql`${hallComments.createdAt} desc`, sql`${hallComments.id} desc`).limit(31);
  const hasMore = rows.length > 30;
  return { hasMore, comments: rows.slice(0, 30).reverse().map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) };
}

export async function addHallComment(db: ToskerDatabase, actor: AuthenticatedActor, input: { conversationId: string; itemId: string; body: string; id: string }) {
  await requireHallNote(db, actor, input.conversationId, input.itemId);
  const body = input.body.trim();
  if (!body || body.length > 1000 || !/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Enter a comment up to 1,000 characters.");
  // The client-generated ID makes retries safe; author always comes from auth.
  await db.insert(hallComments).values({ id: input.id, itemId: input.itemId, authorId: actor.userId, body }).onConflictDoNothing();
}

export async function setHallReaction(db: ToskerDatabase, actor: AuthenticatedActor, input: { conversationId: string; itemId: string; reaction: HallReaction; active: boolean }) {
  await requireHallNote(db, actor, input.conversationId, input.itemId);
  if (!HALL_REACTIONS.some((entry) => entry.key === input.reaction) || typeof input.active !== "boolean") throw new Error("Unsupported reaction.");
  if (input.active) await db.insert(hallReactions).values({ itemId: input.itemId, userId: actor.userId, reaction: input.reaction }).onConflictDoNothing();
  else await db.delete(hallReactions).where(and(eq(hallReactions.itemId, input.itemId), eq(hallReactions.userId, actor.userId), eq(hallReactions.reaction, input.reaction)));
}

export async function moveHallItem(db: ToskerDatabase, actor: AuthenticatedActor, input: { conversationId: string; itemId: string; targetId?: string; direction?: "left" | "right" }) {
  const scope = await hallScope(db, actor, input.conversationId);
  await db.transaction(async (tx) => {
    // Serialize reorder operations per board. Normalize ties from older records.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.conversationId}))`);
    const items = await tx.select({ id: hallItems.id }).from(hallItems).where(and(scope, isNull(hallItems.archivedAt)))
      .orderBy(asc(hallItems.position), asc(hallItems.createdAt), asc(hallItems.id));
    const from = items.findIndex((item) => item.id === input.itemId);
    const to = input.targetId ? items.findIndex((item) => item.id === input.targetId) : from + (input.direction === "left" ? -1 : 1);
    if (from < 0 || (input.targetId && to < 0)) throw new AuthorizationDeniedError("Item not found in this Hall.");
    if (to < 0 || to >= items.length || from === to) return;
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    const positions = sql.join(items.map((item, position) => sql`when ${item.id}::uuid then ${position}::integer`), sql` `);
    await tx.update(hallItems).set({ position: sql`case ${hallItems.id} ${positions} else ${hallItems.position} end`, updatedAt: new Date() }).where(and(scope, isNull(hallItems.archivedAt)));
  });
}
