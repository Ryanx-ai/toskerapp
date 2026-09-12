import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, rooms, invites, roomMemberships } from "../src/server/db/schema";
import { generateShareInvitation, cancelInvitation } from "../src/server/rooms/invitation-service";
import { joinRoomInvite, withdrawRoomMember } from "../src/server/rooms/lifecycle";
import { inviteHash, inviteToken } from "../src/server/rooms/invite-crypto";

const db = getDatabase();
async function main() {
  const [roomId, ownerId, memberId] = process.argv.slice(2);
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  assert.equal(room?.slug, `fp2-service-${roomId}`); assert.equal(room.ownerId, ownerId);
  const [owner] = await db.select().from(users).where(eq(users.id, ownerId));
  const [member] = await db.select().from(users).where(eq(users.id, memberId));
  assert.equal(owner.authProvider, "fp2-qa"); assert.equal(member.authProvider, "fp2-qa");
  const a = { userId: owner.id, authProvider: owner.authProvider, authSubject: owner.authSubject };
  const b = { userId: member.id, authProvider: member.authProvider, authSubject: member.authSubject };
  const membership = async () => (await db.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.userId, memberId)))).length;
  // Legacy compatibility is preserved until an explicit replacement.
  const legacy = inviteToken();
  await db.insert(invites).values({ roomId, inviterId: ownerId, tokenHash: inviteHash(legacy), expiresAt: new Date(Date.now() + 3600000) });
  await joinRoomInvite(db, b, legacy); assert.equal(await membership(), 1);
  await withdrawRoomMember(db, a, roomId, memberId, async () => {});
  for (const order of ["join-first", "revoke-first", "concurrent"] as const) {
    const share = await generateShareInvitation(db, a, roomId, 24);
    if (order === "join-first") {
      await joinRoomInvite(db, b, share.token); await cancelInvitation(db, a, roomId, share.id);
      assert.equal(await membership(), 1);
    } else if (order === "revoke-first") {
      await cancelInvitation(db, a, roomId, share.id);
      await assert.rejects(() => joinRoomInvite(db, b, share.token)); assert.equal(await membership(), 0);
    } else {
      const [joined, revoked] = await Promise.allSettled([joinRoomInvite(db, b, share.token), cancelInvitation(db, a, roomId, share.id)]);
      assert.equal(revoked.status, "fulfilled");
      assert.equal(await membership(), joined.status === "fulfilled" ? 1 : 0);
      await assert.rejects(() => joinRoomInvite(db, b, share.token));
    }
    if (await membership()) await withdrawRoomMember(db, a, roomId, memberId, async () => {});
  }
  console.log("PASS FP2 invitation races: legacy compatibility, join-first preservation, revoke-first denial and simultaneous join/revoke coherent committed outcome.");
}
main().then(() => process.exit(0)).catch(() => { console.error("FAIL FP2 invitation races; inspect exact retained fixture."); process.exit(1); });
