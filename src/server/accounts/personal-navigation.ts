import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { ToskerReader } from "@/server/db/client";
import { conversationParticipants, conversations, profiles, users } from "@/server/db/schema";
import { projectedProfileStatus } from "@/server/profiles/projection";

export async function readPersonalNavigation(db: ToskerReader, viewerId: string) {
  const rows = await db.select({
    conversationId: conversations.id, displayName: profiles.displayName, username: profiles.username, tid: users.tid,
    presenceStatus: projectedProfileStatus(viewerId), userId: users.id, avatarUrl: profiles.avatarUrl,
    nickname: sql<string | null>`(select n.nickname from connection_nicknames n join connections c on c.id = n.connection_id
      where c.status = 'accepted' and n.user_id = ${viewerId} and ((c.requester_id = ${viewerId} and c.addressee_id = ${users.id}) or (c.addressee_id = ${viewerId} and c.requester_id = ${users.id})) limit 1)`,
  }).from(conversations).innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, conversations.id))
    .innerJoin(users, eq(users.id, conversationParticipants.userId)).innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(conversations.kind, "personal"), sql`${conversationParticipants.userId} <> ${viewerId}`,
      sql`exists(select 1 from conversation_participants personal_viewer where personal_viewer.conversation_id = ${conversations.id} and personal_viewer.user_id = ${viewerId})`));
  return rows.map(row => ({ ...row, slug: `chat-${row.conversationId}` }));
}
