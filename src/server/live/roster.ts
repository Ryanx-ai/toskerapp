import "server-only";
import { sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { authorizedContext } from "@/server/map-pins/scope";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { contextualName } from "@/server/profiles/context-name";
import { approvedAvatarUrl } from "@/lib/identity-visual";
import { validLiveRosterRequest, type LiveParticipant } from "@/lib/live-contract";

/** Presence supplies only candidate IDs. Both viewer and each candidate must still
 * be authorized for this exact context; optional profile fields never leave here. */
export async function liveRoster(db: ToskerDatabase, actor: AuthenticatedActor, input: unknown): Promise<LiveParticipant[]> {
  if (!validLiveRosterRequest(input)) throw new TypeError("Invalid roster request.");
  const ids = [...new Set(input.userIds)];
  // One statement snapshot authorizes viewer AND candidates. The left join keeps
  // an authorized empty roster distinguishable from an unauthorized context.
  // Unlike token issuance this read grants no future access and needs no lease.
  const rows = await db.execute(sql`select p.user_id,
      ${contextualName(actor.userId, sql`c.room_id`, sql`p.user_id`, sql`p.display_name`)} as display_name,
      p.avatar_url
    from conversations c left join profiles p on
      ${ids.length ? sql`p.user_id in (${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)})` : sql`false`}
      and ${authorizedContext(sql`p.user_id`)}
    where c.id=${input.conversationId}::uuid and ${authorizedContext(sql`${actor.userId}::uuid`)}
    order by p.user_id`);
  if (!rows.rows.length) throw new AuthorizationDeniedError();
  return rows.rows.filter(row => row.user_id).map(row => ({ userId: String(row.user_id), displayName: String(row.display_name), avatarUrl: approvedAvatarUrl(typeof row.avatar_url === "string" ? row.avatar_url : null) }));
}
