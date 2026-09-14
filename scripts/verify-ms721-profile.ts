import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, profiles, connections, connectionNicknames, messages, notifications } from "../src/server/db/schema";
import { updateOwnProfile, type OwnProfileChange } from "../src/server/profiles/owner-profile";
import { readNamecard } from "../src/server/profiles/namecard";
const db=getDatabase(), rollback=new Error("MS7.2.1 fixture rollback");
async function main() {
  const [a,b]=[randomUUID(),randomUUID()].map(userId=>({userId,authProvider:"ms721-qa",authSubject:userId}));
  try { await db.transaction(async tx=>{
    await tx.insert(users).values([a,b].map(actor=>({id:actor.userId,authProvider:actor.authProvider,authSubject:actor.authSubject,tid:`QA-${actor.userId}`})));
    await tx.insert(profiles).values([a,b].map((actor,index)=>({userId:actor.userId,displayName:`QA profile ${index}`,username:`qa-${actor.userId}`,namecardBio:"Unprojected bio",presenceStatus:"away" as const})));
    const [before]=await tx.select().from(profiles).where(eq(profiles.userId,a.userId));
    const [peer]=await tx.select().from(profiles).where(eq(profiles.userId,b.userId));
    const [connection]=await tx.insert(connections).values({requesterId:a.userId,addresseeId:b.userId,pairKey:[a.userId,b.userId].sort().join(":"),status:"accepted"}).returning();
    await tx.insert(connectionNicknames).values({connectionId:connection.id,userId:b.userId,nickname:"B private alias"});
    const saved=await updateOwnProfile(tx,a,{displayName:"  A new global name  "}); assert.equal(saved.displayName,"A new global name"); assert.equal(saved.presenceStatus,"away");
    await updateOwnProfile(tx,a,{presenceStatus:"meeting"});
    const [after]=await tx.select().from(profiles).where(eq(profiles.userId,a.userId));
    assert.equal(after.displayName,"A new global name"); assert.equal(after.presenceStatus,"meeting");
    for(const field of ["userId","username","namecardBio","avatarUrl","status"] as const)assert.equal(after[field],before[field]);
    assert.deepEqual((await tx.select().from(profiles).where(eq(profiles.userId,b.userId)))[0],peer);
    const card=await readNamecard(tx,b,a.userId); assert.equal(card.displayName,"A new global name"); assert.equal(card.nickname,"B private alias"); assert.equal(card.presenceStatus,"meeting");
    for(const input of [{},{displayName:" "},{displayName:"x".repeat(81)},{displayName:"bad\nname"},{presenceStatus:"invisible"},{displayName:"forged",userId:b.userId},{username:"renamed"}]) await assert.rejects(updateOwnProfile(tx,a,input as OwnProfileChange));
    assert.equal((await tx.select().from(messages).where(inArray(messages.authorId,[a.userId,b.userId]))).length,0);
    assert.equal((await tx.select().from(notifications).where(inArray(notifications.userId,[a.userId,b.userId]))).length,0);
    throw rollback;
  }); } catch(error) { if(error!==rollback)throw error; }
  console.log("PASS owner-only partial Profile updates; finite validation/forged fields denied; identifiers/bio/avatar/peer preserved; viewer alias retained; no message/notification writes; all fixtures rolled back");
}
void main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$client.end());
