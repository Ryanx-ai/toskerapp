import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationShares, rooms, roomMemberships } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db=getDatabase(),rollback=new Error("schema QA rollback");
async function main(){
  await assert.rejects(()=>db.transaction(async tx=>{
    const actors=await resolveQaActors(tx),fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
    assert.equal(fixture.run,"ms74-fp1-20261010");
    const [room]=await tx.select().from(rooms).where(eq(rooms.id,fixture.roomId));assert(room&&room.ownerId===actors.a.userId&&room.slug===fixture.slug);
    assert((await tx.select().from(roomMemberships).where(eq(roomMemberships.roomId,room.id))).some(m=>m.userId===actors.founder.userId));
    assert.equal((await tx.select().from(locationShares).where(eq(locationShares.userId,actors.a.userId))).length,0,"Do not overwrite an existing consent");
    const createdAt=new Date(),base={userId:actors.a.userId,conversationId:fixture.conversationId,sessionId:"qa-synthetic-session",precision:"area",createdAt};
    for(const lifetime of [0,-1,300001])await assert.rejects(()=>tx.transaction(t=>t.insert(locationShares).values({...base,expiresAt:new Date(createdAt.getTime()+lifetime)})),error=>(error as {cause?:{code:string}}).cause?.code==="23514");
    await tx.insert(locationShares).values({...base,expiresAt:new Date(createdAt.getTime()+300000)});
    await assert.rejects(()=>tx.transaction(t=>t.update(locationShares).set({precision:"street"}).where(eq(locationShares.userId,actors.a.userId))),error=>(error as {cause?:{code:string}}).cause?.code==="23514");
    await assert.rejects(()=>tx.transaction(t=>t.update(locationShares).set({sessionId:""}).where(eq(locationShares.userId,actors.a.userId))),error=>(error as {cause?:{code:string}}).cause?.code==="23514");
    throw rollback;
  }),error=>error===rollback);
  console.log(JSON.stringify({pass:true,rollback:true,cases:["five minutes allowed","zero/negative lifetime rejected","five minutes plus one ms rejected","invalid precision rejected","empty session rejected"],retainedWrites:0}));
}
main().catch(error=>{console.error(JSON.stringify({pass:false,kind:error?.name,detail:error instanceof assert.AssertionError?error.message.split("\n")[0]:"Private details suppressed"}));process.exitCode=1;}).finally(()=>db.$client.end());
