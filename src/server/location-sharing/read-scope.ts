import "server-only";
import { sql } from "drizzle-orm";
import type { ToskerTransaction } from "@/server/db/client";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { authorizedContext } from "@/server/map-pins/scope";

/** The local worker admits only its exact two isolated users. Lock both, in the
 * same sorted order as relationship withdrawal, before taking context locks.
 * No source discovered after this point can bypass the actor/session fence. */
export async function lockLocalLocationActors(tx: ToskerTransaction, userIds: string[]) {
  await tx.execute(sql`select pg_advisory_xact_lock_shared(hashtextextended('tosker-token:' || actors.id, 0))
    from (select unnest(array[${sql.join([...new Set(userIds)].sort().map(id => sql`${id}`), sql`, `)}]::text[]) id order by id offset 0) actors`);
}

/** Same parent→child→conversation lock order as Map authorization, without
 * resolving a slug and fetching the same context again for every source.
 * Caller holds ALL admitted actor locks. Authorize in a subsequent statement:
 * a statement's pre-lock MVCC snapshot must never authorize a post-revoke read. */
export async function lockLocationReadContext(tx: ToskerTransaction, actor: AuthenticatedActor, id: string) {
  // Dependencies enforce parent -> child -> conversation, in one round trip.
  // These CTEs ONLY lock; authorization below uses a fresh statement snapshot.
  const locked = await tx.execute(sql`with parent as materialized (
      select r.id from rooms r where r.id=(select c.room_id from conversations c where c.id=${id}::uuid) for share of r
    ), child as materialized (
      select s.id from subrooms s join parent p on p.id=s.room_id
      where s.id=(select c.subroom_id from conversations c where c.id=${id}::uuid) for share of s
    ) select c.id from conversations c where c.id=${id}::uuid and c.kind in ('room','personal')
      and (c.room_id is null or c.room_id in (select id from parent))
      and (c.subroom_id is null or c.subroom_id in (select id from child)) for share of c`);
  if (locked.rows.length !== 1) throw new AuthorizationDeniedError();
  const permitted = await tx.execute(sql`select c.id from conversations c where c.id=${id}::uuid and ${authorizedContext(sql`${actor.userId}::uuid`)}`);
  if (permitted.rows.length !== 1) throw new AuthorizationDeniedError();
}
