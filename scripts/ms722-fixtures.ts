/** MS7.2 frame/sidebar QA only. No reused FP4 fixtures; explicit seed/inspect/cleanup. */
import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, rooms, roomMemberships, subrooms, conversations, conversationParticipants, messages, hallItems } from "../src/server/db/schema";
const db = getDatabase();
const id = (n: number) => `f7220000-2026-4000-8000-${n.toString(16).padStart(12,"0")}`;
const a = "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", b = "d7a58753-9877-45b2-9fc7-cca188559fed";
async function main() {
  const mode = process.argv[2] ?? "inspect";
  assert(["seed","inspect","cleanup"].includes(mode));
  const roomIds = [id(1),id(2)], conversationIds = [id(11),id(12),id(13),id(14)];
  if (mode === "seed") {
    assert.equal((await db.select({ id: users.id }).from(users).where(inArray(users.id,[a,b]))).length,2);
    assert.equal((await db.select().from(rooms).where(inArray(rooms.id,roomIds))).length,0,"Inspect existing fixtures before retrying seed");
    await db.transaction(async tx => {
      await tx.insert(rooms).values([{id:id(1),ownerId:a,name:"MS7.2 Frame QA",slug:"ms722-frame-qa"},{id:id(2),ownerId:a,name:"MS7.2 Second QA",slug:"ms722-second-qa"}]);
      await tx.insert(roomMemberships).values(roomIds.flatMap(roomId => [{roomId,userId:a,role:"owner" as const},{roomId,userId:b,role:"member" as const}]));
      await tx.insert(subrooms).values([{id:id(3),roomId:id(1),name:"MS7.2 Alpha",createdBy:a},{id:id(4),roomId:id(1),name:"MS7.2 Beta",createdBy:a}]);
      await tx.insert(conversations).values([{id:id(11),kind:"room",roomId:id(1),isPrimary:true},{id:id(12),kind:"room",roomId:id(2),isPrimary:true},{id:id(13),kind:"room",roomId:id(1),subroomId:id(3),title:"MS7.2 Alpha"},{id:id(14),kind:"room",roomId:id(1),subroomId:id(4),title:"MS7.2 Beta"}]);
      await tx.insert(conversationParticipants).values(conversationIds.flatMap(conversationId => [a,b].map(userId => ({conversationId,userId}))));
    });
  }
  const actual = await db.select().from(rooms).where(inArray(rooms.id,roomIds));
  const membership = await db.select().from(roomMemberships).where(inArray(roomMemberships.roomId,roomIds));
  const actualConversations = await db.select({id:conversations.id}).from(conversations).where(inArray(conversations.roomId,roomIds));
  const messageRows = await db.select({id:messages.id}).from(messages).where(inArray(messages.conversationId,conversationIds));
  const notes = await db.select({id:hallItems.id}).from(hallItems).where(inArray(hallItems.conversationId,conversationIds));
  console.log({mode,roomIds,rooms:actual.length,memberships:membership.length,conversations:actualConversations.length,messages:messageRows.length,hallItems:notes.length});
  if (mode === "cleanup") {
    assert.equal(actual.length,2,"Cleanup is one-shot; inspect missing/partial fixtures");
    assert(actual.every(row => row.ownerId===a && row.name.startsWith("MS7.2 ") && row.slug.startsWith("ms722-")));
    assert(membership.every(row => [a,b].includes(row.userId)));
    assert.equal(actualConversations.length,4); assert(actualConversations.every(row => conversationIds.includes(row.id)));
    assert.equal(messageRows.length,0,"Unexpected content: review before cleanup"); assert.equal(notes.length,0);
    await db.transaction(async tx => { for (const roomId of roomIds) await tx.delete(rooms).where(eq(rooms.id,roomId)); });
    console.log("Removed exactly two owned QA Rooms and their child contexts/preferences. No user, Sandbox or Personal conversation deleted. No application undo.");
  }
}
main().catch(error => { console.error(error); process.exitCode=1; }).finally(()=>db.$client.end());
