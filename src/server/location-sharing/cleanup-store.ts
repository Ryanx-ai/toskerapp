import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { LOCATION_EXPIRY_SWEEP_SQL } from "./cleanup-sql";
import type { CleanupStore } from "./cleanup-consumer";

export const cleanupStore: CleanupStore = {
  async now() {
    const r = await getDatabase().execute(sql`select floor(extract(epoch from clock_timestamp())*1000)::bigint ms`);
    return Number(r.rows[0].ms);
  },
  async acknowledge(nonce) {
    await getDatabase().execute(sql`update location_cleanup_health set ready_ack_at=clock_timestamp()
      where slot=1 and ready_nonce=${nonce}::uuid and ready_requested_at>clock_timestamp()-interval '1 minute'
      and ready_requested_at<=clock_timestamp()`);
  },
  async sweep() {
    return getDatabase().transaction(async tx => {
      await tx.execute(sql`set local statement_timeout='4s'`);
      await tx.execute(sql`set local lock_timeout='1s'`);
      const r = (await tx.execute(sql.raw(LOCATION_EXPIRY_SWEEP_SQL))).rows[0];
      const result = { expiredConsents: Number(r.expired_consents), expiredObligations: Number(r.expired_obligations) };
      console.info(JSON.stringify({ event: "cleanup-expiry", ...result }));
      return result;
    });
  },
  async failure() {
    await getDatabase().execute(sql`insert into location_cleanup_health(slot,failure_at) values(1,clock_timestamp())
      on conflict(slot) do update set failure_at=excluded.failure_at`);
  },
};
