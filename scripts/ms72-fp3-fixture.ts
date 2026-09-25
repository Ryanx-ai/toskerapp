/** Exact FP3 browser-created Room only; no retained Room or user cleanup. */
import assert from 'node:assert/strict';
import {eq,inArray} from 'drizzle-orm';
import {getDatabase} from '../src/server/db/client';
import {rooms,roomMemberships,subrooms,conversations,conversationParticipants,messages,hallItems} from '../src/server/db/schema';
const db=getDatabase(),a='0ee1e5a5-6d7a-4541-a6ca-ca69788997ef',b='d7a58753-9877-45b2-9fc7-cca188559fed';
async function main(){
 const [mode,slug,...receiptIds]=process.argv.slice(2);
 if(mode==='cleanup-receipts'){
  // Supply only exact receipt IDs recorded by this FP3 browser run, after UI Nuke.
  const ids=[slug,...receiptIds];assert(ids.length>=1&&ids.length<=2);assert(ids.every(id=>/^[a-f0-9-]{36}$/.test(id)));
  await db.transaction(async tx=>{
   const found=await tx.select().from(messages).where(inArray(messages.id,ids)).for('update');assert.equal(found.length,ids.length);
   assert(found.every(m=>m.authorId===a&&m.conversationId==='be192eac-38c6-4d46-a6d2-bea19fa324fa'&&m.body===''&&m.deletedAt&&m.createdAt>=new Date('2026-09-25T00:00:00+08:00')));
   assert.equal((await tx.select().from(hallItems).where(inArray(hallItems.sourceMessageId,ids))).length,0);
   await tx.delete(messages).where(inArray(messages.id,ids));
   console.log('Removed exact already-nuked FP3 Personal receipts only; retained Personal history untouched; no application undo.',ids);
  });return;
 }
 assert(['attach','inspect','cleanup','cleanup-empty'].includes(mode));assert(/^fp3-review-[a-f0-9]{6}$/.test(slug));
 await db.transaction(async tx=>{
  const [room]=await tx.select().from(rooms).where(eq(rooms.slug,slug)).for('update');assert(room&&room.ownerId===a&&room.name==='FP3 Review');
  const members=await tx.select().from(roomMemberships).where(eq(roomMemberships.roomId,room.id));assert(members.every(m=>[a,b].includes(m.userId)));
  if(mode==='attach'){
   assert.equal(members.length,1,'Do not repeat fixture attachment');
   assert.equal((await tx.select().from(subrooms).where(eq(subrooms.roomId,room.id))).length,0);
   const chats=await tx.select().from(conversations).where(eq(conversations.roomId,room.id));assert.equal(chats.length,1);
   assert.equal((await tx.select().from(messages).where(eq(messages.conversationId,chats[0].id))).length,0);
   await tx.insert(roomMemberships).values({roomId:room.id,userId:b,role:'member'});
   const [child]=await tx.insert(subrooms).values({roomId:room.id,name:'FP3 Side Trip',createdBy:a,visibility:'everyone'}).returning();
   const [chat]=await tx.insert(conversations).values({kind:'room',roomId:room.id,subroomId:child.id,title:child.name}).returning();
   await tx.insert(conversationParticipants).values([{conversationId:chats[0].id,userId:b},...[a,b].map(userId=>({conversationId:chat.id,userId}))]);
  }
  const children=await tx.select().from(subrooms).where(eq(subrooms.roomId,room.id));
  const chats=await tx.select().from(conversations).where(eq(conversations.roomId,room.id));
  const content=await tx.select().from(messages).where(inArray(messages.conversationId,chats.map(c=>c.id)));
  const notes=await tx.select().from(hallItems).where(inArray(hallItems.conversationId,chats.map(c=>c.id)));
  console.log({mode,roomId:room.id,slug,children:children.map(c=>({id:c.id,name:c.name})),messages:content.map(m=>({id:m.id,empty:m.body==='',nuked:Boolean(m.deletedAt)})),hallItems:notes.length});
  if(mode==='cleanup'||mode==='cleanup-empty'){
   assert(room.createdAt>=new Date('2026-09-25T00:00:00+08:00'));
   if(mode==='cleanup-empty'){assert.equal(children.length,0);assert.equal(chats.length,1);assert.equal(members.length,1);assert.equal(content.length,0);}
   else {assert.equal(children.length,1);assert(children.every(c=>c.createdBy===a&&c.name==='FP3 Side Trip'));assert.equal(chats.length,2);}
   assert.equal(notes.length,0);assert(content.every(m=>m.authorId===a&&m.body===''&&m.deletedAt&&m.createdAt>=room.createdAt));
   assert(content.length<=4,'Inspect unexpected QA content (one local and one live smoke per child/parent)');
   await tx.delete(rooms).where(eq(rooms.id,room.id));
   console.log('Removed only the verified FP3 synthetic Room, child, memberships and empty nuked receipts. No application undo; all retained users/Rooms/Personal history preserved.');
  }
 });
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$client.end());
