import { neon } from "@neondatabase/serverless";
import { neonCleanupHandler } from "../src/server/location-sharing/neon-trigger";

/** Capability canary ONLY. No DELETE, schema mutation, timer, or history.
 * This exact resource will be upgraded to reviewed cleanup after hosted edge
 * attestation and scheduler acceptance. Current sharing admission stays shut. */
const rescueCanary = {
  fetch: neonCleanupHandler(async () => {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`select 1 as reachable`;
    if (rows.length !== 1 || rows[0].reachable !== 1) throw new Error("Unavailable");
    console.info(JSON.stringify({ event: "cleanup-capability", databaseReachable: true, destructive: false }));
  }, () => process.env.NEON_BRANCH === "main" && Boolean(process.env.DATABASE_URL)
    && !process.env.NEON_API_KEY && process.env.TOSKER_CLEANUP_MODE === "canary"),
};
export default rescueCanary;
