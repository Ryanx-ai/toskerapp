/** Exact QA contexts, real sessions, rollback-only access probes. No provider. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { connections, conversations, locationLatest, locationShares, roomMemberships, subroomAccess } from "../src/server/db/schema";
import { latestLocationService } from "../src/server/location-sharing/latest-service";
import { AuthenticationRequiredError, type AuthenticatedActor } from "../src/server/auth/actor";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const sessions: string[] = [], leases: string[] = [], cases: string[] = [];
let step = "ownership";
async function session(actor: AuthenticatedActor, id: string) {
  const s = await clerk.sessions.getSession(id);
  if (s.userId !== actor.authSubject || s.status !== "active" || s.expireAt <= Date.now()) throw new AuthenticationRequiredError();
}
const options = { session, notify: async () => {} };
const point = { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, signal = new AbortController().signal;
async function main() {
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal((await db.select().from(locationShares).where(inArray(locationShares.userId, [actors.a.userId, actors.b.userId]))).length, 0);
  for (const actor of [actors.a, actors.b]) sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
  const service = latestLocationService(db, options);
  const begin = async (role: 0 | 1, context: string, precision: "area" | "precise") => {
    const value = await service.begin(role ? actors.b : actors.a, sessions[role], context, precision); leases.push(value.id); return value;
  };
  const mark = () => { cases.push(step); console.log(JSON.stringify({ passed: step })); };
  step = "selected Subroom does not disclose to unselected B";
  const selected = await begin(0, fixture.selectedChatId, "precise");
  await service.send(actors.a, sessions[0], selected.id, point, 0, randomUUID(), signal);
  await assert.rejects(() => service.read(actors.b, sessions[1], fixture.selectedChatId));
  assert.equal((await service.read(actors.b, sessions[1], fixture.conversationId)).peers.length, 0);
  await service.stop(actors.a, sessions[0], selected.id); mark();
  step = "everyone Subroom delivery remains isolated from parent";
  const open = await begin(1, fixture.everyoneChatId, "area");
  await service.send(actors.b, sessions[1], open.id, point, 0, randomUUID(), signal);
  assert.equal((await service.read(actors.a, sessions[0], fixture.everyoneChatId)).peers.length, 1);
  assert.equal((await service.read(actors.a, sessions[0], fixture.conversationId)).peers.length, 0);
  await service.stop(actors.b, sessions[1], open.id); mark();
  step = "Personal delivery and relationship revocation";
  const pair = [actors.a.userId, actors.b.userId].sort().join(":");
  const [chat] = await db.select().from(conversations).where(and(eq(conversations.kind, "personal"), eq(conversations.directKey, pair)));
  const [connection] = await db.select().from(connections).where(and(eq(connections.pairKey, pair), eq(connections.status, "accepted")));
  assert(chat && connection);
  const precise = await begin(0, chat.id, "precise");
  await service.send(actors.a, sessions[0], precise.id, point, 0, randomUUID(), signal);
  assert.deepEqual((await service.read(actors.b, sessions[1], chat.id)).peers[0].snapshot.point, point);
  const rollback = new Error("rollback exact QA access probe");
  await assert.rejects(() => db.transaction(async tx => {
    await tx.delete(connections).where(eq(connections.id, connection.id));
    const isolated = latestLocationService(tx as unknown as ToskerDatabase, options);
    await assert.rejects(() => isolated.read(actors.b, sessions[1], chat.id));
    await assert.rejects(() => isolated.send(actors.a, sessions[0], precise.id, point, 1, randomUUID(), signal));
    throw rollback;
  }), error => error === rollback);
  assert.equal((await service.read(actors.b, sessions[1], chat.id)).peers.length, 1); mark();
  step = "precision downgrade replaces row; old Stop cannot delete new consent";
  const broad = await begin(0, chat.id, "area");
  await assert.rejects(() => service.send(actors.a, sessions[0], precise.id, point, 1, randomUUID(), signal));
  await service.send(actors.a, sessions[0], broad.id, point, 0, randomUUID(), signal);
  await service.stop(actors.a, sessions[0], precise.id);
  const view = await service.read(actors.b, sessions[1], chat.id);
  assert.equal(view.peers.length, 1); assert.equal(view.peers[0].snapshot.precision, "area"); assert.equal(view.peers[0].snapshot.point, undefined);
  assert.equal((await db.select().from(locationLatest).where(eq(locationLatest.leaseId, precise.id))).length, 0);
  await service.stop(actors.a, sessions[0], broad.id); mark();
  step = "rollback-only selected grant withdrawal denies both reader and source";
  await assert.rejects(() => db.transaction(async tx => {
    await tx.insert(subroomAccess).values({ subroomId: fixture.selectedId, userId: actors.b.userId }).onConflictDoNothing();
    const isolated = latestLocationService(tx as unknown as ToskerDatabase, options);
    const value = await isolated.begin(actors.b, sessions[1], fixture.selectedChatId, "area");
    await isolated.send(actors.b, sessions[1], value.id, point, 0, randomUUID(), signal);
    assert.equal((await isolated.read(actors.a, sessions[0], fixture.selectedChatId)).peers.length, 1);
    await tx.delete(subroomAccess).where(and(eq(subroomAccess.subroomId, fixture.selectedId), eq(subroomAccess.userId, actors.b.userId)));
    await assert.rejects(() => isolated.read(actors.b, sessions[1], fixture.selectedChatId));
    assert.equal((await isolated.read(actors.a, sessions[0], fixture.selectedChatId)).peers.length, 0);
    assert.equal((await tx.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, fixture.roomId), eq(roomMemberships.userId, actors.founder.userId)))).length, 1);
    throw rollback;
  }), error => error === rollback); mark();
  writeFileSync(".git/ms74-fp3/latest-contexts.json", JSON.stringify({ passed: true, at: new Date().toISOString(), cases, accessChangesRolledBack: true, providerCalls: 0 }), { mode: 0o600 });
}
main().catch(error => { console.error(JSON.stringify({ passed: false, step, kind: error?.name })); process.exitCode = 1; }).finally(async () => {
  try { if (leases.length) await db.delete(locationShares).where(inArray(locationShares.id, leases)); }
  finally { await Promise.allSettled(sessions.map(id => clerk.sessions.revokeSession(id))); await db.$client.end(); console.log("Exact test cleanup complete."); }
});
