import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { getDatabase } from "../src/server/db/client";
import { mutateTrip, readTrip } from "../src/server/trips/service";
import { createQaFixture, cleanupQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";
const db=getDatabase();
async function main(){
  if(process.argv[2]==="--create"){
    const {a}=await resolveQaActors(db);const f=await createQaFixture(db,"FP1 A/B browser acceptance and six-width visual proof");
    console.log("RECEIPT",JSON.stringify(f));
    for(let i=0;i<5;i++)await mutateTrip(db,a,{roomSlug:f.slug,requestId:randomUUID(),expectedRevision:i,command:{type:"add",routeId:null,candidate:{title:i===2?"A deliberately long Singapore planning place name for focus reveal":`FP1 safe point ${i+1}`,latitude:1.2837+i*.002,longitude:103.8607-i*.001,source:"pin",provider:null,providerId:null,address:"Synthetic QA — not a verified venue",attribution:"",license:""}}});
    const plan=await readTrip(db,a,f.slug);assert.equal(plan.places.length,5);console.log("READY",f.slug);return;
  }
  assert(process.argv[3]?.endsWith(".json"),"Exact receipt path required");const f=JSON.parse(readFileSync(process.argv[3],"utf8")) as QaFixture;
  assert.equal(f.purpose,"FP1 A/B browser acceptance and six-width visual proof");
  console.log(await cleanupQaFixture(db,f,process.argv[2]==="--cleanup-apply"));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:"Sanitized fixture setup failure; retain receipt and inspect");process.exitCode=1;}).finally(()=>db.$client.end());
