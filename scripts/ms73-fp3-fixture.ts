/** Exact-owned FP3 fixture. Never reuse historical receipts. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { getDatabase } from "../src/server/db/client";
import { messages } from "../src/server/db/schema";
import { readMessageHistory } from "../src/server/conversations/history";
import { searchConversation } from "../src/server/conversations/search";
import { createQaFixture, cleanupQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";
import { readTrip,mutateTrip } from "../src/server/trips/service";
import type { TripCommand } from "../src/lib/trip-contract";
const db=getDatabase(),path="docs/MS7-3-FP3-FIXTURE.json";
async function main(){
  const {a,b,founder}=await resolveQaActors(db);
  if(process.argv[2]==="--create"){
    assert(!existsSync(path),"Inspect saved receipt; no duplicate setup");
    const f=await createQaFixture(db,"FP3 Chat search, Singapore roads and route-owned lifecycle acceptance");
    const rows=Array.from({length:80},(_,i)=>({id:randomUUID(),conversationId:f.conversationId,authorId:i%2?b.userId:a.userId,body:`FP3 safe QA ${i+1}: ${i===0?"orchid earliest":i===35?"orchid middle":i===79?"orchid latest":"surrounding conversation"}`,createdAt:new Date(Date.now()-(80-i)*60000)}));
    await db.insert(messages).values(rows);
    assert.equal((await searchConversation(db,founder,f.conversationId,"orchid")).results.length,3);
    const latest=await readMessageHistory(db,a,f.conversationId);assert.equal(latest.messages.length,50);assert(!latest.messages.some(m=>m.id===rows[0].id));
    console.log(JSON.stringify({...f,oldest:rows[0].id,middle:rows[35].id,latest:rows[79].id}));return;
  }
  const f=JSON.parse(readFileSync(path,"utf8")) as QaFixture;
  assert.equal(f.purpose,"FP3 Chat search, Singapore roads and route-owned lifecycle acceptance");
  if(process.argv[2]==="--seed-map"){
    await cleanupQaFixture(db,f,false);
    assert.equal((await readTrip(db,a,f.slug)).routes.length,0,"No overwrite or duplicate seed");
    const change=async(command:TripCommand)=>mutateTrip(db,a,{roomSlug:f.slug,requestId:randomUUID(),expectedRevision:(await readTrip(db,a,f.slug)).revision,command});
    for(const name of ["FP3 public QA route","FP3 disposable route"]){
      const routeId=(await change({type:"create-route",name,color:name.includes("disposable")?"sky":"gold"})).resultId!;
      for(const [title,latitude,longitude] of [["QA western point",1.3045,103.7739],["QA Bayfront point",1.2836965,103.8607226],["QA eastern point",1.305948,103.929666]] as const){
        await change({type:"add",routeId,candidate:{title,latitude,longitude,source:"pin",provider:null,providerId:null,address:"Synthetic public QA point; not a verified venue",attribution:"",license:""}});
      }
    }
    console.log("PASS exact-owned A/B/founder fixture: two independent three-card routes, no provider call");return;
  }
  assert(["--inspect","--cleanup-apply"].includes(process.argv[2]));
  console.log(await cleanupQaFixture(db,f,process.argv[2]==="--cleanup-apply"));
}
main().catch(()=>{console.error("FP3 fixture stopped; inspect exact ownership assertions (details suppressed)");process.exitCode=1;}).finally(()=>db.$client.end());
