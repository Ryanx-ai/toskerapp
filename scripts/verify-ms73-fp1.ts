import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, subrooms, subroomAccess, conversations, conversationParticipants, messages, hallItems, tripPlans, tripMutationReceipts, profiles } from "../src/server/db/schema";
import { mutateTrip, readTrip, TripError } from "../src/server/trips/service";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
import { quickOrder, type TripCommand, type PlaceCandidate } from "../src/lib/trip-contract";
import { createQaFixture, cleanupQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";

const db=getDatabase(); let fixture:QaFixture | undefined;
const pin=(title:string,longitude:number):PlaceCandidate=>({title,longitude,latitude:1.29,source:"pin",provider:null,providerId:null,address:"Synthetic FP1 QA point",attribution:"",license:""});
async function main(){
  const {a,b,founder}=await resolveQaActors(db);
  const founderBefore=await db.select().from(profiles).where(eq(profiles.userId,founder.userId));
  fixture=await createQaFixture(db,"FP1 shared Star/Nuke/order + isolated Subroom permission proof");
  console.log("Owned FP1 fixture",JSON.stringify(fixture));
  const f=fixture;
  const snapshot=()=>readTrip(db,a,f.slug);
  const call=async(command:TripCommand,actor=a,scope=f.slug,revision?:number)=>mutateTrip(db,actor,{roomSlug:scope,requestId:randomUUID(),expectedRevision:revision??(await readTrip(db,actor,scope)).revision,command});
  for(const [i,longitude] of [103.85,103.89,103.86,103.87].entries())await call({type:"add",candidate:pin(`FP1 Point ${i+1}`,longitude),routeId:null});
  let s=await snapshot(); const first=s.places[0].id, day1=s.routes[0].id;
  const suggestion=quickOrder(s.places); assert.equal(suggestion[0],first);assert.equal(suggestion.at(-1),s.places.at(-1)!.id);assert.equal(new Set(suggestion).size,4);
  await call({type:"star-place",placeId:first,starred:true},b);
  assert((await readTrip(db,founder,f.slug)).places.find(p=>p.id===first)?.starred);
  const day2=(await call({type:"create-route",name:"Day 2",color:"sky"})).resultId!;
  await call({type:"membership",routeId:day2,placeId:first,included:true});
  await call({type:"order-routes",routeIds:[day2,day1]},b);assert.deepEqual((await snapshot()).routes.map(r=>r.id),[day2,day1]);
  const before=await snapshot();await assert.rejects(()=>call({type:"order-routes",routeIds:[day1,day1]}));assert.deepEqual(await snapshot(),before);
  const nuke={roomSlug:f.slug,requestId:randomUUID(),expectedRevision:before.revision,command:{type:"nuke-place" as const,placeId:first}};
  const result=await mutateTrip(db,b,nuke);assert((await mutateTrip(db,b,nuke)).replayed);
  s=await readTrip(db,founder,f.slug);assert(!s.places.some(p=>p.id===first));assert(!s.memberships.some(m=>m.placeId===first));assert.equal(s.revision,result.revision);
  assert.deepEqual(s.memberships.filter(m=>m.routeId===day1).map(m=>m.position).sort(),[0,1,2]);
  await assert.rejects(()=>call({type:"edit-place",placeId:first,title:"No resurrection",note:""},a,f.slug,before.revision),e=>e instanceof TripError&&e.code==="conflict");
  const rev=s.revision;
  const race=await Promise.allSettled([call({type:"star-place",placeId:s.places[0].id,starred:true},a,f.slug,rev),call({type:"nuke-place",placeId:s.places[0].id},b,f.slug,rev)]);
  assert.equal(race.filter(r=>r.status==="fulfilled").length,1);
  console.log("PASS shared Star, endpoint-preserving Quick order, route order, atomic Nuke memberships/retry, stale-write denial, Star/Nuke race");

  const child=await db.transaction(async tx=>{
    await tx.select().from(rooms).where(eq(rooms.id,f.id)).for("update");
    const exact=await resolveQaActors(tx);assert.equal(exact.founder.userId,founder.userId);
    const [row]=await tx.insert(subrooms).values({roomId:f.id,name:"FP1 selected Map QA",createdBy:a.userId,visibility:"selected",position:0}).returning();
    await tx.insert(subroomAccess).values([a.userId,founder.userId].map(userId=>({subroomId:row.id,userId})));
    const [chat]=await tx.insert(conversations).values({kind:"room",roomId:f.id,subroomId:row.id,isPrimary:false,title:row.name}).returning();
    await tx.insert(conversationParticipants).values([a.userId,founder.userId].map(userId=>({conversationId:chat.id,userId})));
    return {...row,conversationId:chat.id};
  });
  console.log("Owned child receipt",JSON.stringify({id:child.id,roomId:f.id,conversationId:child.conversationId,createdAt:child.createdAt}));
  const scope=`${f.slug}--${child.id}`;const parentBefore=await snapshot();
  assert.equal((await readTrip(db,a,scope)).places.length,0);
  await assert.rejects(()=>readTrip(db,b,scope),AuthorizationDeniedError);
  const childPlace=(await call({type:"add",candidate:pin("Child-only pin",103.88),routeId:null},a,scope)).resultId!;
  assert.equal((await readTrip(db,founder,scope)).places[0].id,childPlace);assert.deepEqual(await snapshot(),parentBefore);
  await assert.rejects(()=>call({type:"star-place",placeId:childPlace,starred:true}));
  await assert.rejects(()=>readTrip(db,a,`unrelated--${child.id}`),AuthorizationDeniedError);
  await db.transaction(async tx=>{await tx.select().from(rooms).where(eq(rooms.id,f.id)).for("update");await tx.insert(subroomAccess).values({subroomId:child.id,userId:b.userId});});
  assert.equal((await readTrip(db,b,scope)).places.length,1);
  await db.transaction(async tx=>{await tx.select().from(rooms).where(eq(rooms.id,f.id)).for("update");await tx.delete(subroomAccess).where(and(eq(subroomAccess.subroomId,child.id),eq(subroomAccess.userId,b.userId)));});
  await assert.rejects(()=>readTrip(db,b,scope),AuthorizationDeniedError);
  console.log("PASS independent Subroom plan, selected visibility, founder stable access, grant/revoke, cross-context denial");

  // Exact-owned child cleanup before the stricter parent helper (which permits only one primary Chat).
  await db.transaction(async tx=>{
    await tx.select().from(rooms).where(eq(rooms.id,f.id)).for("update");
    const [row]=await tx.select().from(subrooms).where(eq(subrooms.id,child.id));
    assert(row&&row.roomId===f.id&&row.createdBy===a.userId&&row.name===child.name&&row.createdAt.toISOString()===child.createdAt.toISOString());
    const chats=await tx.select().from(conversations).where(eq(conversations.subroomId,child.id));assert.deepEqual(chats.map(c=>c.id),[child.conversationId]);
    assert.equal((await tx.select().from(messages).where(eq(messages.conversationId,child.conversationId))).length,0);
    assert.equal((await tx.select().from(hallItems).where(eq(hallItems.conversationId,child.conversationId))).length,0);
    const edits=await tx.select({actor:tripMutationReceipts.actorId}).from(tripMutationReceipts).innerJoin(tripPlans,eq(tripPlans.id,tripMutationReceipts.planId)).where(eq(tripPlans.subroomId,child.id));assert(edits.every(e=>[a.userId,b.userId].includes(e.actor)));
    await tx.delete(subrooms).where(and(eq(subrooms.id,child.id),eq(subrooms.roomId,f.id)));
  });
  console.log(await cleanupQaFixture(db,f,true));fixture=undefined;
  assert.deepEqual(await db.select().from(profiles).where(eq(profiles.userId,founder.userId)),founderBefore);
  assert.equal((await db.select().from(tripPlans).where(eq(tripPlans.roomId,f.id))).length,0);
  assert.equal((await db.select().from(conversations).where(inArray(conversations.id,[child.conversationId,f.conversationId]))).length,0);
  console.log("PASS exact-owned Room/Subroom cleanup; founder profile unchanged; retained Founder Review Room untouched");
}
main().catch(error=>{console.error(error instanceof assert.AssertionError ? error.message : error instanceof TripError ? error.message : "Sanitized FP1 service failure");console.log("Retained failure fixture",fixture);process.exitCode=1;}).finally(()=>db.$client.end());
