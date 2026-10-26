/** Isolated-only rehearsal/apply. No implicit retained/Production database path. */
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {sql} from "drizzle-orm";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {getDatabase,type ToskerDatabase} from "../src/server/db/client";
import {readTrip,mutateTrip,readTripComments} from "../src/server/trips/service";
import type {AuthenticatedActor} from "../src/server/auth/actor";
import type {TripCommand} from "../src/lib/trip-contract";
import {tripTables,tripBackup} from "./lib/ms73-fp3-migration";
import {REVIEW_HOST,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";

const mode=process.argv[2],directory=".git/ms74-fp4/migration",rollback=new Error("owned rehearsal rollback");
assert(["--rehearse","--apply-review"].includes(mode));
assert.equal(new URL(process.env.DATABASE_URL!).hostname,REVIEW_HOST,"Isolated review database required");
assert.equal(process.env.NEON_PROJECT_ID,REVIEW_PROJECT);
const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));
assert.equal(fixture.project,REVIEW_PROJECT);assert.equal(fixture.status,"committed");
const migrations=readMigrationFiles({migrationsFolder:"drizzle"}),migration=migrations.at(-1)!;
assert.equal(migrations.length,34);
const implementationHash=createHash("sha256").update(readFileSync("src/server/trips/service.ts")).update(readFileSync(import.meta.filename)).digest("hex");
const db=getDatabase();
const record={pass:false,mode,at:new Date().toISOString(),migrationHash:migration.hash,implementationHash,checks:[] as string[],retainedDatabaseTouched:false};
const checked=(name:string)=>record.checks.push(name);
mkdirSync(directory,{recursive:true,mode:0o700});
async function run(){
 const history=await db.execute(sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`);
 history.rows.forEach((r,i)=>{assert.equal(r.hash,migrations[i]?.hash);assert.equal(Number(r.created_at),migrations[i]?.folderMillis);});
 assert.equal(history.rows.length,33,"Recover existing application state; do not replay migration");
 if(mode==="--apply-review"){
  const evidence=JSON.parse(readFileSync(`${directory}/rehearsal-pass.json`,"utf8"));
  assert(evidence.pass);assert.equal(evidence.migrationHash,migration.hash);assert.equal(evidence.implementationHash,implementationHash);
 }
 const beforePublic=await db.transaction(tx=>tripBackup(tx));
 try{await db.transaction(async tx=>{
  await tx.execute(sql`set local lock_timeout='5s'`);await tx.execute(sql`set local statement_timeout='60s'`);
  const founder=await tx.execute(sql`select id from public.users where tid='8V3X7P1' limit 2`);
  assert.equal(founder.rows.length,1);assert.equal(founder.rows[0].id,fixture.founderId);
  const owned=await tx.execute(sql`select id from public.rooms where id=${fixture.roomId}::uuid and slug=${fixture.slug} and owner_id=${fixture.ownerId}::uuid and created_at=${fixture.createdAt}::timestamptz`);
  assert.equal(owned.rows.length,1);
  const membership=await tx.execute(sql`select user_id from public.room_memberships where room_id=${fixture.roomId}::uuid`);
  assert.deepEqual(membership.rows.map(r=>r.user_id).sort(),[...fixture.qaUserIds,fixture.founderId].sort());
  checked("Exact fixture ownership and server-resolved founder membership");
  if(mode==="--rehearse"){
   const schema=`fp4_move_${randomUUID().replaceAll("-","")}`;
   await tx.execute(sql.raw(`create schema ${schema}`));await tx.execute(sql.raw(`set local search_path=${schema},public`));
   for(const table of tripTables){await tx.execute(sql.raw(`create table ${schema}.${table} (like public.${table} including all)`));await tx.execute(sql.raw(`insert into ${schema}.${table} select * from public.${table}`));}
   const fks=await tx.execute(sql`select c.relname as table_name,k.conname,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and k.contype='f' and c.relname in (${sql.join(tripTables.map(t=>sql`${t}`),sql`,`)})`);
   for(const r of fks.rows){assert(tripTables.includes(r.table_name as typeof tripTables[number]));assert(/^[a-z_]+$/.test(String(r.conname)));const definition=String(r.definition).replace(/REFERENCES (?:public\.)?(trip_[a-z_]+)/g,`REFERENCES ${schema}.$1`);await tx.execute(sql.raw(`alter table ${schema}.${r.table_name} add constraint ${r.conname} ${definition}`));}
   for(const statement of migrations[24].sql.filter(s=>/CREATE FUNCTION|CREATE TRIGGER|DO \$\$ DECLARE t text/.test(s)))await tx.execute(sql.raw(statement));
   for(const statement of migrations[25].sql.filter(s=>/CREATE FUNCTION|DO \$\$ DECLARE t text/.test(s)))await tx.execute(sql.raw(statement));
  }
  await tx.execute(sql.raw(`lock table ${tripTables.join(",")} in access exclusive mode`));
  const before=await tripBackup(tx);
  const definition=await tx.execute(sql`select pg_get_functiondef('tosker_fp3_card_projection()'::regprocedure) as definition`);
  if(mode==="--apply-review"){
   const path=`${directory}/review-before-${Date.now()}.json`,backup={migrationHash:migration.hash,data:before,definition:definition.rows[0].definition};
   writeFileSync(path,JSON.stringify(backup),{mode:0o600,flag:"wx"});assert.deepEqual(JSON.parse(readFileSync(path,"utf8")),backup);
   checked("Private verified pre-migration backup, including projection function");
  }
  for(const statement of migration.sql)await tx.execute(sql.raw(statement));
  assert.deepEqual(await tripBackup(tx),before);checked("Migration preserves every trip row byte-for-byte");
  if(mode==="--apply-review"){
   await tx.execute(sql`insert into drizzle.__drizzle_migrations(hash,created_at) values(${migration.hash},${migration.folderMillis})`);return;
  }
  const testDb=tx as unknown as ToskerDatabase;
  const actor=(userId:string):AuthenticatedActor=>({userId,authProvider:"qa-server-test",authSubject:"isolated-service-test"});
  const a=actor(fixture.qaUserIds[0]),b=actor(fixture.qaUserIds[1]),f=actor(fixture.founderId);
  const read=()=>readTrip(testDb,a,fixture.slug);
  const change=async(command:TripCommand,who=a,scope=fixture.slug)=>mutateTrip(testDb,who,{roomSlug:scope,requestId:randomUUID(),expectedRevision:(await readTrip(testDb,who,scope)).revision,command});
  const source=(await change({type:"create-route",name:"Move rehearsal source",color:"gold"})).resultId!;
  const target=(await change({type:"create-route",name:"Move rehearsal target",color:"sky"})).resultId!;
  const ids:string[]=[];
  for(let i=0;i<3;i++)ids.push((await change({type:"add",routeId:source,candidate:{source:"pin",title:`Synthetic transfer ${i}`,latitude:1.28+i/1000,longitude:103.86,provider:null,providerId:null,address:"Synthetic QA only",attribution:"",license:""}})).resultId!);
  const card=ids[1];
  await change({type:"comment",placeId:card,body:"Synthetic comment retained through transfer"},b);
  await change({type:"star-place",placeId:card,starred:true});await change({type:"skip-place",placeId:card,skipped:true});
  await change({type:"lock-position",routeId:source,position:2,locked:true});
  const locked=await read();await assert.rejects(()=>change({type:"move-place",placeId:card,routeId:target}));assert.deepEqual(await read(),locked);
  await change({type:"lock-position",routeId:source,position:2,locked:false});
  await assert.rejects(()=>change({type:"move-place",placeId:ids[0],routeId:target}));
  checked("Locked moved card or affected later position rejects atomically");
  const beforeMove=await read(),comments=await readTripComments(testDb,b,fixture.slug,card);
  const request={roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:beforeMove.revision,command:{type:"move-place" as const,placeId:card,routeId:target}};
  await mutateTrip(testDb,b,request);assert((await mutateTrip(testDb,b,request)).replayed);
  const moved=await read();assert.deepEqual(moved.places.find(p=>p.id===card),beforeMove.places.find(p=>p.id===card));assert.deepEqual(await readTripComments(testDb,a,fixture.slug,card),comments);
  assert.equal(moved.memberships.find(p=>p.placeId===card)?.routeId,target);assert.equal(moved.memberships.find(p=>p.placeId===ids[2])?.position,1);
  assert.deepEqual(await readTrip(testDb,b,fixture.slug),await readTrip(testDb,f,fixture.slug));
  const projection=await tx.execute(sql`select route_id from trip_route_places where place_id=${card}::uuid`);assert.equal(projection.rows.length,1);assert.equal(projection.rows[0].route_id,target);
  checked("Identity, comments, private-state key, metadata and projection preserved; A/B/founder reconcile; retry idempotent");
  await assert.rejects(()=>mutateTrip(testDb,b,{...request,requestId:randomUUID()}));
  await assert.rejects(()=>mutateTrip(testDb,b,{...request,command:{type:"move-place",placeId:ids[2],routeId:target}}));
  const duplicate=(await change({type:"copy-place",placeId:ids[2],routeId:target})).resultId!;
  await assert.rejects(()=>change({type:"move-place",placeId:ids[2],routeId:target}));
  await change({type:"archive-place",placeId:duplicate,archived:true});await assert.rejects(()=>change({type:"move-place",placeId:ids[2],routeId:target}));
  checked("Stale revision, changed retry, active/archived duplicate refuse without merge");
  const selectedScope=`${fixture.slug}--${fixture.selectedId}`;
  const foreign=(await change({type:"create-route",name:"Selected-only source",color:"rose"},a,selectedScope)).resultId!;
  await assert.rejects(()=>change({type:"move-place",placeId:ids[2],routeId:foreign}));
  await assert.rejects(()=>readTrip(testDb,b,selectedScope));await readTrip(testDb,f,selectedScope);
  await assert.rejects(async()=>mutateTrip(testDb,actor(randomUUID()),{...request,expectedRevision:(await read()).revision}));
  checked("Cross-context destination, nonmember and selected-Subroom boundaries remain enforced");
  await assert.rejects(()=>tx.transaction(t=>t.execute(sql`update trip_places set route_id=${source}::uuid where id=${card}::uuid`)));
  await assert.rejects(()=>tx.transaction(t=>t.execute(sql`update trip_route_places set position=position where place_id=${card}::uuid`)));
  await assert.rejects(()=>tx.transaction(async t=>{await t.execute(sql`select set_config('tosker.trip_protocol','3',true)`);await t.execute(sql`update trip_places set title=title where id=${card}::uuid`);}));
  checked("Unmarked ownership change, projection write and old protocol rejected");
  const rollbackTarget=(await change({type:"create-route",name:"Atomic rollback target",color:"sage"})).resultId!;
  const snapshot=await read();
  await assert.rejects(()=>tx.transaction(async t=>{await mutateTrip(t as unknown as ToskerDatabase,a,{roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:snapshot.revision,command:{type:"move-place",placeId:ids[2],routeId:rollbackTarget}});throw rollback;}),error=>error===rollback);
  assert.deepEqual(await read(),snapshot);
  checked("Successful transfer and its receipt fully roll back on later transaction failure");
  // Legacy protocol-4 operations remain usable after this function-only migration.
  await change({type:"star-place",placeId:card,starred:false});
  await change({type:"nuke-route",routeId:source});assert((await read()).places.some(p=>p.id===card));assert.equal((await readTripComments(testDb,a,fixture.slug,card)).comments.length,1);
  checked("Legacy protocol-4 write and source-route Nuke leave transferred card/comments intact");
  throw rollback;
 });}catch(error){if(error!==rollback)throw error;}
 assert.deepEqual(await db.transaction(tx=>tripBackup(tx)),beforePublic,"Public trip records unchanged");
 checked(mode==="--rehearse"?"Public trip records unchanged; rehearsal schema rolled back":"Review trip records unchanged; exact migration journal appended");record.pass=true;
 if(mode==="--rehearse")writeFileSync(`${directory}/rehearsal-pass.json`,JSON.stringify(record,null,2),{mode:0o600});
}
run().catch(error=>{console.error(JSON.stringify({pass:false,kind:error instanceof assert.AssertionError?"assertion":"database",code:error?.cause?.code??error?.code??null}));process.exitCode=1;}).finally(async()=>{writeFileSync(`${directory}/${mode.slice(2)}-${Date.now()}.json`,JSON.stringify(record,null,2),{mode:0o600});console.log(JSON.stringify({pass:record.pass,mode,checks:record.checks}));await db.$client.end();});
