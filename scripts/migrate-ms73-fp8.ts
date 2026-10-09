/** Additive checkpoint defaults only. Explicit backup/rehearsal gate, no title restoration. */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDatabase, type ToskerTransaction } from "../src/server/db/client";

const db = getDatabase(), directory = ".git/fp8-recovery";
type Rows = Record<string, Record<string, unknown>[]>;
async function snapshot(tx: ToskerTransaction): Promise<Rows> {
  const tables = await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`);
  const rows: Rows = {};
  for (const { tablename } of tables.rows) {
    assert(/^[a-z_]+$/.test(String(tablename)));
    rows[String(tablename)] = (await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) as rows from public.${tablename} t`))).rows[0].rows as Rows[string];
  }
  return rows;
}
function verify(before: Rows[string], after: Rows[string]) {
  const originals = new Map(before.map(row => [row.id, row]));
  assert.equal(before.length, after.length);
  for (const row of after) {
    const { default_title: defaultTitle, ...unchanged } = row;
    assert.deepEqual(unchanged, originals.get(row.id), "All original fields preserved exactly");
    if (row.source === "pin" && !row.provider_id) {
      assert.match(String(defaultTitle), /^Checkpoint [1-9][0-9]*$/);
      if (/^Checkpoint [1-9][0-9]*$/.test(String(row.title))) assert.equal(defaultTitle, row.title);
    } else assert.equal(defaultTitle, null);
  }
}
async function main() {
  const mode = process.argv[2]; assert(["--rehearse", "--apply"].includes(mode));
  const migrations = readMigrationFiles({ migrationsFolder: "drizzle" }); assert.equal(migrations.length, 29);
  const migration = migrations[28];
  const history = (await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`)).rows;
  history.forEach((row, i) => { assert.equal(row.hash, migrations[i]?.hash); assert.equal(Number(row.created_at), migrations[i]?.folderMillis); });
  if (history.length === 29) { console.log("FP8 migration already applied exactly; not replayed"); return; }
  assert.equal(history.length, 28);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const rehearsal = `${directory}/migration-rehearse.json`;
  if (mode === "--apply") {
    assert(existsSync(rehearsal), "Rehearsal required before apply");
    assert.equal(JSON.parse(readFileSync(rehearsal, "utf8")).hash, migration.hash);
  }
  await db.transaction(async tx => {
    await tx.execute(sql`set transaction isolation level repeatable read`);
    await tx.execute(sql`set local lock_timeout='5s'`);
    await tx.execute(sql`set local statement_timeout='60s'`);
    if (mode === "--apply") await tx.execute(sql`lock table trip_places in access exclusive mode`);
    const before = await snapshot(tx);
    const path = `${directory}/before-${mode.slice(2)}-${randomUUID()}.json`;
    writeFileSync(path, JSON.stringify({ at: new Date().toISOString(), hash: migration.hash, data: before }), { mode: 0o600, flag: "wx" });
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")).data, before);
    console.log({ backup: path, sha256: createHash("sha256").update(readFileSync(path)).digest("hex"), credentials: false });
    if (mode === "--rehearse") {
      // Only an isolated temporary copy receives DDL/backfill; no public row or trigger is touched.
      await tx.execute(sql`create temporary table fp8_checkpoint_rehearsal (like public.trip_places including all) on commit drop`);
      await tx.execute(sql`insert into fp8_checkpoint_rehearsal select * from public.trip_places`);
      for (const statement of migration.sql) await tx.execute(sql.raw(statement.replaceAll('"trip_places"', '"fp8_checkpoint_rehearsal"').replace(/\btrip_places\b/g, "fp8_checkpoint_rehearsal")));
      const after = (await tx.execute(sql`select to_jsonb(t) as row from fp8_checkpoint_rehearsal t`)).rows.map(r => r.row as Record<string, unknown>);
      verify(before.trip_places, after);
      assert.deepEqual(await snapshot(tx), before, "Public data unchanged by rehearsal");
    } else {
      for (const statement of migration.sql) await tx.execute(sql.raw(statement));
      const after = await snapshot(tx); verify(before.trip_places, after.trip_places);
      for (const table of Object.keys(before).filter(table => table !== "trip_places")) assert.deepEqual(after[table], before[table], `${table} retained unchanged`);
      await tx.execute(sql`insert into drizzle.__drizzle_migrations(hash,created_at) values(${migration.hash},${migration.folderMillis})`);
    }
  });
  writeFileSync(`${directory}/migration-${mode.slice(2)}.json`, JSON.stringify({ hash: migration.hash, at: new Date().toISOString(), passed: true }), { mode: 0o600 });
  console.log(`PASS FP8 ${mode.slice(2)}: all retained fields preserved; default metadata only`);
}
main().catch(error => { console.error({ failure: "FP8 migration stopped", kind: error?.name, assertion: error instanceof assert.AssertionError ? error.message.split("\n")[0] : undefined, code: error?.cause?.code ?? error?.code }); process.exitCode = 1; }).finally(() => db.$client.end());
