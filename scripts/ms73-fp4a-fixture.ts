/** Exact-owned browser fixture; run only through the verified FP4A shadow launcher before cutover. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {existsSync,readFileSync,writeFileSync} from "node:fs";
import {eq,asc} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
import {messages} from "../src/server/db/schema";
import {createQaFixture,cleanupQaFixture,resolveQaActors,type QaFixture} from "./lib/ms73-fixtures";
import {readTrip,mutateTrip} from "../src/server/trips/service";
import type {TripCommand} from "../src/lib/trip-contract";
const db=getDatabase(),path=".git/fp4a-recovery/browser-fixture.json";
async function main(){
 const {a,b}=await resolveQaActors(db);
 if(process.argv[2]==="--create"){
  assert(!existsSync(path),"Inspect existing receipt; never duplicate setup");
  const f=await createQaFixture(db,"FP4A isolated browser acceptance; A/B/founder; disposable");
  writeFileSync(path,JSON.stringify(f,null,2),{mode:0o600,flag:"wx"});
  console.log(JSON.stringify(f));
  await db.insert(messages).values(Array.from({length:80},(_,i)=>({id:randomUUID(),conversationId:f.conversationId,authorId:i%2?b.userId:a.userId,body:`FP4A safe QA ${i+1}: ${[0,35,79].includes(i)?"orchid":"surrounding conversation"}`,createdAt:new Date(Date.now()-(80-i)*60000)})));
  const change=async(command:TripCommand)=>mutateTrip(db,a,{roomSlug:f.slug,requestId:randomUUID(),expectedRevision:(await readTrip(db,a,f.slug)).revision,command});
  const routeId=(await change({type:"create-route",name:"FP4A Singapore QA",color:"gold"})).resultId!;
  for(const [latitude,longitude] of [[1.2837,103.8607],[1.2868,103.8545],[1.2897,103.8555],[1.2906,103.8519],[1.2873,103.8513]])await change({type:"add",routeId,candidate:{title:"Checkpoint",source:"pin",latitude,longitude,provider:null,providerId:null,address:"Synthetic QA checkpoint; not a verified venue",attribution:"",license:""}});
  console.log("PASS five shared checkpoints seeded without provider calls");return;
 }
 assert(["--inspect","--cleanup-apply","--seed-short","--prepare-search"].includes(process.argv[2]));
 const f=JSON.parse(readFileSync(path,"utf8")) as QaFixture;
 assert.equal(f.purpose,"FP4A isolated browser acceptance; A/B/founder; disposable");
 if(process.argv[2]==="--prepare-search"){
  await cleanupQaFixture(db,f,false);
  const rows=await db.select().from(messages).where(eq(messages.conversationId,f.conversationId)).orderBy(asc(messages.createdAt));
  assert.equal(rows.length,80);assert(rows.every(r=>r.body.startsWith("FP4A safe QA ")));
  for(const [i,word] of [[0,"earliest"],[35,"middle"],[79,"latest"]] as const)await db.update(messages).set({body:`FP4A safe QA ${i+1}: orchid ${word}`}).where(eq(messages.id,rows[i].id));
  writeFileSync(path,JSON.stringify({...f,oldest:rows[0].id,middle:rows[35].id,latest:rows[79].id},null,2),{mode:0o600});console.log("PASS exact QA search fixture prepared");return;
 }
 if(process.argv[2]==="--seed-short"){
  await cleanupQaFixture(db,f,false);
  assert(!(await readTrip(db,a,f.slug)).routes.some(r=>r.name==="FP4A bounded roads"));
  const change=async(command:TripCommand)=>mutateTrip(db,a,{roomSlug:f.slug,requestId:randomUUID(),expectedRevision:(await readTrip(db,a,f.slug)).revision,command});
  const routeId=(await change({type:"create-route",name:"FP4A bounded roads",color:"sky"})).resultId!;
  for(const [latitude,longitude] of [[1.2837,103.8607],[1.2868,103.8545]])await change({type:"add",routeId,candidate:{title:"Checkpoint",source:"pin",latitude,longitude,provider:null,providerId:null,address:"Synthetic bounded routing QA",attribution:"",license:""}});
  console.log("PASS exact-owned two-point routing fixture; no provider calls");return;
 }
 console.log(await cleanupQaFixture(db,f,process.argv[2]==="--cleanup-apply"));
}
main().catch(e=>{console.error("FP4A fixture stopped:",e instanceof Error?e.message:"unknown");process.exitCode=1;}).finally(()=>db.$client.end());
