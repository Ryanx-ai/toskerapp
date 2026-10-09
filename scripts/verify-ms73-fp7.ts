/** FP7 rollback-only ownership/copy regression. No provider traffic or retained fixtures. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { conversations, roomMemberships, subrooms, conversationParticipants, subroomAccess, connections } from "../src/server/db/schema";
import { createQaFixture, resolveQaActors } from "./lib/ms73-fixtures";
import { mutateTrip, readTrip } from "../src/server/trips/service";
import { tripCopyDestinations } from "../src/server/trips/destinations";
import { copyPlaceFields } from "../src/server/trips/copy-fields";
import { roadKey } from "../src/lib/maps/road-contract";
import { routingPlaces, type TripCommand } from "../src/lib/trip-contract";
const db=getDatabase(),rollback=new Error("FP7 rollback");
async function main(){
  try{await db.transaction(async tx=>{
    const d=tx as unknown as ToskerDatabase,{a,b,founder}=await resolveQaActors(tx);
    const f=await createQaFixture(d,"FP7 rollback source authorization/copy"),g=await createQaFixture(d,"FP7 rollback destination authorization/copy");
    const read=(scope=f.slug,actor=a)=>readTrip(d,actor,scope);
    const change=async(command:TripCommand,scope=f.slug,actor=a)=>mutateTrip(d,actor,{roomSlug:scope,expectedRevision:(await read(scope,actor)).revision,requestId:randomUUID(),command});
    const poi={title:"Marina Bay Sands",source:"search" as const,provider:"qa",providerId:"fp7-mbs",latitude:1.2837,longitude:103.8607,address:"QA address context",attribution:"QA attribution",license:"QA license"};
    const p=(await change({type:"add",routeId:null,candidate:poi})).resultId!;
    const source=(await read()).routes[0].id;
    const manual=(await change({type:"add",routeId:source,candidate:{...poi,title:"Checkpoint",source:"pin",provider:null,providerId:null,latitude:1.29}})).resultId!;
    await change({type:"rename-checkpoint",placeId:manual,title:"Home checkpoint"});
    await assert.rejects(()=>change({type:"rename-checkpoint",placeId:p,title:"Forged name"}));
    await assert.rejects(()=>change({type:"move-checkpoint",placeId:p,latitude:1.3,longitude:103.8}));
    await change({type:"place-icon",placeId:p,icon:"home"});await change({type:"star-place",placeId:p,starred:true});
    await change({type:"edit-place",placeId:p,title:poi.title,note:"Shared planning context"});
    await change({type:"comment",placeId:p,body:"Must not be copied"});
    await change({type:"skip-place",placeId:p,skipped:true});
    const target=(await change({type:"create-route",name:"Destination",color:"sky"})).resultId!;
    const input={roomSlug:f.slug,expectedRevision:(await read()).revision,requestId:randomUUID(),command:{type:"copy-place" as const,placeId:p,routeId:target}};
    const copied=await mutateTrip(d,a,input),replay=await mutateTrip(d,a,input);
    assert(copied.resultId&&copied.resultId!==p);assert.equal(replay.resultId,copied.resultId);assert.equal(replay.replayed,true);
    await assert.rejects(()=>mutateTrip(d,a,{...input,command:{...input.command,placeId:manual}}));
    const after=await read(),card=after.places.find(p=>p.id===copied.resultId)!;
    assert.equal(card.commentCount,0);assert.equal(card.note,"Shared planning context");assert.equal(card.skipped,false);assert.equal(card.icon,"home");assert.equal(card.starred,true);assert.equal(card.title,poi.title);
    assert.equal((await change({type:"copy-place",placeId:p,routeId:target})).resultId,copied.resultId);
    const manualCopy=(await change({type:"copy-place",placeId:manual,routeId:target})).resultId!;
    assert.equal((await read()).places.find(p=>p.id===manualCopy)?.title,"Home checkpoint");
    assert.equal((await read()).places.find(p=>p.id===manualCopy)?.latitude,1.29);
    assert.notEqual(roadKey(routingPlaces(await read(),source),"drive"),roadKey(routingPlaces(await read(),target),"drive"));
    await assert.rejects(()=>change({type:"copy-place",placeId:p,routeId:source}));
    await change({type:"archive-place",placeId:copied.resultId,archived:true});
    await assert.rejects(()=>change({type:"copy-place",placeId:p,routeId:target}));
    await change({type:"archive-place",placeId:copied.resultId,archived:false});
    // Removed/forged actor cannot read a source or discover destinations.
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId,f.id),eq(roomMemberships.userId,b.userId)));
    await assert.rejects(()=>change({type:"copy-place",placeId:p,routeId:target},f.slug,b));
    await assert.rejects(()=>tripCopyDestinations(d,b,f.slug));
    await tx.insert(roomMemberships).values({roomId:f.id,userId:b.userId,role:"member"});
    const [sub]=await tx.insert(subrooms).values({roomId:g.id,name:"FP7 owners",createdBy:a.userId,visibility:"owners"}).returning();
    const [chat]=await tx.insert(conversations).values({kind:"room",roomId:g.id,subroomId:sub.id,title:"FP7 owners"}).returning();
    await tx.insert(conversationParticipants).values({conversationId:chat.id,userId:a.userId});
    const subScope=`${g.slug}--${sub.id}`;
    const [sandbox]=await tx.select().from(conversations).where(and(eq(conversations.kind,"sandbox"),eq(conversations.ownerId,a.userId)));
    const [personal]=await tx.select().from(conversations).where(and(eq(conversations.kind,"personal"),eq(conversations.directKey,[a.userId,b.userId].sort().join(":"))));
    assert(sandbox&&personal,"Retained isolated QA contexts must exist");
    const sandboxScope=`sandbox--${sandbox.id}`,personalScope=`personal--${personal.id}`;
    const destinations=await tripCopyDestinations(d,a,f.slug);
    for(const scope of [g.slug,subScope,sandboxScope,personalScope])assert(destinations.some(t=>t.scope===scope));
    assert.equal(destinations.find(t=>t.scope===sandboxScope)?.href,"/personal/my-room/map");
    assert.equal(destinations.find(t=>t.scope===personalScope)?.href,`/personal/chat-${personal.id}/map`);
    assert.equal(destinations.find(t=>t.scope===subScope)?.href,`/room/${g.slug}/subroom/${sub.id}/map`);
    assert(!(await tripCopyDestinations(d,b,f.slug)).some(t=>t.scope===subScope||t.scope===sandboxScope));
    const share=async(destination:string,actor=a,sourceScope=f.slug,routeId=source)=>{
      const command={type:"copy-route" as const,sourceScope,sourceRevision:(await read(sourceScope,actor)).revision,routeId};
      const request={roomSlug:destination,expectedRevision:(await read(destination,actor)).revision,requestId:randomUUID(),command};
      return {request,result:await mutateTrip(d,actor,request)};
    };
    const shared=await share(g.slug),sharedId=shared.result.resultId!;
    const destinationState=await read(g.slug),sharedCards=routingPlaces(destinationState,sharedId);
    assert.equal(sharedCards.length,2);assert.deepEqual(sharedCards.map(p=>p.title),[poi.title,"Home checkpoint"]);
    assert(sharedCards.every(c=>![p,manual].includes(c.id)&&c.commentCount===0&&!c.skipped));
    assert.equal((await mutateTrip(d,a,shared.request)).replayed,true);
    assert.equal((await read(g.slug)).routes.length,1);
    const second=await share(g.slug);assert.equal((await read(g.slug)).routes.find(r=>r.id===second.result.resultId)?.name,"Route 1 (2)");
    for(const destination of [subScope,sandboxScope,personalScope]){
      const result=await share(destination);assert.equal(routingPlaces(await read(destination),result.result.resultId!).length,2);
      // Each context is also checked as an authorized source, not just destination.
      await share(g.slug,a,destination,result.result.resultId!);
    }
    const attack={...shared.request,requestId:randomUUID(),expectedRevision:(await read(g.slug)).revision};
    await assert.rejects(async()=>mutateTrip(d,b,{...attack,roomSlug:subScope,expectedRevision:(await read(subScope)).revision}));
    await assert.rejects(async()=>mutateTrip(d,b,{...attack,roomSlug:sandboxScope,expectedRevision:(await read(sandboxScope)).revision}));
    await assert.rejects(()=>mutateTrip(d,founder,{...attack,command:{...attack.command,sourceScope:personalScope}}));
    await assert.rejects(()=>mutateTrip(d,a,{...attack,command:{...attack.command,routeId:randomUUID()}}));
    await assert.rejects(()=>mutateTrip(d,a,{...attack,command:{...attack.command,sourceRevision:0}}));
    await tx.update(connections).set({status:"pending"}).where(eq(connections.pairKey,[a.userId,b.userId].sort().join(":")));
    await assert.rejects(()=>mutateTrip(d,a,{...attack,roomSlug:personalScope}));
    assert(!(await tripCopyDestinations(d,a,f.slug)).some(t=>t.scope===personalScope));
    await tx.update(connections).set({status:"accepted"}).where(eq(connections.pairKey,[a.userId,b.userId].sort().join(":")));
    await tx.update(subrooms).set({visibility:"selected"}).where(eq(subrooms.id,sub.id));
    await assert.rejects(()=>share(subScope));
    await tx.insert(subroomAccess).values({subroomId:sub.id,userId:a.userId});await share(subScope);
    await tx.delete(subroomAccess).where(and(eq(subroomAccess.subroomId,sub.id),eq(subroomAccess.userId,a.userId)));
    await assert.rejects(()=>share(subScope));
    // Revocation blocks even an exact receipt replay.
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId,g.id),eq(roomMemberships.userId,a.userId)));
    await assert.rejects(()=>mutateTrip(d,a,shared.request));
    await tx.insert(roomMemberships).values({roomId:g.id,userId:a.userId,role:"owner"});
    const unchanged=await read(g.slug);
    await change({type:"nuke-route",routeId:source});
    assert.deepEqual(await read(g.slug),unchanged);
    assert((await read()).places.some(c=>c.id===copied.resultId));
    await change({type:"nuke-route",routeId:sharedId},g.slug);
    assert((await read()).places.some(c=>c.id===copied.resultId));
    assert.deepEqual(await read(f.slug,b),await read(f.slug,founder));
    const fields=copyPlaceFields({id:"never",planId:"never",routeId:"never",position:99,isStop:false,skipped:true,archivedAt:new Date(),createdAt:new Date(),updatedAt:new Date(),...poi,defaultTitle:null,note:"",icon:"home",starred:true});
    assert.deepEqual(Object.keys(fields).sort(),["title","defaultTitle","latitude","longitude","source","provider","providerId","address","attribution","license","icon","starred","note"].sort());
    throw rollback;
  });}catch(error){if(error!==rollback)throw error;}
  console.log("PASS FP7 card/route copies, explicit whitelist, duplicate/archive handling, source independence, receipt replay/mismatch, source revisions, Room/Subroom/accepted Personal/owner Sandbox, pending/removed/forged denial, discovery, A/B/founder reconciliation. Rolled back all fixtures; zero provider calls.");
}
main().catch(error=>{console.error({failure:"FP7 rollback",kind:error?.name,assertion:error instanceof assert.AssertionError?error.message.split("\n")[0]:undefined});process.exitCode=1;}).finally(()=>db.$client.end());
