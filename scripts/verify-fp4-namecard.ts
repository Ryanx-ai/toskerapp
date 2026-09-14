/** Development service acceptance. All exact synthetic fixtures roll back. No Clerk mutation. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { connectionNicknames, connections, conversationParticipants, conversations, profiles, roomMemberships, rooms, users } from "../src/server/db/schema";
import { readNamecard } from "../src/server/profiles/namecard";

const db = getDatabase(), rollback = new Error("FP4 exact fixture rollback");
const ids = [randomUUID(), randomUUID(), randomUUID()];
const [a, b, c] = ids.map((userId) => ({ userId, authProvider: "fp4-service-qa", authSubject: userId }));
let checks = 0;
const pass = (name: string) => { checks++; console.log(`PASS ${name}`); };
async function main() {
try {
  await db.transaction(async (tx) => {
    await tx.insert(users).values(ids.map((id) => ({ id, authProvider: "fp4-service-qa", authSubject: id, tid: `FP4-${id}` })));
    await tx.insert(profiles).values(ids.map((userId, index) => ({ userId, displayName: `FP4 identity ${index}`, username: `fp4-${userId}`, namecardBio: "PRIVATE_UNPROJECTED_BIO", status: "PRIVATE_UNPROJECTED_STATUS" })));
    await assert.rejects(readNamecard(tx, a, c.userId));
    await assert.rejects(readNamecard(tx, a, "forged")); pass("unknown / malformed / unrelated identity denied");
    const self = await readNamecard(tx, a, a.userId); assert.equal(self.self, true); pass("own identity available");
    const connectionId = randomUUID();
    await tx.insert(connections).values({ id: connectionId, requesterId: a.userId, addresseeId: b.userId, pairKey: [a.userId, b.userId].sort().join(":"), status: "accepted" });
    await tx.insert(connectionNicknames).values([{ connectionId, userId: a.userId, nickname: "A_PRIVATE_ALIAS" }, { connectionId, userId: b.userId, nickname: "B_PRIVATE_ALIAS" }]);
    const ab = await readNamecard(tx, a, b.userId), ba = await readNamecard(tx, b, a.userId);
    assert.equal(ab.nickname, "A_PRIVATE_ALIAS"); assert.equal(ba.nickname, "B_PRIVATE_ALIAS");
    assert.equal(JSON.stringify(ab).includes("B_PRIVATE_ALIAS"), false);
    assert.deepEqual(Object.keys(ab).sort(), ["userId", "displayName", "username", "tid", "avatarUrl", "presenceStatus", "connectionId", "nickname", "conversationId", "self", "commonRooms", "moreCommonRooms"].sort()); pass("accepted identity and viewer-only alias; exact safe projection");
    await tx.insert(connections).values({ requesterId: b.userId, addresseeId: c.userId, pairKey: [b.userId, c.userId].sort().join(":"), status: "pending" });
    await assert.rejects(readNamecard(tx, b, c.userId)); pass("pending relationship grants no Namecard access");
    const room = randomUUID();
    await tx.insert(rooms).values({ id: room, ownerId: a.userId, name: "FP4 common", slug: `fp4-${room}` });
    await tx.insert(roomMemberships).values([{ roomId: room, userId: a.userId, role: "owner" }, { roomId: room, userId: c.userId }]);
    const ac = await readNamecard(tx, a, c.userId); assert.deepEqual(ac.commonRooms.map((item) => item.id), [room]); assert.equal(ac.connectionId, null); assert.equal(ac.nickname, null);
    assert.equal((await readNamecard(tx, b, a.userId)).commonRooms.length, 0); pass("current overlap only; another viewer cannot see private Room");
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId, room), eq(roomMemberships.userId, c.userId)));
    await assert.rejects(readNamecard(tx, a, c.userId)); pass("withdrawal removes shared-context authority immediately");
    const chat = randomUUID();
    await tx.insert(conversations).values({ id: chat, kind: "personal", directKey: [a.userId, c.userId].sort().join(":") });
    await tx.insert(conversationParticipants).values([{ conversationId: chat, userId: a.userId }, { conversationId: chat, userId: c.userId }]);
    const direct = await readNamecard(tx, a, c.userId); assert.equal(direct.conversationId, chat); assert.equal(direct.commonRooms.length, 0); pass("Personal participant identity does not resurrect former Room overlap");
    await tx.update(profiles).set({ presenceStatus: "meeting" }).where(eq(profiles.userId, c.userId));
    assert.equal((await readNamecard(tx, a, c.userId)).presenceStatus, "meeting"); pass("coarse status revalidates without activity writes");
    const many = Array.from({ length: 22 }, (_, index) => ({ id: randomUUID(), ownerId: a.userId, name: `FP4 bounded ${String(index).padStart(2, "0")}`, slug: `fp4-${randomUUID()}` }));
    await tx.insert(rooms).values(many); await tx.insert(roomMemberships).values(many.flatMap((item) => [{ roomId: item.id, userId: a.userId, role: "owner" as const }, { roomId: item.id, userId: c.userId, role: "member" as const }]));
    const bounded = await readNamecard(tx, a, c.userId); assert.equal(bounded.commonRooms.length, 20); assert.equal(bounded.moreCommonRooms, true); pass("authorized Common Rooms bounded at 20 with honest overflow");
    throw rollback;
  });
} catch (error) { if (error !== rollback) throw error; }
finally { await db.$client.end(); }
console.log(`PASS ${checks} Namecard groups; transaction rolled back every fixture`);
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
