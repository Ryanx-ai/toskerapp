import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { profiles } from "@/server/db/schema";
import type { IdentityAccent } from "@/lib/profile-contract";

/** Correlated to the selected profile. Apply BEFORE serialization, never in JSX.
 * A Personal conversation alone deliberately grants no optional details/status.
 * These fields supplement, never replace, the caller's basic object authorization.
 */
function audienceAllows(viewerId: string, audience: SQL) {
  const accepted = sql`exists(select 1 from connections privacy_friend where privacy_friend.status = 'accepted'
    and ((privacy_friend.requester_id = ${viewerId} and privacy_friend.addressee_id = ${profiles.userId})
      or (privacy_friend.addressee_id = ${viewerId} and privacy_friend.requester_id = ${profiles.userId})))`;
  const shared = sql`exists(select 1 from room_memberships privacy_viewer join room_memberships privacy_target
    on privacy_target.room_id = privacy_viewer.room_id where privacy_viewer.user_id = ${viewerId} and privacy_target.user_id = ${profiles.userId})`;
  return sql`(${profiles.userId} = ${viewerId} or (${audience} in ('friends','shared_context') and ${accepted}) or (${audience} = 'shared_context' and ${shared}))`;
}
export function projectedProfileStatus(viewerId: string) {
  return sql<"online" | "idle" | "away" | "meeting" | null>`case when ${audienceAllows(viewerId, sql`${profiles.statusAudience}`)} then ${profiles.presenceStatus} else null end`;
}
export function projectedProfileDetails(viewerId: string) {
  const visible = audienceAllows(viewerId, sql`${profiles.detailsAudience}`);
  return {
    namecardBio: sql<string | null>`case when ${visible} then ${profiles.namecardBio} else null end`,
    identityAccent: sql<IdentityAccent>`case when ${visible} then ${profiles.identityAccent}::text else 'neutral' end`,
  };
}
