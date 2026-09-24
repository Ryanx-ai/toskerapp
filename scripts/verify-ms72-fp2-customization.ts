import assert from 'node:assert/strict';
import {randomUUID,randomInt} from 'node:crypto';
import {inArray,sql} from 'drizzle-orm';
import {getDatabase} from '../src/server/db/client';
import {users,profiles,connections,messages,notifications,hallItems,conversationReads} from '../src/server/db/schema';
import {readOwnProfile} from '../src/server/profiles/own-read';
import {updateOwnProfile,ProfileConflictError,type OwnProfileChange} from '../src/server/profiles/owner-profile';
import {readNamecard} from '../src/server/profiles/namecard';
import {IDENTITY_ACCENTS,IDENTITY_BANNERS,IDENTITY_FRAMES,INTERFACE_ACCENTS,interfacePalette} from '../src/lib/profile-contract';
const db=getDatabase(),rollback=new Error('FP2 rollback');
function lum(hex:string) {const rgb=hex.replace('#','').match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function ratio(a:string,b:string) {const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
async function main() {
  for(const [preset,p] of Object.entries(interfacePalette)) {
    assert(ratio('#ffffff',p.fill)>=4.5,preset+' action contrast');
    // Existing hover brightness max1.15, tested independently from default.
    const hover='#'+p.fill.slice(1).match(/../g)!.map(c=>Math.min(255,Math.round(parseInt(c,16)*1.15)).toString(16).padStart(2,'0')).join('');
    assert(ratio('#ffffff',hover)>=4.5,preset+' hover contrast');
    assert(ratio(p.highlight,'#19232a')>=4.5,preset+' selected text');
    console.log('PASS contrast',preset,ratio('#ffffff',p.fill).toFixed(2),ratio('#ffffff',hover).toFixed(2));
  }
  assert(ratio('#ff9cae','#492631')>=4.5);assert(ratio('#c89c5d','#182229')>=3);
  const actors=Array.from({length:2},()=>{const userId=randomUUID();return {userId,authProvider:'ms72-fp2-qa',authSubject:userId};}),[a,b]=actors;
  try {await db.transaction(async tx=>{
    const counts=async()=>Promise.all([messages,notifications,hallItems,conversationReads].map(async table=>Number((await tx.select({n:sql<number>`count(*)`}).from(table))[0].n)));
    const beforeCounts=await counts();
    await tx.insert(users).values(actors.map(a=>({id:a.userId,authProvider:a.authProvider,authSubject:a.authSubject,tid:Array.from({length:7},()=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[randomInt(36)]).join('')})));
    await tx.insert(profiles).values(actors.map(a=>({userId:a.userId,displayName:'FP2 QA',username:'qa-'+a.userId})));
    await tx.insert(connections).values({requesterId:a.userId,addresseeId:b.userId,pairKey:[a.userId,b.userId].sort().join(':'),status:'accepted'});
    let current=await readOwnProfile(tx,a.userId);const bBefore=await readOwnProfile(tx,b.userId);
    assert.equal(current.identityBanner,'glow');assert.equal(current.identityFrame,'none');assert.equal(current.interfaceAccent,'tosker');
    for(const accent of IDENTITY_ACCENTS)for(const banner of IDENTITY_BANNERS)for(const frame of IDENTITY_FRAMES){
      current=await updateOwnProfile(tx,a,{identityAccent:accent,identityBanner:banner,identityFrame:frame,detailsAudience:'friends'},current.revision);
      const peer=await readNamecard(tx,b,a.userId);assert.equal(peer.identityAccent,accent);assert.equal(peer.identityBanner,banner);assert.equal(peer.identityFrame,frame);assert(!('interfaceAccent' in peer));
    }
    for(const accent of INTERFACE_ACCENTS){
      const old=current.revision;current=await updateOwnProfile(tx,a,{interfaceAccent:accent},old);
      assert.equal((await readOwnProfile(tx,a.userId)).interfaceAccent,accent);
      await assert.rejects(updateOwnProfile(tx,a,{identityFrame:'none'},old),ProfileConflictError);
      assert.deepEqual(await readOwnProfile(tx,b.userId),bBefore);
    }
    current=await updateOwnProfile(tx,a,{detailsAudience:'self'},current.revision);
    const hidden=await readNamecard(tx,b,a.userId);assert.equal(hidden.identityAccent,'neutral');assert.equal(hidden.identityBanner,'glow');assert.equal(hidden.identityFrame,'none');
    for(const bad of [{interfaceAccent:'red'},{identityBanner:'url(x)'},{identityFrame:null},{userId:b.userId,interfaceAccent:'iris'}]) await assert.rejects(updateOwnProfile(tx,a,bad as OwnProfileChange,current.revision));
    current=await updateOwnProfile(tx,a,{identityAccent:'neutral',identityBanner:'glow',identityFrame:'none',interfaceAccent:'tosker'},current.revision);
    assert.deepEqual(await readOwnProfile(tx,a.userId),current);
    assert.deepEqual(await counts(),beforeCounts,'Metadata never creates activity');
    assert.equal((await tx.select().from(notifications).where(inArray(notifications.userId,actors.map(a=>a.userId)))).length,0);
    assert.equal((await tx.select().from(messages).where(inArray(messages.authorId,actors.map(a=>a.userId)))).length,0);
    console.log('PASS 30 shared preset combinations; 3 private accents; owner-only fields; stale rejection; audience withholding; reset; no peer preference or message/notification mutation');
    throw rollback;
  });}catch(e){if(e!==rollback)throw e;}
  assert.equal((await db.select().from(users).where(inArray(users.id,actors.map(a=>a.userId)))).length,0);console.log('PASS fixtures rolled back');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$client.end());
