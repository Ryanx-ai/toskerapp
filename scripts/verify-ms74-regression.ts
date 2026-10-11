/** Rollback-only Chat/Board regression. Never select an arbitrary retained Room. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { messages, hallItems, hallReactions, connections, conversations } from "../src/server/db/schema";
import { createQaFixture, resolveQaActors } from "./lib/ms73-fixtures";
import { readMessageHistory } from "../src/server/conversations/history";
import { searchConversation } from "../src/server/conversations/search";
import { changeOwnMessage, setMessageReaction, acceptedSendReceipt } from "../src/server/conversations/service";
import { createHallNote, pinChatMessage, changeHallLifecycle } from "../src/server/hall/lifecycle";
import { addHallComment, listHallComments, setHallReaction, requireHallNote } from "../src/server/hall/service";
import { liveRoster } from "../src/server/live/roster";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
const db = getDatabase(), rollback = new Error("MS74 regression rollback");
async function main() {
  await assert.rejects(() => db.transaction(async tx => {
    const d = tx as unknown as ToskerDatabase, actors = await resolveQaActors(tx);
    const fixture = await createQaFixture(d, "MS7.4 rollback-only Chat Board authorization regression");
    const id = randomUUID(), noteId = randomUUID(), commentId = randomUUID();
    const [sandbox] = await tx.select().from(conversations).where(and(eq(conversations.kind, "sandbox"), eq(conversations.ownerId, actors.a.userId)));
    assert(sandbox);
    await tx.insert(messages).values({ id, conversationId: fixture.conversationId, authorId: actors.a.userId, body: "Safe rollback-only MS74 text" });
    assert((await readMessageHistory(d, actors.b, fixture.conversationId)).messages.some(m => m.id === id));
    assert.equal((await searchConversation(d, actors.b, fixture.conversationId, "MS74")).results[0].id, id);
    assert.equal((await acceptedSendReceipt(tx, actors.a, fixture.conversationId, id))?.authorId, actors.a.userId);
    await assert.rejects(() => acceptedSendReceipt(tx, actors.b, fixture.conversationId, id), AuthorizationDeniedError);
    await assert.rejects(() => changeOwnMessage(d, actors.b, { conversationId: fixture.conversationId, messageId: id, body: "forged" }), AuthorizationDeniedError);
    await setMessageReaction(d, actors.b, { conversationId: fixture.conversationId, messageId: id, emoji: "❤️", active: true });
    await changeOwnMessage(d, actors.a, { conversationId: fixture.conversationId, messageId: id, body: "Safe edited MS74 text" });
    await pinChatMessage(d, actors.a, { conversationId: fixture.conversationId, messageId: id });
    const [pin] = await tx.select().from(hallItems).where(eq(hallItems.sourceMessageId, id)); assert(pin);
    await requireHallNote(d, actors.b, fixture.conversationId, pin.id);
    await assert.rejects(() => requireHallNote(d, actors.a, sandbox.id, pin.id), AuthorizationDeniedError);
    await createHallNote(d, actors.a, { id: noteId, conversationId: fixture.conversationId, title: "Safe rollback QA", body: "Not retained" });
    await createHallNote(d, actors.a, { id: noteId, conversationId: fixture.conversationId, title: "Retry", body: "Not retained" });
    await addHallComment(d, actors.b, { id: commentId, conversationId: fixture.conversationId, itemId: noteId, body: "Safe QA comment" });
    await addHallComment(d, actors.b, { id: commentId, conversationId: fixture.conversationId, itemId: noteId, body: "Safe QA comment" });
    assert.equal((await listHallComments(d, actors.a, fixture.conversationId, noteId)).comments.length, 1);
    await setHallReaction(d, actors.b, { conversationId: fixture.conversationId, itemId: noteId, reaction: "heart", active: true });
    await setHallReaction(d, actors.b, { conversationId: fixture.conversationId, itemId: noteId, reaction: "heart", active: true });
    assert.equal((await tx.select().from(hallReactions).where(eq(hallReactions.itemId, noteId))).length, 1);
    await changeHallLifecycle(d, actors.a, { conversationId: fixture.conversationId, itemId: noteId, operation: "archive" });
    await assert.rejects(() => requireHallNote(d, actors.b, fixture.conversationId, noteId), AuthorizationDeniedError);
    await changeHallLifecycle(d, actors.a, { conversationId: fixture.conversationId, itemId: noteId, operation: "restore" });
    await requireHallNote(d, actors.b, fixture.conversationId, noteId);
    await changeOwnMessage(d, actors.a, { conversationId: fixture.conversationId, messageId: id, remove: true });
    assert.equal((await tx.select().from(hallItems).where(eq(hallItems.id, pin.id))).length, 0);
    assert.equal((await searchConversation(d, actors.b, fixture.conversationId, "MS74")).results.length, 0);
    // A/B relationship only, transaction-local: no provider revocation or retained change.
    const pair = [actors.a.userId, actors.b.userId].sort().join(":");
    const [personal] = await tx.select().from(conversations).where(and(eq(conversations.kind, "personal"), eq(conversations.directKey, pair))); assert(personal);
    await tx.update(connections).set({ status: "pending" }).where(eq(connections.pairKey, pair));
    await assert.rejects(() => liveRoster(d, actors.a, { conversationId: personal.id, userIds: [] }), AuthorizationDeniedError);
    throw rollback;
  }), error => error === rollback);
  console.log(JSON.stringify({ pass: true, rollbackOnly: true, founderResolvedAndIncluded: true, providerCalls: 0, cases: ["Chat history/search", "send receipt identity", "author-only edit", "reaction", "Board source reference", "cross-context denial", "note/comment/reaction dedup", "archive/restore", "source deletion cascade", "revoked Personal Live denial"] }));
}
main().catch(error => { console.error({ pass: false, kind: error.name, detail: error instanceof assert.AssertionError ? error.message.split("\n")[0] : undefined }); process.exitCode = 1; }).finally(() => db.$client.end());
