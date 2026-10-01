/** Explicit forward migration with backup, compatibility guard and rollback-only rehearsal. */
import assert from "node:assert/strict";
import { randomUUID,createHash } from "node:crypto";
import { readFileSync,writeFileSync,mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDatabase,type ToskerDatabase } from "../src/server/db/client";
import { readTrip,mutateTrip,readTripComments } from "../src/server/trips/service";
import { tripBackup,tripTables,verifyBackfill } from "./lib/ms73-fp3-migration";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { verifyFp3Lifecycle } from "./lib/ms73-fp3-lifecycle";
const db=getDatabase(), rollback=new Error("rehearsal rollback");
async function main(){
  const mode=process.argv[2];assert(["--rehearse","--apply"].includes(mode));
  const migrations=readMigrationFiles({migrationsFolder:"drizzle"}),migration=migrations.at(-1)!;assert.equal(migrations.length,25);
  const applied=await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`);
  applied.rows.forEach((row,i)=>{assert.equal(row.hash,migrations[i]?.hash);assert.equal(Number(row.created_at),migrations[i]?.folderMillis);});
  if(applied.rows.length===25){console.log("FP3 already applied with exact hash; no replay.");return;}
  assert.equal(applied.rows.length,24);
  const fixture=JSON.parse(readFileSync("docs/MS7-3-FP3-FIXTURE.json","utf8"));
  const {a,b,founder}=await resolveQaActors(db);
  try{await db.transaction(async tx=>{
    await tx.execute(sql`set local lock_timeout='10s'`);await tx.execute(sql`set local statement_timeout='90s'`);
    if(mode==="--rehearse"){
      const schema=`fp3_rehearsal_${randomUUID().replaceAll("-","")}`;
      await tx.execute(sql.raw(`create schema ${schema}`));
      await tx.execute(sql.raw(`set local search_path=${schema},public`));
      for(const table of tripTables){await tx.execute(sql.raw(`create table ${schema}.${table} (like public.${table} including all)`));await tx.execute(sql.raw(`insert into ${schema}.${table} select * from public.${table}`));}
      const index=await tx.execute(sql.raw(`select indexname from pg_indexes where schemaname='${schema}' and tablename='trip_places' and indexdef like '%(plan_id, provider, provider_id)'`));
      assert.equal(index.rows.length,1);assert(/^[a-z_0-9]+$/.test(String(index.rows[0].indexname)));
      await tx.execute(sql.raw(`alter index ${schema}.${index.rows[0].indexname} rename to trip_places_provider_unique`));
      // LIKE omits FKs. Recreate them, redirecting only trip-table references into this isolated schema.
      const fks=await tx.execute(sql`select c.relname as table_name,k.conname,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and k.contype='f' and c.relname like 'trip_%'`);
      for(const row of fks.rows){assert(tripTables.includes(row.table_name as typeof tripTables[number]));const definition=String(row.definition).replace(/REFERENCES (?:public\.)?(trip_[a-z_]+)/g,`REFERENCES ${schema}.$1`);await tx.execute(sql.raw(`alter table ${schema}.${row.table_name} add constraint ${row.conname} ${definition}`));}
    }
    await tx.execute(sql.raw(`lock table ${tripTables.join(",")} in access exclusive mode`));
    const before=await tripBackup(tx);
    let backupPath:string|undefined;
    if(mode==="--apply"){
      const directory=resolve(".git/fp3-recovery");mkdirSync(directory,{recursive:true,mode:0o700});
      backupPath=`${directory}/before-${randomUUID()}.json`;
      writeFileSync(backupPath,JSON.stringify({migrationHash:migration.hash,at:new Date().toISOString(),data:before}),{mode:0o600,flag:"wx"});
      assert.deepEqual(JSON.parse(readFileSync(backupPath,"utf8")).data,before,"Recoverable backup round-trip before DDL");
      console.log(JSON.stringify({backup:backupPath,sha256:createHash("sha256").update(readFileSync(backupPath)).digest("hex"),credentials:false}));
    }
    for(const statement of migration.sql)await tx.execute(sql.raw(statement));
    const after=await tripBackup(tx),mapping=verifyBackfill(before,after);
    if(backupPath)writeFileSync(backupPath.replace("before-","mapping-"),JSON.stringify({mapping,migrationHash:migration.hash}),{mode:0o600,flag:"wx"});
    console.log(JSON.stringify({mode,backfill:"PASS",beforeCards:before.trip_places.length,afterCards:after.trip_places.length,beforeComments:before.trip_comments.length,afterComments:after.trip_comments.length,receiptsPreserved:after.trip_mutation_receipts.length}));
    if(mode==="--rehearse"){
      // Savepoint tests prove old servers and direct writes to the legacy projection fail closed.
      await assert.rejects(()=>tx.transaction(t=>t.execute(sql`update trip_plans set revision=revision where id=(select id from trip_plans limit 1)`)));
      const testDb={transaction:tx.transaction.bind(tx)} as unknown as ToskerDatabase;
      assert.deepEqual(await readTrip(testDb,a,fixture.slug),await readTrip(testDb,founder,fixture.slug));
      const change=async(command:Parameters<typeof mutateTrip>[2]["command"],actor=a)=>mutateTrip(testDb,actor,{roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:(await readTrip(testDb,actor,fixture.slug)).revision,command});
      const r1=(await change({type:"create-route",name:"FP3 rehearsal R1",color:"gold"})).resultId!,r2=(await change({type:"create-route",name:"FP3 rehearsal R2",color:"sky"})).resultId!;
      const candidate={title:"Public synthetic QA",source:"pin" as const,latitude:1.30,longitude:103.8,provider:null,providerId:null,address:"",attribution:"",license:""};
      const p1=(await change({type:"add",routeId:r1,candidate})).resultId!,p2=(await change({type:"add",routeId:r2,candidate})).resultId!;
      assert.notEqual(p1,p2);assert.equal((await change({type:"add",routeId:r1,candidate})).resultId,p1);
      await change({type:"comment",placeId:p1,body:"R1 survives"});await change({type:"comment",placeId:p2,body:"R2 cascades"},b);
      const nuke={roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:(await readTrip(testDb,a,fixture.slug)).revision,command:{type:"nuke-route" as const,routeId:r2}};
      await mutateTrip(testDb,a,nuke);assert((await mutateTrip(testDb,a,nuke)).replayed);
      assert.equal((await readTripComments(testDb,b,fixture.slug,p1)).comments.length,1);
      await assert.rejects(()=>readTripComments(testDb,a,fixture.slug,p2));
      assert(!(await readTrip(testDb,b,fixture.slug)).places.some(p=>p.id===p2));
      await assert.rejects(()=>change({type:"add",routeId:r2,candidate}));
      await change({type:"nuke-route",routeId:r1});
      await assert.rejects(()=>change({type:"add",routeId:null,candidate}));
      await assert.rejects(()=>tx.transaction(t=>t.execute(sql`update trip_route_places set position=position`)));
      console.log("PASS rollback-only live-data backfill, independent cards/comments, duplicate-in-route, Nuke/replay/stale/empty and old-protocol/projection guards");
      await verifyFp3Lifecycle(tx as unknown as ToskerDatabase);
      throw rollback;
    }
    await tx.execute(sql`insert into drizzle.__drizzle_migrations (hash,created_at) values (${migration.hash},${migration.folderMillis})`);
  });}catch(error){if(error!==rollback)throw error;}
  console.log(mode==="--rehearse"?"PASS rehearsal rolled back completely; public data/schema unchanged":"PASS atomic FP3 migration committed; old Map writes now fail closed until FP3 canonical");
}
main().catch(e=>{console.error(JSON.stringify({failure:"Migration failed atomically; sensitive details suppressed",kind:e instanceof assert.AssertionError?"assertion":"database",code:e?.cause?.code??e?.code??null}));process.exitCode=1;}).finally(()=>db.$client.end());
