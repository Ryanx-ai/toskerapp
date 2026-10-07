/** Fresh FP6 Room only. Never reuse FP5 receipts or touch retained founder data. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { mapPins, mapPinReceipts } from "../src/server/db/schema";
import { createQaFixture, cleanupQaFixture, resolveQaActors } from "./lib/ms73-fixtures";
import { mutateTrip, readTrip } from "../src/server/trips/service";
const db=getDatabase(), path=".git/fp6-recovery/fixture.json";
async function main(){
  const mode=process.argv[2]; assert(["--create","--inspect","--cleanup"].includes(mode));
  if(mode==="--create"){
    assert(!existsSync(path),"Existing FP6 receipt: inspect, never reseed");
    const receipt=await db.transaction(async tx=>{
      const d=tx as unknown as ToskerDatabase,{a}=await resolveQaActors(tx);
      const fixture=await createQaFixture(d,"FP6 A/B reorder, search, origin and ephemeral Ping acceptance; disposable");
      const items=[{title:"QA Marina Bay Sands",source:"search" as const,latitude:1.2837,longitude:103.8607},{title:"Checkpoint",source:"pin" as const,latitude:1.2897,longitude:103.8555},{title:"QA Gardens",source:"search" as const,latitude:1.2818,longitude:103.8636},{title:"Checkpoint",source:"pin" as const,latitude:1.286,longitude:103.851}];
      let routeId:string|null=null;
      for(const item of items){const plan=await readTrip(d,a,fixture.slug);await mutateTrip(d,a,{roomSlug:fixture.slug,expectedRevision:plan.revision,requestId:randomUUID(),command:{type:"add",routeId,candidate:{...item,provider:item.source==="search"?"qa":null,providerId:item.source==="search"?`fp6-${item.title}`:null,address:"Synthetic QA only · Singapore",attribution:"QA fixture",license:"QA"}}});routeId=(await readTrip(d,a,fixture.slug)).routes[0].id;}
      return {fixture,routeId};
    });
    writeFileSync(path,JSON.stringify(receipt,null,2),{mode:0o600,flag:"wx"});console.log({room:receipt.fixture.slug,founderIncluded:true,providerCalls:0});return;
  }
  const r=JSON.parse(readFileSync(path,"utf8"));
  await db.transaction(async tx=>{
    const d=tx as unknown as ToskerDatabase,{a,b}=await resolveQaActors(tx);
    const pins=await tx.select().from(mapPins).where(eq(mapPins.conversationId,r.fixture.conversationId));
    const receipts=await tx.select().from(mapPinReceipts).where(eq(mapPinReceipts.conversationId,r.fixture.conversationId));
    assert([...pins.map(p=>p.creatorId),...receipts.map(r=>r.actorId)].every(id=>[a.userId,b.userId].includes(id)));
    console.log(await cleanupQaFixture(d,r.fixture,mode==="--cleanup"));
  });
}
main().catch(e=>{console.error({failure:"FP6 fixture stopped",kind:e?.name,assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined});process.exitCode=1;}).finally(()=>db.$client.end());
