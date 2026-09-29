import "server-only";
import { and, asc, desc, eq, inArray, isNull, isNotNull, or, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { messages, profiles } from "@/server/db/schema";
import { hallScope } from "@/server/hall/service";
import { isConversationId } from "@/lib/realtime-contract";
import type { ReactionSummary } from "@/lib/reaction-contract";
import type { MentionSpan } from "@/lib/mentions";
import { contextualName, conversationRoomId } from "@/server/profiles/context-name";

export type HistoryOptions = { before?: string; after?: string; target?: string; ids?: string[]; checkIds?: string[] };
export class InvalidHistoryRequest extends Error {}
export async function readMessageHistory(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, options: HistoryOptions = {}) {
  const started = performance.now();
  const modes = [options.before, options.after, options.target, options.ids].filter((value) => value !== undefined);
  if (!isConversationId(conversationId) || modes.length > 1 || modes.some((value) => typeof value === "string" && !isConversationId(value)) || (options.ids && (!options.ids.length || options.ids.length > 200 || options.ids.some((id) => !isConversationId(id))))) throw new InvalidHistoryRequest("Invalid history request.");
  await hallScope(db, actor, conversationId);
  if (options.checkIds && (options.checkIds.length > 202 || options.checkIds.some((id) => !isConversationId(id)))) throw new InvalidHistoryRequest("Invalid removal check.");
  const authorized = performance.now();
  const roomId = conversationRoomId(conversationId);
  const relatedName = contextualName(actor.userId,roomId,sql`p.user_id`,sql`p.display_name`);
  // Cursor timestamps come from this conversation, never a forged client tuple.
  const boundary = options.before ? sql`(${messages.createdAt}, ${messages.id}) < (select created_at, id from messages where id = ${options.before} and conversation_id = ${conversationId})`
    : options.after ? sql`(${messages.createdAt}, ${messages.id}) > (select created_at, id from messages where id = ${options.after} and conversation_id = ${conversationId})`
    : options.target ? sql`${messages.id} in (
        (select id from messages where conversation_id = ${conversationId} and deleted_at is null
          and (created_at,id) <= (select created_at,id from messages where id = ${options.target} and conversation_id = ${conversationId} and deleted_at is null)
          order by created_at desc,id desc limit 26)
        union all
        (select id from messages where conversation_id = ${conversationId} and deleted_at is null
          and (created_at,id) > (select created_at,id from messages where id = ${options.target} and conversation_id = ${conversationId} and deleted_at is null)
          order by created_at,id limit 25)
      )`
    : options.ids ? inArray(messages.id, options.ids) : undefined;
  const ascending = Boolean(options.after || options.ids || options.target);
  const checked = [...new Set([...(options.checkIds ?? []), ...(options.ids ?? []), ...(options.target ? [options.target] : [])])];
  const [rows, newest, removed] = await Promise.all([
    db.select({ id: messages.id, author: contextualName(actor.userId,roomId,sql`${profiles.userId}`,sql`${profiles.displayName}`), authorId: messages.authorId, avatarUrl: profiles.avatarUrl, body: messages.body, createdAt: messages.createdAt,
      editedAt: messages.editedAt, deletedAt: messages.deletedAt, replyToId: messages.replyToId,
      replyTo: sql<string | null>`(select left(m.body, 240) from messages m where m.id = ${messages.replyToId} and m.conversation_id = ${conversationId} and m.deleted_at is null)`,
      replyAuthor: sql<string | null>`(select ${relatedName} from messages m join profiles p on p.user_id = m.author_id where m.id = ${messages.replyToId} and m.conversation_id = ${conversationId} and m.deleted_at is null)`,
      mentions: sql<MentionSpan[]>`coalesce((select json_agg(json_build_object('userId', mm.user_id, 'start', mm.start, 'length', mm.length, 'label', mm.label) order by mm.start) from message_mentions mm where mm.message_id = ${messages.id}), '[]'::json)`,
      reactionSummary: sql<ReactionSummary[]>`coalesce((select json_agg(r order by r.emoji) from (select emoji, count(*)::int as count, bool_or(mr.user_id = ${actor.userId}) as mine, array_agg(${relatedName} order by ${relatedName}) as participants from message_reactions mr join profiles p on p.user_id = mr.user_id where message_id = ${messages.id} group by emoji) r), '[]'::json)`,
    }).from(messages).innerJoin(profiles, eq(profiles.userId, messages.authorId))
      .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt), boundary))
      .orderBy(ascending ? asc(messages.createdAt) : desc(messages.createdAt), ascending ? asc(messages.id) : desc(messages.id)).limit(options.ids ? 200 : 51),
    db.select({ id: messages.id, createdAt: messages.createdAt }).from(messages).where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt))).orderBy(desc(messages.createdAt), desc(messages.id)).limit(1),
    checked.length ? db.select({ id: messages.id }).from(messages).where(and(eq(messages.conversationId, conversationId), isNotNull(messages.deletedAt), or(inArray(messages.id, checked), inArray(messages.id, db.select({ id: messages.replyToId }).from(messages).where(and(eq(messages.conversationId, conversationId), inArray(messages.id, checked))))))) : Promise.resolve([]),
  ]);
  // A target is an authorized context window, never a query-filtered transcript.
  // Keep <=50 rows and one extra older row as evidence for the older cursor.
  const targetHasOlder = Boolean(options.target && rows.findIndex(row => row.id === options.target) === 25);
  const page = options.target ? (targetHasOlder ? rows.slice(1) : rows).slice(0,50) : options.ids ? rows : rows.slice(0, 50);
  if (!ascending) page.reverse();
  const cursor = (message: { id: string; createdAt: Date }) => ({ id: message.id, createdAt: message.createdAt.toISOString() });
  return {
    messages: page.map((message) => ({ ...message, replyToId: message.replyTo ? message.replyToId : null, editedAt: message.editedAt?.toISOString() ?? null, deletedAt: null, createdAt: message.createdAt.toISOString(), mine: message.authorId === actor.userId })),
    removedIds: removed.map((row) => row.id),
    nextCursor: !options.ids && (options.target ? targetHasOlder : rows.length > 50) && page.length ? cursor(options.after ? page.at(-1)! : page[0]) : null,
    latest: newest[0] ? cursor(newest[0]) : null,
    timing: { authorizationMs: authorized - started, queryMs: performance.now() - authorized, totalMs: performance.now() - started },
  };
}
export type HistoryPage = Awaited<ReturnType<typeof readMessageHistory>>;
