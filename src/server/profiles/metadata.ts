import "server-only";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { roomMemberships } from "@/server/db/schema";
import { getDatabase } from "@/server/db/client";
import { getRealtimeServer } from "@/server/realtime/provider";
import { PROFILE_CHANGED, userChannel } from "@/lib/realtime-contract";

/** Content-free, best effort after commit. No activity/notification/message rows.
 * Bound work to 500 related recipients in batches of ten; normal canonical
 * reconciliation covers missed signals. No user/profile data in the payload.
 */
export async function publishProfileMetadata(userId: string) {
  if (!process.env.ABLY_API_KEY) return;
  try {
    const result = await getDatabase().execute<{ user_id: string }>(sql`
      select related.user_id from (
        select ${userId}::uuid as user_id
        union select case when requester_id = ${userId} then addressee_id else requester_id end
          from connections where status = 'accepted' and (requester_id = ${userId} or addressee_id = ${userId})
        union select peer.user_id from room_memberships own join room_memberships peer on peer.room_id = own.room_id where own.user_id = ${userId}
        union select peer.user_id from conversation_participants own join conversations c on c.id = own.conversation_id
          join conversation_participants peer on peer.conversation_id = c.id where c.kind = 'personal' and own.user_id = ${userId}
      ) related order by (related.user_id = ${userId}) desc, related.user_id limit 500`);
    for (let i=0;i<result.rows.length;i+=10) await Promise.all(result.rows.slice(i,i+10).map(row =>
      getRealtimeServer().channels.get(userChannel(row.user_id)).publish({ id: randomUUID(), name: PROFILE_CHANGED, data: { version: 1 } })));
  } catch { console.warn("[realtime] Profile signal unavailable; canonical reconciliation retained."); }
}

/** Same content-free primitive, limited to current members of the changed Room. */
export async function publishRoomIdentityMetadata(roomId: string) {
  if (!process.env.ABLY_API_KEY) return;
  try {
    const members = await getDatabase().select({userId:roomMemberships.userId}).from(roomMemberships).where(eq(roomMemberships.roomId,roomId)).limit(500);
    for(let i=0;i<members.length;i+=10) await Promise.all(members.slice(i,i+10).map(member => getRealtimeServer().channels.get(userChannel(member.userId))
      .publish({id:randomUUID(),name:PROFILE_CHANGED,data:{version:1}})));
  } catch { console.warn("[realtime] Room identity signal unavailable; canonical reconciliation retained."); }
}

/** Private preference invalidation never goes to peers. */
export async function publishOwnSettingsMetadata(userId: string) {
  if (!process.env.ABLY_API_KEY) return;
  try { await getRealtimeServer().channels.get(userChannel(userId)).publish({id:randomUUID(),name:PROFILE_CHANGED,data:{version:1}}); }
  catch { console.warn("[realtime] Settings signal unavailable; canonical reconciliation retained."); }
}
