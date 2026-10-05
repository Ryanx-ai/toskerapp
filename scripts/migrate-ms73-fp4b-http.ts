/** Same reviewed additive DDL in one atomic HTTP batch; no long-lived websocket. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { readMigrationFiles } from "drizzle-orm/migrator";
async function main() {
  const mode=process.argv[2];assert(["--rehearse","--apply"].includes(mode));
  const db=neon(process.env.DATABASE_URL!),migrations=readMigrationFiles({migrationsFolder:"drizzle"});assert.equal(migrations.length,27);
  const migration=migrations[26],history=await db`select hash,created_at from drizzle.__drizzle_migrations order by created_at`;
  history.forEach((r,i)=>{assert.equal(r.hash,migrations[i]?.hash);assert.equal(Number(r.created_at),migrations[i]?.folderMillis);});
  if(history.length===27){console.log("FP4B applied exactly; no replay.");return;}assert.equal(history.length,26);
  for(const statement of migration.sql)assert(/^\s*(CREATE TABLE|CREATE (UNIQUE )?INDEX|ALTER TABLE) /i.test(statement)&&!/\b(DROP|DELETE|UPDATE|TRUNCATE)\b/i.test(statement.replace(/ON (UPDATE|DELETE) (no action|cascade|restrict)/gi,"")),"Reviewed additive DDL only");
  const tables=await db`select tablename from pg_tables where schemaname='public' order by tablename`;assert.equal(tables.length,32);
  tables.forEach(r=>assert(/^[a-z_]+$/.test(String(r.tablename))));
  const snapshot=`jsonb_build_object(${tables.map(r=>`'${r.tablename}',(select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from public.${r.tablename} t)`).join(",")})`;
  const [{data:before}]=await db.query(`select ${snapshot} as data`);
  const directory=".git/fp4b-recovery";mkdirSync(directory,{recursive:true,mode:0o700});
  const path=`${directory}/before-http-${mode.slice(2)}-${randomUUID()}.json`;
  writeFileSync(path,JSON.stringify({at:new Date().toISOString(),migrationHash:migration.hash,data:before}),{mode:0o600,flag:"wx"});
  assert.deepEqual(JSON.parse(readFileSync(path,"utf8")).data,before);
  console.log(JSON.stringify({backup:path,sha256:createHash("sha256").update(readFileSync(path)).digest("hex"),credentials:false}));
  const queries=[
    db.query("set local lock_timeout='10s'"),db.query("set local statement_timeout='30s'"),
    db.query("lock table drizzle.__drizzle_migrations in exclusive mode"),
    db.query(`lock table ${tables.map(r=>`public.${r.tablename}`).join(",")} in share mode`),
    db.query("select 1 / ((select count(*) from drizzle.__drizzle_migrations)=26)::int as history_guard"),
    // If any retained row changed since backup, abort rather than use stale recovery data.
    db.query(`select 1 / (${snapshot}=$1::jsonb)::int as before_guard`,[JSON.stringify(before)]),
    ...migration.sql.map(statement=>db.query(statement)),
    db.query(`select 1 / (${snapshot}=$1::jsonb)::int as after_guard`,[JSON.stringify(before)]),
    db.query("select 1 / ((select count(*) from pg_constraint where contype='f' and (conrelid in ('map_pins'::regclass,'map_pin_preferences'::regclass,'map_pin_receipts'::regclass) or confrelid='map_pins'::regclass))=6)::int as fk_guard"),
    mode==="--rehearse"?db.query("DO $$ BEGIN RAISE EXCEPTION USING ERRCODE='P004B', MESSAGE='FP4B_REHEARSAL_ROLLBACK'; END $$"):db.query("insert into drizzle.__drizzle_migrations(hash,created_at) values($1,$2)",[migration.hash,migration.folderMillis]),
  ];
  try{await db.transaction(queries);}catch(e){
    if(mode!=="--rehearse" || (e as {code?:string}).code!=="P004B")throw e;
    const unchanged=await db.query(`select ${snapshot}=$1::jsonb as same`,[JSON.stringify(before)]);assert.equal(unchanged[0].same,true);
    assert.equal((await db`select to_regclass('public.map_pins') as pins`)[0].pins,null);
    console.log("PASS HTTP rollback rehearsal reached final sentinel; all guards passed, new tables absent, retained rows unchanged");return;
  }
  assert.equal(mode,"--apply","Rehearsal must roll back");
  console.log("PASS additive0026 cutover, atomic backup guards and retained-data equality; public27migrations");
}
main().catch(e=>{console.error(JSON.stringify({failure:"FP4B migration not accepted; recover history before retry",kind:e instanceof Error?e.name:"unknown",assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined,code:e?.code??null}));process.exitCode=1;});
