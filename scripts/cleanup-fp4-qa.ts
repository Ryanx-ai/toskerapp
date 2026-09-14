/** Exact owned FP4 fixtures only; dry-run default. No user or canonical conversation reset. */
import assert from "node:assert/strict";
import { and, eq, inArray, notInArray, or } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, subrooms, conversations, messages, hallItems, hallComments, notifications, users } from "../src/server/db/schema";
const db = getDatabase();
db.$client.options.connectionTimeoutMillis = 15_000;
db.$client.options.query_timeout = 20_000;
const id = (n: number) => `f7400000-2026-4000-8000-${n.toString(16).padStart(12, "0")}`;
const a = "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", b = "d7a58753-9877-45b2-9fc7-cca188559fed";
async function main() {
  await db.transaction(async (tx) => {
    const owned = await tx.select().from(rooms).where(inArray(rooms.id, [id(1), id(5)])).for("update");
    assert.equal(owned.length, 2); assert(owned.every((room) => room.ownerId === a && room.slug === (room.id === id(1) ? "fp4-acceptance" : "fp4-order-check")));
    const children = await tx.select().from(subrooms).where(inArray(subrooms.roomId, [id(1), id(5)])); assert.deepEqual(children.map((child) => child.id), [id(2)]);
    const chats = await tx.select().from(conversations).where(inArray(conversations.roomId, [id(1), id(5)])); assert.deepEqual(chats.map((chat) => chat.id).sort(), [id(3), id(4), id(6)].sort());
    const privateIds = [...[120, 121, 130, 131].map(id), "f25ee381-6dd0-4071-b936-436a4f0dde7d"], privateNotes = [122, 132].map(id);
    const ownMessages = await tx.select().from(messages).where(or(inArray(messages.conversationId, chats.map((chat) => chat.id)), inArray(messages.id, privateIds)));
    assert(ownMessages.every((message) => [a, b].includes(message.authorId) && (message.deletedAt ? !message.body : message.body.startsWith("FP4"))), "Non-QA content in owned fixture; stop");
    const messageIds = ownMessages.map((message) => message.id);
    if (messageIds.length) assert.equal((await tx.select().from(messages).where(and(inArray(messages.replyToId, messageIds), notInArray(messages.id, messageIds)))).length, 0, "External reply references fixture; stop");
    const ownHall = await tx.select().from(hallItems).where(or(inArray(hallItems.conversationId, chats.map((chat) => chat.id)), inArray(hallItems.id, privateNotes)));
    assert(ownHall.every((item) => [a,b].includes(item.authorId) && (item.kind === "pinned_message" ? messageIds.includes(item.sourceMessageId!) : item.title?.startsWith("FP4"))), "Non-QA Hall content; stop");
    if (ownHall.length) assert((await tx.select().from(hallComments).where(inArray(hallComments.itemId, ownHall.map((item) => item.id)))).every((comment) => [a,b].includes(comment.authorId) && comment.body.startsWith("FP4")), "Non-QA discussion; stop");
    const usersBefore = await tx.select({ id: users.id }).from(users);
    const privateScopes = await tx.select({ id: conversations.id }).from(conversations).where(inArray(conversations.kind, ["personal", "sandbox"]));
    const preservedHall = await tx.select({ id: hallItems.id, position: hallItems.position }).from(hallItems).where(ownHall.length ? notInArray(hallItems.id, ownHall.map((item) => item.id)) : undefined).orderBy(hallItems.id);
    const activity = await tx.select({ id: notifications.id }).from(notifications).where(or(inArray(notifications.roomId, [id(1), id(5)]), inArray(notifications.conversationId, chats.map((chat) => chat.id)), inArray(notifications.messageId, privateIds)));
    console.log(process.argv.includes("--confirm") ? "EXACT CLEANUP" : "DRY RUN", { rooms: 2, children: children.length, messages: ownMessages.length, hallObjects: ownHall.length, notifications: activity.length });
    if (!process.argv.includes("--confirm")) return;
    if (activity.length) await tx.delete(notifications).where(inArray(notifications.id, activity.map((item) => item.id)));
    await tx.delete(hallItems).where(inArray(hallItems.id, privateNotes));
    await tx.delete(messages).where(inArray(messages.id, privateIds));
    await tx.delete(rooms).where(inArray(rooms.id, owned.map((room) => room.id)));
    assert.deepEqual(await tx.select({ id: users.id }).from(users), usersBefore);
    assert.deepEqual(await tx.select({ id: conversations.id }).from(conversations).where(inArray(conversations.kind, ["personal", "sandbox"])), privateScopes);
    assert.deepEqual(await tx.select({ id: hallItems.id, position: hallItems.position }).from(hallItems).orderBy(hallItems.id), preservedHall);
    console.log("PASS exact cleanup; users, Personal/Sandbox and unrelated Hall ordering preserved");
  });
}
void main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$client.end());
