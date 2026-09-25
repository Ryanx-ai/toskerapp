import assert from "node:assert/strict";
import { randomUUID, randomInt } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, profiles, rooms, roomMemberships, connections, connectionNicknames, conversations, conversationParticipants, messages, notifications, hallItems, conversationReads } from "../src/server/db/schema";
import { updateOwnProfile, ProfileConflictError, type OwnProfileChange } from "../src/server/profiles/owner-profile";
import { readOwnProfile } from "../src/server/profiles/own-read";
import { readNamecard } from "../src/server/profiles/namecard";
import { readConnections } from "../src/server/connections/read";
import { readPersonalNavigation } from "../src/server/accounts/personal-navigation";
const db=getDatabase(), rollback=new Error("MS7.2 privacy fixture rollback");
async function main() {
  const actors=Array.from({length:6},()=>{const userId=randomUUID();return {userId,authProvider:"ms72-privacy-qa",authSubject:userId};});
  const [a,b,c,d,e,f]=actors;
  const trigger=await db.execute<{tgenabled:string}>(sql`select tgenabled from pg_trigger where tgrelid='public.profiles'::regclass and tgname='tosker_profile_revision' and not tgisinternal`);
  assert.equal(trigger.rows.length,1); assert.equal(trigger.rows[0].tgenabled,"O");
  try { await db.transaction(async tx=>{
    await tx.insert(users).values(actors.map(actor=>({id:actor.userId,authProvider:actor.authProvider,authSubject:actor.authSubject,tid:Array.from({length:7},()=>"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[randomInt(36)]).join("")})));
    await tx.insert(profiles).values(actors.map((actor,i)=>({userId:actor.userId,displayName:`Privacy QA ${i}`,username:`qa-${actor.userId}`,presenceStatus:"meeting" as const,namecardBio:"Unshared QA bio",identityAccent:"rose" as const})));
    const [friend]=await tx.insert(connections).values({requesterId:a.userId,addresseeId:b.userId,pairKey:[a.userId,b.userId].sort().join(":"),status:"accepted"}).returning();
    await tx.insert(connections).values({requesterId:a.userId,addresseeId:d.userId,pairKey:[a.userId,d.userId].sort().join(":"),status:"pending"});
    await tx.insert(connectionNicknames).values({connectionId:friend.id,userId:b.userId,nickname:"Only B's private alias"});
    const [shared,hidden]=await tx.insert(rooms).values([{ownerId:a.userId,name:"Shared QA",slug:`ms72-${randomUUID()}`},{ownerId:a.userId,name:"Hidden QA",slug:`ms72-${randomUUID()}`}]).returning();
    await tx.insert(roomMemberships).values([{roomId:shared.id,userId:a.userId,role:"owner"},{roomId:shared.id,userId:c.userId,role:"member"},{roomId:hidden.id,userId:a.userId,role:"owner"}]);
    for(const peer of [c,e]) {
      const [chat]=await tx.insert(conversations).values({kind:"personal",directKey:[a.userId,peer.userId].sort().join(":")}).returning();
      await tx.insert(conversationParticipants).values([a,peer].map(actor=>({conversationId:chat.id,userId:actor.userId})));
    }
    const ids=actors.map(actor=>actor.userId);
    const identifiers=await tx.select().from(users).where(inArray(users.id,ids));
    const peerBefore=await readOwnProfile(tx,b.userId);
    const self=await readNamecard(tx,a,a.userId); assert.equal(self.namecardBio,"Unshared QA bio"); assert.equal(self.identityAccent,"rose");
    const friendCard=await readNamecard(tx,b,a.userId); assert.equal(friendCard.namecardBio,null); assert.equal(friendCard.identityAccent,"neutral"); assert.equal(friendCard.presenceStatus,"meeting"); assert.equal(friendCard.nickname,"Only B's private alias"); assert.equal(friendCard.commonRooms.length,0);
    assert.equal((await readConnections(tx,b.userId))[0].person.presenceStatus,"meeting");
    assert.equal((await readConnections(tx,d.userId))[0].person.presenceStatus,null);
    const memberCard=await readNamecard(tx,c,a.userId); assert.equal(memberCard.presenceStatus,"meeting"); assert.equal(memberCard.namecardBio,null); assert.deepEqual(memberCard.commonRooms.map(r=>r.id),[shared.id]); assert.equal(memberCard.nickname,null);
    assert.equal((await readPersonalNavigation(tx,c.userId))[0].presenceStatus,"meeting");
    assert.equal((await readPersonalNavigation(tx,e.userId))[0].presenceStatus,null);
    assert.equal((await readNamecard(tx,e,a.userId)).presenceStatus,null);
    await assert.rejects(readNamecard(tx,f,a.userId)); await assert.rejects(readNamecard(tx,d,a.userId));
    assert.equal(friendCard.relationship?.status,"accepted");
    assert.equal((await readNamecard(tx,e,a.userId)).relationship,null);
    const [pendingChat]=await tx.insert(conversations).values({kind:"personal",directKey:[a.userId,d.userId].sort().join(":")}).returning();
    await tx.insert(conversationParticipants).values([a,d].map(actor=>({conversationId:pendingChat.id,userId:actor.userId})));
    assert.equal((await readNamecard(tx,d,a.userId)).relationship?.incoming,true);
    assert.equal((await readNamecard(tx,a,d.userId)).relationship?.incoming,false);
    assert.equal((await readNamecard(tx,d,a.userId)).namecardBio,null);
    console.log("PASS self/friend/co-member/pending/Personal-only/stranger projection; private alias/Common Rooms don't leak");
    let current=await readOwnProfile(tx,a.userId);
    current=await updateOwnProfile(tx,a,{detailsAudience:"friends",statusAudience:"friends"},current.revision);
    assert.equal((await readNamecard(tx,b,a.userId)).namecardBio,"Unshared QA bio"); assert.equal((await readNamecard(tx,c,a.userId)).namecardBio,null); assert.equal((await readPersonalNavigation(tx,c.userId))[0].presenceStatus,null);
    current=await updateOwnProfile(tx,a,{detailsAudience:"shared_context",statusAudience:"shared_context"},current.revision);
    assert.equal((await readNamecard(tx,c,a.userId)).identityAccent,"rose");
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId,shared.id),eq(roomMemberships.userId,c.userId)));
    const former=await readNamecard(tx,c,a.userId); assert.equal(former.presenceStatus,null); assert.equal(former.namecardBio,null); assert.equal(former.identityAccent,"neutral"); assert.equal(former.commonRooms.length,0);
    assert.equal((await readPersonalNavigation(tx,c.userId))[0].presenceStatus,null);
    current=await updateOwnProfile(tx,a,{detailsAudience:"self",statusAudience:"self"},current.revision);
    assert.equal((await readConnections(tx,b.userId))[0].person.presenceStatus,null); assert.equal((await readNamecard(tx,b,a.userId)).namecardBio,null);
    console.log("PASS exact audiences, former-member withdrawal, Personal not a privacy bypass, Friends projection withholding");
    const stale=current.revision;
    current=await updateOwnProfile(tx,a,{displayName:"  Cafe\u0301 العربية 👩‍👩‍👧‍👦  "},current.revision);
    assert.equal(current.displayName,"Café العربية 👩‍👩‍👧‍👦"); assert.equal(current.presenceStatus,"meeting");
    await assert.rejects(updateOwnProfile(tx,a,{namecardBio:"Stale overwrite"},stale),ProfileConflictError);
    // Simulate the still-deployed old writer, which knows nothing about revision.
    await tx.update(profiles).set({presenceStatus:"idle"}).where(eq(profiles.userId,a.userId));
    await assert.rejects(updateOwnProfile(tx,a,{displayName:"Old draft"},current.revision),ProfileConflictError);
    const latest=await readOwnProfile(tx,a.userId); assert.equal(latest.revision,current.revision+1);
    for(const input of [{},{displayName:" "},{displayName:"x".repeat(81)},{namecardBio:"x".repeat(161)},{displayName:"bad\u202ename"},{displayName:"bad\u0085name"},{statusAudience:"everyone"},{detailsAudience:"public"},{identityAccent:"#ff00ff"},{presenceStatus:"invisible"},{userId:b.userId,displayName:"forged"},{username:"change"},{tid:"CHANGED"},{avatarUrl:"https://example.com/private"},{revision:999}]) await assert.rejects(updateOwnProfile(tx,a,input as OwnProfileChange,latest.revision));
    assert.deepEqual(await readOwnProfile(tx,b.userId),peerBefore);
    assert.deepEqual(await tx.select().from(users).where(inArray(users.id,ids)),identifiers);
    for(const [table,column] of [[messages,messages.authorId],[notifications,notifications.userId],[hallItems,hallItems.authorId],[conversationReads,conversationReads.userId]] as const) assert.equal((await tx.select().from(table).where(inArray(column,ids))).length,0);
    console.log("PASS NFC/RTL/joiners, length/control/forgery rejection, optimistic conflict including legacy writer, stable identifiers, zero communication/attention writes");
    throw rollback;
  }); } catch(error) { if(error!==rollback)throw error; }
  assert.equal((await db.select().from(users).where(inArray(users.id,actors.map(a=>a.userId)))).length,0);
  console.log("PASS exact synthetic fixture transaction rolled back; revision trigger active; no real account/Room/history changed");
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$client.end());
