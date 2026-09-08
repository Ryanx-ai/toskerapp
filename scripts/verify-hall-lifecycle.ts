import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, rooms, roomMemberships, conversations, conversationParticipants, hallItems, hallComments, hallReactions, messages, notifications, subrooms } from "../src/server/db/schema";
import { changeHallLifecycle, createHallNote, ownsHallRoom, pinChatMessage } from "../src/server/hall/lifecycle";
import { addHallComment, editHallNote, moveHallItem, setHallReaction } from "../src/server/hall/service";

const db = getDatabase(), roomId = crypto.randomUUID(), chatId = crypto.randomUUID(), childId = crypto.randomUUID(), childChatId = crypto.randomUUID();
const slug = `qa-ms713-${roomId}`, noteA = crypto.randomUUID(), noteB = crypto.randomUUID(), sourceId = crypto.randomUUID();
async function main() {
  const [aUser] = await db.select().from(users).where(eq(users.id, "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef"));
  const [bUser] = await db.select().from(users).where(eq(users.id, "d7a58753-9877-45b2-9fc7-cca188559fed"));
  assert(aUser && bUser);
  const actor = (user: typeof aUser) => ({ userId: user.id, authProvider: user.authProvider, authSubject: user.authSubject });
  const a = actor(aUser), b = actor(bUser);
  const lifecycle = (who: typeof a, itemId: string, operation: "archive" | "restore" | "delete" | "unpin") => changeHallLifecycle(db, who, { conversationId: chatId, itemId, operation });
  const read = (id: string) => db.select().from(hallItems).where(eq(hallItems.id, id));
  try {
    await db.insert(rooms).values({ id: roomId, slug, name: "Temporary MS7.1.3 Hall acceptance", ownerId: a.userId });
    await db.insert(roomMemberships).values([{ roomId, userId: a.userId, role: "owner" }, { roomId, userId: b.userId, role: "member" }]);
    await db.insert(subrooms).values({ id: childId, roomId, name: "Owner-only", visibility: "owners", createdBy: a.userId });
    await db.insert(conversations).values([{ id: chatId, kind: "room", roomId, isPrimary: true }, { id: childChatId, kind: "room", roomId, subroomId: childId }]);
    await db.insert(conversationParticipants).values([{ conversationId: chatId, userId: a.userId }, { conversationId: chatId, userId: b.userId }, { conversationId: childChatId, userId: a.userId }]);
    const input = { id: noteA, conversationId: chatId, title: "A retained note", body: "Original content" };
    await Promise.all([createHallNote(db, a, input), createHallNote(db, a, input)]);
    assert.equal((await read(noteA)).length, 1);
    assert.equal((await db.select().from(notifications).where(eq(notifications.conversationId, chatId))).length, 1);
    await assert.rejects(() => createHallNote(db, b, input));
    await createHallNote(db, b, { ...input, id: noteB, title: "B retained note" });
    assert.equal(await ownsHallRoom(db, a, chatId), true);
    assert.equal(await ownsHallRoom(db, b, chatId), false);
    for (const operation of ["archive", "restore", "delete"] as const) await assert.rejects(() => lifecycle(b, noteA, operation));
    await assert.rejects(() => editHallNote(db, a, { conversationId: chatId, itemId: noteB, title: "Owner cannot rewrite B", body: "" }));
    await editHallNote(db, b, { conversationId: chatId, itemId: noteB, title: "B edited", body: "Kept" });
    await lifecycle(b, noteB, "archive");
    assert((await read(noteB))[0].archivedAt);
    await lifecycle(a, noteB, "restore");
    assert.equal((await read(noteB))[0].archivedAt, null);
    assert.equal((await read(noteB))[0].body, "Kept");
    const comment = { conversationId: chatId, itemId: noteA, id: crypto.randomUUID(), body: "Member comment" };
    await addHallComment(db, b, comment);
    await setHallReaction(db, b, { conversationId: chatId, itemId: noteA, reaction: "heart", active: true });
    await lifecycle(a, noteA, "archive");
    await assert.rejects(() => addHallComment(db, b, { ...comment, id: crypto.randomUUID() }));
    await assert.rejects(() => setHallReaction(db, b, { conversationId: chatId, itemId: noteA, reaction: "heart", active: true }));
    await assert.rejects(() => moveHallItem(db, b, { conversationId: chatId, itemId: noteA, direction: "right" }));
    await lifecycle(a, noteA, "restore");
    assert.equal((await db.select().from(hallComments).where(eq(hallComments.itemId, noteA))).length, 1);
    assert.equal((await db.select().from(hallReactions).where(eq(hallReactions.itemId, noteA))).length, 1);
    await assert.rejects(() => changeHallLifecycle(db, a, { conversationId: childChatId, itemId: noteA, operation: "delete" }));
    await assert.rejects(() => createHallNote(db, b, { ...input, id: crypto.randomUUID(), conversationId: childChatId }));
    await db.insert(messages).values({ id: sourceId, conversationId: chatId, authorId: a.userId, body: "Chat stays intact" });
    await Promise.all([pinChatMessage(db, a, { conversationId: chatId, messageId: sourceId }), pinChatMessage(db, b, { conversationId: chatId, messageId: sourceId })]);
    const pins = await db.select().from(hallItems).where(eq(hallItems.sourceMessageId, sourceId));
    assert.equal(pins.length, 1);
    await lifecycle(b, pins[0].id, "unpin");
    assert.equal((await db.select().from(messages).where(eq(messages.id, sourceId)))[0].body, "Chat stays intact");
    await lifecycle(a, noteA, "delete");
    assert.equal((await read(noteA)).length, 0);
    assert.equal((await db.select().from(hallComments).where(eq(hallComments.itemId, noteA))).length, 0);
    assert.equal((await db.select().from(hallReactions).where(eq(hallReactions.itemId, noteA))).length, 0);
    // Hall mutation waits behind withdrawal, then rechecks committed membership.
    let entered!: () => void, release!: () => void;
    const atLock = new Promise<void>((resolve) => { entered = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const withdrawal = db.transaction(async (tx) => {
      await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update"); entered(); await gate;
      await tx.delete(conversationParticipants).where(and(eq(conversationParticipants.conversationId, chatId), eq(conversationParticipants.userId, b.userId)));
      await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.userId, b.userId)));
    });
    await atLock;
    let settled = false;
    const racing = lifecycle(b, noteB, "delete").then(() => { settled = true; return true; }, () => { settled = true; return false; });
    await new Promise((resolve) => setTimeout(resolve, 150)); assert.equal(settled, false);
    release(); await withdrawal; assert.equal(await racing, false); assert.equal((await read(noteB)).length, 1);
    await lifecycle(a, noteB, "delete");
    // Exercise the same visible Hall controls in the existing test users' other
    // contexts; delete only the exact new note IDs, never a conversation.
    const [sandbox] = await db.select({ id: conversations.id }).from(conversations)
      .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, conversations.id))
      .where(and(eq(conversations.kind, "sandbox"), eq(conversationParticipants.userId, a.userId)));
    const [personal] = await db.select({ id: conversations.id }).from(conversations)
      .where(and(eq(conversations.kind, "personal"), eq(conversations.directKey, [a.userId, b.userId].sort().join(":"))));
    assert(sandbox && personal);
    for (const [context, privateToA] of [[sandbox, true], [personal, false]] as const) {
      const itemId = crypto.randomUUID();
      try {
        await createHallNote(db, a, { id: itemId, conversationId: context.id, title: "MS713 isolated acceptance", body: "Temporary test note" });
        assert.equal(await ownsHallRoom(db, a, context.id), false);
        await assert.rejects(() => changeHallLifecycle(db, b, { conversationId: context.id, itemId, operation: "delete" }));
        if (privateToA) await assert.rejects(() => addHallComment(db, b, { conversationId: context.id, itemId, id: crypto.randomUUID(), body: "Denied" }));
        else await addHallComment(db, b, { conversationId: context.id, itemId, id: crypto.randomUUID(), body: "Authorized shared comment" });
        for (const operation of ["archive", "restore", "delete"] as const) await changeHallLifecycle(db, a, { conversationId: context.id, itemId, operation });
        assert.equal((await read(itemId)).length, 0);
      } finally { await db.delete(hallItems).where(and(eq(hallItems.id, itemId), eq(hallItems.conversationId, context.id), eq(hallItems.authorId, a.userId))); }
    }
    console.log("PASS: author/owner moderation, member denial, archive/restore preserves comments/reactions, idempotent creation/notifications, scoped pin/unpin preserves Chat, delete cascade, Subroom isolation and mutation/withdrawal race.");
    console.log("PASS: Personal and Sandbox Hall lifecycle; Sandbox outsider denied; only exact temporary notes cleaned.");
  } finally { await db.delete(rooms).where(and(eq(rooms.id, roomId), eq(rooms.slug, slug))); }
}
main().then(() => process.exit(0)).catch((error: unknown) => { console.error("FAIL: Hall lifecycle", { location: error instanceof Error ? error.stack?.match(/verify-hall-lifecycle\.ts:\d+:\d+/)?.[0] : undefined }); process.exit(1); });
