import assert from "node:assert/strict";
import { and, eq, inArray, or } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, subrooms, conversations, messages, notifications, roomMemberships, hallItems } from "../src/server/db/schema";
const target={id:"4223b6ab-dd63-4451-b862-876713b452b9",slug:"fp2-live-review-4c225a",owner:"0ee1e5a5-6d7a-4541-a6ca-ca69788997ef"};
const people=[target.owner,"d7a58753-9877-45b2-9fc7-cca188559fed"];
async function main(){
  await getDatabase().transaction(async tx=>{
    const [room]=await tx.select().from(rooms).where(eq(rooms.id,target.id)).for("update");
    assert(room&&room.slug===target.slug&&room.ownerId===target.owner,"Exact live fixture only");
    const members=await tx.select().from(roomMemberships).where(eq(roomMemberships.roomId,target.id));assert(members.every(m=>people.includes(m.userId)));
    const children=await tx.select().from(subrooms).where(eq(subrooms.roomId,target.id));assert.equal(children.length,2);assert(children.every(c=>["Live Alpha","Live Beta"].includes(c.name)));
    const chats=await tx.select().from(conversations).where(eq(conversations.roomId,target.id));assert.equal(chats.length,3);assert(chats.every(c=>c.kind==="room"));const ids=chats.map(c=>c.id);
    const sent=await tx.select().from(messages).where(inArray(messages.conversationId,ids));assert.equal(sent.length,4);assert(sent.every(m=>people.includes(m.authorId)&&(m.body.startsWith("FP2 live ")||m.body==="@tosker-user-b-clerk-test")));
    assert.equal((await tx.select().from(hallItems).where(eq(hallItems.roomId,target.id))).length,0);
    const events=await tx.select({id:notifications.id}).from(notifications).where(or(eq(notifications.roomId,target.id),inArray(notifications.conversationId,ids)));
    console.log(process.argv.includes("--confirm")?"EXACT LIVE QA CLEANUP":"DRY RUN",{rooms:1,children:children.length,conversations:chats.length,messages:sent.length,notifications:events.length});
    if(!process.argv.includes("--confirm"))return;
    await tx.delete(rooms).where(and(eq(rooms.id,target.id),eq(rooms.slug,target.slug),eq(rooms.ownerId,target.owner)));
    assert.equal((await tx.select().from(rooms).where(eq(rooms.id,target.id))).length,0);
    console.log("Exact live Room removed; no users, Personal conversations, Sandboxes or unrelated content removed. No application undo.");
  });
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
