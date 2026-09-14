/** Exact FP4 fixtures. Retained for browser acceptance; cleanup is a separate guarded command. */
import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, rooms, roomMemberships, subrooms, subroomAccess, conversations, conversationParticipants, messages, messageReactions, messageMentions, notifications, hallItems, hallComments, hallCommentReactions, hallReactions, sidebarPins } from "../src/server/db/schema";
import { addHallComment, listHallComments, setCommentReaction, setHallReaction } from "../src/server/hall/service";
import { createHallNote, pinChatMessage, changeHallLifecycle } from "../src/server/hall/lifecycle";
import { acceptedSendReceipt, changeOwnMessage, setMessageReaction } from "../src/server/conversations/service";
import { readMessageHistory } from "../src/server/conversations/history";
import { searchConversation } from "../src/server/conversations/search";
import { changeSidebarPin, readSidebarPins } from "../src/server/conversations/sidebar-pins";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
import type { AuthenticatedActor } from "../src/server/auth/actor";

const db = getDatabase();
// QA must fail visibly if a pooled Development connection stalls; no runtime config change.
db.$client.options.connectionTimeoutMillis = 15_000;
db.$client.options.query_timeout = 20_000;
const id = (n: number) => `f7400000-2026-4000-8000-${n.toString(16).padStart(12, "0")}`;
const aId = "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", bId = "d7a58753-9877-45b2-9fc7-cca188559fed";
let checks = 0;
const pass = (name: string) => { checks++; console.log(`PASS ${name}`); };
async function main() {
  assert.equal((await db.select().from(rooms).where(inArray(rooms.id, [id(1), id(5)]))).length, 0, "FP4 fixture already exists: inspect/resume, never duplicate");
  assert.equal((await db.select().from(sidebarPins).where(inArray(sidebarPins.userId, [aId, bId]))).length, 0, "Pre-existing QA-user pins: preserve and inspect before testing");
  const records = await db.select().from(users).where(inArray(users.id, [aId, bId]));
  const actor = (userId: string): AuthenticatedActor => { const row = records.find((entry) => entry.id === userId); assert(row); return { userId, authProvider: row.authProvider, authSubject: row.authSubject }; };
  const a = actor(aId), b = actor(bId);
  const [personal] = await db.select().from(conversations).where(and(eq(conversations.kind, "personal"), eq(conversations.directKey, [aId, bId].sort().join(":"))));
  const [sandbox] = await db.select().from(conversations).where(and(eq(conversations.kind, "sandbox"), eq(conversations.ownerId, aId))); assert(personal && sandbox);
  await db.transaction(async (tx) => {
    await tx.insert(rooms).values([{ id: id(1), ownerId: aId, name: "FP4 Acceptance", slug: "fp4-acceptance" }, { id: id(5), ownerId: aId, name: "FP4 Order Check", slug: "fp4-order-check" }]);
    await tx.insert(roomMemberships).values([id(1), id(5)].flatMap((roomId) => [{ roomId, userId: aId, role: "owner" as const }, { roomId, userId: bId, role: "member" as const }]));
    await tx.insert(subrooms).values({ id: id(2), roomId: id(1), name: "FP4 Planning", visibility: "selected", createdBy: aId });
    await tx.insert(subroomAccess).values([aId, bId].map((userId) => ({ subroomId: id(2), userId })));
    await tx.insert(conversations).values([{ id: id(3), roomId: id(1), kind: "room", isPrimary: true }, { id: id(4), roomId: id(1), kind: "room", subroomId: id(2), title: "FP4 Planning" }, { id: id(6), roomId: id(5), kind: "room", isPrimary: true }]);
    await tx.insert(conversationParticipants).values([id(3), id(4), id(6)].flatMap((conversationId) => [aId, bId].map((userId) => ({ conversationId, userId }))));
  });
  for (const [index, conversationId] of [id(3), id(4), personal.id, sandbox.id].entries()) {
    console.log(`STAGE ${index}: source and independent note`);
    const source = id(100 + index * 10), reply = id(101 + index * 10), note = id(102 + index * 10), comment = id(103 + index * 10), reader = index === 3 ? a : b;
    await db.insert(messages).values([{ id: source, conversationId, authorId: aId, body: "FP4 canonical source" }, { id: reply, conversationId, authorId: reader.userId, body: "FP4 independent reply", replyToId: source }]);
    await createHallNote(db, a, { id: note, conversationId, title: "FP4 retained note", body: "Keep this separate note" });
    await pinChatMessage(db, reader, { conversationId, messageId: source });
    console.log(`STAGE ${index}: reference comments and reactions`);
    const [pin] = await db.select().from(hallItems).where(eq(hallItems.sourceMessageId, source)); assert(pin);
    await addHallComment(db, reader, { id: comment, conversationId, itemId: pin.id, body: "FP4 Hall discussion" });
    await setHallReaction(db, reader, { conversationId, itemId: pin.id, reaction: "heart", active: true });
    await setCommentReaction(db, a, { conversationId, itemId: pin.id, commentId: comment, emoji: "👍", active: true });
    const discussion = await listHallComments(db, reader, conversationId, pin.id); assert.equal(discussion.comments[0].reactions[0].count, 1);
    console.log(`STAGE ${index}: edit and retraction`);
    assert.equal((await db.select().from(messageReactions).where(eq(messageReactions.messageId, source))).length, 0, "Hall reaction must not react to Chat source");
    if (index !== 3) await assert.rejects(changeOwnMessage(db, b, { conversationId, messageId: source, body: "forged edit" }), AuthorizationDeniedError);
    await changeOwnMessage(db, a, { conversationId, messageId: source, body: "FP4 canonical edited" });
    assert.equal((await readMessageHistory(db, reader, conversationId, { target: source })).messages.find((m) => m.id === source)?.body, "FP4 canonical edited");
    await assert.rejects(addHallComment(db, reader, { id: id(900 + index), conversationId: index === 3 ? personal.id : sandbox.id, itemId: pin.id, body: "forged scope" }));
    await setMessageReaction(db, a, { conversationId, messageId: source, emoji: "👍", active: true });
    await db.insert(messageMentions).values({ messageId: source, userId: reader.userId, start: 0, length: 3, label: "FP4" });
    await db.insert(notifications).values({ userId: reader.userId, actorId: aId, conversationId, messageId: source, type: "message" });
    await changeOwnMessage(db, a, { conversationId, messageId: source, remove: true });
    await changeOwnMessage(db, a, { conversationId, messageId: source, remove: true });
    const [receipt] = await db.select().from(messages).where(eq(messages.id, source)); assert.equal(receipt.body, ""); assert.equal(receipt.editedAt, null); assert.equal(receipt.replyToId, null);
    assert.equal((await db.select().from(hallItems).where(eq(hallItems.id, pin.id))).length, 0);
    assert.equal((await db.select().from(hallComments).where(eq(hallComments.id, comment))).length, 0);
    assert.equal((await db.select().from(hallReactions).where(eq(hallReactions.itemId, pin.id))).length, 0);
    assert.equal((await db.select().from(hallCommentReactions).where(eq(hallCommentReactions.commentId, comment))).length, 0);
    assert.equal((await db.select().from(notifications).where(eq(notifications.messageId, source))).length, 0);
    assert.equal((await db.select().from(messageMentions).where(eq(messageMentions.messageId, source))).length, 0);
    const history = await readMessageHistory(db, reader, conversationId, { checkIds: [source, reply] }); assert(history.removedIds.includes(source)); assert.equal(history.messages.find((m) => m.id === reply)?.replyTo, null);
    assert(!(await searchConversation(db, reader, conversationId, "canonical")).results.some((m) => m.id === source));
    await assert.rejects(setHallReaction(db, reader, { conversationId, itemId: pin.id, reaction: "heart", active: true }));
    await assert.rejects(addHallComment(db, reader, { conversationId, itemId: pin.id, id: comment, body: "resurrect" }));
    await db.transaction(async (tx) => { const ack = await acceptedSendReceipt(tx, a, conversationId, source); assert(ack?.removed); assert(!("body" in ack)); });
    await changeHallLifecycle(db, a, { conversationId, itemId: note, operation: "archive" });
    await assert.rejects(setHallReaction(db, reader, { conversationId, itemId: note, reaction: "heart", active: true }));
    await changeHallLifecycle(db, a, { conversationId, itemId: note, operation: "restore" });
    pass(`${["Room", "Subroom", "Personal", "Sandbox"][index]} Hall-reference comments/reactions; author edit; scoped denial; complete Nuke cascade/receipt/reply/Search; native note Archive/Restore`);
  }
  const activityBefore = await db.select({ id: notifications.id }).from(notifications);
  await changeSidebarPin(db, a, id(3), { kind: "pin", pinned: true }); await changeSidebarPin(db, a, id(6), { kind: "pin", pinned: true });
  assert.deepEqual(await readSidebarPins(db, aId), [id(3), id(6)]); assert.deepEqual(await readSidebarPins(db, bId), []);
  await changeSidebarPin(db, a, id(6), { kind: "move", targetId: id(3), expectedIds: [id(3), id(6)] });
  assert.deepEqual(await readSidebarPins(db, aId), [id(6), id(3)]);
  assert((await changeSidebarPin(db, a, id(3), { kind: "move", targetId: id(6), expectedIds: [id(3), id(6)] })).conflict);
  await assert.rejects(changeSidebarPin(db, a, sandbox.id, { kind: "pin", pinned: true }));
  await assert.rejects(changeSidebarPin(db, a, id(4), { kind: "pin", pinned: true }));
  await changeSidebarPin(db, b, id(6), { kind: "pin", pinned: true });
  await db.transaction(async (tx) => { await tx.select().from(rooms).where(eq(rooms.id, id(5))).for("update"); await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId, id(5)), eq(roomMemberships.userId, bId))); });
  assert.deepEqual(await readSidebarPins(db, bId), []); await assert.rejects(changeSidebarPin(db, b, id(6), { kind: "pin", pinned: true }));
  await db.insert(roomMemberships).values({ roomId: id(5), userId: bId });
  await db.delete(sidebarPins).where(inArray(sidebarPins.conversationId, [id(3), id(6)]));
  assert.deepEqual(await db.select({ id: notifications.id }).from(notifications), activityBefore); pass("private pin persistence/order/stale conflict, actor isolation, Sandbox/child rejection, withdrawn target filtering, zero notification writes");
  // A bounded old-source jump fixture; the UI must load it outside the latest page.
  await db.insert(messages).values(Array.from({ length: 54 }, (_, index) => ({ id: id(600 + index), conversationId: id(3), authorId: aId, body: `FP4 history ${index}`, createdAt: new Date(Date.now() - (54 - index) * 1000) })));
  await pinChatMessage(db, b, { conversationId: id(3), messageId: id(600) });
  console.log(JSON.stringify({ result: "PASS", checks, fixturesRetained: true, room: "/room/fp4-acceptance", child: `/room/fp4-acceptance/subroom/${id(2)}`, second: "/room/fp4-order-check", personalId: personal.id, sandboxId: sandbox.id }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$client.end());
