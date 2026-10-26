/** Supervised local synthetic-QA sweeper. Never deploy/schedule this script. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { getDatabase } from "../src/server/db/client";
import { locationCleanupWorkers } from "../src/server/db/schema";
import { LOCAL_LOCATION_WORKER_FILE, type LocalLocationWorker } from "../src/server/location-sharing/local-qa";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { isIsolatedReview } from "../src/server/accounts/isolated-review";
const db = getDatabase(), runId = randomUUID();
// A session advisory lock MUST NOT travel through transaction-mode PgBouncer.
// Use the already configured direct endpoint for this one bounded owner only.
const directUrl = process.env.DATABASE_URL_UNPOOLED;
assert(directUrl && process.env.DATABASE_URL);
const direct = new URL(directUrl), pooled = new URL(process.env.DATABASE_URL);
assert(!direct.hostname.includes("-pooler") && direct.hostname === pooled.hostname.replace("-pooler", "")
  && direct.pathname === pooled.pathname && direct.username === pooled.username);
const ownerPool = new Pool({ connectionString: directUrl, max: 1, connectionTimeoutMillis: 5000 });
// v1 used an unsupported pooled session lock. Its orphan may remain on a
// provider pool backend; never terminate that shared backend to release it.
// v2 is direct-session-only. No v1 process/config/payload remained at cutover.
const ownershipKey = "tosker-local-location-worker-v2-direct";
const minutes = Number(process.argv[2] ?? 60);
const fp4 = process.argv[3] === "--fp4";
assert(process.argv[3] === undefined || fp4);
assert(!process.env.VERCEL && Number.isInteger(minutes) && minutes >= 10 && minutes <= 120);
if (fp4) {
  assert(isIsolatedReview(), "FP4 worker requires isolated review");
  assert(!existsSync(".git/ms74-fp4/qa-budget-hold.json"), "Reconcile the saved FP4 QA budget hold; never reset counters");
  const approval = JSON.parse(readFileSync(".git/ms74-fp4/capacity-approval.json", "utf8"));
  assert.equal(approval.approvedAt, "2026-10-26T12:05:21.406Z");
  assert.equal(approval.expiresAt, "2026-11-02T12:05:21.406Z");
  assert(Date.now() >= Date.parse(approval.approvedAt) && Date.now() + minutes * 60000 < Date.parse(approval.expiresAt));
}
let stopped = false, wake: (() => void) | undefined, stage = "connect";
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { stopped = true; wake?.(); });

async function main() {
  const owner = await ownerPool.connect();
  owner.on("error", () => { stopped = true; process.exitCode = 1; wake?.(); });
  let owns = false;
  try {
    stage = "exclusive worker ownership";
    owns = Boolean((await owner.query("select pg_try_advisory_lock(hashtextextended($1,0)) ok", [ownershipKey])).rows[0].ok);
    assert(owns, "Another supervised worker is active");
    stage = "exact QA fixture admission";
    const config = await db.transaction(async tx => {
      const actors = await resolveQaActors(tx);
      const review = isIsolatedReview();
      const fixture = JSON.parse(readFileSync(fp4 ? ".git/ms74-fp4/review-fixture.json" : review ? ".git/ms74-fp3/review-fixture.json" : ".git/ms74-recovery/fixture.json", "utf8"));
      assert.equal(fixture.run, fp4 ? "ms74-fp4-20261026" : review ? "ms74-fp3-review-20261016" : "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
      if (fp4) {
        assert.equal(fixture.project, "falling-mode-50310792");
        const [state] = (await tx.execute(sql`select (select count(*) from location_latest)::int payloads,
          (select count(*) from location_cleanup_workers)::int workers,
          (select count(*) from location_shares where expires_at>clock_timestamp())::int active`)).rows;
        assert.deepEqual(state, {payloads:0,workers:0,active:0}, "Do not replace another review run");
      }
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
      return { runId, userIds: [actors.a.userId, actors.b.userId, ...(review ? [actors.founder.userId] : [])], conversationIds: contexts, endsAt: endsAt.getTime() } satisfies LocalLocationWorker;
    });
    stage = "worker configuration";
    const tmp = `${LOCAL_LOCATION_WORKER_FILE}.${runId}`;
    writeFileSync(tmp, JSON.stringify(config), { mode: 0o600, flag: "wx" }); renameSync(tmp, LOCAL_LOCATION_WORKER_FILE);
    console.log(JSON.stringify({ worker: "ready", syntheticOnly: true, minutes, founderMembershipVerified: true }));
    let sweeps = 0;
    while (!stopped && Date.now() < config.endsAt) {
      stage = "bounded sweep";
      const started = performance.now();
      await db.transaction(async tx => {
        await tx.execute(sql`set local statement_timeout='5s'`);
        const rows = await tx.select().from(locationCleanupWorkers).where(eq(locationCleanupWorkers.runId, runId)).for("no key update");
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
      const released = await owner.query("select pg_advisory_unlock(hashtextextended($1,0)) ok", [ownershipKey]);
      assert(released.rows[0].ok, "Worker ownership was lost");
      console.log(JSON.stringify({ worker: "stopped", exactRunPayloadsDeleted: true }));
    } } finally { owner.release(true); }
  }
}
main().catch(error => { const candidate = error?.code ?? error?.cause?.code; const sqlState = typeof candidate === "string" && /^[0-9A-Z]{5}$/.test(candidate) ? candidate : undefined; console.error(JSON.stringify({ worker: "failed", stage, sqlState, stopQa: true })); process.exitCode = 1; }).finally(async () => { await db.$client.end(); await ownerPool.end(); });
