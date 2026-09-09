import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, subrooms, roomMemberships, conversations, messages, hallItems, hallComments, users } from "../src/server/db/schema";

// One-shot cleanup of the exact canonical smoke fixture. Default is read-only;
// apply only the fingerprint printed by the reviewed final dry run.
const roomId = "17c2333a-7554-4035-840a-52d8cf1dafbe", name = "MS719 Integrated 1788962825284";
const a = "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", b = "d7a58753-9877-45b2-9fc7-cca188559fed";
const personal = "be192eac-38c6-4d46-a6d2-bea19fa324fa";
const privateFixtures = [
  ["3d0960f3-3a74-4fe7-a5f3-4dbe58a50749", `${name} Personal live`, a],
  ["21644d20-2012-4c11-98fe-e78ad3b860b5", `${name} Personal reply`, b],
  ["9d5db853-3455-42f8-b0de-0290d19b8b3a", "MS714 latency Personal mtu6cfs1 0", a],
  ["30dd21d8-c6de-47e5-be2e-845c2f063e9b", "MS714 latency Personal mtu6chkq 1", a],
  ["caef8bdc-8afa-44bf-815e-191961e81102", "MS714 latency Personal mtu6cj1a 2", a],
];
const db = getDatabase();
async function main() {
  await db.transaction(async tx => {
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update");
    assert.equal(room?.name, name); assert.equal(room.slug, "ms719-integrated-1788962825284-d5f2aa"); assert.equal(room.ownerId, a);
    const children = await tx.select().from(subrooms).where(eq(subrooms.roomId, roomId));
    assert.equal(children.length, 1); assert.equal(children[0].id, "68525ea3-433f-4c4c-841b-25796448a131");
    const members = await tx.select().from(roomMemberships).where(eq(roomMemberships.roomId, roomId));
    assert.deepEqual(members.map(m => m.userId).sort(), [a,b].sort());
    const chats = await tx.select().from(conversations).where(eq(conversations.roomId, roomId)).orderBy(asc(conversations.id));
    assert.equal(chats.length, 2); assert(chats.every(c => c.kind === "room"));
    const chatIds = chats.map(c => c.id);
    const rows = await tx.select().from(messages).where(inArray(messages.conversationId, chatIds)).orderBy(asc(messages.id));
    assert.equal(rows.length, 8);
    assert(rows.every(m => [a,b].includes(m.authorId) && ([`${name} parent`, `${name} child`].includes(m.body) || /^MS714 latency (Room|Subroom) [a-z0-9]+ [012]$/.test(m.body))), "Unexpected content: preserve and inspect");
    const notes = await tx.select().from(hallItems).where(inArray(hallItems.conversationId, chatIds));
    assert.equal(notes.length, 1); assert.equal(notes[0].authorId, a); assert.equal(notes[0].title, `${name} note`); assert.equal(notes[0].body, "Canonical shared context");
    assert.equal((await tx.select().from(hallComments).where(eq(hallComments.itemId, notes[0].id))).length, 0);
    const privateIds = privateFixtures.map(f => f[0]);
    const privateRows = await tx.select().from(messages).where(inArray(messages.id, privateIds)).orderBy(asc(messages.id));
    assert.equal(privateRows.length, 5);
    for (const row of privateRows) { const expected = privateFixtures.find(f => f[0] === row.id)!; assert.equal(row.conversationId, personal); assert.equal(row.body, expected[1]); assert.equal(row.authorId, expected[2]); }
    const ids = [...rows.map(m => m.id), ...privateIds];
    assert.equal((await tx.select({ id: hallItems.id }).from(hallItems).where(inArray(hallItems.sourceMessageId, ids))).length, 0, "No retained source may be orphaned");
    assert.equal((await tx.select({ id: messages.id }).from(messages).where(and(inArray(messages.replyToId, ids), notInArray(messages.id, ids)))).length, 0, "No non-QA reply may be orphaned");
    const fingerprint = createHash("sha256").update(JSON.stringify({ room, chats, rows, notes, privateRows })).digest("hex");
    console.log(JSON.stringify({ mode: process.env.MS719_LIVE_CLEANUP ? "apply" : "dry-run", roomId, fingerprint, roomMessages: rows.length, hallItems: notes.length, exactPersonalMessages: privateRows.length }));
    if (!process.env.MS719_LIVE_CLEANUP) return;
    assert.equal(process.env.MS719_LIVE_CLEANUP, fingerprint, "Fixture changed; nothing deleted");
    const beforeUsers = await tx.select({ id: users.id }).from(users).orderBy(asc(users.id));
    const beforePrivate = await tx.select().from(conversations).where(inArray(conversations.kind, ["personal", "sandbox"])).orderBy(asc(conversations.id));
    await tx.delete(hallItems).where(eq(hallItems.id, notes[0].id));
    await tx.delete(rooms).where(eq(rooms.id, roomId));
    await tx.delete(messages).where(inArray(messages.id, privateIds));
    assert.deepEqual(await tx.select({ id: users.id }).from(users).orderBy(asc(users.id)), beforeUsers);
    assert.deepEqual(await tx.select().from(conversations).where(inArray(conversations.kind, ["personal", "sandbox"])).orderBy(asc(conversations.id)), beforePrivate);
    console.log("PASS: exact live QA fixture removed; users, Sandboxes and Personal conversations preserved. No application undo.");
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$client.end());
