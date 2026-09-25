import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerReader } from "@/server/db/client";
import { connections, profiles, rooms, users } from "@/server/db/schema";
import { projectedProfileDetails, projectedProfileStatus } from "./projection";
import { isConversationId } from "@/lib/realtime-contract";

/** Deliberate-open projection, not a public profile lookup or a directory. */
export async function readNamecard(db: ToskerReader, actor: AuthenticatedActor, targetId: string, roomId?: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) throw new AuthorizationDeniedError("Namecard unavailable.");
  let roomContext: {id:string;name:string} | null = null;
  if(roomId !== undefined) {
    if(!isConversationId(roomId)) throw new AuthorizationDeniedError("Room context unavailable.");
    [roomContext] = await db.select({id:rooms.id,name:rooms.name}).from(rooms).where(and(eq(rooms.id,roomId),sql`exists(select 1 from room_memberships context_viewer where context_viewer.room_id = ${rooms.id} and context_viewer.user_id = ${actor.userId})`)).limit(1);
    if(!roomContext) throw new AuthorizationDeniedError("Room context unavailable.");
  }
  const sharedRoom = sql`exists (select 1 from room_memberships viewer join room_memberships person on person.room_id = viewer.room_id where viewer.user_id = ${actor.userId} and person.user_id = ${targetId})`;
  const pair = [actor.userId, targetId].sort().join(":");
  const accepted = sql`exists (select 1 from connections c where c.pair_key = ${pair} and c.status = 'accepted')`;
  const personal = sql`exists (select 1 from conversations c join conversation_participants viewer on viewer.conversation_id = c.id join conversation_participants person on person.conversation_id = c.id where c.kind = 'personal' and viewer.user_id = ${actor.userId} and person.user_id = ${targetId})`;
  const [person] = await db.select({
    userId: users.id, displayName: profiles.displayName, username: profiles.username,
    tid: users.tid, avatarUrl: profiles.avatarUrl, presenceStatus: projectedProfileStatus(actor.userId), ...projectedProfileDetails(actor.userId),
    roomNickname: sql<string | null>`(select nickname from room_memberships contextual_member where contextual_member.room_id = ${roomContext?.id ?? null} and contextual_member.user_id = ${targetId})`,
    connectionId: sql<string | null>`(select id from connections where pair_key = ${pair} and status = 'accepted')`,
    nickname: sql<string | null>`(select n.nickname from connection_nicknames n join connections c on c.id = n.connection_id where c.pair_key = ${pair} and c.status = 'accepted' and n.user_id = ${actor.userId})`,
    conversationId: sql<string | null>`(select c.id from conversations c join conversation_participants v on v.conversation_id = c.id join conversation_participants p on p.conversation_id = c.id where c.kind = 'personal' and v.user_id = ${actor.userId} and p.user_id = ${targetId} limit 1)`,
  }).from(users).innerJoin(profiles, eq(profiles.userId, users.id)).where(and(eq(users.id, targetId), sql`(${actor.userId} = ${targetId} or ${accepted} or ${personal} or ${sharedRoom})`)).limit(1);
  if (!person) throw new AuthorizationDeniedError("Namecard unavailable.");
  // Authorization is in the query, before ordering, limiting or exposing a count.
  const overlap = await db.select({ id: rooms.id, name: rooms.name, slug: rooms.slug }).from(rooms)
    .where(sql`exists (select 1 from room_memberships v join room_memberships p on p.room_id = v.room_id where v.room_id = ${rooms.id} and v.user_id = ${actor.userId} and p.user_id = ${targetId})`)
    .orderBy(asc(rooms.name), asc(rooms.id)).limit(21);
  const [relationship] = await db.select({id: connections.id, status: connections.status, incoming: sql<boolean>`${connections.addresseeId} = ${actor.userId}`}).from(connections).where(eq(connections.pairKey, pair)).limit(1);
  return { ...person, relationship: relationship ?? null, roomContext, self: actor.userId === targetId, commonRooms: overlap.slice(0, 20), moreCommonRooms: overlap.length > 20 };
}

export type Namecard = Awaited<ReturnType<typeof readNamecard>>;
