import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { messages, profiles } from "@/server/db/schema";
import { hallScope } from "@/server/hall/service";
import { isConversationId } from "@/lib/realtime-contract";
import type { ReactionSummary } from "@/lib/reaction-contract";

export type HistoryOptions = { before?: string; after?: string; target?: string; ids?: string[] };
export class InvalidHistoryRequest extends Error {}
export async function readMessageHistory(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, options: HistoryOptions = {}) {
  const started = performance.now();
  const modes = [options.before, options.after, options.target, options.ids].filter((value) => value !== undefined);
  if (!isConversationId(conversationId) || modes.length > 1 || modes.some((value) => typeof value === "string" && !isConversationId(value)) || (options.ids && (!options.ids.length || options.ids.length > 200 || options.ids.some((id) => !isConversationId(id))))) throw new InvalidHistoryRequest("Invalid history request.");
  await hallScope(db, actor, conversationId);
  const authorized = performance.now();
  // Cursor timestamps come from this conversation, never a forged client tuple.
  const boundary = options.before ? sql`(${messages.createdAt}, ${messages.id}) < (select created_at, id from messages where id = ${options.before} and conversation_id = ${conversationId})`
    : options.after ? sql`(${messages.createdAt}, ${messages.id}) > (select created_at, id from messages where id = ${options.after} and conversation_id = ${conversationId})`
    : options.target ? sql`(${messages.createdAt}, ${messages.id}) <= (select created_at, id from messages where id = ${options.target} and conversation_id = ${conversationId})`
    : options.ids ? inArray(messages.id, options.ids) : undefined;
  const ascending = Boolean(options.after || options.ids);
  const [rows, newest] = await Promise.all([
    db.select({ id: messages.id, author: profiles.displayName, authorId: messages.authorId, body: messages.body, createdAt: messages.createdAt,
      editedAt: messages.editedAt, deletedAt: messages.deletedAt, replyToId: messages.replyToId,
      replyTo: sql<string | null>`(select case when m.deleted_at is not null then 'Message deleted' else left(m.body, 240) end from messages m where m.id = ${messages.replyToId} and m.conversation_id = ${conversationId})`,
      reactionSummary: sql<ReactionSummary[]>`coalesce((select json_agg(r order by r.emoji) from (select emoji, count(*)::int as count, bool_or(mr.user_id = ${actor.userId}) as mine, array_agg(p.display_name order by p.display_name) as participants from message_reactions mr join profiles p on p.user_id = mr.user_id where message_id = ${messages.id} group by emoji) r), '[]'::json)`,
    }).from(messages).innerJoin(profiles, eq(profiles.userId, messages.authorId))
      .where(and(eq(messages.conversationId, conversationId), boundary))
      .orderBy(ascending ? asc(messages.createdAt) : desc(messages.createdAt), ascending ? asc(messages.id) : desc(messages.id)).limit(options.ids ? 200 : 51),
    db.select({ id: messages.id, createdAt: messages.createdAt }).from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.createdAt), desc(messages.id)).limit(1),
  ]);
  const page = options.ids ? rows : rows.slice(0, 50);
  if (!ascending) page.reverse();
  const cursor = (message: { id: string; createdAt: Date }) => ({ id: message.id, createdAt: message.createdAt.toISOString() });
  return {
    messages: page.map((message) => ({ ...message, body: message.deletedAt ? "Message deleted" : message.body, editedAt: message.editedAt?.toISOString() ?? null, deletedAt: message.deletedAt?.toISOString() ?? null, createdAt: message.createdAt.toISOString(), mine: message.authorId === actor.userId })),
    nextCursor: !options.ids && rows.length > 50 && page.length ? cursor(options.after ? page.at(-1)! : page[0]) : null,
    latest: newest[0] ? cursor(newest[0]) : null,
    timing: { authorizationMs: authorized - started, queryMs: performance.now() - authorized, totalMs: performance.now() - started },
  };
}
export type HistoryPage = Awaited<ReturnType<typeof readMessageHistory>>;
