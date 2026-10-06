/** Shadow-only browser fixture. Public founder data is never a test setup target. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {existsSync,readFileSync,writeFileSync} from "node:fs";
import {sql} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
import {createQaFixture,cleanupQaFixture,resolveQaActors,type QaFixture} from "./lib/ms73-fixtures";
import {readTrip,mutateTrip} from "../src/server/trips/service";
import type {TripCommand} from "../src/lib/trip-contract";
const db=getDatabase(),path=".git/fp5-recovery/browser-fixture.json";
async function main(){
  const receipt=JSON.parse(readFileSync(".git/fp5-recovery/browser-schema.json","utf8"));
  const current=await db.execute(sql`select current_schema() as name`);
  assert(/^fp5_rehearsal_[a-f0-9]{32}$/.test(receipt.schema)&&current.rows[0].name===receipt.schema,"STOP: exact FP5 shadow required");
  const {a}=await resolveQaActors(db);
  if(process.argv[2]==="--create"){
    assert(!existsSync(path),"Receipt exists; inspect before continuing");
    const fixture=await createQaFixture(db,"FP5 isolated Map interaction and private Sandbox acceptance; disposable");
    writeFileSync(path,JSON.stringify({fixture},null,2),{mode:0o600,flag:"wx"});
    const change=async(command:TripCommand)=>mutateTrip(db,a,{roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:(await readTrip(db,a,fixture.slug)).revision,command});
    const routeId=(await change({type:"create-route",name:"FP5 Singapore QA",color:"gold"})).resultId!;
    for(const [latitude,longitude] of [[1.2837,103.8607],[1.2868,103.8545],[1.2897,103.8555],[1.2906,103.8519],[1.2873,103.8513]])await change({type:"add",routeId,candidate:{title:"Checkpoint",source:"pin",latitude,longitude,provider:null,providerId:null,address:"Synthetic QA checkpoint; not a verified venue",attribution:"",license:""}});
    const secondId=(await change({type:"create-route",name:"FP5 second route",color:"sky"})).resultId!;
    writeFileSync(path,JSON.stringify({fixture,routeId,secondId},null,2),{mode:0o600});
    console.log(JSON.stringify({room:fixture.slug,purpose:fixture.purpose,founderIncluded:true,providerRequests:0}));return;
  }
  assert(["--inspect","--cleanup"].includes(process.argv[2]));
  const {fixture}=JSON.parse(readFileSync(path,"utf8")) as {fixture:QaFixture};
  console.log(await cleanupQaFixture(db,fixture,process.argv[2]==="--cleanup"));
}
main().catch(e=>{console.error(JSON.stringify({failure:"FP5 fixture stopped",kind:e instanceof Error?e.name:"unknown",assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined,code:e?.cause?.code??e?.code??null}));process.exitCode=1;}).finally(()=>db.$client.end());
