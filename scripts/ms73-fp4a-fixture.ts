/** Exact-owned browser fixture; run only through the verified FP4A shadow launcher before cutover. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {existsSync,readFileSync,writeFileSync} from "node:fs";
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
 assert(["--inspect","--cleanup-apply"].includes(process.argv[2]));
 const f=JSON.parse(readFileSync(path,"utf8")) as QaFixture;
 assert.equal(f.purpose,"FP4A isolated browser acceptance; A/B/founder; disposable");
 console.log(await cleanupQaFixture(db,f,process.argv[2]==="--cleanup-apply"));
}
main().catch(e=>{console.error("FP4A fixture stopped:",e instanceof Error?e.message:"unknown");process.exitCode=1;}).finally(()=>db.$client.end());
