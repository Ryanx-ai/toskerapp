import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerReader } from "@/server/db/client";
import { profiles, rooms, users } from "@/server/db/schema";

/** Deliberate-open projection, not a public profile lookup or a directory. */
export async function readNamecard(db: ToskerReader, actor: AuthenticatedActor, targetId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) throw new AuthorizationDeniedError("Namecard unavailable.");
  const sharedRoom = sql`exists (select 1 from room_memberships viewer join room_memberships person on person.room_id = viewer.room_id where viewer.user_id = ${actor.userId} and person.user_id = ${targetId})`;
  const pair = [actor.userId, targetId].sort().join(":");
  const accepted = sql`exists (select 1 from connections c where c.pair_key = ${pair} and c.status = 'accepted')`;
  const personal = sql`exists (select 1 from conversations c join conversation_participants viewer on viewer.conversation_id = c.id join conversation_participants person on person.conversation_id = c.id where c.kind = 'personal' and viewer.user_id = ${actor.userId} and person.user_id = ${targetId})`;
  const [person] = await db.select({
    userId: users.id, displayName: profiles.displayName, username: profiles.username,
    tid: users.tid, avatarUrl: profiles.avatarUrl, presenceStatus: profiles.presenceStatus,
    connectionId: sql<string | null>`(select id from connections where pair_key = ${pair} and status = 'accepted')`,
    nickname: sql<string | null>`(select n.nickname from connection_nicknames n join connections c on c.id = n.connection_id where c.pair_key = ${pair} and c.status = 'accepted' and n.user_id = ${actor.userId})`,
    conversationId: sql<string | null>`(select c.id from conversations c join conversation_participants v on v.conversation_id = c.id join conversation_participants p on p.conversation_id = c.id where c.kind = 'personal' and v.user_id = ${actor.userId} and p.user_id = ${targetId} limit 1)`,
  }).from(users).innerJoin(profiles, eq(profiles.userId, users.id)).where(and(eq(users.id, targetId), sql`(${actor.userId} = ${targetId} or ${accepted} or ${personal} or ${sharedRoom})`)).limit(1);
  if (!person) throw new AuthorizationDeniedError("Namecard unavailable.");
  // Authorization is in the query, before ordering, limiting or exposing a count.
  const overlap = await db.select({ id: rooms.id, name: rooms.name, slug: rooms.slug }).from(rooms)
    .where(sql`exists (select 1 from room_memberships v join room_memberships p on p.room_id = v.room_id where v.room_id = ${rooms.id} and v.user_id = ${actor.userId} and p.user_id = ${targetId})`)
    .orderBy(asc(rooms.name), asc(rooms.id)).limit(21);
  return { ...person, self: actor.userId === targetId, commonRooms: overlap.slice(0, 20), moreCommonRooms: overlap.length > 20 };
}

export type Namecard = Awaited<ReturnType<typeof readNamecard>>;
