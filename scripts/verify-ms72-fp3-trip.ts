import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq,sql} from 'drizzle-orm';
import {getDatabase,type ToskerDatabase} from '../src/server/db/client';
import {users,profiles,rooms,roomMemberships,roomTags,conversations,messages,notifications,hallItems} from '../src/server/db/schema';
import {updateRoom} from '../src/server/rooms/lifecycle';
import {generateTid} from '../src/server/accounts/tid';
import {normalizeRoomTags,roomSidebarTag} from '../src/lib/room-tags';
const db=getDatabase(),rollback=new Error('FP3 rollback');
async function main(){
 const actors=Array.from({length:2},()=>{const userId=randomUUID();return {userId,authProvider:'fp3-trip-test',authSubject:userId};});const [a,b]=actors;
 try{await db.transaction(async tx=>{
  await tx.insert(users).values(actors.map(a=>({id:a.userId,authProvider:a.authProvider,authSubject:a.authSubject,tid:generateTid()})));
  await tx.insert(profiles).values(actors.map(a=>({userId:a.userId,displayName:'FP3 rollback only',username:'qa-'+a.userId})));
  const [room]=await tx.insert(rooms).values({ownerId:a.userId,name:'Trip QA',slug:'fp3-'+randomUUID()}).returning();
  await tx.insert(roomMemberships).values([{roomId:room.id,userId:a.userId,role:'owner'},{roomId:room.id,userId:b.userId,role:'member'}]);
  await tx.insert(conversations).values({kind:'room',roomId:room.id,isPrimary:true,title:room.name});
  const counts=async()=>Promise.all([messages,notifications,hallItems].map(async t=>Number((await tx.select({n:sql`count(*)`}).from(t))[0].n)));
  const before=await counts();const input={roomId:room.id,name:'Malacca Weekend',tags:['TRIP','JB Supper Run']};
  await assert.rejects(updateRoom(tx as unknown as ToskerDatabase,b,input));
  await updateRoom(tx as unknown as ToskerDatabase,a,input);
  const tags=(await tx.select().from(roomTags).where(eq(roomTags.roomId,room.id))).map(x=>x.value);
  assert.equal(roomSidebarTag(tags),'TRIP · JB Supper Run');
  assert.equal(roomSidebarTag([...tags].reverse()),'TRIP · JB Supper Run');
  assert.throws(()=>normalizeRoomTags(['TRIP','x'.repeat(25)]));assert.throws(()=>normalizeRoomTags(['TRIP','<bad>']));
  await updateRoom(tx as unknown as ToskerDatabase,a,{...input,tags:['TRIP']});
  assert.equal(roomSidebarTag((await tx.select().from(roomTags).where(eq(roomTags.roomId,room.id))).map(x=>x.value)),'TRIP');
  assert.deepEqual(await counts(),before);throw rollback;
 });}catch(e){if(e!==rollback)throw e;}
 console.log('PASS trip owner/member authorization, persistence, reset, order-independent label, input limits, no message/Hall/notification writes; fixtures rolled back');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$client.end());
