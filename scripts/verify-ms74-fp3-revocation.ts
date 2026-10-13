import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { locationShares, rooms, roomMemberships, subroomAccess, conversations, connections } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { locationService } from "../src/server/location-sharing/service";
import { retireLocationLease } from "../src/server/location-sharing/lifecycle";
import { withdrawRoomMember } from "../src/server/rooms/lifecycle";
import { revokePinSubroomAccess, revokePinConnection } from "../src/server/map-pins/access-lifecycle";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
const db=getDatabase(),rollback=new Error("FP3 revocation rollback"),cases:string[]=[];let step="ownership";
async function main(){
  const actors=await resolveQaActors(db),fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
  assert.equal(fixture.run,"ms74-fp1-20261010");
  const [room]=await db.select().from(rooms).where(eq(rooms.id,fixture.roomId));assert(room&&room.ownerId===actors.a.userId&&room.slug===fixture.slug);
  assert((await db.select().from(roomMemberships).where(eq(roomMemberships.roomId,room.id))).some(m=>m.userId===actors.founder.userId));
  for(const scenario of ["Room","Subroom","Personal","Stop failure","Expired","No area"]){
    step=scenario;
    await assert.rejects(()=>db.transaction(async tx=>{
      const d=tx as unknown as ToskerDatabase,clears:string[]=[],revoked:string[]=[];
      const retire:typeof retireLocationLease=(t,user,ids)=>retireLocationLease(t,user,ids,async row=>{clears.push(row.id);});
      let failDelivery=false,areaAvailable=true,published=0;
      const service=locationService(d,{session:async()=>{},retire,retirement:async row=>{if(failDelivery)throw new Error("simulated transport down");clears.push(row.id);},publish:async()=>{published++;},area:async()=>{if(!areaAvailable)throw new Error("No area");return {label:"Singapore Central",source:"ura"};}});
      const actor=actors.b,session="qa-revoke-session";
      const revoke=async(id:string)=>{revoked.push(id);},notify=async()=>{};
      let context=fixture.conversationId,connectionId="";
      if(scenario==="Subroom"){await tx.insert(subroomAccess).values({subroomId:fixture.selectedId,userId:actor.userId}).onConflictDoNothing();context=fixture.selectedChatId;}
      if(scenario==="Personal"){
        const pair=[actors.a.userId,actors.b.userId].sort().join(":");
        const [chat]=await tx.select().from(conversations).where(and(eq(conversations.kind,"personal"),eq(conversations.directKey,pair)));
        const [connection]=await tx.select().from(connections).where(eq(connections.pairKey,pair));assert(chat&&connection&&connection.status==="accepted");context=chat.id;connectionId=connection.id;
      }
      const lease=await service.begin(actor,session,context,"precise");
      if(scenario==="Room")await withdrawRoomMember(d,actors.a,fixture.roomId,actor.userId,revoke,retire);
      if(scenario==="Subroom")await revokePinSubroomAccess(d,actors.a,fixture.selectedId,actor.userId,revoke,notify,retire);
      if(scenario==="Personal")await revokePinConnection(d,actor,connectionId,revoke,notify,retire);
      if(scenario==="Stop failure"){failDelivery=true;await assert.rejects(()=>service.stop(actor,session,lease.id));}
      if(scenario==="Expired")await tx.update(locationShares).set({createdAt:new Date(Date.now()-301000),expiresAt:new Date(Date.now()-1000)}).where(eq(locationShares.id,lease.id));
      if(scenario==="No area")areaAvailable=false;
      await assert.rejects(()=>service.send(actor,session,lease.id,{latitude:1.2834,longitude:103.8607,accuracy:50},new AbortController().signal));
      assert.equal(published,0);
      if(["Room","Subroom","Personal"].includes(scenario)){assert(clears.includes(lease.id));assert(revoked.includes(actor.userId));}
      if(scenario!=="No area")await assert.rejects(()=>service.validate(actors.a,"qa-viewer",lease.id,context),AuthorizationDeniedError);
      if(scenario==="Stop failure")assert.equal((await tx.select().from(locationShares).where(eq(locationShares.id,lease.id))).length,0);
      assert((await tx.select().from(roomMemberships).where(eq(roomMemberships.roomId,room.id))).some(m=>m.userId===actors.founder.userId));
      throw rollback;
    }),error=>error===rollback);cases.push(scenario);
  }
  console.log(JSON.stringify({pass:true,rollback:true,cases,providerCalls:0,actualRevocations:0,founderMembershipStable:true}));
}
main().catch(error=>{console.error(JSON.stringify({pass:false,step,kind:error?.name,detail:error instanceof assert.AssertionError?error.message.split("\n")[0]:"Private details suppressed"}));process.exitCode=1;}).finally(()=>db.$client.end());
