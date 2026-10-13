/** Additive metadata only; exact retained-row backup and rollback rehearsal.
 * No coordinate payload is copied to a backup. This does not enable sharing. */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDatabase, type ToskerTransaction } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { LOCATION_EXPIRY_SWEEP_SQL, LOCATION_RESCUE_ACK_SQL } from "../src/server/location-sharing/cleanup-sql";

const db = getDatabase(), dir = ".git/ms74-fp3", mode = process.argv[2];
assert(["--rehearse", "--apply"].includes(mode));
async function snapshot(tx: ToskerTransaction) {
  const tables = (await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`)).rows;
  const data: Record<string, unknown> = {};
  for (const { tablename } of tables) {
    assert(/^[a-z_]+$/.test(String(tablename)));
    if (tablename === "location_latest") {
      assert.equal(Number((await tx.execute(sql`select count(*) n from location_latest`)).rows[0].n), 0);
      data.location_latest = [];
    } else data[String(tablename)] = (await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from public.${tablename} t`))).rows[0].rows;
  }
  return data;
}
async function test(tx: ToskerTransaction) {
  const { a, b } = await resolveQaActors(tx);
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
  const expired = randomUUID(), future = randomUUID();
  await tx.execute(sql`insert into location_cleanup_reservations(id,created_at,expires_at,armed) values
    (${expired}::uuid,now()-interval '6 minutes',now()-interval '1 minute',true),
    (${future}::uuid,now(),now()+interval '5 minutes',false)`);
  await assert.rejects(tx.transaction(n => n.execute(sql`insert into location_cleanup_reservations values(${randomUUID()}::uuid,now(),now()+interval '6 minutes',true)`)));
  await assert.rejects(tx.transaction(n => n.execute(sql`insert into location_cleanup_budget values('2026-10-14',101)`)));
  await assert.rejects(tx.transaction(n => n.execute(sql`insert into location_cleanup_health(slot) values(2)`)));
  await tx.execute(sql`insert into location_shares(user_id,id,conversation_id,session_id,precision,created_at,expires_at) values
    (${a.userId}::uuid,${expired}::uuid,${fixture.conversationId}::uuid,'synthetic-cleanup-rehearsal','area',now()-interval '6 minutes',now()-interval '1 minute'),
    (${b.userId}::uuid,${future}::uuid,${fixture.conversationId}::uuid,'synthetic-cleanup-rehearsal','area',now(),now()+interval '5 minutes')`);
  const result = (await tx.execute(sql.raw(LOCATION_EXPIRY_SWEEP_SQL))).rows[0];
  assert.equal(result.expired_consents, 1); assert.equal(result.expired_obligations, 1);
  assert.equal((await tx.execute(sql`select id from location_shares where id=${future}::uuid`)).rows.length, 1);
  assert.equal((await tx.execute(sql`select id from location_cleanup_reservations where id=${future}::uuid`)).rows.length, 1);
  const duplicate = (await tx.execute(sql.raw(LOCATION_EXPIRY_SWEEP_SQL))).rows[0];
  assert.equal(duplicate.expired_consents, 0); assert.equal(duplicate.expired_obligations, 0);
  await tx.execute(sql.raw(LOCATION_RESCUE_ACK_SQL));
  assert.equal((await tx.execute(sql`select 1 from location_cleanup_health where slot=1 and rescue_at is not null`)).rows.length, 1);
  console.log(JSON.stringify({ metadataConstraints: "PASS", scopedExpiry: "PASS", duplicateSweep: "PASS", futureConsentPreserved: true, syntheticRollbackOnly: true }));
}
async function main() {
  const migrations = readMigrationFiles({ migrationsFolder: "drizzle" }); assert.equal(migrations.length, 32);
  const migration = migrations[31];
  const applied = (await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`)).rows;
  applied.forEach((r, i) => { assert.equal(r.hash, migrations[i]?.hash); assert.equal(Number(r.created_at), migrations[i]?.folderMillis); });
  if (applied.length === 32) { console.log("Exact cleanup metadata already applied; no replay"); return; }
  assert.equal(applied.length, 31);
  if (mode === "--apply") {
    const proof = JSON.parse(readFileSync(`${dir}/cleanup-migration-rehearse.json`, "utf8"));
    assert.equal(proof.hash, migration.hash); assert.equal(proof.passed, true);
  }
  const rollback = new Error("Expected rollback");
  try {
    await db.transaction(async tx => {
      await tx.execute(sql`set transaction isolation level repeatable read`);
      await tx.execute(sql`set local lock_timeout='5s'`); await tx.execute(sql`set local statement_timeout='45s'`);
      const before = await snapshot(tx);
      assert.deepEqual(before.location_shares, []); assert.deepEqual(before.location_cleanup_workers, []);
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const file = `${dir}/cleanup-before-${mode.slice(2)}-${randomUUID()}.json`;
      writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), hash: migration.hash, data: before }), { flag: "wx", mode: 0o600 });
      assert.deepEqual(JSON.parse(readFileSync(file, "utf8")).data, before);
      console.log(JSON.stringify({ backup: file, sha256: createHash("sha256").update(readFileSync(file)).digest("hex"), tables: Object.keys(before).length }));
      for (const statement of migration.sql) await tx.execute(sql.raw(statement));
      if (mode === "--rehearse") {
        try { await tx.transaction(async nested => { await test(nested); throw rollback; }); }
        catch (e) { if (e !== rollback) throw e; }
      }
      const after = await snapshot(tx);
      for (const table of Object.keys(before)) assert.deepEqual(after[table], before[table], "Retained rows unchanged");
      for (const table of ["location_cleanup_reservations", "location_cleanup_health", "location_cleanup_budget"]) assert.deepEqual(after[table], []);
      if (mode === "--rehearse") throw rollback;
      await tx.execute(sql`insert into drizzle.__drizzle_migrations(hash,created_at) values(${migration.hash},${migration.folderMillis})`);
    });
  } catch (e) { if (e !== rollback) throw e; }
  writeFileSync(`${dir}/cleanup-migration-${mode.slice(2)}.json`, JSON.stringify({ hash: migration.hash, passed: true, at: new Date().toISOString(), retainedRowsUnchanged: true }), { mode: 0o600 });
  console.log(JSON.stringify({ cleanupMigration: mode, passed: true, payloadsPersisted: false }));
}
main().catch(() => { console.error(JSON.stringify({ cleanupMigration: mode, passed: false, detailsSuppressed: true })); process.exitCode = 1; }).finally(() => db.$client.end());
