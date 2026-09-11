/** Tiny, explicitly owned Development browser fixtures. No founder rows mutated. */
import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { publishUserActivity } from "../src/server/realtime/provider";
import { users, profiles, connections, notifications, rooms, roomMemberships, subrooms, subroomAccess, conversations, conversationParticipants } from "../src/server/db/schema";
const db = getDatabase();
const a = "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", b = "d7a58753-9877-45b2-9fc7-cca188559fed";
const guest = "cf017101-1111-4111-8111-111111111111", room = "cf017101-2222-4222-8222-222222222222";
const chat = "cf017101-3333-4333-8333-333333333333", child = "cf017101-4444-4444-8444-444444444444", childChat = "cf017101-5555-4555-8555-555555555555";
const privateChild = "cf017101-6666-4666-8666-666666666666", privateChat = "cf017101-7777-4777-8777-777777777777";
const subject = "fp1-browser-fixture-only", slug = "fp1-navigation-review";
async function main() {
  const mode = process.argv[2];
  assert(["setup", "remove-request", "request-again", "cleanup"].includes(mode));
  assert.equal((await db.select().from(users).where(inArray(users.id, [a, b]))).length, 2);
  if (mode === "setup") {
    assert.equal((await db.select().from(users).where(eq(users.id, guest))).length, 0, "Never overwrite an existing fixture");
    await db.transaction(async tx => {
      await tx.insert(users).values({ id: guest, authProvider: "clerk", authSubject: subject, tid: "TID-FP1-ONLY" });
      await tx.insert(profiles).values({ userId: guest, displayName: "FP1 Request QA", username: "fp1-request-qa" });
      await tx.insert(connections).values({ requesterId: guest, addresseeId: b, pairKey: [guest, b].sort().join(":") });
      await tx.insert(notifications).values({ userId: b, actorId: guest, type: "connection_request" });
      await tx.insert(rooms).values({ id: room, slug, ownerId: a, name: "FP1 navigation — a deliberately long Room name for the founder header check" });
      await tx.insert(roomMemberships).values([{ roomId: room, userId: a, role: "owner" }, { roomId: room, userId: b, role: "member" }]);
      await tx.insert(subrooms).values([{ id: child, roomId: room, createdBy: a, name: "A deliberately long shared Subroom name for the narrow header check", visibility: "everyone" }, { id: privateChild, roomId: room, createdBy: a, name: "FP1 owners only", visibility: "owners" }]);
      await tx.insert(conversations).values([{ id: chat, roomId: room, kind: "room", isPrimary: true }, { id: childChat, roomId: room, subroomId: child, kind: "room" }, { id: privateChat, roomId: room, subroomId: privateChild, kind: "room" }]);
      await tx.insert(conversationParticipants).values([chat, childChat].flatMap(conversationId => [a,b].map(userId => ({ conversationId, userId }))));
      await tx.insert(conversationParticipants).values({ conversationId: privateChat, userId: a });
      await tx.insert(subroomAccess).values({ subroomId: privateChild, userId: a });
    });
  } else {
    assert.equal((await db.select().from(users).where(and(eq(users.id, guest), eq(users.authSubject, subject)))).length, 1, "Exact QA owner required");
    if (mode === "remove-request") await db.delete(connections).where(and(eq(connections.requesterId, guest), eq(connections.addresseeId, b)));
    if (mode === "request-again") await db.transaction(async tx => {
      await tx.insert(connections).values({ requesterId: guest, addresseeId: b, pairKey: [guest, b].sort().join(":") });
      await tx.insert(notifications).values({ userId: b, actorId: guest, type: "connection_request" });
    });
    if (mode === "cleanup") await db.transaction(async tx => {
      await tx.delete(rooms).where(and(eq(rooms.id, room), eq(rooms.slug, slug)));
      await tx.delete(notifications).where(inArray(notifications.actorId, [guest]));
      await tx.delete(users).where(and(eq(users.id, guest), eq(users.authSubject, subject)));
    });
  }
  await publishUserActivity(b);
  console.log(`FP1 fixture ${mode}: complete`);
}
main().then(()=>process.exit(0)).catch(error=>{console.error("FP1 fixture failed", error instanceof Error ? error.message : "unknown");process.exit(1)});
