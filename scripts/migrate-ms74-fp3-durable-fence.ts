/** Forward-only, empty-payload fence transition. Rehearse before apply. */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDatabase, type ToskerTransaction } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db=getDatabase(), mode=process.argv[2], dir=".git/ms74-fp3";
assert(["--rehearse","--apply"].includes(mode));
async function snapshot(tx:ToskerTransaction) {
  assert.equal(Number((await tx.execute(sql`select count(*) n from location_latest`)).rows[0].n),0);
  const data:Record<string,unknown>={};
  for(const {tablename} of (await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`)).rows) {
    assert(/^[a-z_]+$/.test(String(tablename)));
    data[String(tablename)]=(await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from public.${tablename} t`))).rows[0].rows;
  }
  return data;
}
async function test(tx:ToskerTransaction) {
  const {a,founder}=await resolveQaActors(tx), fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
  assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
  assert.equal((await tx.execute(sql`select 1 from rooms r join room_memberships m on m.room_id=r.id
    where r.id=${fixture.roomId}::uuid and r.owner_id=${a.userId}::uuid and r.slug=${fixture.slug} and m.user_id=${founder.userId}::uuid`)).rows.length,1);
  const id=randomUUID(), request=randomUUID();
  await tx.execute(sql`insert into location_shares(user_id,id,conversation_id,session_id,precision,created_at,expires_at)
    values(${a.userId}::uuid,${id}::uuid,${fixture.conversationId}::uuid,'synthetic-fence-rehearsal','area',now(),now()+interval '5 minutes')`);
  const insert=(nested:ToskerTransaction,armed:boolean|null,worker:string|null=null)=>nested.execute(sql`
    insert into location_latest(lease_id,worker_run_id,cleanup_armed,precision,expires_at,accepted_at,revision,request_id,label,source)
    values(${id}::uuid,${worker}::uuid,${armed},'area',now()+interval '5 minutes',now(),1,${request}::uuid,'Central Region','ura')`);
  await assert.rejects(tx.transaction(n=>insert(n,null)));
  await assert.rejects(tx.transaction(n=>insert(n,false)));
  await assert.rejects(tx.transaction(n=>insert(n,true)));
  await tx.execute(sql`insert into location_cleanup_reservations(id,created_at,expires_at,armed)
    values(${id}::uuid,now(),now()+interval '5 minutes',false)`);
  await assert.rejects(tx.transaction(n=>insert(n,true)));
  await tx.execute(sql`update location_cleanup_reservations set armed=true where id=${id}::uuid`);
  await insert(tx,true);
  await assert.rejects(tx.transaction(n=>n.execute(sql`update location_latest set latitude=1.2834,longitude=103.8607,accuracy=50 where lease_id=${id}::uuid`)));
  await assert.rejects(tx.transaction(n=>n.execute(sql`update location_latest set expires_at=expires_at+interval '1 second' where lease_id=${id}::uuid`)));
  await tx.execute(sql`delete from location_cleanup_reservations where id=${id}::uuid`);
  assert.equal((await tx.execute(sql`select 1 from location_latest where lease_id=${id}::uuid`)).rows.length,0);
  // The old local-worker path still requires its real cleanup generation.
  const worker=randomUUID();
  await assert.rejects(tx.transaction(n=>insert(n,null,worker)));
  await tx.execute(sql`insert into location_cleanup_workers values(1,${worker}::uuid,now(),now(),now()+interval '1 hour')`);
  await assert.rejects(tx.transaction(n=>insert(n,true,worker)));
  await insert(tx,null,worker);
  await tx.execute(sql`delete from location_shares where id=${id}::uuid`);
  assert.equal((await tx.execute(sql`select 1 from location_latest where lease_id=${id}::uuid`)).rows.length,0);
  console.log(JSON.stringify({durableFenceConstraints:"PASS",unarmedDenied:true,missingObligationDenied:true,
    nullFenceDenied:true,wrongExpiryDenied:true,broadCoordinatesDenied:true,dualFenceDenied:true,
    localWorkerStillRequired:true,consentAndReservationCascade:true,syntheticRollbackOnly:true}));
}
async function main() {
  const migrations=readMigrationFiles({migrationsFolder:"drizzle"});assert.equal(migrations.length,33);const migration=migrations[32];
  const applied=(await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`)).rows;
  applied.forEach((r,i)=>{assert.equal(r.hash,migrations[i]?.hash);assert.equal(Number(r.created_at),migrations[i]?.folderMillis);});
  if(applied.length===33){console.log("Exact durable fence already applied; no replay");return;}assert.equal(applied.length,32);
  const hosted=JSON.parse(readFileSync(`${dir}/hosted-queue-test.json`,"utf8"));assert.equal(hosted.hostedQueuePassed,true);
  const rescue=JSON.parse(readFileSync(`${dir}/hosted-rescue-test.json`,"utf8"));assert(rescue.verifiedAt && rescue.state==="cleaned");
  if(mode==="--apply"){const proof=JSON.parse(readFileSync(`${dir}/durable-fence-rehearse.json`,"utf8"));assert.equal(proof.hash,migration.hash);assert.equal(proof.passed,true);}
  const rollback=new Error("Expected rollback");
  try {await db.transaction(async tx=>{
    await tx.execute(sql`set transaction isolation level repeatable read`);
    await tx.execute(sql`set local lock_timeout='5s'`);await tx.execute(sql`set local statement_timeout='45s'`);
    const before=await snapshot(tx);assert.deepEqual(before.location_shares,[]);assert.deepEqual(before.location_cleanup_workers,[]);
    const file=`${dir}/fence-before-${mode.slice(2)}-${randomUUID()}.json`;
    writeFileSync(file,JSON.stringify({hash:migration.hash,data:before}),{flag:"wx",mode:0o600});assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).data,before);
    console.log(JSON.stringify({backup:file,sha256:createHash("sha256").update(readFileSync(file)).digest("hex")}));
    for(const statement of migration.sql)await tx.execute(sql.raw(statement));
    try{await tx.transaction(async n=>{await test(n);throw rollback;});}catch(e){if(e!==rollback)throw e;}
    assert.deepEqual(await snapshot(tx),before,"Retained data must remain unchanged");
    if(mode==="--rehearse")throw rollback;
    await tx.execute(sql`insert into drizzle.__drizzle_migrations(hash,created_at) values(${migration.hash},${migration.folderMillis})`);
  });}catch(e){if(e!==rollback)throw e;}
  writeFileSync(`${dir}/durable-fence-${mode.slice(2)}.json`,JSON.stringify({hash:migration.hash,passed:true,retainedRowsUnchanged:true,at:new Date().toISOString()}),{mode:0o600});
  console.log(JSON.stringify({durableFence:mode,passed:true,retainedRowsUnchanged:true}));
}
main().catch(()=>{console.error(JSON.stringify({durableFence:mode,passed:false,detailsSuppressed:true}));process.exitCode=1;}).finally(()=>db.$client.end());
