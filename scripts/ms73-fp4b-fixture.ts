import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { mapPins,mapPinReceipts } from "../src/server/db/schema";
import { createQaFixture,cleanupQaFixture,resolveQaActors,type QaFixture } from "./lib/ms73-fixtures";
import { mutateTrip,readTrip } from "../src/server/trips/service";
const db=getDatabase(),directory=".git/fp4b-recovery",path=`${directory}/browser-fixture.json`;
async function main(){
  const mode=process.argv[2];
  if(mode==="--create"){
    assert(!existsSync(path),"Receipt exists: inspect, never recreate/reseed");
    const result=await db.transaction(async tx=>{
      const d=tx as unknown as ToskerDatabase,{a}=await resolveQaActors(tx);
      const fixture=await createQaFixture(d,"FP4B canonical Pins and Sandbox projections browser A/B");
      const routes=[];
      for(const [name,color] of [["Pin QA route 1","gold"],["Pin QA route 2","sky"]] as const){
        routes.push((await mutateTrip(d,a,{roomSlug:fixture.slug,expectedRevision:(await readTrip(d,a,fixture.slug)).revision,requestId:randomUUID(),command:{type:"create-route",name,color}})).resultId);
      }
      return {fixture,routes};
    });
    mkdirSync(directory,{recursive:true,mode:0o700});writeFileSync(path,JSON.stringify(result),{mode:0o600,flag:"wx"});
    console.log(JSON.stringify(result));return;
  }
  assert(["--inspect","--cleanup"].includes(mode));
  const {fixture}=JSON.parse(readFileSync(path,"utf8")) as {fixture:QaFixture};
  await db.transaction(async tx=>{
    const {a,b}=await resolveQaActors(tx),allowed=[a.userId,b.userId];
    const pins=await tx.select().from(mapPins).where(eq(mapPins.conversationId,fixture.conversationId));
    const receipts=await tx.select().from(mapPinReceipts).where(eq(mapPinReceipts.conversationId,fixture.conversationId));
    assert(pins.every(p=>allowed.includes(p.creatorId))&&receipts.every(r=>allowed.includes(r.actorId)),"STOP: founder/non-QA Pin contribution; preserve fixture");
    console.log(await cleanupQaFixture(tx as unknown as ToskerDatabase,fixture,mode==="--cleanup"));
  });
}
main().catch(e=>{console.error(JSON.stringify({failure:"FP4B fixture stopped",kind:e instanceof Error?e.name:"unknown",assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined,code:e?.cause?.code??e?.code??null}));process.exitCode=1;}).finally(()=>db.$client.end());
