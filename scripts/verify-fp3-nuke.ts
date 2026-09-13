/** Exact FP3 fixtures retained for browser/final acceptance. No migrations/providers.
 * NODE_OPTIONS=--conditions=react-server dotenv -e .env.local -- tsx scripts/verify-fp3-nuke.ts
 */
import assert from "node:assert/strict";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, conversations, conversationParticipants, conversationReads, rooms, roomMemberships, subrooms, subroomAccess, messages, messageMentions, messageReactions, notifications, hallItems, hallComments } from "../src/server/db/schema";
import { acceptedSendReceipt, changeOwnMessage, requireLiveReply, setMessageReaction } from "../src/server/conversations/service";
import { readMessageHistory } from "../src/server/conversations/history";
import { searchConversation } from "../src/server/conversations/search";
import { createHallNote, pinChatMessage } from "../src/server/hall/lifecycle";
import { addHallComment, lockHallScope } from "../src/server/hall/service";
import { removeDraftSources, EMPTY_CHAT_DRAFT } from "../src/lib/chat-drafts";
import { withoutRemovedMessages } from "../src/lib/message-removal";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
import type { AuthenticatedActor } from "../src/server/auth/actor";

const db = getDatabase();
const id = (n: number) => `f7300000-2026-4000-8000-${n.toString(16).padStart(12, "0")}`;
const roomId = id(1), childId = id(2), parentId = id(3), childChat = id(4);
const aId = "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", bId = "d7a58753-9877-45b2-9fc7-cca188559fed";
let checks = 0;
const pass = (label: string) => { checks++; console.log(`PASS ${label}`); };
async function main() {
  assert.equal((await db.select().from(rooms).where(eq(rooms.id, roomId))).length, 0, "FP3 fixture exists: inspect/resume; do not duplicate");
  const actors = await db.select().from(users).where(inArray(users.id, [aId, bId]));
  const actor = (userId: string): AuthenticatedActor => { const row = actors.find((r) => r.id === userId); assert(row); return { userId, authProvider: row.authProvider, authSubject: row.authSubject }; };
  const a = actor(aId), b = actor(bId);
  const [personal] = await db.select().from(conversations).where(and(eq(conversations.kind, "personal"), eq(conversations.directKey, [aId, bId].sort().join(":"))));
  const [sandbox] = await db.select().from(conversations).where(and(eq(conversations.kind, "sandbox"), eq(conversations.ownerId, aId)));
  assert(personal && sandbox, "Existing canonical Personal/Sandbox required");
  await db.insert(rooms).values({ id: roomId, slug: "fp3-founder-review", name: "FP3 Founder Review", ownerId: aId });
  await db.insert(roomMemberships).values([{ roomId, userId: aId, role: "owner" }, { roomId, userId: bId, role: "member" }]);
  await db.insert(subrooms).values({ id: childId, roomId, name: "FP3 Planning", visibility: "selected", createdBy: aId });
  await db.insert(subroomAccess).values([{ subroomId: childId, userId: aId }, { subroomId: childId, userId: bId }]);
  await db.insert(conversations).values([{ id: parentId, kind: "room", roomId, isPrimary: true }, { id: childChat, kind: "room", roomId, subroomId: childId, title: "FP3 Planning" }]);
  await db.insert(conversationParticipants).values([parentId, childChat].flatMap((conversationId) => [aId, bId].map((userId) => ({ conversationId, userId }))));
  const scopes = [parentId, childChat, personal.id, sandbox.id];
  for (const [index, conversationId] of scopes.entries()) {
    const source = id(100 + index * 10), reply = id(101 + index * 10), note = id(102 + index * 10), comment = id(103 + index * 10), unrelated = id(104 + index * 10), reader = index === 3 ? a : b;
    await db.insert(messages).values([{ id: source, conversationId, authorId: aId, body: "FP3 confidential original", createdAt: new Date(Date.now() - 86400000), editedAt: new Date(), replyToId: unrelated }, { id: reply, conversationId, authorId: reader.userId, body: "Independent FP3 reply", replyToId: source }, { id: unrelated, conversationId, authorId: aId, body: "Unrelated FP3 retained message" }]);
    await db.insert(messageMentions).values({ messageId: source, userId: reader.userId, start: 0, length: 3, label: "FP3" });
    await setMessageReaction(db, reader, { conversationId, messageId: source, emoji: "👍", active: true });
    await db.insert(notifications).values([{ userId: reader.userId, actorId: aId, conversationId, messageId: source, type: "message", isMention: true }, { userId: reader.userId, actorId: aId, conversationId, messageId: unrelated, type: "message" }]);
    await createHallNote(db, a, { id: note, conversationId, title: "Independent FP3 note", body: "Keep this note" });
    await addHallComment(db, reader, { id: comment, conversationId, itemId: note, body: "Keep this comment" });
    await pinChatMessage(db, reader, { conversationId, messageId: source });
    const [beforeNote] = await db.select().from(hallItems).where(eq(hallItems.id, note));
    if (index < 3) await assert.rejects(() => changeOwnMessage(db, b, { conversationId, messageId: source, remove: true }), AuthorizationDeniedError);
    if (index === 0) await db.insert(conversationReads).values({ conversationId, userId: bId, manualChatUnreadId: id(500), manualHallUnreadId: id(501) });
    await changeOwnMessage(db, a, { conversationId, messageId: source, remove: true });
    await changeOwnMessage(db, a, { conversationId, messageId: source, remove: true });
    const [receipt] = await db.select().from(messages).where(eq(messages.id, source));
    assert(receipt.deletedAt); assert.equal(receipt.body, ""); assert.equal(receipt.replyToId, null); assert.equal(receipt.editedAt, null);
    const history = await readMessageHistory(db, reader, conversationId, { checkIds: [source, reply] });
    assert(history.removedIds.includes(source)); assert(!history.messages.some((m) => m.id === source));
    const kept = history.messages.find((m) => m.id === reply)!; assert(kept); assert.equal(kept.replyTo, null); assert.equal(kept.replyToId, null); assert.equal(kept.replyAuthor, null);
    assert(!(await readMessageHistory(db, reader, conversationId, { target: source })).messages.some((m) => m.id === source));
    assert(!(await searchConversation(db, reader, conversationId, "confidential")).results.some((m) => m.id === source));
    assert.equal((await db.select().from(messageReactions).where(eq(messageReactions.messageId, source))).length, 0);
    assert.equal((await db.select().from(messageMentions).where(eq(messageMentions.messageId, source))).length, 0);
    assert.equal((await db.select().from(notifications).where(eq(notifications.messageId, source))).length, 0);
    assert.equal((await db.select().from(hallItems).where(eq(hallItems.sourceMessageId, source))).length, 0);
    assert.equal((await db.select().from(notifications).where(eq(notifications.messageId, unrelated))).length, 1);
    assert.equal((await db.select().from(hallItems).where(eq(hallItems.id, note)))[0].position, beforeNote.position);
    assert.equal((await db.select().from(hallComments).where(eq(hallComments.id, comment))).length, 1);
    await assert.rejects(() => changeOwnMessage(db, a, { conversationId, messageId: source, body: "resurrection" }));
    await assert.rejects(() => setMessageReaction(db, a, { conversationId, messageId: source, emoji: "👍", active: true }));
    await assert.rejects(() => pinChatMessage(db, a, { conversationId, messageId: source }));
    await db.transaction(async (tx) => { await lockHallScope(tx, a, conversationId); const accepted = await acceptedSendReceipt(tx, a, conversationId, source); assert.equal(accepted?.removed, true); assert(!("body" in accepted!)); });
    pass(`${["Room", "Subroom", "Personal", "Sandbox"][index]}: author-only/idempotent Nuke, receipt, standalone reply, reactions/mentions/pin/exact notifications, Search/source, safe send receipt, unrelated content`);
  }
  const [pref] = await db.select().from(conversationReads).where(and(eq(conversationReads.conversationId, parentId), eq(conversationReads.userId, bId)));
  assert.equal(pref.manualChatUnreadId, id(500)); assert.equal(pref.manualHallUnreadId, id(501)); pass("manual unread survives Nuke");
  await db.insert(messages).values(Array.from({ length: 54 }, (_, i) => ({ id: id(600 + i), conversationId: parentId, authorId: aId, body: `FP3 history ${i}`, createdAt: new Date(Date.now() - 100000 + i * 1000) })));
  const page = await readMessageHistory(db, b, parentId); assert(page.nextCursor);
  await changeOwnMessage(db, a, { conversationId: parentId, messageId: page.nextCursor.id, remove: true });
  assert((await readMessageHistory(db, b, parentId, { before: page.nextCursor.id })).messages.length > 0); pass("removed page boundary preserves older cursor continuity");
  for (const [i, operation] of ["edit", "reaction", "pin"].entries()) {
    const source = id(700 + i); await db.insert(messages).values({ id: source, conversationId: parentId, authorId: aId, body: "FP3 race" });
    await Promise.allSettled([changeOwnMessage(db, a, { conversationId: parentId, messageId: source, remove: true }), operation === "edit" ? changeOwnMessage(db, a, { conversationId: parentId, messageId: source, body: "FP3 edited" }) : operation === "reaction" ? setMessageReaction(db, b, { conversationId: parentId, messageId: source, emoji: "👍", active: true }) : pinChatMessage(db, b, { conversationId: parentId, messageId: source })]);
    assert.equal((await db.select().from(messages).where(eq(messages.id, source)))[0].body, "");
    assert.equal((await db.select().from(messageReactions).where(eq(messageReactions.messageId, source))).length, 0);
    assert.equal((await db.select().from(hallItems).where(eq(hallItems.sourceMessageId, source))).length, 0);
    pass(`Nuke versus ${operation} race`);
  }
  await db.transaction(async (tx) => { await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update"); await tx.delete(subroomAccess).where(and(eq(subroomAccess.subroomId, childId), eq(subroomAccess.userId, bId))); });
  await assert.rejects(() => readMessageHistory(db, b, childChat, { checkIds: [id(110)] }), AuthorizationDeniedError);
  await assert.rejects(() => changeOwnMessage(db, b, { conversationId: childChat, messageId: id(111), remove: true }), AuthorizationDeniedError);
  await db.insert(subroomAccess).values({ subroomId: childId, userId: bId }); pass("revoked Subroom access blocks receipt reads and own-message Nuke");
  const removed = new Set([id(100)]), draft = { ...EMPTY_CHAT_DRAFT, body: "Keep my typing", reply: { id: id(100), author: "A", body: "secret" } };
  assert.deepEqual(removeDraftSources(draft, removed), { ...draft, reply: null });
  const rows = withoutRemovedMessages([{ id: id(100), body: "secret" }, { id: id(101), body: "reply", replyToId: id(100), replyTo: "secret", replyAuthor: "A" }], removed);
  assert.equal(rows.length, 1); assert.equal(rows[0].replyTo, undefined); pass("stale client row/reply suppression; unsent draft text preserved");
  assert.equal((await db.select().from(messages).where(and(eq(messages.conversationId, parentId), isNull(messages.deletedAt)))).length > 0, true);
  console.log(JSON.stringify({ result: "PASS", checks, fixturesRetained: true, roomId, parentId, childId, childChat, personalId: personal.id, sandboxId: sandbox.id }));
}
async function replyRace() {
  assert.equal((await db.select().from(rooms).where(eq(rooms.id, roomId))).length, 1);
  const actors = await db.select().from(users).where(inArray(users.id, [aId, bId]));
  const actor = (userId: string): AuthenticatedActor => { const row = actors.find((r) => r.id === userId)!; return { userId, authProvider: row.authProvider, authSubject: row.authSubject }; };
  const a = actor(aId), b = actor(bId), source = id(900), reply = id(901);
  assert.equal((await db.select().from(messages).where(inArray(messages.id, [source, reply]))).length, 0, "Race already ran");
  await db.insert(messages).values({ id: source, conversationId: parentId, authorId: aId, body: "FP3 race source" });
  const outcomes = await Promise.allSettled([
    db.transaction(async (tx) => { await lockHallScope(tx, b, parentId); await requireLiveReply(tx, parentId, source); await tx.insert(messages).values({ id: reply, conversationId: parentId, authorId: bId, body: "FP3 independent race reply", replyToId: source }); }),
    changeOwnMessage(db, a, { conversationId: parentId, messageId: source, remove: true }),
  ]);
  assert.equal(outcomes[1].status, "fulfilled");
  const page = await readMessageHistory(db, b, parentId, { checkIds: [source, reply] });
  assert(!page.messages.some((m) => m.id === source));
  const kept = page.messages.find((m) => m.id === reply);
  if (kept) { assert.equal(kept.replyToId, null); assert.equal(kept.replyTo, null); assert.equal(kept.replyAuthor, null); }
  await assert.rejects(() => db.transaction(async (tx) => { await lockHallScope(tx, b, parentId); await requireLiveReply(tx, parentId, source); }));
  console.log("PASS Nuke/reply serialization: independent accepted reply has no source; subsequent replies denied");
}
(process.argv.includes("--reply-race") ? replyRace() : main()).catch(() => { console.error("FP3 acceptance failed. Exact fixtures retained; inspect before retry. No secrets logged."); process.exitCode = 1; }).finally(() => db.$client.end());
