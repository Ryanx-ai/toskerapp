import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, profiles, connections } from "../src/server/db/schema";
import { updateOwnProfile, ProfileConflictError, type OwnProfileChange } from "../src/server/profiles/owner-profile";
import { readOwnProfile } from "../src/server/profiles/own-read";
import { readConnections } from "../src/server/connections/read";
import { readNamecard } from "../src/server/profiles/namecard";
import { limitUsernameEdits, UsernameError } from "../src/server/profiles/username";
const db=getDatabase(), rollback=new Error("FP5 username fixture rollback");
const actors=Array.from({length:2},()=>{const userId=randomUUID();return {userId,authProvider:"fp5-username",authSubject:userId};});
async function main(){
  try { await db.transaction(async tx=>{
    const [a,b]=actors;
    await tx.insert(users).values(actors.map((a,i)=>({id:a.userId,authProvider:a.authProvider,authSubject:a.authSubject,tid:`F${i}${a.userId.replaceAll('-','').slice(0,5).toUpperCase()}`})));
    const suffix=a.userId.slice(0,8), original=`fp5-original-${suffix}`, next=`fp5-next-${suffix}`, peer=`fp5-peer-${suffix}`;
    await tx.insert(profiles).values([{userId:a.userId,username:original,displayName:"Username QA"},{userId:b.userId,username:peer,displayName:"Peer QA"}]);
    await tx.insert(connections).values({requesterId:a.userId,addresseeId:b.userId,pairKey:actors.map(a=>a.userId).sort().join(':'),status:"accepted"});
    const ids=await tx.select().from(users).where(inArray(users.id,actors.map(a=>a.userId)));
    let p=await readOwnProfile(tx,a.userId); const before=p.revision;
    p=await updateOwnProfile(tx,a,{username:` @${next.toUpperCase()} `},p.revision);
    assert.equal(p.username,next); assert(p.revision>before);
    await assert.rejects(updateOwnProfile(tx,a,{username:original},before),ProfileConflictError);
    for(const username of [peer,peer.toUpperCase(),"ab","x".repeat(25),"admin","tosker","bad_name","-bad","bad-","has space","a.b","x\u202ey","名字"]) await assert.rejects(updateOwnProfile(tx,a,{username},p.revision));
    await assert.rejects(updateOwnProfile(tx,a,{username:original,userId:b.userId} as OwnProfileChange,p.revision));
    await assert.rejects(updateOwnProfile(tx,a,{username:original}));
    assert.equal((await readOwnProfile(tx,b.userId)).username,peer);
    assert.equal((await readNamecard(tx,b,a.userId)).username,next);
    assert.equal((await readConnections(tx,b.userId))[0].person.username,next);
    assert.equal((await tx.select().from(profiles).where(eq(profiles.username,original))).length,0);
    for(let i=0;i<10;i++)await limitUsernameEdits(tx,a);
    await assert.rejects(limitUsernameEdits(tx,a),UsernameError);
    await limitUsernameEdits(tx,b);
    p=await updateOwnProfile(tx,a,{username:original},p.revision);
    assert.equal(p.username,original);
    assert.deepEqual(await tx.select().from(users).where(inArray(users.id,actors.map(a=>a.userId))),ids);
    console.log("PASS username normalization/allowed/reserved/case collision/stale/self-only, Namecard/Friends projection, no old alias, stable TIDs/auth bindings, isolated durable attempt limits");
    throw rollback;
  }); }catch(e){if(e!==rollback)throw e;}
  assert.equal((await db.select().from(users).where(inArray(users.id,actors.map(a=>a.userId)))).length,0);
  console.log("PASS exact synthetic username/rate-limit fixtures rolled back; no retained account changes");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$client.end());
