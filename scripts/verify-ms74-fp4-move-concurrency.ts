/** Isolated synthetic shadow tables; concurrent real service transactions, no public writes. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {sql} from "drizzle-orm";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {getDatabase,type ToskerDatabase,type ToskerTransaction} from "../src/server/db/client";
import {mutateTrip,readTrip,readTripComments} from "../src/server/trips/service";
import type {AuthenticatedActor} from "../src/server/auth/actor";
import type {TripCommand,TripMutation} from "../src/lib/trip-contract";
import {tripTables,tripBackup} from "./lib/ms73-fp3-migration";
import {REVIEW_HOST,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";

assert.equal(new URL(process.env.DATABASE_URL!).hostname,REVIEW_HOST);
assert.equal(process.env.NEON_PROJECT_ID,REVIEW_PROJECT);
const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));
assert.equal(fixture.project,REVIEW_PROJECT);assert.equal(fixture.status,"committed");
const db=getDatabase(),schema=`fp4_concurrency_${randomUUID().replaceAll("-","")}`;
assert(/^fp4_concurrency_[a-f0-9]{32}$/.test(schema));
const path=`.git/ms74-fp4/migration/concurrency-${Date.now()}.json`;
const evidence={pass:false,schema,checks:[] as string[],publicUnchanged:false,cleaned:false};
writeFileSync(path,JSON.stringify(evidence),{flag:"wx",mode:0o600});
const migrations=readMigrationFiles({migrationsFolder:"drizzle"});assert.equal(migrations.length,34);
const actors=fixture.qaUserIds.map((userId:string):AuthenticatedActor=>({userId,authProvider:"qa-server-test",authSubject:"isolated-service-test"}));
const [a,b]=actors;
const scoped=<T>(fn:(tx:ToskerTransaction)=>Promise<T>)=>db.transaction(async tx=>{
  await tx.execute(sql.raw(`set local search_path=${schema},public`));
  await tx.execute(sql`set local lock_timeout='10s'`);await tx.execute(sql`set local statement_timeout='30s'`);
  return fn(tx);
});
const read=()=>scoped(tx=>readTrip(tx as unknown as ToskerDatabase,a,fixture.slug));
const request=async(command:TripCommand):Promise<TripMutation>=>({roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:(await read()).revision,command});
const mutate=(input:TripMutation,who=a)=>scoped(tx=>mutateTrip(tx as unknown as ToskerDatabase,who,input));
const change=async(command:TripCommand,who=a)=>mutate(await request(command),who);
let created=false,before:Awaited<ReturnType<typeof tripBackup>>|undefined;
async function run(){
 const founder=await db.execute(sql`select id from users where tid='8V3X7P1' limit 2`);
 assert.equal(founder.rows.length,1);assert.equal(founder.rows[0].id,fixture.founderId);
 const owned=await db.execute(sql`select id from rooms where id=${fixture.roomId}::uuid and owner_id=${fixture.ownerId}::uuid and slug=${fixture.slug} and created_at=${fixture.createdAt}::timestamptz`);assert.equal(owned.rows.length,1);
 const member=await db.execute(sql`select user_id from room_memberships where room_id=${fixture.roomId}::uuid`);
 assert.deepEqual(member.rows.map(r=>r.user_id).sort(),[...fixture.qaUserIds,fixture.founderId].sort());
 before=await db.transaction(tx=>tripBackup(tx));
 await db.transaction(async tx=>{
  await tx.execute(sql.raw(`create schema ${schema}`));await tx.execute(sql.raw(`set local search_path=${schema},public`));
  for(const table of tripTables){await tx.execute(sql.raw(`create table ${schema}.${table} (like public.${table} including all)`));await tx.execute(sql.raw(`insert into ${schema}.${table} select * from public.${table}`));}
  const fks=await tx.execute(sql`select c.relname as table_name,k.conname,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and k.contype='f' and c.relname in (${sql.join(tripTables.map(t=>sql`${t}`),sql`,`)})`);
  for(const r of fks.rows){assert(tripTables.includes(r.table_name as typeof tripTables[number]));assert(/^[a-z_]+$/.test(String(r.conname)));const definition=String(r.definition).replace(/REFERENCES (?:public\.)?(trip_[a-z_]+)/g,`REFERENCES ${schema}.$1`);await tx.execute(sql.raw(`alter table ${schema}.${r.table_name} add constraint ${r.conname} ${definition}`));}
  for(const index of [24,25])for(const statement of migrations[index].sql.filter(s=>/CREATE FUNCTION|CREATE TRIGGER|DO \$\$ DECLARE t text/.test(s)))await tx.execute(sql.raw(statement));
  for(const statement of migrations[33].sql)await tx.execute(sql.raw(statement));
 });created=true;
 const source=(await change({type:"create-route",name:"Concurrency source",color:"gold"})).resultId!;
 const left=(await change({type:"create-route",name:"Concurrency left",color:"sky"})).resultId!;
 const right=(await change({type:"create-route",name:"Concurrency right",color:"rose"})).resultId!;
 const cards:string[]=[];
 for(let i=0;i<3;i++)cards.push((await change({type:"add",routeId:source,candidate:{source:"pin",title:`Concurrent synthetic ${i}`,latitude:1.27+i/1000,longitude:103.85,provider:null,providerId:null,address:"Synthetic only",attribution:"",license:""}})).resultId!);
 await change({type:"comment",placeId:cards[1],body:"Synthetic concurrency comment"},b);
 const first=await request({type:"move-place",placeId:cards[1],routeId:left});
 const second={...first,requestId:randomUUID(),command:{type:"move-place" as const,placeId:cards[1],routeId:right}};
 const outcomes=await Promise.allSettled([mutate(first,a),mutate(second,b)]);
 assert.equal(outcomes.filter(r=>r.status==="fulfilled").length,1);
 const failure=outcomes.find(r=>r.status==="rejected") as PromiseRejectedResult;assert.equal(failure.reason.code,"conflict");
 const after=await read();assert.equal(after.revision,first.expectedRevision+1);
 const destination=after.memberships.find(m=>m.placeId===cards[1])!.routeId;assert([left,right].includes(destination));
 assert.equal((await scoped(tx=>readTripComments(tx as unknown as ToskerDatabase,b,fixture.slug,cards[1]))).comments.length,1);
 evidence.checks.push("A/B simultaneous same-card Move: exactly one commit, one conflict, one revision, comments retained");
 const retry=await request({type:"move-place",placeId:cards[2],routeId:left});
 const replay=await Promise.all([mutate(retry,a),mutate(retry,a)]);
 assert.equal(replay.filter(r=>r.replayed).length,1);assert.equal((await read()).revision,retry.expectedRevision+1);
 evidence.checks.push("Concurrent identical request commits once and replays once");
 await change({type:"archive-route",routeId:right,archived:true});
 await assert.rejects(()=>change({type:"move-place",placeId:cards[2],routeId:right}));
 await change({type:"archive-route",routeId:right,archived:false});
 await change({type:"archive-route",routeId:left,archived:true});
 await assert.rejects(()=>change({type:"move-place",placeId:cards[2],routeId:right}));
 await change({type:"archive-route",routeId:left,archived:false});
 evidence.checks.push("Archived source or destination rejects Move");
 const copied=(await change({type:"copy-place",placeId:cards[2],routeId:right})).resultId!;assert.notEqual(copied,cards[2]);
 await change({type:"nuke-place",placeId:copied});assert((await read()).places.some(p=>p.id===cards[2]));
 evidence.checks.push("Copy has independent identity; Nuke copy preserves original");
 await scoped(async tx=>{
  await tx.execute(sql`select set_config('tosker.trip_protocol','4',true)`);
  await assert.rejects(()=>tx.transaction(t=>t.execute(sql`update trip_places set id=${randomUUID()}::uuid where id=${cards[1]}::uuid`)));
  const projections=await tx.execute(sql`select count(*)::int n from trip_route_places where place_id=${cards[1]}::uuid`);assert.equal(projections.rows[0].n,1);
 });
 evidence.checks.push("Card identity remains immutable; exactly one compatibility projection");
 evidence.pass=true;
}
run().catch(error=>{evidence.pass=false;console.error(JSON.stringify({pass:false,kind:error instanceof assert.AssertionError?"assertion":"service/database",code:error?.cause?.code??error?.code??null}));process.exitCode=1;}).finally(async()=>{
 try{
  if(created){await db.execute(sql.raw(`drop schema ${schema} cascade`));evidence.cleaned=true;}
  if(before){assert.deepEqual(await db.transaction(tx=>tripBackup(tx)),before);evidence.publicUnchanged=true;}
 }catch{evidence.pass=false;process.exitCode=1;}
 writeFileSync(path,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,schema:undefined,receipt:path}));await db.$client.end();
});
