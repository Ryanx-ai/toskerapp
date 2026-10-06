/** FP5 forward extension. Rehearsal is default-explicit and fully rolled back. No public apply by default. */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDatabase, type ToskerTransaction, type ToskerDatabase } from "../src/server/db/client";
import { verifyFp5Lifecycle } from "./lib/ms73-fp5-lifecycle";

const db=getDatabase(), rollback=new Error("rehearsal rollback"), directory=".git/fp5-recovery";
type Rows=Record<string,Record<string,unknown>[]>;
async function snapshot(tx:ToskerTransaction,tables:string[],schema:string):Promise<Rows>{
  assert(/^(public|fp5_rehearsal_[a-f0-9]{32})$/.test(schema));
  const data:Rows={};
  for(const table of tables){assert(/^[a-z_]+$/.test(table));const r=await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) as rows from ${schema}.${table} t`));data[table]=r.rows[0].rows as Rows[string];}
  return data;
}
const canonicalRows=(rows:Rows[string])=>rows.map(r=>JSON.stringify(r)).sort();
async function main(){
  const mode=process.argv[2];assert(["--rehearse","--prepare-browser","--apply"].includes(mode));
  const migrations=readMigrationFiles({migrationsFolder:"drizzle"});assert.equal(migrations.length,28);
  const migration=migrations[27];
  const history=await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`);
  history.rows.forEach((r,i)=>{assert.equal(r.hash,migrations[i]?.hash);assert.equal(Number(r.created_at),migrations[i]?.folderMillis);});
  if(history.rows.length===28){console.log("FP5 already applied exactly; no replay");return;}
  assert.equal(history.rows.length,27);
  // No data backfill, deletes or destructive table/column operations. CHECK replacement is atomic.
  const ddl=migration.sql.join("\n");
  assert(!/\b(?:DELETE FROM|TRUNCATE|DROP TABLE|DROP COLUMN|UPDATE \w+ SET)\b/i.test(ddl));
  assert.equal((ddl.match(/DROP CONSTRAINT/g)||[]).length,1);
  assert(ddl.includes('DROP CONSTRAINT "trip_plans_context_valid"'));
  mkdirSync(directory,{recursive:true,mode:0o700});
  const receiptPath=`${directory}/browser-schema.json`;
  if(mode==="--prepare-browser")assert(!existsSync(receiptPath),"STOP: recover existing FP5 browser receipt instead of replacing it");
  let ownedSchema:string|undefined;
  try{await db.transaction(async tx=>{
    await tx.execute(sql`set transaction isolation level repeatable read`);
    await tx.execute(sql`set local lock_timeout='10s'`);
    await tx.execute(sql`set local statement_timeout='90s'`);
    const result=await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`);
    const tables=result.rows.map(r=>String(r.tablename));assert.equal(tables.length,35);
    if(mode==="--apply")await tx.execute(sql.raw(`lock table ${tables.map(t=>`public.${t}`).join(",")} in share mode`));
    const before=await snapshot(tx,tables,"public");
    const backup=`${directory}/before-${mode.slice(2)}-${randomUUID()}.json`;
    writeFileSync(backup,JSON.stringify({at:new Date().toISOString(),migrationHash:migration.hash,data:before}),{mode:0o600,flag:"wx"});
    assert.deepEqual(JSON.parse(readFileSync(backup,"utf8")).data,before);
    console.log(JSON.stringify({backup,sha256:createHash("sha256").update(readFileSync(backup)).digest("hex"),credentials:false}));
    let schema="public";
    if(mode!=="--apply"){
      schema=`fp5_rehearsal_${randomUUID().replaceAll("-","")}`;ownedSchema=schema;
      await tx.execute(sql.raw(`create schema ${schema}`));
      await tx.execute(sql.raw(`set local search_path=${schema},public`));
      for(const table of tables){await tx.execute(sql.raw(`create table ${schema}.${table} (like public.${table} including all)`));await tx.execute(sql.raw(`insert into ${schema}.${table} select * from public.${table}`));}
      const fks=await tx.execute(sql`select c.relname as table_name,k.conname,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and k.contype='f'`);
      for(const r of fks.rows){assert(tables.includes(String(r.table_name)));const definition=String(r.definition).replace(/REFERENCES (?:public\.)?"?([a-z_]+)"?/g,(_,table)=>{assert(tables.includes(table));return `REFERENCES ${schema}.${table}`;});await tx.execute(sql.raw(`alter table ${schema}.${r.table_name} add constraint ${r.conname} ${definition}`));}
      // Only function/trigger definitions; NEVER replay FP3 data backfill or historical public migrations.
      for(const statement of migrations[24].sql.filter(s=>/CREATE FUNCTION|CREATE TRIGGER|DO \$\$ DECLARE t text/.test(s)))await tx.execute(sql.raw(statement));
      for(const statement of migrations[25].sql.filter(s=>/CREATE FUNCTION|DO \$\$ DECLARE t text/.test(s)))await tx.execute(sql.raw(statement));
    }
    for(const statement of migration.sql)await tx.execute(sql.raw(statement));
    const after=await snapshot(tx,tables,schema);
    for(const table of tables){
      const normalized=after[table].map(row=>{const copy={...row};if(table==="trip_places"){assert.equal(copy.icon,"destination");delete copy.icon;}if(table==="trip_plans"){assert.equal(copy.sandbox_conversation_id,null);delete copy.sandbox_conversation_id;}return copy;});
      assert.deepEqual(canonicalRows(normalized),canonicalRows(before[table]),`${table}: all retained fields preserved`);
    }
    if(mode==="--rehearse"){await verifyFp5Lifecycle(tx as unknown as ToskerDatabase);throw rollback;}
    if(mode==="--apply")await tx.execute(sql`insert into drizzle.__drizzle_migrations(hash,created_at) values(${migration.hash},${migration.folderMillis})`);
  });}catch(error){if(error!==rollback)throw error;}
  if(mode==="--prepare-browser")writeFileSync(receiptPath,JSON.stringify({schema:ownedSchema,migrationHash:migration.hash,at:new Date().toISOString(),purpose:"FP5 isolated browser QA; public remains27"}),{mode:0o600,flag:"wx"});
  if(mode==="--rehearse"){
    const result=await db.execute(sql`select count(*)::int as n from information_schema.columns where table_schema='public' and ((table_name='trip_places' and column_name='icon') or (table_name='trip_plans' and column_name='sandbox_conversation_id'))`);assert.equal(result.rows[0].n,0);
  }
  console.log(`PASS FP5 ${mode.slice(2)}; ${mode==="--apply"?"atomic additive cutover28":"public remains27; retained data unchanged"}`);
}
main().catch(error=>{console.error(JSON.stringify({failure:"FP5 migration stopped; sensitive details suppressed",kind:error instanceof assert.AssertionError?"assertion":"database",assertion:error instanceof assert.AssertionError?error.message.split("\n")[0]:undefined,code:error?.cause?.code??error?.code??null}));process.exitCode=1;}).finally(()=>db.$client.end());
