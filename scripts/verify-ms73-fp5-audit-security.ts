/** Actual public schema authorization/lifecycle probe, all writes rolled back. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {and,eq,sql} from "drizzle-orm";
import {getDatabase,type ToskerDatabase} from "../src/server/db/client";
import {conversations} from "../src/server/db/schema";
import {createQaFixture,resolveQaActors} from "./lib/ms73-fixtures";
import {readTrip,mutateTrip} from "../src/server/trips/service";
import {addPinToRoute,pinRouteChoices} from "../src/server/map-pins/transfer";
import {readTripComments} from "../src/server/trips/service";
import {AuthorizationDeniedError} from "../src/server/auth/authorize";
import {readPins,mutatePin} from "../src/server/map-pins/service";
import type {TripCommand} from "../src/lib/trip-contract";
const db=getDatabase(),rollback=new Error("owned FP5 public probe rollback");
async function main(){
  const before=await db.execute(sql`select (select count(*)::int from rooms) as rooms,(select count(*)::int from trip_mutation_receipts) as receipts`);
  try{await db.transaction(async tx=>{
    const history=await tx.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);assert.equal(history.rows[0].n,28);
    const ns=await tx.execute(sql`select current_schema() as name`);assert.equal(ns.rows[0].name,"public");
    const d=tx as unknown as ToskerDatabase,{a,b,founder}=await resolveQaActors(tx);
    const fixture=await createQaFixture(d,"FP5 actual post-cutover rollback authorization/lifecycle");
    const [sandbox]=await tx.select().from(conversations).where(and(eq(conversations.ownerId,a.userId),eq(conversations.kind,"sandbox")));
    assert(sandbox);const scope=`sandbox--${sandbox.id}`,read=()=>readTrip(d,a,scope);
    await assert.rejects(()=>readTrip(d,b,scope));await assert.rejects(()=>readTrip(d,founder,scope));await assert.rejects(()=>readTrip(d,a,`personal--${sandbox.id}`));
    const change=async(command:TripCommand)=>mutateTrip(d,a,{roomSlug:scope,requestId:randomUUID(),expectedRevision:(await read()).revision,command});
    const routeId=(await change({type:"create-route",name:"FP5 rollback QA",color:"gold"})).resultId!;
    const candidate={source:"pin" as const,title:"Checkpoint",latitude:1.3,longitude:103.85,provider:null,providerId:null,address:"QA rollback only",attribution:"",license:""};
    const id=(await change({type:"add",routeId,candidate})).resultId!;assert.equal((await read()).places.find(p=>p.id===id)?.title,"Checkpoint 1");
    await change({type:"comment",placeId:id,body:"Audit rollback comment"});
    await assert.rejects(()=>readTripComments(d,b,scope,id),AuthorizationDeniedError);
    for (const command of [
      {type:"rename-checkpoint",placeId:id,title:"Forged"},
      {type:"comment",placeId:id,body:"Forged"},
      {type:"nuke-place",placeId:id},
      {type:"nuke-route",routeId},
      {type:"order",routeId,placeIds:[id]},
      {type:"move-checkpoint",placeId:id,latitude:1.31,longitude:103.85},
      {type:"lock-position",routeId,position:0,locked:true},
    ]) await assert.rejects(()=>mutateTrip(d,b,{roomSlug:scope,requestId:randomUUID(),expectedRevision:0,command:command as TripCommand}),AuthorizationDeniedError);
    assert(!(await pinRouteChoices(d,b)).some(r=>r.id===routeId));
    const pin=(await mutatePin(d,a,{scope:fixture.slug,requestId:randomUUID(),command:{type:"create",candidate,state:"saved"}})).resultId;
    const transfer={sourceScope:fixture.slug,targetScope:scope,pinId:pin,expectedPinRevision:1,routeId,expectedTripRevision:(await read()).revision,requestId:randomUUID()};
    await assert.rejects(()=>addPinToRoute(d,b,transfer),AuthorizationDeniedError);
    await addPinToRoute(d,a,transfer);
    assert(!(await readTrip(d,b,fixture.slug)).places.some(p=>p.id===id));
    await assert.rejects(()=>readTrip(d,a,"sandbox--"+fixture.conversationId),AuthorizationDeniedError);
    const rename={roomSlug:scope,requestId:randomUUID(),expectedRevision:(await read()).revision,command:{type:"rename-checkpoint" as const,placeId:id,title:"QA Home"}};
    await mutateTrip(d,a,rename);assert((await mutateTrip(d,a,rename)).replayed);await change({type:"place-icon",placeId:id,icon:"home"});
    await assert.rejects(()=>change({type:"place-icon",placeId:id,icon:"invalid" as never}));
    const poi=(await change({type:"add",routeId,candidate:{...candidate,source:"search",provider:"qa",providerId:"fp5-rollback",title:"QA Provider",longitude:103.86}})).resultId!;
    await assert.rejects(()=>change({type:"rename-checkpoint",placeId:poi,title:"Fake rename"}));
    await mutateTrip(d,a,{roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:0,command:{type:"create-route",name:"Shared rollback QA",color:"sky"}});
    assert.deepEqual(await readTrip(d,b,fixture.slug),await readTrip(d,founder,fixture.slug));
    const memory=await readPins(d,founder,"ms73-founder-review-904a9dea");assert(memory.pins.some(p=>p.id==="009e5547-5a05-4ae7-a511-11f46c7599b0"&&p.state==="saved"));
    throw rollback;
  });}catch(error){if(error!==rollback)throw error;}
  const after=await db.execute(sql`select (select count(*)::int from rooms) as rooms,(select count(*)::int from trip_mutation_receipts) as receipts`);assert.deepEqual(after.rows,before.rows);
  console.log("PASS actual public28 Sandbox owner-only/cross-context denial, manual name/icon/replay/POI protection, A/B/founder shared read, retained founder Pin; all probe writes rolled back");
}
main().catch(error=>{console.error(JSON.stringify({failure:"FP5 cutover probe stopped",kind:error?.name,assertion:error instanceof assert.AssertionError?error.message.split("\n")[0]:undefined}));process.exitCode=1;}).finally(()=>db.$client.end());
