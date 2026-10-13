import { neon } from "@neondatabase/serverless";
import { neonCleanupHandler } from "../src/server/location-sharing/neon-trigger";
import { LOCATION_EXPIRY_SWEEP_SQL, LOCATION_RESCUE_ACK_SQL } from "../src/server/location-sharing/cleanup-sql";

/** Independent hourly rescue. DB time, fixed scope and bounded transaction;
 * never accept caller SQL/cutoffs/identities. This is not the normal <60s job.
 * Sharing admission remains shut until the separate queue gates pass. */
const rescue = {
  fetch: neonCleanupHandler(async () => {
    const sql = neon(process.env.DATABASE_URL!);
    const results = await sql.transaction([
      sql`select set_config('statement_timeout','4000',true),set_config('lock_timeout','1000',true)`,
      sql.query(LOCATION_EXPIRY_SWEEP_SQL),
      sql.query(LOCATION_RESCUE_ACK_SQL),
    ]);
    const outcome = results[1][0];
    console.info(JSON.stringify({ event: "cleanup-rescue", expiredConsents: Number(outcome.expired_consents),
      expiredObligations: Number(outcome.expired_obligations), oldCounters: Number(outcome.old_counters) }));
  }, () => process.env.NEON_BRANCH === "main" && Boolean(process.env.DATABASE_URL)
    && !process.env.NEON_API_KEY && process.env.TOSKER_CLEANUP_MODE === "expiry-rescue"),
};
export default rescue;
