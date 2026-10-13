/** Additive migration; rehearsal rolls back real DDL. Never backs up payloads. */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDatabase, type ToskerTransaction } from "../src/server/db/client";
import { locationCleanupWorkers, locationLatest, locationShares } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), dir = ".git/ms74-fp3", mode = process.argv[2];
assert(["--rehearse", "--apply"].includes(mode));
async function snapshot(tx: ToskerTransaction) {
  const names = (await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`)).rows;
  const data: Record<string, unknown> = {};
  for (const { tablename } of names) {
    assert(/^[a-z_]+$/.test(String(tablename)));
    // No location payload is ever written to a migration backup.
    if (tablename === "location_latest") {
      assert.equal(Number((await tx.execute(sql`select count(*) n from location_latest`)).rows[0].n), 0);
      data.location_latest = [];
    } else data[String(tablename)] = (await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from public.${tablename} t`))).rows[0].rows;
  }
  return data;
}
async function constraints(tx: ToskerTransaction) {
  const { a } = await resolveQaActors(tx);
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010");
  assert.equal(fixture.status, "committed");
  const now = new Date(), expiresAt = new Date(now.getTime() + 300000), runId = randomUUID();
  await tx.insert(locationCleanupWorkers).values({ slot: 1, runId, startedAt: now, lastSweepAt: now, endsAt: new Date(now.getTime() + 3600000) });
  const [lease] = await tx.insert(locationShares).values({ userId: a.userId, conversationId: fixture.conversationId, sessionId: "synthetic-migration-only", precision: "area", createdAt: now, expiresAt }).returning();
  const row = { leaseId: lease.id, workerRunId: runId, precision: "area", expiresAt, acceptedAt: now, revision: 1, requestId: randomUUID(), label: "Synthetic QA", source: "ura" };
  let rejected = 0;
  for (const mutation of [{ latitude: 1.2834 }, { precision: "precise", latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, { revision: 0 }, { expiresAt: new Date(expiresAt.getTime() + 1) }, { acceptedAt: expiresAt }]) {
    await assert.rejects(tx.transaction(async nested => { await nested.insert(locationLatest).values({ ...row, ...mutation }); }));
    rejected++;
  }
  await tx.insert(locationLatest).values(row);
  await assert.rejects(tx.transaction(async nested => { await nested.insert(locationLatest).values(row); }));
  await tx.delete(locationShares).where(sql`${locationShares.id}=${lease.id}::uuid`);
  assert.equal((await tx.select().from(locationLatest)).length, 0, "Stop cascades payload deletion");
  const [precise] = await tx.insert(locationShares).values({ userId: a.userId, conversationId: fixture.conversationId, sessionId: "synthetic-migration-only", precision: "precise", createdAt: now, expiresAt }).returning();
  await tx.insert(locationLatest).values({ ...row, leaseId: precise.id, precision: "precise", latitude: 1.2834, longitude: 103.8607, accuracy: 50 });
  await tx.delete(locationCleanupWorkers);
  assert.equal((await tx.select().from(locationLatest)).length, 0, "Worker retirement cascades payload deletion");
  await tx.delete(locationShares).where(sql`${locationShares.id}=${precise.id}::uuid`);
  console.log(JSON.stringify({ constraints: "PASS", rejected: rejected + 1, cascades: 2, syntheticRollbackOnly: true }));
}
async function main() {
  const migrations = readMigrationFiles({ migrationsFolder: "drizzle" });
  assert.equal(migrations.length, 31);
  const migration = migrations[30];
  const history = (await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`)).rows;
  history.forEach((r, i) => { assert.equal(r.hash, migrations[i]?.hash); assert.equal(Number(r.created_at), migrations[i]?.folderMillis); });
  if (history.length === 31) { console.log("Exact latest-state migration already applied; no replay"); return; }
  assert.equal(history.length, 30);
  if (mode === "--apply") {
    const proof = JSON.parse(readFileSync(`${dir}/latest-migration-rehearse.json`, "utf8"));
    assert.equal(proof.hash, migration.hash); assert.equal(proof.passed, true);
  }
  const rollback = new Error("expected rehearsal rollback");
  try {
    await db.transaction(async tx => {
      await tx.execute(sql`set transaction isolation level repeatable read`);
      await tx.execute(sql`set local lock_timeout='5s'`);
      await tx.execute(sql`set local statement_timeout='60s'`);
      const before = await snapshot(tx);
      assert.deepEqual(before.location_shares, [], "No active consent during migration");
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const path = `${dir}/latest-before-${mode.slice(2)}-${randomUUID()}.json`;
      writeFileSync(path, JSON.stringify({ at: new Date().toISOString(), hash: migration.hash, data: before }), { flag: "wx", mode: 0o600 });
      assert.deepEqual(JSON.parse(readFileSync(path, "utf8")).data, before);
      console.log(JSON.stringify({ backup: path, sha256: createHash("sha256").update(readFileSync(path)).digest("hex"), tables: Object.keys(before).length }));
      for (const statement of migration.sql) await tx.execute(sql.raw(statement));
      if (mode === "--rehearse") await constraints(tx);
      const after = await snapshot(tx);
      for (const table of Object.keys(before)) assert.deepEqual(after[table], before[table], "Retained rows unchanged");
      assert.deepEqual(after.location_latest, []); assert.deepEqual(after.location_cleanup_workers, []);
      if (mode === "--rehearse") throw rollback;
      await tx.execute(sql`insert into drizzle.__drizzle_migrations(hash,created_at) values(${migration.hash},${migration.folderMillis})`);
    });
  } catch (e) { if (e !== rollback) throw e; }
  writeFileSync(`${dir}/latest-migration-${mode.slice(2)}.json`, JSON.stringify({ hash: migration.hash, passed: true, at: new Date().toISOString(), retainedRowsUnchanged: true, payloadsPersisted: false }), { mode: 0o600 });
  console.log(`PASS latest-state ${mode.slice(2)}; empty additive tables; retained data unchanged`);
}
main().catch(e => { console.error(JSON.stringify({ pass: false, kind: e?.name, detail: e instanceof assert.AssertionError ? e.message.split("\n")[0] : "Migration stopped; details suppressed" })); process.exitCode = 1; }).finally(() => db.$client.end());
