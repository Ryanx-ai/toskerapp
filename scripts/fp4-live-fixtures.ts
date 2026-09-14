/** Two exact, small FP4 live-review Rooms. Never touches canonical Personal/Sandbox. */
import assert from "node:assert/strict";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, roomMemberships, subrooms, subroomAccess, conversations, conversationParticipants, users, messages, hallItems, hallComments } from "../src/server/db/schema";
const db=getDatabase();
db.$client.options.connectionTimeoutMillis=15_000; db.$client.options.query_timeout=20_000;
const id=(n:number)=>`f7410000-2026-4000-8000-${n.toString(16).padStart(12,"0")}`;
const a="0ee1e5a5-6d7a-4541-a6ca-ca69788997ef",b="d7a58753-9877-45b2-9fc7-cca188559fed";
const privateReceipt="e9f55ebb-4747-489a-9e06-dfc664f64830";
async function main() {
  await db.transaction(async tx=>{
    const beforeUsers=await tx.select({id:users.id}).from(users).orderBy(users.id);
    assert(beforeUsers.some(u=>u.id===a)&&beforeUsers.some(u=>u.id===b));
    const beforePrivate=await tx.select({id:conversations.id}).from(conversations).where(inArray(conversations.kind,["personal","sandbox"])).orderBy(conversations.id);
    const owned=await tx.select().from(rooms).where(inArray(rooms.id,[id(1),id(5)])).for("update");
    if(process.argv.includes("--seed")) {
      assert.equal(owned.length,0,"Existing live fixture: inspect, never duplicate");
      assert.equal((await tx.select().from(rooms).where(inArray(rooms.slug,["fp4-live-review","fp4-live-order"]))).length,0);
      await tx.insert(rooms).values([{id:id(1),ownerId:a,name:"FP4 Live Review",slug:"fp4-live-review"},{id:id(5),ownerId:a,name:"FP4 Live Order",slug:"fp4-live-order"}]);
      await tx.insert(roomMemberships).values([id(1),id(5)].flatMap(roomId=>[{roomId,userId:a,role:"owner" as const},{roomId,userId:b,role:"member" as const}]));
      await tx.insert(subrooms).values({id:id(2),roomId:id(1),name:"FP4 Live Child",visibility:"selected",createdBy:a});
      await tx.insert(subroomAccess).values([a,b].map(userId=>({subroomId:id(2),userId})));
      await tx.insert(conversations).values([{id:id(3),roomId:id(1),kind:"room",isPrimary:true},{id:id(4),roomId:id(1),kind:"room",subroomId:id(2),title:"FP4 Live Child"},{id:id(6),roomId:id(5),kind:"room",isPrimary:true}]);
      await tx.insert(conversationParticipants).values([id(3),id(4),id(6)].flatMap(conversationId=>[a,b].map(userId=>({conversationId,userId}))));
      console.log("PASS exact live fixtures seeded",{room:"/room/fp4-live-review",child:id(2),second:"/room/fp4-live-order"}); return;
    }
    assert.equal(owned.length,2); assert(owned.every(r=>r.ownerId===a&&r.slug===(r.id===id(1)?"fp4-live-review":"fp4-live-order")));
    assert.deepEqual((await tx.select({id:subrooms.id}).from(subrooms).where(inArray(subrooms.roomId,[id(1),id(5)]))).map(r=>r.id),[id(2)]);
    const chats=await tx.select({id:conversations.id}).from(conversations).where(inArray(conversations.roomId,[id(1),id(5)])); assert.deepEqual(chats.map(r=>r.id).sort(),[id(3),id(4),id(6)].sort());
    const rows=await tx.select().from(messages).where(inArray(messages.conversationId,chats.map(r=>r.id)));
    assert(rows.every(m=>[a,b].includes(m.authorId)&&(m.deletedAt?!m.body:m.body.startsWith("FP4"))),"Non-QA message: stop");
    const ids=rows.map(m=>m.id);
    if(ids.length)assert.equal((await tx.select().from(messages).where(and(inArray(messages.replyToId,ids),notInArray(messages.id,ids)))).length,0,"External reply: stop");
    const hall=await tx.select().from(hallItems).where(inArray(hallItems.conversationId,chats.map(r=>r.id)));
    assert(hall.every(h=>[a,b].includes(h.authorId)&&(h.kind==="pinned_message"?ids.includes(h.sourceMessageId!):h.title?.startsWith("FP4"))));
    if(hall.length)assert((await tx.select().from(hallComments).where(inArray(hallComments.itemId,hall.map(h=>h.id)))).every(c=>[a,b].includes(c.authorId)&&c.body.startsWith("FP4")));
    const preservedHall=await tx.select({id:hallItems.id,position:hallItems.position}).from(hallItems).where(hall.length?notInArray(hallItems.id,hall.map(h=>h.id)):undefined).orderBy(hallItems.id);
    const [receipt]=await tx.select().from(messages).where(eq(messages.id,privateReceipt));
    assert(receipt&&receipt.authorId===a&&receipt.conversationId==="be192eac-38c6-4d46-a6d2-bea19fa324fa"&&receipt.deletedAt&&!receipt.body,"Exact already-Nuked Personal QA receipt required");
    assert.equal((await tx.select().from(messages).where(eq(messages.replyToId,privateReceipt))).length,0);
    console.log(process.argv.includes("--clean")?"EXACT LIVE CLEANUP":"DRY RUN",{rooms:2,children:1,messages:rows.length,privateReceipts:1,hall:hall.length});
    if(!process.argv.includes("--clean"))return;
    await tx.delete(messages).where(eq(messages.id,privateReceipt));
    await tx.delete(rooms).where(inArray(rooms.id,[id(1),id(5)]));
    assert.deepEqual(await tx.select({id:users.id}).from(users).orderBy(users.id),beforeUsers);
    assert.deepEqual(await tx.select({id:conversations.id}).from(conversations).where(inArray(conversations.kind,["personal","sandbox"])).orderBy(conversations.id),beforePrivate);
    assert.deepEqual(await tx.select({id:hallItems.id,position:hallItems.position}).from(hallItems).orderBy(hallItems.id),preservedHall);
    console.log("PASS live cleanup; users, Personal/Sandbox and other Hall ordering preserved");
  });
}
void main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$client.end());
