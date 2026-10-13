/** Supervised local synthetic-QA sweeper. Never deploy/schedule this script. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationCleanupWorkers } from "../src/server/db/schema";
import { LOCAL_LOCATION_WORKER_FILE, type LocalLocationWorker } from "../src/server/location-sharing/local-qa";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), runId = randomUUID();
const minutes = Number(process.argv[2] ?? 60);
assert(!process.env.VERCEL && Number.isInteger(minutes) && minutes >= 10 && minutes <= 120);
let stopped = false, wake: (() => void) | undefined;
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { stopped = true; wake?.(); });

async function main() {
  const owner = await db.$client.connect();
  let owns = false;
  try {
    owns = Boolean((await owner.query("select pg_try_advisory_lock(hashtextextended('tosker-local-location-worker',0)) ok")).rows[0].ok);
    assert(owns, "Another supervised worker is active");
    const config = await db.transaction(async tx => {
      const actors = await resolveQaActors(tx);
      const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
      assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
      const rows = (await tx.execute(sql`select id from rooms where id=${fixture.roomId}::uuid and slug=${fixture.slug} and owner_id=${actors.a.userId}::uuid and created_at=${fixture.createdAt}::timestamptz`)).rows;
      assert.equal(rows.length, 1);
      assert.equal((await tx.execute(sql`select 1 from room_memberships where room_id=${fixture.roomId}::uuid and user_id=${actors.founder.userId}::uuid`)).rows.length, 1);
      const contexts = (await tx.execute(sql`select c.id from conversations c where c.room_id=${fixture.roomId}::uuid or (c.kind='personal' and c.direct_key=${[actors.a.userId, actors.b.userId].sort().join(":")} and (select count(*) from conversation_participants p where p.conversation_id=c.id)=2)`)).rows.map(r => String(r.id));
      assert(contexts.includes(fixture.conversationId) && contexts.includes(fixture.selectedChatId));
      // Previous local runs may have crashed. Their FK-owned payloads are exact
      // disposable QA data. No Room, consent, profile or retained content delete.
      await tx.delete(locationCleanupWorkers);
      const now = new Date(), endsAt = new Date(now.getTime() + minutes * 60000);
      await tx.insert(locationCleanupWorkers).values({ slot: 1, runId, startedAt: now, lastSweepAt: now, endsAt });
      return { runId, userIds: [actors.a.userId, actors.b.userId], conversationIds: contexts, endsAt: endsAt.getTime() } satisfies LocalLocationWorker;
    });
    const tmp = `${LOCAL_LOCATION_WORKER_FILE}.${runId}`;
    writeFileSync(tmp, JSON.stringify(config), { mode: 0o600, flag: "wx" }); renameSync(tmp, LOCAL_LOCATION_WORKER_FILE);
    console.log(JSON.stringify({ worker: "ready", syntheticOnly: true, minutes, founderMembershipVerified: true }));
    let sweeps = 0;
    while (!stopped && Date.now() < config.endsAt) {
      const started = performance.now();
      await db.transaction(async tx => {
        await tx.execute(sql`set local statement_timeout='5s'`);
        const rows = await tx.select().from(locationCleanupWorkers).where(eq(locationCleanupWorkers.runId, runId)).for("update");
        assert.equal(rows.length, 1, "Worker ownership lost");
        await tx.execute(sql`delete from location_latest where worker_run_id=${runId}::uuid and expires_at <= clock_timestamp()`);
        await tx.update(locationCleanupWorkers).set({ lastSweepAt: sql`clock_timestamp()` }).where(eq(locationCleanupWorkers.runId, runId));
      });
      assert(performance.now() - started < 15000, "Worker stalled; stop QA");
      if (++sweeps % 30 === 0) console.log(JSON.stringify({ worker: "healthy", sweeps }));
      await new Promise<void>(resolve => { const timer = setTimeout(resolve, 5000); wake = () => { clearTimeout(timer); resolve(); }; if (stopped) wake(); });
    }
  } finally {
    try { if (owns) {
      // Fence writers first: deleting worker waits for admitted transactions and
      // atomically cascades every payload belonging to this exact run.
      await db.delete(locationCleanupWorkers).where(eq(locationCleanupWorkers.runId, runId));
      try { if (JSON.parse(readFileSync(LOCAL_LOCATION_WORKER_FILE, "utf8")).runId === runId) unlinkSync(LOCAL_LOCATION_WORKER_FILE); } catch { /* Absent/stale file remains fail-closed through DB generation. */ }
      await owner.query("select pg_advisory_unlock(hashtextextended('tosker-local-location-worker',0))");
      console.log(JSON.stringify({ worker: "stopped", exactRunPayloadsDeleted: true }));
    } } finally { owner.release(); }
  }
}
main().catch(() => { console.error("Cleanup worker failed. STOP QA; writes fail closed. Inspect exact-run payload cleanup before resuming."); process.exitCode = 1; }).finally(() => db.$client.end());
