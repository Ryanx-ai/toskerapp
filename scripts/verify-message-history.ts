import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, rooms, roomMemberships, conversations, conversationParticipants, messages, messageReactions, subrooms } from "../src/server/db/schema";
import { readMessageHistory } from "../src/server/conversations/history";

const db = getDatabase(), roomId = crypto.randomUUID(), chatId = crypto.randomUUID(), childId = crypto.randomUUID(), childChatId = crypto.randomUUID();
const slug = `ms714-history-${roomId.slice(0, 8)}`;
let passed = false;
async function main() {
  const [a] = await db.select().from(users).where(eq(users.id, "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef"));
  const [b] = await db.select().from(users).where(eq(users.id, "d7a58753-9877-45b2-9fc7-cca188559fed"));
  assert(a && b);
  const actor = (user: typeof a) => ({ userId: user.id, authProvider: user.authProvider, authSubject: user.authSubject });
  try {
    await db.insert(rooms).values({ id: roomId, slug, name: "MS714 History Acceptance", ownerId: a.id });
    await db.insert(roomMemberships).values([{ roomId, userId: a.id, role: "owner" }, { roomId, userId: b.id, role: "member" }]);
    await db.insert(subrooms).values({ id: childId, roomId, name: "History private", visibility: "owners", createdBy: a.id });
    await db.insert(conversations).values([{ id: chatId, kind: "room", roomId, isPrimary: true }, { id: childChatId, kind: "room", roomId, subroomId: childId }]);
    await db.insert(conversationParticipants).values([{ conversationId: chatId, userId: a.id }, { conversationId: chatId, userId: b.id }, { conversationId: childChatId, userId: a.id }]);
    const ids = Array.from({ length: 525 }, () => crypto.randomUUID());
    const end = Date.now() - 600000;
    const rows = ids.map((id, index) => ({ id, conversationId: chatId, authorId: index % 2 ? b.id : a.id,
      body: index % 29 === 0 ? "" : `MS714 history ${String(index + 1).padStart(4, "0")}${index % 19 === 0 ? " edited" : ""}${index % 23 === 0 ? "\nSecond line\nhttps://example.com" : ""}${index === 42 ? `\n${"W".repeat(1500)}` : ""}`,
      createdAt: new Date(end - (525 - Math.floor(index / 5) * 5) * 3600000),
      editedAt: index % 19 === 0 ? new Date(end) : null, deletedAt: index % 29 === 0 ? new Date(end) : null,
      replyToId: index > 0 && index % 17 === 0 ? ids[index - 1] : null,
    }));
    for (let start = 0; start < rows.length; start += 100) await db.insert(messages).values(rows.slice(start, start + 100));
    await db.insert(messageReactions).values(ids.filter((_, index) => index % 13 === 0 && index % 29 !== 0).flatMap((messageId) => [{ messageId, userId: a.id, emoji: "👍" }, { messageId, userId: b.id, emoji: "👍" }]));
    const ordered = [...rows].sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime() || x.id.localeCompare(y.id));
    const gathered = [];
    let page = await readMessageHistory(db, actor(a), chatId);
    assert.equal(page.messages.length, 50);
    assert.equal(page.latest?.id, ordered.at(-1)!.id);
    gathered.unshift(...page.messages);
    while (page.nextCursor) { page = await readMessageHistory(db, actor(a), chatId, { before: page.nextCursor.id }); gathered.unshift(...page.messages); }
    assert.equal(gathered.length, 525); assert.equal(new Set(gathered.map((row) => row.id)).size, 525);
    assert.deepEqual(gathered.map((row) => row.id), ordered.map((row) => row.id));
    assert(gathered.some((row) => row.deletedAt && row.body === "Message deleted"));
    assert(gathered.some((row) => row.reactionSummary.some((reaction) => reaction.count === 2 && reaction.mine)));
    assert(gathered.some((row) => row.replyToId && row.replyTo));
    const forward = await readMessageHistory(db, actor(b), chatId, { after: ordered[99].id });
    assert.deepEqual(forward.messages.map((row) => row.id), ordered.slice(100, 150).map((row) => row.id));
    const retained = await readMessageHistory(db, actor(a), chatId, { ids: ordered.slice(100, 300).map((row) => row.id) });
    assert.equal(retained.messages.length, 200);
    await assert.rejects(() => readMessageHistory(db, actor(a), chatId, { ids: ids.slice(0, 201) }));
    await assert.rejects(() => readMessageHistory(db, actor(a), chatId, { before: "not-a-cursor" }));
    await assert.rejects(() => readMessageHistory(db, actor(a), chatId, { before: ids[0], after: ids[1] }));
    await assert.rejects(() => readMessageHistory(db, actor(b), childChatId));
    const oldTarget = await readMessageHistory(db, actor(a), chatId, { target: ordered[100].id });
    assert.equal(oldTarget.messages.at(-1)?.id, ordered[100].id);
    assert.equal((await readMessageHistory(db, actor(a), childChatId, { target: ordered[100].id })).messages.length, 0);
    passed = true;
    console.log("PASS: 525 mixed messages, tied timestamp order, 50-row backward/forward pages, bounded 200-ID refresh, canonical quotes/reactions/tombstones, malformed/foreign cursors and unauthorized Subroom denial.");
    if (process.env.MS714_KEEP_FIXTURE === "1") console.log(JSON.stringify({ fixture: "MS714", roomId, slug, conversationId: chatId, childId, oldMessageId: ordered[100].id, oldestId: ordered[0].id, newestId: ordered.at(-1)!.id }));
  } finally { if (!passed || process.env.MS714_KEEP_FIXTURE !== "1") await db.delete(rooms).where(and(eq(rooms.id, roomId), eq(rooms.slug, slug))); }
}
main().then(() => process.exit(0)).catch((error: unknown) => { console.error("FAIL: message history", { location: error instanceof Error ? error.stack?.match(/verify-message-history\.ts:\d+:\d+/)?.[0] : undefined }); process.exit(1); });
