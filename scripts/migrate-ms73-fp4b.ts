/** Additive forward-only Pin migration. Default rehearsal always rolls back. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDatabase, type ToskerTransaction } from "../src/server/db/client";

const db = getDatabase(), rollback = new Error("rollback");
const pinTables = ["map_pins", "map_pin_preferences", "map_pin_receipts"];
async function snapshot(tx: ToskerTransaction) {
  const tables = await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`);
  const data: Record<string,unknown> = {};
  for (const { tablename } of tables.rows) {
    assert(/^[a-z_]+$/.test(String(tablename)));
    if (pinTables.includes(String(tablename))) continue;
    const rows = await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) as data from public.${tablename} t`));
    data[String(tablename)] = rows.rows[0].data;
  }
  return data;
}
async function main() {
  const mode = process.argv[2]; assert(["--rehearse", "--apply"].includes(mode));
  const migrations = readMigrationFiles({ migrationsFolder: "drizzle" }); assert.equal(migrations.length,27);
  const migration = migrations[26];
  const history = await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`);
  history.rows.forEach((r,i) => { assert.equal(r.hash,migrations[i]?.hash); assert.equal(Number(r.created_at),migrations[i]?.folderMillis); });
  if (history.rows.length === 27) { console.log("FP4B already applied exactly; no replay."); return; }
  assert.equal(history.rows.length,26);
  // Every statement must be additive and target only the three new tables.
  for (const statement of migration.sql) assert(/^\s*(CREATE TABLE|CREATE (UNIQUE )?INDEX|ALTER TABLE) /i.test(statement) && !/\b(DROP|DELETE|UPDATE|TRUNCATE)\b/i.test(statement.replace(/ON (UPDATE|DELETE) (no action|cascade|restrict)/gi, "")), "Only reviewed additive DDL is allowed");
  try {
    await db.transaction(async tx => {
      await tx.execute(sql`set local lock_timeout='10s'`);
      await tx.execute(sql`set local statement_timeout='90s'`);
      const tables = await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`);
      assert.equal(tables.rows.length,32);
      // Prevent a founder edit racing the preservation comparison; release immediately at commit/rollback.
      await tx.execute(sql.raw(`lock table ${tables.rows.map(r => `public.${r.tablename}`).join(",")} in share mode`));
      const before = await snapshot(tx);
      const directory = ".git/fp4b-recovery"; mkdirSync(directory,{recursive:true,mode:0o700});
      const path = `${directory}/before-${mode.slice(2)}-${randomUUID()}.json`;
      writeFileSync(path,JSON.stringify({ at:new Date().toISOString(), migrationHash:migration.hash, data:before }),{mode:0o600,flag:"wx"});
      assert.deepEqual(JSON.parse(readFileSync(path,"utf8")).data,before);
      console.log(JSON.stringify({backup:path,sha256:createHash("sha256").update(readFileSync(path)).digest("hex"),credentials:false}));
      for (const statement of migration.sql) await tx.execute(sql.raw(statement));
      assert.deepEqual(await snapshot(tx),before,"All retained rows unchanged");
      const fks = await tx.execute(sql`select conrelid::regclass::text as source,confrelid::regclass::text as target from pg_constraint where contype='f' and (conrelid in ('map_pins'::regclass,'map_pin_preferences'::regclass,'map_pin_receipts'::regclass) or confrelid='map_pins'::regclass)`);
      assert.equal(fks.rows.length,6);
      assert(fks.rows.every(r => !String(r.source).includes("trip_") && !String(r.target).includes("trip_")));
      if (mode === "--rehearse") throw rollback;
      await tx.execute(sql`insert into drizzle.__drizzle_migrations(hash,created_at) values(${migration.hash},${migration.folderMillis})`);
    });
  } catch (e) { if (e !== rollback) throw e; }
  if (mode === "--rehearse") {
    const absent = await db.execute(sql`select to_regclass('public.map_pins') as pins,to_regclass('public.map_pin_preferences') as preferences,to_regclass('public.map_pin_receipts') as receipts`);
    assert.deepEqual(absent.rows[0],{pins:null,preferences:null,receipts:null});
  }
  console.log(mode === "--rehearse" ? "PASS FP4B rollback-only schema rehearsal, retained rows unchanged; public remains26 migrations" : "PASS FP4B additive cutover; existing application remains compatible");
}
main().catch(e => { console.error(JSON.stringify({failure:"FP4B migration stopped atomically",kind:e instanceof assert.AssertionError?"assertion":"database",message:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined,code:e?.cause?.code??e?.code??null}));process.exitCode=1; }).finally(()=>db.$client.end());
