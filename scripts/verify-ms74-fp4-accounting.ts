/** Real PostgreSQL concurrency in exact-owned isolated shadow tables.
 * No public counter reset, location payload, Clerk/Ably/Geoapify request. */
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {sql, type SQL} from "drizzle-orm";
import {Pool} from "@neondatabase/serverless";
import {drizzle} from "drizzle-orm/neon-serverless";
import {getDatabase,type ToskerDatabase,type ToskerTransaction} from "../src/server/db/client";
import {isIsolatedReview} from "../src/server/accounts/isolated-review";
import {reserveLocationRequest,reserveLocationSessionChecks} from "../src/server/location-sharing/capacity";
import {latestLocationService} from "../src/server/location-sharing/latest-service";
import {durableLocationService} from "../src/server/location-sharing/durable-service";
import {reserveCleanup} from "../src/server/location-sharing/durable-cleanup";
assert(isIsolatedReview());
const db=getDatabase(),name=`fp4_budget_${randomUUID().replaceAll("-","")}`;
assert(/^fp4_budget_[a-f0-9]{32}$/.test(name));
const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));
const path=`.git/ms74-fp4/accounting-${Date.now()}.json`;
const evidence={pass:false,at:new Date().toISOString(),schema:name,checks:[] as string[],publicUnchanged:false,cleaned:false,providerCalls:0};
writeFileSync(path,JSON.stringify(evidence),{mode:0o600,flag:"wx"});
const pools:Pool[]=[];let created=false,phase="ownership",before="";
const fingerprint=async()=>createHash("sha256").update(JSON.stringify([
 (await db.execute(sql`select * from public.map_provider_usage order by scope`)).rows,
 (await db.execute(sql`select * from public.location_cleanup_budget order by day`)).rows,
])).digest("hex");
function worker(){
 const pool=new Pool({connectionString:process.env.DATABASE_URL});pools.push(pool);
 const client=drizzle(pool);
 const transaction=<T>(fn:(tx:ToskerTransaction)=>Promise<T>)=>client.transaction(async tx=>{
  // Explicit pg_catalog position permits ONLY this owned test schema's clock.
  await tx.execute(sql.raw(`set local search_path=${name},pg_catalog,public`));
  await tx.execute(sql`set local lock_timeout='10s'`);await tx.execute(sql`set local statement_timeout='15s'`);
  return fn(tx as unknown as ToskerTransaction);
 });
 return {execute:(query:SQL)=>transaction(tx=>tx.execute(query)),transaction} as unknown as ToskerDatabase;
}
const tick=(date:string)=>db.execute(sql`update ${sql.identifier(name)}.test_clock set t=${date}::timestamptz`);
const check=(name:string)=>{evidence.checks.push(name);console.log(JSON.stringify({gate:name}));};
async function run(){
 const found=(await db.execute(sql`select u.id from public.users u join public.room_memberships m on m.user_id=u.id
   join public.rooms r on r.id=m.room_id where u.tid='8V3X7P1' and r.id=${fixture.roomId}::uuid
   and r.owner_id=${fixture.ownerId}::uuid and r.slug=${fixture.slug} and r.created_at=${fixture.createdAt}::timestamptz`)).rows;
 assert.equal(found.length,1);assert.equal(found[0].id,fixture.founderId);
 before=await fingerprint();
 await db.transaction(async tx=>{
  await tx.execute(sql.raw(`create schema ${name}`));
  for(const table of ["map_provider_usage","location_cleanup_budget","location_cleanup_reservations","location_cleanup_health"])
   await tx.execute(sql.raw(`create table ${name}.${table} (like public.${table} including all)`));
  await tx.execute(sql.raw(`create table ${name}.test_clock(t timestamptz not null)`));
  await tx.execute(sql.raw(`insert into ${name}.test_clock values('2026-10-26T18:00:00Z')`));
  await tx.execute(sql.raw(`create function ${name}.clock_timestamp() returns timestamptz language sql stable as 'select t from ${name}.test_clock'`));
 });created=true;
 const workers=[worker(),worker(),worker()];const a=workers[0];
 phase="historical hold";
 await assert.rejects(()=>reserveLocationRequest(a,"current"));await assert.rejects(()=>reserveLocationRequest(a,"begin"));
 assert.equal((await a.execute(sql`select count(*)::int n from map_provider_usage`)).rows[0].n,0);
 check("Unknown historical UTC26October stays held without inventing counts");
 await tick("2026-10-27T12:00:00Z");phase="single and failure";
 await reserveLocationRequest(a,"current");
 assert.equal((await a.execute(sql`select used from map_provider_usage where scope='location:reads:day'`)).rows[0].used,1);
 const actor={userId:fixture.qaUserIds[0],authProvider:"offline-qa",authSubject:"no-provider-session"};
 for(const service of [latestLocationService(a),durableLocationService(a)]){
  await assert.rejects(()=>service.read(actor,"offline","invalid-context"));
  await assert.rejects(()=>service.read({...actor,userId:fixture.qaUserIds[1]},"offline","invalid-context"));
 }
 assert.equal((await a.execute(sql`select used from map_provider_usage where scope='location:reads:day'`)).rows[0].used,5);
 // Valid IDs then fail missing worker / disabled capacity after charging.
 await assert.rejects(()=>latestLocationService(a).read(actor,"offline",fixture.conversationId));
 await assert.rejects(()=>durableLocationService(a).read(actor,"offline",fixture.conversationId));
 assert.equal((await a.execute(sql`select used from map_provider_usage where scope='location:reads:day'`)).rows[0].used,7);
 check("One charge per read; invalid/failed/retried calls across local and hosted services remain charged");
 phase="later rollback";
 await reserveLocationRequest(a,"current");
 const rollback=new Error("Expected shadow rollback");
 await assert.rejects(()=>a.transaction(async tx=>{await tx.execute(sql`select 1`);throw rollback;}),e=>e===rollback);
 assert.equal((await a.execute(sql`select used from map_provider_usage where scope='location:reads:day'`)).rows[0].used,8);
 check("Later request transaction rollback cannot refund committed admission");
 phase="concurrent workers";
 await a.execute(sql`update map_provider_usage set used=798 where scope='location:reads:day'`); // owned shadow only
 const many=await Promise.allSettled(Array.from({length:12},(_,i)=>reserveLocationRequest(workers[i%3],"current")));
 assert.equal(many.filter(x=>x.status==="fulfilled").length,2);
 assert.equal((await a.execute(sql`select used from map_provider_usage where scope='location:reads:day'`)).rows[0].used,800);
 for(const service of [latestLocationService(a),durableLocationService(a,{capacity:()=>true})])
  await assert.rejects(()=>service.read(actor,"offline",fixture.conversationId));
 check("Three independent worker pools / twelve tab-user requests: exactly two remaining slots; exhausted reads return no view");
 phase="restart";
 await pools[1].end();const restarted=worker();workers[1]=restarted;
 await assert.rejects(()=>reserveLocationRequest(restarted,"current"));
 assert.equal((await restarted.execute(sql`select used from map_provider_usage where scope='location:reads:day'`)).rows[0].used,800);
 check("Restarted connection cannot refund or bypass persisted exhaustion");
 phase="consent attempts";
 const consents=await Promise.allSettled(Array.from({length:24},()=>reserveLocationRequest(a,"begin")));
 assert.equal(consents.filter(x=>x.status==="fulfilled").length,20);
 assert.equal((await a.execute(sql`select reserved from location_cleanup_budget where day='2026-10-27'`)).rows[0].reserved,20);
 check("Concurrent consent attempts atomically enforce20 review cap using existing reservation budget");
 phase="session checks";
 const sessions=await Promise.allSettled(Array.from({length:36},()=>reserveLocationSessionChecks(a)));
 assert.equal(sessions.filter(x=>x.status==="fulfilled").length,30);
 await tick("2026-10-27T12:00:10Z");await reserveLocationSessionChecks(a);
 assert.equal((await a.execute(sql`select used from map_provider_usage where scope='location:session-checks:10s'`)).rows[0].used,1);
 await assert.rejects(()=>reserveLocationSessionChecks(a,31));
 check("Thirty checks/10seconds enforced atomically; next fixed window admits one; invalid cost denied");
 phase="UTC rollover";
 await tick("2026-10-27T23:59:59.999Z");await assert.rejects(()=>reserveLocationRequest(a,"current"));
 await tick("2026-10-28T00:00:00Z");await reserveLocationRequest(a,"current");await reserveLocationRequest(a,"begin");
 assert.deepEqual((await a.execute(sql`select "window",used from map_provider_usage where scope='location:reads:day'`)).rows[0],{window:"2026-10-28",used:1});
 assert.equal((await a.execute(sql`select reserved from location_cleanup_budget where day='2026-10-27'`)).rows[0].reserved,20);
 assert.equal((await a.execute(sql`select reserved from location_cleanup_budget where day='2026-10-28'`)).rows[0].reserved,1);
 await tick("2026-10-27T23:59:59Z");await assert.rejects(()=>reserveLocationRequest(a,"current"));
 check("Database UTC boundary only; prior consent rows preserved; backward clock cannot reset read counter");
 phase="failed consent persists";await tick("2026-10-28T12:00:00Z");
 await assert.rejects(()=>latestLocationService(a).begin(actor,"offline","invalid-context","area"));
 await assert.rejects(()=>durableLocationService(a).begin(actor,"offline","invalid-context","area",new AbortController().signal));
 assert.equal((await a.execute(sql`select reserved from location_cleanup_budget where day='2026-10-28'`)).rows[0].reserved,3);
 check("Failed local/hosted consent attempts persist outside subsequent service work");
 phase="cleanup no duplicate charge";
 await assert.rejects(()=>a.transaction(async tx=>{await reserveCleanup(tx);throw rollback;}),e=>e===rollback);
 assert.equal((await a.execute(sql`select reserved from location_cleanup_budget where day='2026-10-28'`)).rows[0].reserved,3);
 assert.equal((await a.execute(sql`select count(*)::int n from location_cleanup_reservations`)).rows[0].n,0);
 check("Cleanup reservation does not charge consent twice; rollback removes obligation but preserves admission");
 phase="hosted caps in shadow only";
 // Change only limit selection, synchronously scoped to this shadow-only test.
 // No service call or public write is allowed in this block.
 const reviewFlag=process.env.TOSKER_ISOLATED_REVIEW;
 try{
  delete process.env.TOSKER_ISOLATED_REVIEW;
  await a.execute(sql`update map_provider_usage set used=1998 where scope='location:reads:day'`);
  const hosted=await Promise.allSettled(Array.from({length:6},(_,i)=>reserveLocationRequest(workers[i%3],"current")));
  assert.equal(hosted.filter(x=>x.status==="fulfilled").length,2);
  assert.equal((await a.execute(sql`select used from map_provider_usage where scope='location:reads:day'`)).rows[0].used,2000);
  await a.execute(sql`update location_cleanup_budget set reserved=98 where day='2026-10-28'`);
  const admits=await Promise.allSettled(Array.from({length:6},()=>reserveLocationRequest(a,"begin")));
  assert.equal(admits.filter(x=>x.status==="fulfilled").length,2);
  assert.equal((await a.execute(sql`select reserved from location_cleanup_budget where day='2026-10-28'`)).rows[0].reserved,100);
 }finally{process.env.TOSKER_ISOLATED_REVIEW=reviewFlag;}
 check("Hosted SQL retains2000 reads and100 consent attempts; concurrent workers cannot exceed either cap");
 evidence.pass=true;
}
run().catch(e=>{evidence.pass=false;console.error(JSON.stringify({phase,type:e.name,sqlState:/^[0-9A-Z]{5}$/.test(e?.cause?.code??"")?e.cause.code:undefined}));process.exitCode=1;}).finally(async()=>{
 for(const pool of pools)if(!pool.ended)await pool.end();
 if(created){await db.execute(sql.raw(`drop schema ${name} cascade`));evidence.cleaned=true;}
 if(before){evidence.publicUnchanged=(await fingerprint())===before;if(!evidence.publicUnchanged){evidence.pass=false;process.exitCode=1;}}
 writeFileSync(path,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,path}));await db.$client.end();
});
