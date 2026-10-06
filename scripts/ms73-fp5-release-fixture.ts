/** Public FP5 smoke only. Separate receipt from shadow; exact-owned cleanup. */
import assert from "node:assert/strict";
import {existsSync,readFileSync,writeFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {and,eq,sql} from "drizzle-orm";
import {getDatabase,type ToskerDatabase} from "../src/server/db/client";
import {conversations,tripPlans,tripRoutes,tripMutationReceipts,mapPins,mapPinReceipts,tripComments} from "../src/server/db/schema";
import {createQaFixture,cleanupQaFixture,resolveQaActors} from "./lib/ms73-fixtures";
import {readTrip,mutateTrip} from "../src/server/trips/service";
const db=getDatabase(),path=".git/fp5-recovery/release-fixture.json";
async function main(){
  const ns=await db.execute(sql`select current_schema() as name,(select count(*)::int from drizzle.__drizzle_migrations) as migrations`);assert.deepEqual(ns.rows[0],{name:"public",migrations:28});
  const mode=process.argv[2];assert(["--create","--inspect","--cleanup"].includes(mode));
  if(mode==="--create"){
    assert(!existsSync(path),"Existing release receipt: inspect; never reseed");
    const receipt=await db.transaction(async tx=>{
      const d=tx as unknown as ToskerDatabase,{a}=await resolveQaActors(tx);
      const fixture=await createQaFixture(d,"FP5 bounded canonical A/B direct Route planning smoke; disposable");
      const routeId=(await mutateTrip(d,a,{roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:0,command:{type:"create-route",name:"FP5 live QA",color:"gold"}})).resultId!;
      for(const[latitude,longitude]of[[1.2837,103.8607],[1.2897,103.8555]])await mutateTrip(d,a,{roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:(await readTrip(d,a,fixture.slug)).revision,command:{type:"add",routeId,candidate:{title:"Checkpoint",source:"pin",latitude,longitude,provider:null,providerId:null,address:"Synthetic FP5 canonical QA only",attribution:"",license:""}}});
      const[sandbox]=await tx.select().from(conversations).where(and(eq(conversations.ownerId,a.userId),eq(conversations.kind,"sandbox")));assert(sandbox);
      const scope=`sandbox--${sandbox.id}`;assert.equal((await readTrip(d,a,scope)).routes.length,0,"Do not commandeer existing QA-user planning data");
      assert.equal((await tx.select().from(tripPlans).where(eq(tripPlans.sandboxConversationId,sandbox.id))).length,0,"Only a newly owned private plan may be cleaned");
      const privateRouteId=(await mutateTrip(d,a,{roomSlug:scope,requestId:randomUUID(),expectedRevision:0,command:{type:"create-route",name:"FP5 live private QA",color:"sky"}})).resultId!;
      const[plan]=await tx.select().from(tripPlans).where(eq(tripPlans.sandboxConversationId,sandbox.id));
      return {fixture,routeId,privateRouteId,privatePlanId:plan.id,sandboxId:sandbox.id};
    });
    writeFileSync(path,JSON.stringify(receipt,null,2),{mode:0o600,flag:"wx"});console.log(JSON.stringify({room:receipt.fixture.slug,founderIncluded:true,privateRoute:receipt.privateRouteId,providerCalls:0}));return;
  }
  const r=JSON.parse(readFileSync(path,"utf8"));
  await db.transaction(async tx=>{
    const d=tx as unknown as ToskerDatabase,{a,b}=await resolveQaActors(tx),allowed=[a.userId,b.userId];
    const pins=await tx.select().from(mapPins).where(eq(mapPins.conversationId,r.fixture.conversationId));const pinReceipts=await tx.select().from(mapPinReceipts).where(eq(mapPinReceipts.conversationId,r.fixture.conversationId));
    assert(pins.every(p=>allowed.includes(p.creatorId))&&pinReceipts.every(p=>allowed.includes(p.actorId)),"Preserve non-QA Pin contributions");
    const[plan]=await tx.select().from(tripPlans).where(and(eq(tripPlans.id,r.privatePlanId),eq(tripPlans.sandboxConversationId,r.sandboxId))).for("update");assert(plan);
    const[sandbox]=await tx.select().from(conversations).where(eq(conversations.id,r.sandboxId));assert(sandbox.kind==="sandbox"&&sandbox.ownerId===a.userId);
    const routes=await tx.select().from(tripRoutes).where(eq(tripRoutes.planId,plan.id));assert.equal(routes.length,1);assert.equal(routes[0].id,r.privateRouteId);assert.equal(routes[0].name,"FP5 live private QA");
    const changes=await tx.select().from(tripMutationReceipts).where(eq(tripMutationReceipts.planId,plan.id));assert(changes.every(c=>c.actorId===a.userId));
    const comments=await tx.select().from(tripComments).where(eq(tripComments.planId,plan.id));assert(comments.every(c=>c.authorId===a.userId));
    console.log(await cleanupQaFixture(d,r.fixture,mode==="--cleanup"));
    if(mode==="--cleanup"){await tx.execute(sql`select set_config('tosker.trip_protocol','4',true)`);await tx.delete(tripPlans).where(eq(tripPlans.id,plan.id));}
    console.log(JSON.stringify({privateOwnedPlan:r.privatePlanId,action:mode,sandboxAndProfileUntouched:true}));
  });
}
main().catch(e=>{console.error(JSON.stringify({failure:"FP5 release fixture stopped",kind:e?.name,assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined}));process.exitCode=1;}).finally(()=>db.$client.end());
