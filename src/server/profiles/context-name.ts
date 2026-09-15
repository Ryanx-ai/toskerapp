import "server-only";
import { sql, type SQL } from "drizzle-orm";

/** Presentation only. Caller must authorize the conversation/object separately.
 * The extra current-viewer membership guard prevents a supplied Room context
 * exposing an override. No stored authorship or authored message text changes.
 */
export function contextualName(viewerId: string, roomId: SQL, targetId: SQL, canonical: SQL) {
  return sql<string>`coalesce(case when ${roomId} is not null then
    (select identity_member.nickname from room_memberships identity_member where identity_member.room_id = ${roomId}
      and identity_member.user_id = ${targetId} and exists(select 1 from room_memberships identity_viewer where identity_viewer.room_id = ${roomId} and identity_viewer.user_id = ${viewerId}))
    else (select identity_alias.nickname from connection_nicknames identity_alias join connections identity_connection on identity_connection.id = identity_alias.connection_id
      where identity_alias.user_id = ${viewerId} and identity_connection.status = 'accepted'
      and ((identity_connection.requester_id = ${viewerId} and identity_connection.addressee_id = ${targetId}) or (identity_connection.addressee_id = ${viewerId} and identity_connection.requester_id = ${targetId}))) end,
    nullif(${canonical}, ''), 'Tosker member')`;
}
export const conversationRoomId = (conversationId: string) => sql`(select identity_context.room_id from conversations identity_context where identity_context.id = ${conversationId})`;
