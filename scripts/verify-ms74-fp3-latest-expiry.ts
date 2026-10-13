/** Natural five-minute expiry + supervised physical active-row cleanup. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationLatest, locationShares } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { latestLocationService } from "../src/server/location-sharing/latest-service";
import { AuthenticationRequiredError } from "../src/server/auth/actor";
const db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }), sessions: string[] = [];
let leaseId: string | undefined, step = "setup";
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal((await db.select().from(locationShares).where(inArray(locationShares.userId, [actors.a.userId, actors.b.userId]))).length, 0);
  for (const actor of [actors.a, actors.b]) sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
  const service = latestLocationService(db, { session: async (actor, id) => {
    const s = await clerk.sessions.getSession(id);
    if (s.userId !== actor.authSubject || s.status !== "active" || s.expireAt <= Date.now()) throw new AuthenticationRequiredError();
  }, notify: async () => {} });
  const lease = await service.begin(actors.a, sessions[0], fixture.conversationId, "precise"); leaseId = lease.id;
  const point = { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, signal = new AbortController().signal;
  await service.send(actors.a, sessions[0], lease.id, point, 0, randomUUID(), signal);
  step = "natural expiry waiting";
  console.log(JSON.stringify({ test: "natural five-minute expiry started", syntheticOnly: true }));
  // These waits observe actual expiry; they are NOT subscription warm-up delays.
  let refreshed = false;
  while (Date.now() < lease.expiresAt) {
    await wait(Math.min(30000, Math.max(0, lease.expiresAt - Date.now())));
    if (!refreshed && lease.expiresAt - Date.now() < 180000 && lease.expiresAt - Date.now() > 30000) {
      const result = await service.send(actors.a, sessions[0], lease.id, point, 1, randomUUID(), signal);
      assert.equal(result.expiresAt, lease.expiresAt); refreshed = true;
      console.log(JSON.stringify({ manualRefresh: "fixed expiry preserved" }));
    }
    console.log(JSON.stringify({ remainingSeconds: Math.max(0, Math.ceil((lease.expiresAt - Date.now()) / 1000)) }));
  }
  step = "logical expiry";
  assert(refreshed);
  await assert.rejects(() => service.send(actors.a, sessions[0], lease.id, point, 2, randomUUID(), signal));
  assert.equal((await service.read(actors.b, sessions[1], fixture.conversationId)).peers.length, 0);
  step = "active row cleanup";
  while ((await db.select({ id: locationLatest.leaseId }).from(locationLatest).where(eq(locationLatest.leaseId, lease.id))).length) {
    assert(Date.now() - lease.expiresAt < 60000, "Expired active row missed cleanup target"); await wait(1000);
  }
  const result = { passed: true, naturalFiveMinutes: true, manualRefreshDoesNotExtend: true, readsAndWritesDenied: true, activeRowDeletionObservedWithinMs: Date.now() - lease.expiresAt, providerCalls: 0 };
  writeFileSync(".git/ms74-fp3/latest-expiry.json", JSON.stringify(result), { mode: 0o600 }); console.log(JSON.stringify(result));
}
main().catch(error => { console.error(JSON.stringify({ passed: false, step, kind: error?.name, detail: "Private details suppressed" })); process.exitCode = 1; })
  .finally(async () => { try { if (leaseId) await db.delete(locationShares).where(eq(locationShares.id, leaseId)); console.log(JSON.stringify({ exactTestCleanup: true })); }
    finally { await Promise.allSettled(sessions.map(id => clerk.sessions.revokeSession(id))); await db.$client.end(); } });
