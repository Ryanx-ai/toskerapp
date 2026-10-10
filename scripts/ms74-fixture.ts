import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, conversations, conversationParticipants, roomMemberships, subrooms, subroomAccess } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";

const path = ".git/ms74-recovery/fixture.json";
async function main() {
  const db = getDatabase(), actors = await resolveQaActors(db);
  mkdirSync(".git/ms74-recovery", { recursive: true, mode: 0o700 });
  if (!existsSync(path)) {
    assert(process.argv.includes("--create"), "No owned fixture; pass --create explicitly.");
    const suffix = randomUUID().slice(0, 8);
    const receipt = { run: "ms74-fp1-20261010", status: "prepared", roomId: randomUUID(), conversationId: randomUUID(), selectedId: randomUUID(), selectedChatId: randomUUID(), everyoneId: randomUUID(), everyoneChatId: randomUUID(), slug: `ms74-fp1-qa-${suffix}`, name: `MS7.4 FP1 Founder Review — Live ${suffix}`, ownerId: actors.a.userId, founderId: actors.founder.userId, retained: true, purpose: "Local-only Live A/B and Founder Walk; no media or location", createdAt: new Date().toISOString() };
    writeFileSync(path, JSON.stringify(receipt, null, 2), { mode: 0o600, flag: "wx" });
  }
  const receipt = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(receipt.run, "ms74-fp1-20261010"); assert.equal(receipt.ownerId, actors.a.userId); assert.equal(receipt.founderId, actors.founder.userId);
  assert(/^ms74-fp1-qa-[a-f0-9]{8}$/.test(receipt.slug));
  const [existing] = await db.select().from(rooms).where(eq(rooms.id, receipt.roomId));
  if (!existing) {
    assert.equal(receipt.status, "prepared", "Previously committed fixture missing; do not recreate.");
    assert(process.argv.includes("--create"));
    await db.transaction(async tx => {
      const fresh = await resolveQaActors(tx); assert.equal(fresh.founder.userId, receipt.founderId);
      const all = [actors.a.userId, actors.b.userId, fresh.founder.userId], selected = [actors.a.userId, fresh.founder.userId];
      await tx.insert(rooms).values({ id: receipt.roomId, name: receipt.name, slug: receipt.slug, ownerId: actors.a.userId, createdAt: new Date(receipt.createdAt) });
      await tx.insert(roomMemberships).values(all.map(userId => ({ roomId: receipt.roomId, userId, role: userId === actors.a.userId ? "owner" as const : "member" as const })));
      await tx.insert(subrooms).values([
        { id: receipt.selectedId, roomId: receipt.roomId, name: "Scoped Live QA", createdBy: actors.a.userId, visibility: "selected" },
        { id: receipt.everyoneId, roomId: receipt.roomId, name: "Open Live QA", createdBy: actors.a.userId, visibility: "everyone", position: 1 },
      ]);
      await tx.insert(subroomAccess).values([...selected.map(userId => ({ subroomId: receipt.selectedId, userId })), ...all.map(userId => ({ subroomId: receipt.everyoneId, userId }))]);
      await tx.insert(conversations).values([
        { id: receipt.conversationId, kind: "room", roomId: receipt.roomId, isPrimary: true, title: receipt.name },
        { id: receipt.selectedChatId, kind: "room", roomId: receipt.roomId, subroomId: receipt.selectedId, title: "Scoped Live QA" },
        { id: receipt.everyoneChatId, kind: "room", roomId: receipt.roomId, subroomId: receipt.everyoneId, title: "Open Live QA" },
      ]);
      await tx.insert(conversationParticipants).values([...all.map(userId => ({ conversationId: receipt.conversationId, userId })), ...all.map(userId => ({ conversationId: receipt.everyoneChatId, userId })), ...selected.map(userId => ({ conversationId: receipt.selectedChatId, userId }))]);
    });
  }
  const [room] = await db.select().from(rooms).where(eq(rooms.id, receipt.roomId));
  assert(room && room.slug === receipt.slug && room.name === receipt.name && room.ownerId === receipt.ownerId && room.createdAt.toISOString() === receipt.createdAt, "Ownership mismatch");
  const members = await db.select().from(roomMemberships).where(eq(roomMemberships.roomId, receipt.roomId));
  assert(members.some(m => m.userId === actors.founder.userId));
  assert(members.every(m => [actors.a.userId, actors.b.userId, actors.founder.userId].includes(m.userId)));
  receipt.status = "committed";
  writeFileSync(path, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ pass: true, fixture: receipt.slug, founderIncluded: true, retained: true, localOnly: true, members: members.length }));
}
main().catch(error => { console.error("MS7.4 fixture stopped:", error instanceof assert.AssertionError ? error.message : "transaction/connection failed"); process.exitCode = 1; });
