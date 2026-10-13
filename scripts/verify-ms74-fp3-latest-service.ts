/** Real Clerk A/B sessions and DB; synthetic points only. No provider lookups. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { conversations, locationLatest, locationShares, roomMemberships } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { latestLocationService, LocationRevisionConflict } from "../src/server/location-sharing/latest-service";
import { validLocationView } from "../src/lib/shared-location-contract";
import { AuthenticationRequiredError, type AuthenticatedActor } from "../src/server/auth/actor";
const db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const sessions: string[] = [], leases: string[] = [], cases: string[] = [];
let step = "ownership", notices = 0;
const mark = (name: string) => { cases.push(name); console.log(JSON.stringify({ passed: name })); };
// CLI cannot import Next's request-scoped client under react-server conditions.
// Same real provider checks, no mocked session success. Route QA tests the adapter.
async function session(actor: AuthenticatedActor, id: string) {
  const value = await clerk.sessions.getSession(id);
  if (value.userId !== actor.authSubject || value.status !== "active" || value.expireAt <= Date.now()) throw new AuthenticationRequiredError();
}
async function main() {
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
  assert.equal((await db.select().from(locationShares).where(inArray(locationShares.userId, [actors.a.userId, actors.b.userId]))).length, 0, "Pre-existing QA consent must be recovered, not overwritten");
  for (const actor of [actors.a, actors.b]) sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
  const point = { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, signal = new AbortController().signal;
  const service = latestLocationService(db, { session, notify: async () => { notices++; throw new Error("Injected notification outage"); } });
  const begin = async (role: 0 | 1, precision: "area" | "precise", context = fixture.conversationId) => {
    const result = await service.begin(role ? actors.b : actors.a, sessions[role], context, precision); leases.push(result.id); return result;
  };
  step = "broad delivery despite hint outage";
  step = "begin broad";
  const broad = await begin(0, "area"); assert.equal(broad.audienceCount, 2);
  step = "send broad";
  const nonce = randomUUID();
  const sent = await service.send(actors.a, sessions[0], broad.id, point, 0, nonce, signal);
  assert.equal(sent.point, undefined);
  const [stored] = await db.select().from(locationLatest).where(eq(locationLatest.leaseId, broad.id));
  assert(stored && stored.latitude === null && stored.longitude === null && stored.accuracy === null);
  step = "read broad";
  const view = await service.read(actors.b, sessions[1], fixture.conversationId);
  assert(validLocationView(view, fixture.conversationId)); assert.equal(view.peers.length, 1); assert.equal(view.peers[0].snapshot.precision, "area");
  mark(step);
  step = "idempotent retry and stale revision rejection";
  assert.equal((await service.send(actors.a, sessions[0], broad.id, point, 0, nonce, signal)).revision, 1);
  await assert.rejects(() => service.send(actors.a, sessions[0], broad.id, point, 0, randomUUID(), signal), LocationRevisionConflict);
  const refreshed = await service.send(actors.a, sessions[0], broad.id, point, 1, randomUUID(), signal);
  assert.equal(refreshed.revision, 2); assert.equal(refreshed.expiresAt, broad.expiresAt); mark(step);
  step = "actor/context/Sandbox/non-synthetic denial";
  await assert.rejects(() => service.send(actors.b, sessions[1], broad.id, point, 2, randomUUID(), signal));
  await assert.rejects(() => service.send(actors.a, sessions[0], broad.id, { ...point, latitude: 0 }, 2, randomUUID(), signal));
  await assert.rejects(() => service.begin(actors.founder, sessions[0], fixture.conversationId, "area"));
  await assert.rejects(() => service.read(actors.b, sessions[1], fixture.selectedChatId));
  assert.equal((await service.read(actors.b, sessions[1], fixture.everyoneChatId)).peers.length, 0);
  const [sandbox] = await db.select().from(conversations).where(and(eq(conversations.kind, "sandbox"), eq(conversations.ownerId, actors.a.userId)));
  await assert.rejects(() => service.begin(actors.a, sessions[0], sandbox.id, "area")); mark(step);
  step = "Stop commits deletion despite hint outage";
  await service.stop(actors.a, sessions[0], broad.id);
  assert.equal((await db.select().from(locationLatest).where(eq(locationLatest.leaseId, broad.id))).length, 0);
  assert.equal((await service.read(actors.b, sessions[1], fixture.conversationId)).peers.length, 0); mark(step);
  step = "precise delivery both directions";
  const preciseA = await begin(0, "precise"), preciseB = await begin(1, "precise");
  await service.send(actors.a, sessions[0], preciseA.id, point, 0, randomUUID(), signal);
  await service.send(actors.b, sessions[1], preciseB.id, point, 0, randomUUID(), signal);
  assert.deepEqual((await service.read(actors.a, sessions[0], fixture.conversationId)).peers[0].snapshot.point, point);
  assert.deepEqual((await service.read(actors.b, sessions[1], fixture.conversationId)).peers[0].snapshot.point, point); mark(step);
  step = "stale membership denied independently of notifications";
  const rollback = new Error("rollback isolated QA membership probe");
  await assert.rejects(() => db.transaction(async tx => {
    await tx.execute(sql`set local statement_timeout='4s'`);
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId, fixture.roomId), eq(roomMemberships.userId, actors.b.userId)));
    const isolated = latestLocationService(tx as unknown as ToskerDatabase, { session });
    await assert.rejects(() => isolated.read(actors.b, sessions[1], fixture.conversationId));
    assert.equal((await isolated.read(actors.a, sessions[0], fixture.conversationId)).peers.length, 0);
    throw rollback;
  }), e => e === rollback); mark(step);
  step = "session revocation excludes retained row";
  await clerk.sessions.revokeSession(sessions[1]);
  assert.equal((await service.read(actors.a, sessions[0], fixture.conversationId)).peers.length, 0);
  await assert.rejects(() => service.read(actors.b, sessions[1], fixture.conversationId)); mark(step);
  assert(notices > 0);
  writeFileSync(".git/ms74-fp3/latest-service.json", JSON.stringify({ passed: true, at: new Date().toISOString(), cases, realClerkSessions: true, notificationOutageInjected: true, providerLookups: 0, finalCleanupRequired: true }), { mode: 0o600 });
}
main().catch(error => { console.error(JSON.stringify({ passed: false, step, kind: error?.name, frames: String(error?.stack ?? "").split("\n").filter(line => /^\s+at /.test(line)).slice(0, 5), detail: error instanceof assert.AssertionError ? error.message.split("\n")[0] : "Private details suppressed" })); process.exitCode = 1; })
  .finally(async () => {
    try {
      if (leases.length) await db.delete(locationShares).where(inArray(locationShares.id, leases));
      assert.equal(leases.length ? (await db.select().from(locationLatest).where(inArray(locationLatest.leaseId, leases))).length : 0, 0);
      console.log(JSON.stringify({ exactTestPayloadCleanup: true }));
    } finally {
      await Promise.allSettled(sessions.map(id => clerk.sessions.revokeSession(id)));
      await db.$client.end();
    }
  });
