import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { conversations, conversationParticipants, roomMemberships, rooms } from "../src/server/db/schema";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { liveRoster } from "../src/server/live/roster";
import { issueConversationToken } from "../src/server/realtime/auth";
import { liveChannel } from "../src/lib/live-contract";

let step = "resolve";
async function main() {
  const db = getDatabase(), actors = await resolveQaActors(db);
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
  const [room] = await db.select().from(rooms).where(eq(rooms.id, fixture.roomId));
  assert(room && room.slug === fixture.slug && room.ownerId === actors.a.userId);
  const all = [actors.a.userId, actors.b.userId, actors.founder.userId];
  step = "Room roster";
  const roster = await liveRoster(db, actors.a, { conversationId: fixture.conversationId, userIds: [...all, randomUUID()] });
  assert.deepEqual(roster.map(p => p.userId).sort(), all.sort());
  for (const person of roster) assert.deepEqual(Object.keys(person).sort(), ["avatarUrl", "displayName", "userId"]);
  step = "Subroom roster";
  const selected = await liveRoster(db, actors.a, { conversationId: fixture.selectedChatId, userIds: all });
  assert.deepEqual(selected.map(p => p.userId).sort(), [actors.a.userId, actors.founder.userId].sort());
  await assert.rejects(() => liveRoster(db, actors.b, { conversationId: fixture.selectedChatId, userIds: [] }), AuthorizationDeniedError);
  await assert.rejects(() => issueConversationToken(db, actors.b, fixture.selectedChatId), AuthorizationDeniedError);
  await assert.rejects(() => liveRoster(db, actors.a, { conversationId: randomUUID(), userIds: [] }), AuthorizationDeniedError);
  step = "Sandbox";
  const [sandbox] = await db.select().from(conversations).where(and(eq(conversations.kind, "sandbox"), eq(conversations.ownerId, actors.a.userId)));
  assert(sandbox); await assert.rejects(() => liveRoster(db, actors.b, { conversationId: sandbox.id, userIds: all }), AuthorizationDeniedError);
  assert.deepEqual((await liveRoster(db, actors.a, { conversationId: sandbox.id, userIds: all })).map(p => p.userId), [actors.a.userId]);
  step = "Personal";
  const pair = [actors.a.userId, actors.b.userId].sort().join(":");
  const [personal] = await db.select().from(conversations).where(and(eq(conversations.kind, "personal"), eq(conversations.directKey, pair)));
  assert(personal, "Existing isolated QA pair required; do not create or alter retained Personal data.");
  assert.equal((await liveRoster(db, actors.a, { conversationId: personal.id, userIds: all })).length, 2);
  await assert.rejects(() => liveRoster(db, actors.founder, { conversationId: personal.id, userIds: all }), AuthorizationDeniedError);
  step = "tokens";
  const tokens = await Promise.all([issueConversationToken(db, actors.a, fixture.conversationId), issueConversationToken(db, actors.b, fixture.conversationId)]);
  for (const [index, token] of tokens.entries()) {
    assert.equal(token.clientId, [actors.a, actors.b][index].userId);
    const capability = JSON.parse(token.capability);
    assert.deepEqual(capability[liveChannel(fixture.conversationId)].sort(), ["presence", "subscribe"]);
    assert(Object.keys(capability).every(channel => !channel.includes("*")));
    assert(!capability[liveChannel(fixture.selectedChatId)]);
  }
  // Rollback-only negative test: stale participant rows cannot grant Room access.
  step = "rollback stale member";
  const rollback = new Error("owned fixture rollback");
  await assert.rejects(() => db.transaction(async tx => {
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId, fixture.roomId), eq(roomMemberships.userId, actors.b.userId)));
    const stale = await tx.select().from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, fixture.conversationId), eq(conversationParticipants.userId, actors.b.userId)));
    assert.equal(stale.length, 1);
    await assert.rejects(() => liveRoster(tx as unknown as ToskerDatabase, actors.b, { conversationId: fixture.conversationId, userIds: [] }), AuthorizationDeniedError);
    const filtered = await liveRoster(tx as unknown as ToskerDatabase, actors.a, { conversationId: fixture.conversationId, userIds: all });
    assert(!filtered.some(p => p.userId === actors.b.userId));
    throw rollback;
  }), error => error === rollback);
  const after = await db.execute(sql`select count(*)::int n from room_memberships where room_id=${fixture.roomId}::uuid`);
  assert.equal(after.rows[0].n, 3);
  const result = { pass: true, fixture: fixture.slug, cases: ["exact Room", "scoped Subroom viewer/target denial", "forged context", "Sandbox owner-only", "accepted exact Personal pair", "minimal authorized identity", "exact Live token grants", "stale participant and revoked target denial", "rollback preserved all members"], providerTokenRequests: 2, noProviderConnections: true };
  writeFileSync(".git/ms74-recovery/authorization.json", JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
}
main().catch(error => { console.error(JSON.stringify({ pass: false, step, error: error instanceof assert.AssertionError ? error.message : error.name, code: error.code ?? error.cause?.code ?? null })); process.exitCode = 1; });
