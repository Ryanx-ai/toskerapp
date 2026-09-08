import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, roomTags, roomCapabilities, roomMemberships, conversations, messages } from "../src/server/db/schema";

// Read-only companion to scenarios 07/10/11. UI creates the isolated fixture.
async function main() {
  const slug = process.argv[2];
  assert.match(slug ?? "", /^ms7-1-qa-japan-trip-2027-[a-f0-9]{6}$/);
  const db = getDatabase();
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, slug));
  assert.ok(room, "Create the named QA fixture in the browser first");
  assert.equal(room.name, "MS7.1 QA Japan Trip 2027");
  assert.equal(room.ownerId, "0ee1e5a5-6d7a-4541-a6ca-ca69788997ef");
  const tags = await db.select({ value: roomTags.value }).from(roomTags).where(eq(roomTags.roomId, room.id));
  assert.deepEqual(tags.map((tag) => tag.value).sort(), ["Just Chilling", "Osaka", "Travel"]);
  const capabilities = await db.select().from(roomCapabilities).where(eq(roomCapabilities.roomId, room.id));
  assert.equal(capabilities.length, 0, "No fake starter capabilities");
  const members = await db.select({ userId: roomMemberships.userId, role: roomMemberships.role }).from(roomMemberships).where(eq(roomMemberships.roomId, room.id));
  assert.equal(members.length, 2);
  assert.equal(members.filter((member) => member.userId === room.ownerId && member.role === "owner").length, 1);
  assert.equal(members.filter((member) => member.userId === "d7a58753-9877-45b2-9fc7-cca188559fed" && member.role === "member").length, 1);
  const [chat] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.roomId, room.id), eq(conversations.isPrimary, true)));
  const links = await db.select({ id: messages.id, authorId: messages.authorId }).from(messages).where(and(eq(messages.conversationId, chat.id), eq(messages.body, "MS7.1 scenario 07: https://example.com and javascript:alert(1)")));
  assert.equal(links.length, 1);
  assert.equal(links[0].authorId, room.ownerId);
  console.log("PASS: UI-created fixture persists correct tags, no capabilities, exactly A/B membership, one canonical link message.");
}
main().catch(() => { console.error("FAIL: MS7.1.1 read-only fixture acceptance; inspect the scoped QA fixture."); process.exitCode = 1; });
