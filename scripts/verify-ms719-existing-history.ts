import assert from "node:assert/strict";
import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, rooms, conversations, messages } from "../src/server/db/schema";
import { readMessageHistory } from "../src/server/conversations/history";

// Read-only final regression: reuse the retained 525+ fixture, do not reseed it.
const db = getDatabase();
async function main() {
  const roomId = "26ba8c8f-a478-4550-bb68-e50a28c539d4", chatId = "7a03d40e-6da6-4322-8af3-418987567f2c";
  const [room] = await db.select().from(rooms).where(and(eq(rooms.id, roomId), eq(rooms.slug, "ms714-history-26ba8c8f")));
  assert.equal(room?.ownerId, "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef");
  const [chat] = await db.select().from(conversations).where(and(eq(conversations.id, chatId), eq(conversations.roomId, roomId)));
  assert(chat?.isPrimary);
  const [user] = await db.select().from(users).where(eq(users.id, room.ownerId));
  const actor = { userId: user.id, authProvider: user.authProvider, authSubject: user.authSubject };
  const canonical = await db.select({ id: messages.id }).from(messages).where(eq(messages.conversationId, chatId)).orderBy(asc(messages.createdAt), asc(messages.id));
  assert(canonical.length >= 525);
  let page = await readMessageHistory(db, actor, chatId), gathered = [...page.messages];
  while (page.nextCursor) {
    page = await readMessageHistory(db, actor, chatId, { before: page.nextCursor.id });
    assert(page.messages.length <= 50); gathered = [...page.messages, ...gathered];
  }
  assert.deepEqual(gathered.map(row => row.id), canonical.map(row => row.id));
  assert.equal(new Set(gathered.map(row => row.id)).size, canonical.length);
  assert(gathered.some(row => row.deletedAt && row.body === "Message deleted"));
  assert(gathered.some(row => row.replyToId && row.replyAuthor));
  assert(gathered.some(row => row.reactionSummary.length));
  const target = canonical[100].id;
  assert.equal((await readMessageHistory(db, actor, chatId, { target })).messages.at(-1)?.id, target);
  const forward = await readMessageHistory(db, actor, chatId, { after: canonical[99].id });
  assert.deepEqual(forward.messages.map(row => row.id), canonical.slice(100, 150).map(row => row.id));
  const windowIds = canonical.slice(100, 300).map(row => row.id);
  assert.equal((await readMessageHistory(db, actor, chatId, { ids: windowIds })).messages.length, 200);
  await assert.rejects(() => readMessageHistory(db, actor, chatId, { ids: canonical.slice(0, 201).map(row => row.id) }));
  await assert.rejects(() => readMessageHistory(db, actor, chatId, { before: "invalid" }));
  await assert.rejects(() => readMessageHistory(db, actor, chatId, { before: target, after: target }));
  console.log(`PASS: reused ${canonical.length} canonical history rows; stable 50-row traversal/order, target/forward pages, bounded 200-ID refresh, quotes/reactions/tombstones, invalid/oversize cursors denied. No data written.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$client.end());
