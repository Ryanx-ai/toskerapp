/** No samples, no provider calls. Exact synthetic worker row, no active worker. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationCleanupWorkers, locationLatest } from "../src/server/db/schema";
import { LOCAL_LOCATION_WORKER_FILE, lockHealthyLocationWorker } from "../src/server/location-sharing/local-qa";
const db = getDatabase(), runId = randomUUID();
let step = "verify failed worker cleanup", created = false;
async function main() {
  assert(!existsSync(LOCAL_LOCATION_WORKER_FILE));
  assert.equal((await db.select().from(locationCleanupWorkers)).length, 0);
  assert.equal((await db.select({ id: locationLatest.leaseId }).from(locationLatest)).length, 0);
  console.log(JSON.stringify({ failedRunCleanupVerified: true, activeWorkers: 0, activePayloads: 0 }));
  const now = new Date(), endsAt = new Date(now.getTime() + 600000);
  await db.insert(locationCleanupWorkers).values({ slot: 1, runId, startedAt: new Date(now.getTime() - 30000), lastSweepAt: now, endsAt }); created = true;
  const config = { runId, endsAt: endsAt.getTime(), userIds: [], conversationIds: [] };
  step = "heartbeat progresses while admitted request holds generation fence";
  await db.transaction(async tx => {
    await lockHealthyLocationWorker(tx, config);
    await db.transaction(async sweep => {
      await sweep.execute(sql`set local lock_timeout='1s'`);
      await sweep.select().from(locationCleanupWorkers).where(eq(locationCleanupWorkers.runId, runId)).for("no key update");
      await sweep.update(locationCleanupWorkers).set({ lastSweepAt: sql`clock_timestamp()` }).where(eq(locationCleanupWorkers.runId, runId));
    });
    step = "shutdown deletion cannot pass admitted request";
    let blocked = false;
    try { await db.transaction(async closing => {
      await closing.execute(sql`set local lock_timeout='250ms'`);
      await closing.delete(locationCleanupWorkers).where(eq(locationCleanupWorkers.runId, runId));
    }); } catch (error) {
      const value = error as { code?: string; cause?: { code?: string } };
      blocked = (value.code ?? value.cause?.code) === "55P03";
    }
    assert(blocked, "Expected PostgreSQL lock denial, not an unrelated failure");
  });
  step = "stale heartbeat still denies admission";
  await db.update(locationCleanupWorkers).set({ lastSweepAt: new Date(Date.now() - 20000) }).where(eq(locationCleanupWorkers.runId, runId));
  await assert.rejects(() => db.transaction(tx => lockHealthyLocationWorker(tx, config)));
  console.log(JSON.stringify({ passed: true, heartbeatDoesNotWaitForReaders: true, deletionFenced: true, staleHeartbeatDenied: true, providerCalls: 0 }));
}
main().catch(() => { console.error(JSON.stringify({ passed: false, step })); process.exitCode = 1; }).finally(async () => {
  if (created) await db.delete(locationCleanupWorkers).where(eq(locationCleanupWorkers.runId, runId));
  await db.$client.end();
});
