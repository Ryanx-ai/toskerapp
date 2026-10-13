import "server-only";
import { randomUUID } from "node:crypto";
import { QueueClient } from "@vercel/queue";
import { sql } from "drizzle-orm";
import type { ToskerDatabase, ToskerTransaction } from "../db/client";
import { assertCleanupAdmission, CLEANUP_RETENTION_SECONDS, CleanupPolicyError, expiryPublication } from "./cleanup-policy";
import { LOCATION_CLEANUP_TOPIC } from "./cleanup-consumer";

export type CleanupReservation = { id: string; nonce: string; createdAt: Date; expiresAt: Date; reservedToday: number };
export type CleanupPublisher = (message: unknown, options: { retentionSeconds: number; delaySeconds?: number; idempotencyKey: string }) => Promise<unknown>;
const queue = new QueueClient({ region: "iad1", telemetry: { isEnabled: false } });
const publish: CleanupPublisher = (message, options) => queue.send(LOCATION_CLEANUP_TOPIC, message, options);

/** Call only AFTER actor/session/context checks and per-actor rate admission.
 * Failed attempts consume capacity too; retry never resets the global budget. */
export async function reserveCleanup(tx: ToskerTransaction): Promise<CleanupReservation> {
  const counters = (await tx.execute(sql`insert into location_cleanup_budget(day,reserved)
    values(to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD'),1)
    on conflict(day) do update set reserved=location_cleanup_budget.reserved+1
    where location_cleanup_budget.reserved<100 returning reserved`)).rows;
  if(counters.length!==1) throw new CleanupPolicyError();
  const id=randomUUID(), nonce=randomUUID();
  const r=(await tx.execute(sql`with clock as (select date_trunc('milliseconds',clock_timestamp()) t)
    insert into location_cleanup_reservations(id,created_at,expires_at,armed)
    select ${id}::uuid,t,t+interval '5 minutes',false from clock returning created_at,expires_at`)).rows[0];
  await tx.execute(sql`insert into location_cleanup_health(slot,ready_nonce,ready_requested_at,ready_ack_at)
    values(1,${nonce}::uuid,clock_timestamp(),null) on conflict(slot) do update
    set ready_nonce=excluded.ready_nonce,ready_requested_at=excluded.ready_requested_at,ready_ack_at=null`);
  return { id,nonce,createdAt:new Date(String(r.created_at)),expiresAt:new Date(String(r.expires_at)),reservedToday:Number(counters[0].reserved) };
}

/** Short explicit consumer-receipt barrier, not the durable timer. The delayed
 * provider job owns expiry even when this request/process/laptop disappears. */
export async function armCleanup(db:ToskerDatabase, reservation:CleanupReservation, signal:AbortSignal, sender:CleanupPublisher=publish) {
  try {
    const now=Number((await db.execute(sql`select floor(extract(epoch from clock_timestamp())*1000)::bigint ms`)).rows[0].ms);
    const expiry=expiryPublication(reservation.expiresAt.getTime(),now);
    await Promise.all([
      sender({version:1,kind:"readiness",nonce:reservation.nonce},{retentionSeconds:CLEANUP_RETENTION_SECONDS,idempotencyKey:reservation.nonce}),
      sender(expiry.message,{...expiry.options,idempotencyKey:reservation.id}),
    ]);
    const deadline=performance.now()+6000;
    while(!signal.aborted && performance.now()<deadline) {
      const ready=(await db.execute(sql`select 1 from location_cleanup_health where slot=1 and ready_nonce=${reservation.nonce}::uuid
        and ready_ack_at>=ready_requested_at and ready_ack_at>clock_timestamp()-interval '1 minute'
        and (failure_at is null or failure_at<ready_requested_at)`)).rows;
      if(ready.length===1) {
        const armed=(await db.execute(sql`update location_cleanup_reservations set armed=true where id=${reservation.id}::uuid
          and expires_at=${reservation.expiresAt} and expires_at>clock_timestamp() returning id`)).rows;
        if(armed.length!==1 || signal.aborted) throw new CleanupPolicyError();
        return;
      }
      await new Promise(r=>setTimeout(r,250));
    }
    throw new CleanupPolicyError();
  } catch { throw new CleanupPolicyError(); }
}

/** Lease fencing stays under the same transaction as the payload write. The
 * composite FK independently prevents a deleted/expired obligation resurrecting
 * between the final check and commit. Dates always originate in the database. */
export async function lockDurableCleanup(tx:ToskerTransaction,id:string,expiresAt:Date) {
  const r=(await tx.execute(sql`select id from location_cleanup_reservations where id=${id}::uuid
    and armed=true and expires_at=${expiresAt} and expires_at>clock_timestamp() for key share`)).rows;
  if(r.length!==1) throw new CleanupPolicyError();
}

export async function assertDurableAdmission(tx:ToskerTransaction,r:CleanupReservation,capacityVerified:boolean) {
  await lockDurableCleanup(tx,r.id,r.expiresAt);
  const health=(await tx.execute(sql`select floor(extract(epoch from clock_timestamp())*1000)::bigint now,
    floor(extract(epoch from ready_ack_at)*1000)::bigint ready,
    floor(extract(epoch from rescue_at)*1000)::bigint rescue,
    (select count(*)::int from location_cleanup_reservations where expires_at<clock_timestamp()-interval '1 minute') overdue,
    ready_nonce=${r.nonce}::uuid and ready_ack_at>=ready_requested_at
      and (failure_at is null or failure_at<ready_requested_at) receipt
    from location_cleanup_health where slot=1`)).rows[0];
  if(!health || health.receipt!==true) throw new CleanupPolicyError();
  assertCleanupAdmission({databaseNow:Number(health.now),createdAt:r.createdAt.getTime(),expiresAt:r.expiresAt.getTime(),armed:true,
    consumerReadyAt:health.ready===null?null:Number(health.ready),rescueSucceededAt:health.rescue===null?null:Number(health.rescue),
    overdueRows:Number(health.overdue),reservedToday:r.reservedToday,capacityVerified});
}
