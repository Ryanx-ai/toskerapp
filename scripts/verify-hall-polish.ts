import assert from "node:assert/strict";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { conversations, hallComments, hallItems, hallReactions, roomMemberships, users } from "../src/server/db/schema";
import { addHallComment, listHallComments, moveHallItem, requireHallNote, setHallReaction } from "../src/server/hall/service";
import { safeHallImagePath } from "../src/lib/hall-contract";

const db = getDatabase();
const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
async function main() {
  const [room] = await db.select().from(conversations).where(and(eq(conversations.kind, "room"), eq(conversations.isPrimary, true), isNull(conversations.subroomId))).limit(1);
  assert(room?.roomId, "Development shared Room required");
  const members = await db.select({ user: users }).from(users).innerJoin(roomMemberships, eq(roomMemberships.userId, users.id)).where(eq(roomMemberships.roomId, room.roomId));
  assert(members.length >= 2, "Two isolated Room users required");
  const actor = (user: typeof users.$inferSelect) => ({ userId: user.id, authProvider: user.authProvider, authSubject: user.authSubject });
  const a = actor(members[0].user), b = actor(members[1].user);
  const allUsers = await db.select().from(users);
  const outsider = allUsers.find((user) => !members.some((member) => member.user.id === user.id));
  assert(outsider, "An isolated nonmember is required");
  const previousOrder = await db.select({ id: hallItems.id, position: hallItems.position }).from(hallItems).where(eq(hallItems.conversationId, room.id));
  try {
    await db.insert(hallItems).values(ids.map((id, index) => ({ id, conversationId: room.id, roomId: room.roomId, kind: "note" as const, authorId: a.userId, title: `QA Hall ${index}`, body: "Temporary verification fixture", position: 9999 })));
    const input = { conversationId: room.id, itemId: ids[0], body: "A comment persisted for B", id: crypto.randomUUID() };
    await addHallComment(db, a, input);
    await addHallComment(db, a, input);
    const comments = await listHallComments(db, b, room.id, ids[0]);
    assert.equal(comments.comments.length, 1);
    assert.equal(comments.comments[0].authorId, a.userId);
    await assert.rejects(() => listHallComments(db, actor(outsider), room.id, ids[0]));
    await assert.rejects(() => addHallComment(db, actor(outsider), { ...input, id: crypto.randomUUID() }));
    await assert.rejects(() => addHallComment(db, a, { ...input, body: " ", id: crypto.randomUUID() }));
    const reaction = { conversationId: room.id, itemId: ids[0], reaction: "heart" as const, active: true };
    await Promise.all([setHallReaction(db, a, reaction), setHallReaction(db, a, reaction)]);
    await setHallReaction(db, b, reaction);
    await setHallReaction(db, b, { ...reaction, active: false });
    const reactions = await db.select().from(hallReactions).where(eq(hallReactions.itemId, ids[0]));
    assert.equal(reactions.length, 1); assert.equal(reactions[0].userId, a.userId);
    await assert.rejects(() => setHallReaction(db, actor(outsider), reaction));
    const [sandbox] = await db.select().from(conversations).where(and(eq(conversations.kind, "sandbox"), eq(conversations.ownerId, a.userId))).limit(1);
    assert(sandbox);
    await assert.rejects(() => requireHallNote(db, a, sandbox.id, ids[0]));
    await assert.rejects(() => moveHallItem(db, actor(outsider), { conversationId: room.id, itemId: ids[0], targetId: ids[1] }));
    await assert.rejects(() => moveHallItem(db, a, { conversationId: room.id, itemId: ids[0], targetId: crypto.randomUUID() }));
    const before = await db.select({ id: hallItems.id }).from(hallItems).where(and(eq(hallItems.conversationId, room.id), isNull(hallItems.archivedAt))).orderBy(asc(hallItems.position), asc(hallItems.createdAt), asc(hallItems.id));
    const expected = before.map((item) => item.id);
    const from = expected.indexOf(ids[2]), to = expected.indexOf(ids[0]);
    expected.splice(to, 0, expected.splice(from, 1)[0]);
    await moveHallItem(db, a, { conversationId: room.id, itemId: ids[2], targetId: ids[0] });
    const order = await db.select({ id: hallItems.id, position: hallItems.position }).from(hallItems).where(and(eq(hallItems.conversationId, room.id), isNull(hallItems.archivedAt))).orderBy(asc(hallItems.position));
    assert.equal(new Set(order.map((item) => item.position)).size, order.length);
    assert.deepEqual(order.map((item) => item.id), expected);
    assert.equal(safeHallImagePath("https://example.com/photo.jpg"), null);
    assert.equal(safeHallImagePath("data:image/png;base64,blob"), null);
    assert.equal(safeHallImagePath("/hall-media/../secret.png"), null);
    assert.equal(safeHallImagePath("/hall-media/reviewed-image.webp"), "/hall-media/reviewed-image.webp");
    await db.delete(hallItems).where(eq(hallItems.id, ids[0]));
    assert.equal((await db.select().from(hallComments).where(eq(hallComments.itemId, ids[0]))).length, 0);
    assert.equal((await db.select().from(hallReactions).where(eq(hallReactions.itemId, ids[0]))).length, 0);
    console.log(JSON.stringify({ hall: "pass", isolatedUsers: 2, commentRetry: "deduplicated", reactionRetry: "deduplicated", ownReactionRemoval: "pass", nonmemberDenied: true, crossConversationDenied: true, deterministicReorder: true, mediaBoundary: "pass", cascadeCleanup: "pass" }));
  } finally {
    await db.delete(hallItems).where(inArray(hallItems.id, ids));
    for (const item of previousOrder) await db.update(hallItems).set({ position: item.position }).where(eq(hallItems.id, item.id));
  }
}
main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
