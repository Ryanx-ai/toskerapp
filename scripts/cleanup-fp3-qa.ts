/** One-shot exact FP3 cleanup; dry run by default. No user/conversation reset. */
import assert from "node:assert/strict";
import { and, eq, inArray, notInArray, or } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, conversations, messages, hallItems, hallComments, users, subrooms, notifications } from "../src/server/db/schema";
const db = getDatabase();
const id = (n: number) => `f7300000-2026-4000-8000-${n.toString(16).padStart(12, "0")}`;
const a = "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", b = "d7a58753-9877-45b2-9fc7-cca188559fed";
async function main() {
  await db.transaction(async (tx) => {
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, id(1))).for("update");
    assert(room && room.slug === "fp3-founder-review" && room.ownerId === a, "Exact fixture must exist; never broaden cleanup");
    const children = await tx.select({ id: subrooms.id }).from(subrooms).where(eq(subrooms.roomId, room.id));
    assert.deepEqual(children.map((child) => child.id), [id(2)]);
    const chats = await tx.select({ id: conversations.id }).from(conversations).where(eq(conversations.roomId, room.id));
    assert.deepEqual(chats.map((chat) => chat.id).sort(), [id(3), id(4)].sort());
    const privateScopes = ["be192eac-38c6-4d46-a6d2-bea19fa324fa", "7ea32cd4-d805-473a-b4b9-f32d2fb0a35d"];
    const privateIds = [120,121,124,130,131,134].map(id), noteIds = [122,132].map(id), commentIds = [123,133].map(id);
    const privateRows = await tx.select().from(messages).where(inArray(messages.id, privateIds));
    assert.equal(privateRows.length, 6); assert(privateRows.every((message) => privateScopes.includes(message.conversationId) && [a,b].includes(message.authorId) && (message.deletedAt ? message.body === "" : ["Independent FP3 reply", "Unrelated FP3 retained message"].includes(message.body))));
    const notes = await tx.select().from(hallItems).where(inArray(hallItems.id, noteIds));
    assert.equal(notes.length, 2); assert(notes.every((note) => privateScopes.includes(note.conversationId!) && note.authorId === a && note.title === "Independent FP3 note" && note.body === "Keep this note"));
    const comments = await tx.select().from(hallComments).where(inArray(hallComments.itemId, noteIds));
    assert.equal(comments.length, 2); assert(comments.every((comment) => commentIds.includes(comment.id) && comment.body === "Keep this comment"));
    const contained = await tx.select({ id: messages.id, authorId: messages.authorId }).from(messages).where(inArray(messages.conversationId, chats.map((chat) => chat.id)));
    assert(contained.every((message) => [a,b].includes(message.authorId)));
    const allIds = [...privateIds, ...contained.map((message) => message.id)];
    assert.equal((await tx.select({ id: messages.id }).from(messages).where(and(inArray(messages.replyToId, allIds), notInArray(messages.id, allIds)))).length, 0, "An external authored reply references a fixture; stop");
    const sourcePins = await tx.select({ conversationId: hallItems.conversationId }).from(hallItems).where(inArray(hallItems.sourceMessageId, allIds));
    assert(sourcePins.every((pin) => chats.some((chat) => chat.id === pin.conversationId)), "An external Hall pin references a fixture; stop");
    const hallBefore = await tx.select({ id: hallItems.id, position: hallItems.position }).from(hallItems).where(and(notInArray(hallItems.id, noteIds), notInArray(hallItems.conversationId, chats.map((chat) => chat.id)))).orderBy(hallItems.id);
    const usersBefore = await tx.select({ id: users.id }).from(users);
    const preserved = await tx.select({ id: conversations.id }).from(conversations).where(inArray(conversations.id, privateScopes));
    assert.equal(preserved.length, 2);
    const counts = { rooms: 1, subrooms: children.length, roomMessages: contained.length, privateMessages: privateRows.length, privateNotes: notes.length, privateComments: comments.length, notifications: (await tx.select({ id: notifications.id }).from(notifications).where(or(eq(notifications.roomId, room.id), inArray(notifications.conversationId, chats.map((chat) => chat.id)), inArray(notifications.messageId, privateIds)))).length };
    console.log(process.argv.includes("--confirm") ? "EXACT CLEANUP" : "DRY RUN", counts);
    if (!process.argv.includes("--confirm")) return;
    await tx.delete(hallItems).where(inArray(hallItems.id, noteIds));
    await tx.delete(messages).where(inArray(messages.id, privateIds));
    await tx.delete(rooms).where(and(eq(rooms.id, room.id), eq(rooms.slug, "fp3-founder-review"), eq(rooms.ownerId, a)));
    assert.equal((await tx.select().from(messages).where(inArray(messages.id, allIds))).length, 0);
    assert.deepEqual(await tx.select({ id: users.id }).from(users), usersBefore);
    assert.equal((await tx.select().from(conversations).where(inArray(conversations.id, privateScopes))).length, 2);
    assert.deepEqual(await tx.select({ id: hallItems.id, position: hallItems.position }).from(hallItems).orderBy(hallItems.id), hallBefore, "All unrelated Hall items and ordering preserved");
    console.log("PASS exact fixture cleanup; all users and canonical Personal/Sandbox conversations preserved. No application undo.");
  });
}
main().catch(() => { console.error("Cleanup guard failed; inspect exact fixtures, never broaden targets."); process.exitCode = 1; }).finally(() => db.$client.end());
