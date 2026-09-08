import "server-only";
import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { messages, profiles } from "@/server/db/schema";
import { hallScope } from "@/server/hall/service";
import { isConversationId } from "@/lib/realtime-contract";

export class InvalidSearchRequest extends Error {}
export async function searchConversation(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, query: string, before?: string) {
  const term = typeof query === "string" ? query.trim() : "";
  if (!isConversationId(conversationId) || term.length < 2 || term.length > 120 || (before !== undefined && !isConversationId(before))) throw new InvalidSearchRequest();
  await hallScope(db, actor, conversationId);
  // Bound to this conversation; literal substring, not user-supplied SQL/LIKE syntax.
  const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await db.select({ id: messages.id, author: profiles.displayName, authorId: messages.authorId, createdAt: messages.createdAt,
    excerpt: sql<string>`substring(${messages.body} from greatest(1, strpos(lower(${messages.body}), lower(${term})) - 80) for 400)`,
  }).from(messages).innerJoin(profiles, eq(profiles.userId, messages.authorId))
    .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt), ilike(messages.body, pattern),
      before ? sql`(${messages.createdAt}, ${messages.id}) < (select created_at, id from messages where id = ${before} and conversation_id = ${conversationId})` : undefined))
    .orderBy(desc(messages.createdAt), desc(messages.id)).limit(21);
  const results = rows.slice(0, 20).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  return { results, nextCursor: rows.length > 20 ? results.at(-1)!.id : null };
}
export type ConversationSearchPage = Awaited<ReturnType<typeof searchConversation>>;
