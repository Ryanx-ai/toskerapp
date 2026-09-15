import assert from "node:assert/strict";
import { randomUUID, randomInt } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, profiles, connections, messages, notifications, conversationReads } from "../src/server/db/schema";
import { readOwnProfile } from "../src/server/profiles/own-read";
import { updateOwnProfile, ProfileConflictError, type OwnProfileChange } from "../src/server/profiles/owner-profile";
import { readNamecard } from "../src/server/profiles/namecard";
import { BANNER_PREFERENCES, allowsActivityBanner } from "../src/lib/banner-preference";
const db=getDatabase(), rollback=new Error("MS72 Settings rollback");
async function main() {
  for(const type of ["message","hall_note","hall_pin","connection_request","room_invitation"]) for(const kind of ["personal","room"]) for(const mentioned of [true,false]) for(const muted of [true,false]) {
    const item={type,conversationKind:kind,isMention:mentioned,muted};
    assert.equal(allowsActivityBanner("all",item),!muted);
    assert.equal(allowsActivityBanner("quiet",item),false);
    assert.equal(allowsActivityBanner("direct_mentions",item),!muted && (mentioned || (type==="message"&&kind==="personal")));
  }
  // Existing API mute resolution makes direct mentions eligible, but Quiet still wins.
  const mention={type:"message",conversationKind:"room",isMention:true,muted:false};
  assert(allowsActivityBanner("direct_mentions",mention)); assert(!allowsActivityBanner("quiet",mention));
  console.log("PASS banner matrix: all/direct+mentions/quiet, Room/Personal/Hall/friends/invite, existing mute/mention precedence");
  const actors=Array.from({length:2},()=>{const userId=randomUUID();return {userId,authProvider:"ms72-settings-qa",authSubject:userId};});
  const [a,b]=actors;
  try {await db.transaction(async tx=>{
    await tx.insert(users).values(actors.map(actor=>({id:actor.userId,authProvider:actor.authProvider,authSubject:actor.authSubject,tid:Array.from({length:7},()=>"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[randomInt(36)]).join("")})));
    await tx.insert(profiles).values(actors.map(actor=>({userId:actor.userId,displayName:"Settings QA",username:`qa-${actor.userId}`})));
    await tx.insert(connections).values({requesterId:a.userId,addresseeId:b.userId,pairKey:[a.userId,b.userId].sort().join(":"),status:"accepted"});
    let current=await readOwnProfile(tx,a.userId); const beforeB=await readOwnProfile(tx,b.userId);
    assert.equal(current.bannerPreference,"all");
    for(const mode of BANNER_PREFERENCES) {
      const old=current.revision; current=await updateOwnProfile(tx,a,{bannerPreference:mode},old);
      assert.equal((await readOwnProfile(tx,a.userId)).bannerPreference,mode);
      await assert.rejects(updateOwnProfile(tx,a,{bannerPreference:"all"},old),ProfileConflictError);
      assert.deepEqual(await readOwnProfile(tx,b.userId),beforeB);
      assert(!("bannerPreference" in await readNamecard(tx,b,a.userId)));
    }
    for(const accent of ["gold","rose","sage","sky","neutral"] as const) {
      current=await updateOwnProfile(tx,a,{identityAccent:accent,detailsAudience:"self"},current.revision);
      assert.equal((await readNamecard(tx,b,a.userId)).identityAccent,"neutral");
      current=await updateOwnProfile(tx,a,{detailsAudience:"friends"},current.revision);
      assert.equal((await readNamecard(tx,b,a.userId)).identityAccent,accent);
    }
    for(const bad of [{bannerPreference:"push"},{bannerPreference:null},{identityAccent:"url(https://example.com)"},{userId:b.userId,bannerPreference:"quiet"}]) await assert.rejects(updateOwnProfile(tx,a,bad as OwnProfileChange,current.revision));
    for(const [table,column] of [[messages,messages.authorId],[notifications,notifications.userId],[conversationReads,conversationReads.userId]] as const) assert.equal((await tx.select().from(table).where(inArray(column,actors.map(a=>a.userId)))).length,0);
    assert.equal((await tx.select().from(users).where(eq(users.id,a.userId)))[0].authSubject,a.authSubject);
    console.log("PASS actor-only finite persisted preferences, revision conflict, peer unchanged/no private preference projection, five accents with audience withholding, zero communication/attention writes");
    throw rollback;
  });}catch(error){if(error!==rollback)throw error;}
  assert.equal((await db.select().from(users).where(inArray(users.id,actors.map(a=>a.userId)))).length,0);
  console.log("PASS synthetic Settings fixtures rolled back");
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$client.end());
