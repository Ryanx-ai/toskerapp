import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, rooms, roomMemberships, subrooms, conversations, conversationParticipants, messages, notifications } from "../src/server/db/schema";
import { acknowledgeChat, acknowledgeDestination, acknowledgeNotifications, hallNotificationRecipients } from "../src/server/attention/service";
import { deriveAttention } from "../src/lib/attention";

async function main() {
  const db = getDatabase();
  const ids = ["0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", "d7a58753-9877-45b2-9fc7-cca188559fed"];
  const people = await db.select().from(users).where(inArray(users.id, ids));
  assert.equal(people.length, 2);
  const [a, b] = ids.map((id) => { const user = people.find((p) => p.id === id)!; return { userId: id, authProvider: user.authProvider, authSubject: user.authSubject }; });
  const roomId = crypto.randomUUID(), parent = crypto.randomUUID(), child = crypto.randomUUID(), restricted = crypto.randomUUID();
  const childId = crypto.randomUUID(), restrictedId = crypto.randomUUID();
  const first = crypto.randomUUID(), later = crypto.randomUUID();
  const n = Array.from({ length: 6 }, () => crypto.randomUUID());
  try {
    await db.insert(rooms).values({ id: roomId, ownerId: a.userId, slug: `qa-attention-${roomId}`, name: "Temporary attention verification" });
    await db.insert(roomMemberships).values([{ roomId, userId: a.userId, role: "owner" }, { roomId, userId: b.userId, role: "member" }]);
    await db.insert(subrooms).values([{ id: childId, roomId, createdBy: a.userId, name: "Shared child", visibility: "everyone" }, { id: restrictedId, roomId, createdBy: a.userId, name: "Restricted", visibility: "owners" }]);
    await db.insert(conversations).values([{ id: parent, roomId, kind: "room", isPrimary: true }, { id: child, roomId, subroomId: childId, kind: "room" }, { id: restricted, roomId, subroomId: restrictedId, kind: "room" }]);
    await db.insert(conversationParticipants).values([parent, child, restricted].flatMap((conversationId) => ids.map((userId) => ({ userId, conversationId }))));
    assert.deepEqual(await hallNotificationRecipients(db, parent, a.userId), [{ userId: b.userId }]);
    assert.deepEqual(await hallNotificationRecipients(db, child, a.userId), [{ userId: b.userId }]);
    assert.deepEqual(await hallNotificationRecipients(db, restricted, a.userId), [], "Restricted stale participants get no Hall notification");
    await db.insert(messages).values([{ id: first, conversationId: parent, authorId: a.userId, body: "First QA", createdAt: new Date("2026-09-07T00:00:00Z") }, { id: later, conversationId: parent, authorId: a.userId, body: "Later QA", createdAt: new Date("2026-09-07T00:00:01Z") }]);
    await db.insert(notifications).values([
      { id: n[0], userId: b.userId, actorId: a.userId, roomId, conversationId: parent, messageId: first, type: "message" },
      { id: n[1], userId: b.userId, actorId: a.userId, roomId, conversationId: parent, messageId: later, type: "message" },
      { id: n[2], userId: b.userId, actorId: a.userId, roomId, conversationId: parent, type: "hall_note" },
      { id: n[3], userId: b.userId, actorId: a.userId, roomId, conversationId: child, type: "hall_pin" },
      { id: n[4], userId: b.userId, actorId: a.userId, roomId, type: "connection_request" },
      { id: n[5], userId: b.userId, actorId: a.userId, roomId, conversationId: parent, type: "hall_note" },
    ]);
    const rows = () => db.select().from(notifications).where(inArray(notifications.id, n));
    await acknowledgeNotifications(db, a, n);
    assert((await rows()).every((r) => r.readAt === null), "Cannot acknowledge another recipient's records");
    await acknowledgeNotifications(db, b, n.slice(0, 5));
    let snapshot = await rows();
    assert(snapshot.every((r) => r.destinationReadAt === null), "Notifications must not clear destinations");
    assert.equal(snapshot.find((r) => r.id === n[5])!.readAt, null, "Unrendered arrivals remain new");
    const derived = deriveAttention(snapshot.map((r) => ({ ...r, readAt: r.readAt?.toISOString() ?? null, destinationReadAt: null })));
    assert.equal(derived.notifications, 1); assert.equal(derived.requests, 1); assert.equal(derived.conversations[parent], 4);
    await acknowledgeDestination(db, b, [n[0], n[2], n[3], n[4]], parent);
    snapshot = await rows();
    assert(snapshot.find((r) => r.id === n[2])!.destinationReadAt);
    assert(snapshot.filter((r) => r.id !== n[2]).every((r) => r.destinationReadAt === null), "Hall clears only its rendered exact scope");
    await acknowledgeChat(db, b, parent, first);
    snapshot = await rows();
    assert(snapshot.find((r) => r.id === n[0])!.destinationReadAt);
    assert.equal(snapshot.find((r) => r.id === n[1])!.destinationReadAt, null, "Later message remains unread");
    assert.equal(snapshot.find((r) => r.id === n[5])!.destinationReadAt, null, "Chat does not clear Hall");
    await acknowledgeDestination(db, b, n);
    snapshot = await rows();
    assert(snapshot.find((r) => r.id === n[4])!.destinationReadAt);
    assert.equal(snapshot.find((r) => r.id === n[3])!.destinationReadAt, null, "Requests do not clear child Hall");
    await assert.rejects(() => acknowledgeDestination(db, b, [n[3]], restricted));
    await assert.rejects(() => acknowledgeChat(db, b, restricted, first));
    await assert.rejects(() => acknowledgeNotifications(db, b, ["invalid"]));
    console.log("PASS: recipient-only acknowledgement; Notifications independent; Chat/Hall/Requests/child isolation; rendered boundaries; restricted access; derived attention.");
  } finally {
    await db.delete(rooms).where(and(eq(rooms.id, roomId), eq(rooms.slug, `qa-attention-${roomId}`)));
  }
}
main().then(() => process.exit(0)).catch(() => { console.error("Attention acceptance failed"); process.exit(1); });
