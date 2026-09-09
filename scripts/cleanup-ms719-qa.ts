import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { and, asc, inArray, notInArray, or, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, conversations, messages, hallItems, hallComments, roomMemberships as roomMembers, users } from "../src/server/db/schema";

// Founder-authorized exact QA cleanup, never a prefix-based purge. Default is
// read-only. Apply requires the fingerprint from a reviewed, final dry run.
const fixtures = [
  { id: "a83a4c46-3cfb-4a00-921f-1608e77d7fd3", slug: "ms7-1-qa-japan-trip-2027-6f6ae6", name: "MS7.1 QA Japan Trip 2027" },
  { id: "26ba8c8f-a478-4550-bb68-e50a28c539d4", slug: "ms714-history-26ba8c8f", name: "MS714 History Acceptance" },
  { id: "3eccfb56-761a-4ec2-b1a6-9f97c2174c30", slug: "ms719-integrated-1788885047459-80440f", name: "MS719 Integrated 1788885047459" },
];
const actors = ["0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", "d7a58753-9877-45b2-9fc7-cca188559fed"];
const personalId = "be192eac-38c6-4d46-a6d2-bea19fa324fa", sandboxId = "7ea32cd4-d805-473a-b4b9-f32d2fb0a35d";
const privateFixtures = [
  ["69da9c6a-cd04-431a-a8e7-bbdc4cc081a7", "MS711 stress mtsdf7pa hey, testing Tosker", 0],
  ["9821c201-6282-435f-b8f6-caa5521a3c81", "MS711 stress mtsdf7pa reply", 1],
  ["fa6e1a9d-9c43-429c-b93d-8ec26479eaff", "MS711 attention mtsdsfz9", 0],
  ["35068ac4-9f9d-4834-b6b9-e2f4173c6500", "MS714 latency Personal mtsqrxl7 0", 0],
  ["b48e7e28-93d1-4234-9dd8-4ec65a330d70", "MS714 latency Personal mtsqs4qd 1", 0],
  ["9b380b5b-8113-44e8-a012-3dd8f588a7db", "MS714 latency Personal mtsqsbjk 2", 0],
  ["6a8b97e9-fc19-4c80-b032-3f86d8712140", "MS714 latency Personal mtsrgsld 0", 0],
  ["12f4d135-b04c-49eb-9a0d-06ebf0554dfe", "MS714 latency Personal mtsrgyj3 1", 0],
  ["9ace6a6f-7794-41dc-8760-6c6a5c5313cd", "MS714 latency Personal mtsrh3hl 2", 0],
  ["951a7400-5a1d-4e13-8bf7-9610ed01c6c1", "MS714 latency Personal mtsrnois 0", 0],
  ["37de43eb-f6ee-4e0f-b48d-6f19facc37c6", "MS714 latency Personal mtsrnsai 1", 0],
  ["a8a4a349-927b-4508-aff8-deab700a252b", "MS714 latency Personal mtsrnwxs 2", 0],
  ["20d75558-24da-4d7c-ac38-86ea20b484cf", "MS711 attention mtsrr2nf", 0],
  ["9ba19061-93c5-48fa-bd61-b0d6b8a2ca79", "MS719 retained-source Personal 1788885400821", 0],
  ["fb693ab8-f974-4074-99d5-18064f17f5fd", "MS719 retained-source Sandbox 1788885584410", 0],
  ["370e0fd1-0693-44aa-80f5-4f879d53f8fb", "MS714 latency Personal mtu5dccd 0", 0],
  ["acf51e6e-6f4b-4033-b539-d06a0dad0381", "MS714 latency Personal mtu5dfqq 1", 0],
  ["8bd74dea-5d86-474a-8105-ddcc862236e0", "MS714 latency Personal mtu5dlc9 2", 0],
] as const;
const db = getDatabase();
async function main() {
  await db.transaction(async tx => {
    const selected = await tx.select().from(rooms).where(inArray(rooms.id, fixtures.map(f => f.id))).orderBy(asc(rooms.id)).for("update");
    assert.equal(selected.length, fixtures.length, "Every exact fixture must exist; inspect before retrying cleanup");
    for (const room of selected) {
      const expected = fixtures.find(f => f.id === room.id)!;
      assert.equal(room.slug, expected.slug); assert.equal(room.name, expected.name); assert.equal(room.ownerId, actors[0]);
    }
    const chats = await tx.select().from(conversations).where(inArray(conversations.roomId, fixtures.map(f => f.id))).orderBy(asc(conversations.id));
    assert(chats.every(c => c.kind === "room"), "Never delete Personal/Sandbox conversations");
    const chatIds = chats.map(c => c.id);
    const rows = await tx.select().from(messages).where(inArray(messages.conversationId, chatIds)).orderBy(asc(messages.id));
    const notes = await tx.select().from(hallItems).where(inArray(hallItems.conversationId, chatIds)).orderBy(asc(hallItems.id));
    const members = await tx.select().from(roomMembers).where(inArray(roomMembers.roomId, fixtures.map(f => f.id))).orderBy(asc(roomMembers.roomId), asc(roomMembers.userId));
    const comments = notes.length ? await tx.select().from(hallComments).where(inArray(hallComments.itemId, notes.map(n => n.id))).orderBy(asc(hallComments.id)) : [];
    assert(rows.every(m => actors.includes(m.authorId)) && notes.every(n => actors.includes(n.authorId)) && comments.every(c => actors.includes(c.authorId)) && members.every(m => actors.includes(m.userId)), "Unexpected actor: stop for inspection");
    const rowIds = rows.map(m => m.id);
    if (rowIds.length) {
      assert.equal((await tx.select({ id: hallItems.id }).from(hallItems).where(and(inArray(hallItems.sourceMessageId, rowIds), or(sql`${hallItems.conversationId} is null`, notInArray(hallItems.conversationId, chatIds))))).length, 0, "External retained source must be preserved");
      assert.equal((await tx.select({ id: messages.id }).from(messages).where(and(inArray(messages.replyToId, rowIds), notInArray(messages.conversationId, chatIds)))).length, 0, "External reply must be preserved");
    }
    const privateIds = privateFixtures.map(f => f[0]);
    const privateRows = await tx.select().from(messages).where(inArray(messages.id, privateIds)).orderBy(asc(messages.id));
    assert.equal(privateRows.length, privateFixtures.length, "Inspect missing or changed QA records; never broaden targets");
    for (const row of privateRows) {
      const expected = privateFixtures.find(f => f[0] === row.id)!;
      assert.equal(row.body, expected[1]); assert.equal(row.authorId, actors[expected[2]]);
      assert.equal(row.conversationId, row.id === "fb693ab8-f974-4074-99d5-18064f17f5fd" ? sandboxId : personalId);
    }
    assert.equal((await tx.select({ id: hallItems.id }).from(hallItems).where(inArray(hallItems.sourceMessageId, privateIds))).length, 0, "Private QA source still pinned: inspect first");
    assert.equal((await tx.select({ id: messages.id }).from(messages).where(and(inArray(messages.replyToId, privateIds), notInArray(messages.id, privateIds)))).length, 0, "Non-QA reply must be preserved");
    const fingerprint = createHash("sha256").update(JSON.stringify({ selected, chats, rows, notes, comments, privateRows, memberships: members.map(m => ({ roomId: m.roomId, userId: m.userId, role: m.role })) })).digest("hex");
    const beforeUsers = await tx.select({ id: users.id }).from(users).orderBy(asc(users.id));
    const beforePrivate = await tx.select().from(conversations).where(inArray(conversations.kind, ["personal", "sandbox"])).orderBy(asc(conversations.id));
    console.log(JSON.stringify({ mode: process.env.MS719_CLEANUP_FINGERPRINT ? "apply" : "dry-run", fingerprint, fixtures: selected.map(r => ({ id: r.id, name: r.name })), conversations: chats.length, messages: rows.length, hallItems: notes.length, comments: comments.length, exactPrivateMessages: privateRows.length }));
    if (!process.env.MS719_CLEANUP_FINGERPRINT) return;
    assert.equal(process.env.MS719_CLEANUP_FINGERPRINT, fingerprint, "QA data changed since reviewed dry run; nothing deleted");
    // Remove only in-fixture retained references before their source messages.
    await tx.delete(hallItems).where(inArray(hallItems.conversationId, chatIds));
    await tx.delete(rooms).where(inArray(rooms.id, fixtures.map(f => f.id)));
    await tx.delete(messages).where(inArray(messages.id, privateIds));
    assert.deepEqual(await tx.select({ id: users.id }).from(users).orderBy(asc(users.id)), beforeUsers);
    assert.deepEqual(await tx.select().from(conversations).where(inArray(conversations.kind, ["personal", "sandbox"])).orderBy(asc(conversations.id)), beforePrivate);
    console.log("PASS: exact QA Rooms and cascaded QA content removed; users and all Personal/Sandbox conversations unchanged. Database deletion has no application undo.");
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$client.end());
