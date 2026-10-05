/** Forward-only additive migration. Rehearsal copies trip tables and rolls back all work. */
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {sql} from "drizzle-orm";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {getDatabase,type ToskerDatabase} from "../src/server/db/client";
import {tripBackup,tripTables} from "./lib/ms73-fp3-migration";
import {verifyFp4aLifecycle} from "./lib/ms73-fp4a-lifecycle";
const db=getDatabase(),rollback=new Error("rollback");
async function main(){
  const mode=process.argv[2];assert(["--rehearse","--prepare-browser","--apply"].includes(mode));
  let browserSchema:string|undefined;
  const migrations=readMigrationFiles({migrationsFolder:"drizzle"}),migration=migrations.at(-1)!;assert.equal(migrations.length,26);
  const applied=await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`);
  applied.rows.forEach((r,i)=>{assert.equal(r.hash,migrations[i]?.hash);assert.equal(Number(r.created_at),migrations[i]?.folderMillis);});
  if(applied.rows.length===26){console.log("FP4A exact migration already applied; no replay.");return;}assert.equal(applied.rows.length,25);
  try{await db.transaction(async tx=>{
    await tx.execute(sql`set local lock_timeout='10s'`);await tx.execute(sql`set local statement_timeout='90s'`);
    if(mode!=="--apply"){
      const schema=`fp4a_rehearsal_${randomUUID().replaceAll("-","")}`;
      browserSchema=schema;
      await tx.execute(sql.raw(`create schema ${schema}`));await tx.execute(sql.raw(`set local search_path=${schema},public`));
      for(const t of tripTables){await tx.execute(sql.raw(`create table ${schema}.${t} (like public.${t} including all)`));await tx.execute(sql.raw(`insert into ${schema}.${t} select * from public.${t}`));}
      const fks=await tx.execute(sql`select c.relname as table_name,k.conname,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and k.contype='f' and c.relname like 'trip_%'`);
      for(const r of fks.rows){assert(tripTables.includes(r.table_name as typeof tripTables[number]));const def=String(r.definition).replace(/REFERENCES (?:public\.)?(trip_[a-z_]+)/g,`REFERENCES ${schema}.$1`);await tx.execute(sql.raw(`alter table ${schema}.${r.table_name} add constraint ${r.conname} ${def}`));}
      // Recreate the existing guard/projection functions and triggers within the isolated schema.
      for(const s of migrations[24].sql.filter(s=>/CREATE FUNCTION|CREATE TRIGGER|DO \$\$ DECLARE t text/.test(s)))await tx.execute(sql.raw(s));
    }
    await tx.execute(sql.raw(`lock table ${tripTables.join(",")} in access exclusive mode`));
    const before=await tripBackup(tx);
    if(mode==="--apply"){
      const directory=resolve(".git/fp4a-recovery");mkdirSync(directory,{recursive:true,mode:0o700});const path=`${directory}/before-${randomUUID()}.json`;
      writeFileSync(path,JSON.stringify({migrationHash:migration.hash,at:new Date().toISOString(),data:before}),{mode:0o600,flag:"wx"});assert.deepEqual(JSON.parse(readFileSync(path,"utf8")).data,before);
      console.log(JSON.stringify({backup:path,sha256:createHash("sha256").update(readFileSync(path)).digest("hex"),credentials:false}));
    }
    for(const s of migration.sql)await tx.execute(sql.raw(s));
    const after=await tripBackup(tx);
    for(const t of tripTables){
      const normalized=after[t].map(row=>{const copy={...row};if(t==="trip_places"){assert.equal(copy.skipped,false);delete copy.skipped;}if(t==="trip_routes"){assert.deepEqual(copy.locked_positions,[0]);delete copy.locked_positions;}return copy;});
      assert.deepEqual(normalized,before[t],`${t}: original bytes/identities preserved`);
    }
    if(mode!=="--apply"){
      await assert.rejects(()=>tx.transaction(async t=>{await t.execute(sql`select set_config('tosker.trip_protocol','3',true)`);await t.execute(sql`update trip_plans set revision=revision`);}));
      if(mode==="--rehearse"){
        await verifyFp4aLifecycle(tx as unknown as ToskerDatabase);
        throw rollback;
      }
      return;
    }
    await tx.execute(sql`insert into drizzle.__drizzle_migrations(hash,created_at) values(${migration.hash},${migration.folderMillis})`);
  });}catch(e){if(e!==rollback)throw e;}
  if(mode==="--prepare-browser"){
    const directory=resolve(".git/fp4a-recovery");mkdirSync(directory,{recursive:true,mode:0o700});
    writeFileSync(`${directory}/browser-schema.json`,JSON.stringify({schema:browserSchema,migrationHash:migration.hash,at:new Date().toISOString(),purpose:"FP4A isolated local browser verification; public migration unapplied"}),{mode:0o600,flag:"wx"});
    console.log("PASS isolated browser schema prepared; ownership receipt in .git/fp4a-recovery/browser-schema.json; public migration unapplied");
  }else console.log(mode==="--rehearse"?"PASS isolated rehearsal fully rolled back; public schema/data unchanged":"PASS FP4A atomic cutover; old Map writes blocked until FP4A canonical");
}
main().catch(e=>{console.error(JSON.stringify({failure:"FP4A migration stopped atomically; sensitive details suppressed",kind:e instanceof assert.AssertionError?"assertion":"database",assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined,code:e?.cause?.code??e?.code??null}));process.exitCode=1;}).finally(()=>db.$client.end());
