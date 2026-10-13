import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDatabase, type ToskerTransaction } from "../src/server/db/client";
const db=getDatabase(),directory=".git/ms74-fp3",mode=process.argv[2];
assert(["--rehearse","--apply"].includes(mode));
async function snapshot(tx:ToskerTransaction){
  const tables=await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`);
  const result:Record<string,unknown>={};
  for(const {tablename} of tables.rows){assert(/^[a-z_]+$/.test(String(tablename)));result[String(tablename)]=(await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from public.${tablename} t`))).rows[0].rows;}
  return result;
}
async function main(){
  const migrations=readMigrationFiles({migrationsFolder:"drizzle"});assert.equal(migrations.length,30);const migration=migrations[29];
  const history=(await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`)).rows;
  history.forEach((row,i)=>{assert.equal(row.hash,migrations[i]?.hash);assert.equal(Number(row.created_at),migrations[i]?.folderMillis);});
  if(history.length===30){console.log("Exact FP3 migration already applied; not replayed");return;}assert.equal(history.length,29);
  if(mode==="--apply"){
    const rehearsal=JSON.parse(readFileSync(`${directory}/migration-rehearse.json`,"utf8"));
    assert.equal(rehearsal.hash,migration.hash);assert.equal(rehearsal.passed,true);
  }
  const rollback=new Error("rehearsal complete");
  try{await db.transaction(async tx=>{
    await tx.execute(sql`set transaction isolation level repeatable read`);
    await tx.execute(sql`set local lock_timeout='5s'`);await tx.execute(sql`set local statement_timeout='60s'`);
    const before=await snapshot(tx);mkdirSync(directory,{recursive:true,mode:0o700});
    const file=`${directory}/before-${mode.slice(2)}-${randomUUID()}.json`;
    writeFileSync(file,JSON.stringify({at:new Date().toISOString(),migrationHash:migration.hash,data:before}),{flag:"wx",mode:0o600});
    assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).data,before);
    console.log(JSON.stringify({backup:file,sha256:createHash("sha256").update(readFileSync(file)).digest("hex"),tables:Object.keys(before).length}));
    if(mode==="--rehearse"){
      await tx.execute(sql`create schema fp3_location_rehearsal`);
      await tx.execute(sql`set local search_path to fp3_location_rehearsal, public`);
    }
    for(const statement of migration.sql)await tx.execute(sql.raw(statement));
    const schema=mode==="--rehearse"?"fp3_location_rehearsal":"public";
    const columns=(await tx.execute(sql`select column_name from information_schema.columns where table_schema=${schema} and table_name='location_shares' order by column_name`)).rows.map(r=>r.column_name);
    assert.deepEqual(columns,["conversation_id","created_at","expires_at","id","precision","session_id","user_id"]);
    const after=await snapshot(tx);for(const table of Object.keys(before))assert.deepEqual(after[table],before[table],"Retained public rows unchanged");
    if(mode==="--rehearse")throw rollback;
    assert.deepEqual(after.location_shares,[]);
    await tx.execute(sql`insert into drizzle.__drizzle_migrations(hash,created_at) values(${migration.hash},${migration.folderMillis})`);
  });}catch(error){if(error!==rollback)throw error;}
  writeFileSync(`${directory}/migration-${mode.slice(2)}.json`,JSON.stringify({hash:migration.hash,passed:true,at:new Date().toISOString(),coordinatesStored:false}),{mode:0o600});
  console.log(`PASS FP3 ${mode.slice(2)}; retained data preserved; non-coordinate consent only`);
}
main().catch(error=>{console.error(JSON.stringify({pass:false,kind:error?.name,detail:error instanceof assert.AssertionError?error.message.split("\n")[0]:"Migration stopped; private details suppressed"}));process.exitCode=1;}).finally(()=>db.$client.end());
