import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { Realtime } from "ably";
import { getDatabase } from "../src/server/db/client";
import { conversationParticipants, conversations, profiles, roomMemberships, rooms, subrooms, users } from "../src/server/db/schema";
import { issueConversationToken } from "../src/server/realtime/auth";
import { publishMessageChanged, revokeActorRealtime } from "../src/server/realtime/provider";
import { conversationChannel, typingChannel, userChannel, MESSAGE_CHANGED } from "../src/lib/realtime-contract";

const db = getDatabase();
const roomId = crypto.randomUUID(), conversationId = crypto.randomUUID(), childId = crypto.randomUUID(), childConversationId = crypto.randomUUID();
const clients: Realtime[] = [];

async function main() {
  // Display names are mutable and are deliberately stressed by scenario 29.
  // Resolve the known QA identities without depending on their presentation.
  const candidates = await db.select({ user: users, username: profiles.username }).from(users).innerJoin(profiles, eq(users.id, profiles.userId));
  const aUser = candidates.find(({ user, username }) => user.id === "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef" && username === "tosker-user-a-clerk-test")?.user;
  const bUser = candidates.find(({ user, username }) => user.id === "d7a58753-9877-45b2-9fc7-cca188559fed" && username === "tosker-user-b-clerk-test")?.user;
  assert(aUser && bUser, "Existing test users required");
  const actor = (user: typeof users.$inferSelect) => ({ userId: user.id, authProvider: user.authProvider, authSubject: user.authSubject });
  const a = actor(aUser), b = actor(bUser);
  try {
    await db.insert(rooms).values({ id: roomId, ownerId: a.userId, slug: `qa-ms6b-${roomId}`, name: "Temporary MS6B transport verification" });
    await db.insert(roomMemberships).values([{ roomId, userId: a.userId, role: "owner" }, { roomId, userId: b.userId, role: "member" }]);
    await db.insert(subrooms).values({ id: childId, roomId, name: "Owner only", visibility: "owners", createdBy: a.userId });
    await db.insert(conversations).values([{ id: conversationId, roomId, kind: "room", isPrimary: true }, { id: childConversationId, roomId, subroomId: childId, kind: "room" }]);
    // Deliberately stale participation must NOT authorize the restricted child.
    await db.insert(conversationParticipants).values([{ conversationId, userId: a.userId }, { conversationId, userId: b.userId }, { conversationId: childConversationId, userId: a.userId }, { conversationId: childConversationId, userId: b.userId }]);
    await assert.rejects(() => issueConversationToken(db, b, childConversationId));
    await assert.rejects(() => issueConversationToken(db, b, crypto.randomUUID()));
    const [aToken, bToken] = await Promise.all([issueConversationToken(db, a, conversationId), issueConversationToken(db, b, conversationId)]);
    assert.equal(aToken.clientId, a.userId); assert.equal(bToken.clientId, b.userId);
    assert.equal(aToken.expires! - aToken.issued!, 600000);
    assert.deepEqual(JSON.parse(bToken.capability!), { [conversationChannel(conversationId)]: ["subscribe"], [typingChannel(conversationId)]: ["publish", "subscribe"], [userChannel(b.userId)]: ["subscribe"] });
    for (const token of [aToken, bToken]) clients.push(new Realtime({ tokenDetails: token, logLevel: 0, queueMessages: false }));
    const received = clients.map((client) => new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Realtime delivery timed out")), 10000);
      void client.channels.get(conversationChannel(conversationId)).subscribe(MESSAGE_CHANGED, () => { clearTimeout(timeout); resolve(); }).catch(() => { clearTimeout(timeout); reject(new Error("Attach failed")); });
    }));
    await Promise.all(clients.map((client) => client.channels.get(conversationChannel(conversationId)).attach()));
    const start = Date.now();
    await publishMessageChanged(conversationId);
    await Promise.all(received);
    const deliveryMs = Date.now() - start;
    await assert.rejects(() => clients[1].channels.get(conversationChannel(conversationId)).publish("forged", {}));
    await assert.rejects(() => clients[1].channels.get(conversationChannel(childConversationId)).attach());
    await assert.rejects(() => clients[1].channels.get(userChannel(a.userId)).attach());
    await assert.rejects(() => clients[1].channels.get(typingChannel(conversationId)).publish({ name: "typing.changed", clientId: a.userId, data: { active: true } }));
    await db.delete(roomMemberships).where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.userId, b.userId)));
    await assert.rejects(() => issueConversationToken(db, b, conversationId));
    await revokeActorRealtime(b.userId);
    const denied = new Realtime({ tokenDetails: bToken, logLevel: 0 }); clients.push(denied);
    await assert.rejects(() => denied.channels.get(conversationChannel(conversationId)).attach());
    console.log(JSON.stringify({ ms6bTransport: "PASS", deliveryMs, twoActorTokens: true, exactCapabilities: true, restrictedSubroomDenied: true, staleParticipationDenied: true, forgedDurablePublishDenied: true, forgedTypingIdentityDenied: true, removedMembershipDenied: true, revokedTokenDenied: true }));
  } finally {
    clients.forEach((client) => client.close());
    // Only this run's random-ID fixture; no founder content or identities deleted.
    await db.delete(rooms).where(and(eq(rooms.id, roomId), eq(rooms.slug, `qa-ms6b-${roomId}`)));
  }
}

main().then(() => process.exit(0)).catch((error: unknown) => {
  const location = error instanceof Error ? error.stack?.match(/verify-ms6b\.ts:\d+:\d+/)?.[0] : undefined;
  console.error("MS6B transport acceptance failed", { location });
  process.exit(1);
});
