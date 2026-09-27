import "server-only";
import { sql } from "drizzle-orm";
import type { ToskerDatabase } from "@/server/db/client";
import type { AuthenticatedActor } from "@/server/auth/actor";

export class UsernameError extends Error {}

/** Reuse the existing bounded actor/operation counter, isolated from invitation quotas.
 * Commits before the profile transaction, so collision/invalid attempts consume quota too. */
export async function limitUsernameEdits(db: Pick<ToskerDatabase, "execute">, actor: AuthenticatedActor) {
  const result = await db.execute(sql`insert into invite_rate_limits (user_id, operation, window_start, attempts)
    values (${actor.userId}, 'profile_username', clock_timestamp(), 1)
    on conflict (user_id, operation) do update set
      attempts = case when invite_rate_limits.window_start <= clock_timestamp() - interval '10 minutes' then 1 else invite_rate_limits.attempts + 1 end,
      window_start = case when invite_rate_limits.window_start <= clock_timestamp() - interval '10 minutes' then clock_timestamp() else invite_rate_limits.window_start end
    where invite_rate_limits.window_start <= clock_timestamp() - interval '10 minutes' or invite_rate_limits.attempts < 10
    returning attempts`);
  if (!result.rows.length) throw new UsernameError("Too many username attempts. Try again in 10 minutes.");
}

export function isUsernameCollision(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; constraint?: string; cause?: unknown };
  return (value.code === "23505" && value.constraint === "profiles_username_unique") || Boolean(value.cause && isUsernameCollision(value.cause));
}
