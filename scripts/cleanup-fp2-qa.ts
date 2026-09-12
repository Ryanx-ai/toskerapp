import assert from "node:assert/strict";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, rooms, conversations, messages, subrooms, notifications, roomMemberships, connections, conversationParticipants } from "../src/server/db/schema";
const db=getDatabase();
const targets=[
  {id:"e44ceb92-b1d5-4375-bd13-28a836af5d3c",slug:"fp2-service-e44ceb92-b1d5-4375-bd13-28a836af5d3c",owner:"d7b21474-9b0e-4744-b05d-030bc2f26ff4"},
  {id:"9d2a70a7-9983-434a-b572-842706a740df",slug:"fp2-invitation-review-039009",owner:"0ee1e5a5-6d7a-4541-a6ca-ca69788997ef"},
];
const fake=["d7b21474-9b0e-4744-b05d-030bc2f26ff4","0cc1e8c5-7b27-4873-b241-16ad877eb856","a8e80815-9e2d-4604-8215-efacdb3ea8f2","91c99920-ac79-496b-88d6-c2b6d59167e0"];
async function main() {
  await db.transaction(async tx=>{
    const selected=await tx.select().from(rooms).where(inArray(rooms.id,targets.map(r=>r.id))).for("update");
    assert.equal(selected.length,2,"Exact fixtures must still exist; never broaden cleanup");
    for(const target of targets) { const found=selected.find(r=>r.id===target.id)!;assert.equal(found.slug,target.slug);assert.equal(found.ownerId,target.owner); }
    const people=await tx.select().from(users).where(inArray(users.id,fake));assert.equal(people.length,4);assert(people.every(u=>u.authProvider==="fp2-qa"));
    const links=await tx.select().from(connections).where(sql`${connections.requesterId} in ${fake} or ${connections.addresseeId} in ${fake}`);
    assert(links.every(c=>fake.includes(c.requesterId)&&fake.includes(c.addresseeId)),"No connections to legitimate users may cascade");
    const participantRooms=await tx.select({roomId:conversations.roomId,kind:conversations.kind}).from(conversationParticipants).innerJoin(conversations,eq(conversations.id,conversationParticipants.conversationId)).where(inArray(conversationParticipants.userId,fake));
    assert(participantRooms.every(c=>c.kind==="room"&&c.roomId===targets[0].id),"No Personal/Sandbox/outside conversation may be removed");
    const owned=await tx.select().from(rooms).where(inArray(rooms.ownerId,fake));assert(owned.every(r=>r.id===targets[0].id));
    const membership=await tx.select().from(roomMemberships).where(inArray(roomMemberships.userId,fake));assert(membership.every(m=>m.roomId===targets[0].id));
    const roomIds=targets.map(r=>r.id), chats=await tx.select({id:conversations.id}).from(conversations).where(inArray(conversations.roomId,roomIds));
    const containedMessages=await tx.select({id:messages.id,author:messages.authorId}).from(messages).where(inArray(messages.conversationId,chats.map(c=>c.id)));
    assert(containedMessages.every(m=>[...fake,targets[1].owner,"d7a58753-9877-45b2-9fc7-cca188559fed"].includes(m.author)));
    const counts={rooms:selected.length,children:(await tx.select({id:subrooms.id}).from(subrooms).where(inArray(subrooms.roomId,roomIds))).length,conversations:chats.length,messages:containedMessages.length,notifications:(await tx.select({id:notifications.id}).from(notifications).where(or(inArray(notifications.roomId,roomIds),inArray(notifications.conversationId,chats.map(c=>c.id))))).length,nonLoginQaUsers:people.length};
    console.log(process.argv.includes("--confirm")?"EXACT QA CLEANUP":"DRY RUN",JSON.stringify(counts));
    if(!process.argv.includes("--confirm"))return;
    for(const target of targets)await tx.delete(rooms).where(and(eq(rooms.id,target.id),eq(rooms.slug,target.slug),eq(rooms.ownerId,target.owner)));
    await tx.delete(users).where(and(inArray(users.id,fake),eq(users.authProvider,"fp2-qa")));
    assert.equal((await tx.select().from(rooms).where(inArray(rooms.id,roomIds))).length,0);
    console.log("Owned fixtures removed; legitimate users, Personal conversations, Sandboxes and unrelated Rooms preserved. No application undo.");
  });
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
