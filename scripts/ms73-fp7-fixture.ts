/** Exact-owned FP7 fixtures only. Founder resolution is inside each creation transaction. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { createQaFixture, cleanupQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";
import { mutateTrip, readTrip } from "../src/server/trips/service";
const db=getDatabase(),path=".git/fp7-recovery/fixtures.json";
async function main(){
  const mode=process.argv[2];assert(["--create","--inspect","--cleanup"].includes(mode));
  if(mode==="--create"){
    assert(!existsSync(path),"Existing FP7 receipt: inspect, never reseed");mkdirSync(".git/fp7-recovery",{recursive:true,mode:0o700});
    const receipt=await db.transaction(async tx=>{
      const d=tx as unknown as ToskerDatabase,{a}=await resolveQaActors(tx);
      const source=await createQaFixture(d,"FP7 origin/tag/card-copy/share A/B acceptance; disposable"),destination=await createQaFixture(d,"FP7 independent Route-copy destination A/B acceptance; disposable");
      const items=[{title:"Marina Bay Sands",source:"search" as const,latitude:1.2837,longitude:103.8607},{title:"Checkpoint",source:"pin" as const,latitude:1.286,longitude:103.855},{title:"Gardens by the Bay",source:"search" as const,latitude:1.2818,longitude:103.8636}];
      let routeId:string|null=null;
      for(const item of items){await mutateTrip(d,a,{roomSlug:source.slug,expectedRevision:(await readTrip(d,a,source.slug)).revision,requestId:randomUUID(),command:{type:"add",routeId,candidate:{...item,provider:item.source==="search"?"qa":null,providerId:item.source==="search"?`fp7-${item.title}`:null,address:"Synthetic QA planning point · Singapore",attribution:"QA fixture, not provider evidence",license:"QA"}}});routeId=(await readTrip(d,a,source.slug)).routes[0].id;}
      const second=await mutateTrip(d,a,{roomSlug:source.slug,expectedRevision:(await readTrip(d,a,source.slug)).revision,requestId:randomUUID(),command:{type:"create-route",name:"Day 2",color:"sky"}});
      return {source,destination,routeId,secondRouteId:second.resultId};
    });
    writeFileSync(path,JSON.stringify(receipt,null,2),{mode:0o600,flag:"wx"});console.log({source:receipt.source.slug,destination:receipt.destination.slug,founderIncluded:true,providerCalls:0});return;
  }
  const receipt=JSON.parse(readFileSync(path,"utf8")) as {source:QaFixture;destination:QaFixture};
  // Each cleanup independently verifies exact identity, members and no founder contributions.
  for(const fixture of [receipt.destination,receipt.source])console.log(await cleanupQaFixture(db,fixture,mode==="--cleanup"));
}
main().catch(e=>{console.error({failure:"FP7 fixture stopped",kind:e?.name,assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined});process.exitCode=1;}).finally(()=>db.$client.end());
