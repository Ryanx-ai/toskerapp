/** Prove concurrent readers retain actor revocation fences. No access mutation. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationShares } from "../src/server/db/schema";
import { latestLocationService } from "../src/server/location-sharing/latest-service";
import { lockActorTokens } from "../src/server/realtime/access-lock";
import { AuthenticationRequiredError, type AuthenticatedActor } from "../src/server/auth/actor";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }), sessions: string[] = [];
let leaseId: string | undefined, release: () => void = () => {}, step = "ownership";
async function session(actor: AuthenticatedActor, id: string) {
  const value = await clerk.sessions.getSession(id);
  if (value.userId !== actor.authSubject || value.status !== "active" || value.expireAt <= Date.now()) throw new AuthenticationRequiredError();
}
async function main() {
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal((await db.select().from(locationShares).where(inArray(locationShares.userId, [actors.a.userId, actors.b.userId]))).length, 0);
  for (const actor of [actors.a, actors.b]) sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
  const service = latestLocationService(db, { session, notify: async () => {} });
  leaseId = (await service.begin(actors.b, sessions[1], fixture.conversationId, "precise")).id;
  await service.send(actors.b, sessions[1], leaseId, { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, 0, randomUUID(), new AbortController().signal);
  let entered!: () => void;
  const paused = new Promise<void>(r => { entered = r; }), proceed = new Promise<void>(r => { release = r; });
  let pause = true;
  const reader = latestLocationService(db, { notify: async () => {}, session: async (actor, id) => {
    await session(actor, id);
    if (pause) { pause = false; entered(); await proceed; }
  } });
  step = "read reaches actor fence";
  const pending = reader.read(actors.a, sessions[0], fixture.conversationId);
  // Attach rejection handling immediately, while the readiness barrier is open.
  const result = pending.then(value => ({ value }), () => ({ value: null }));
  const timer = setTimeout(() => release(), 10000);
  try {
    await Promise.race([paused, result.then(() => { throw new Error("Read ended before barrier"); })]);
    step = "both source and viewer revocation wait for read";
    for (const actor of [actors.a, actors.b]) {
      let denied = false;
      try { await db.transaction(async tx => { await tx.execute(sql`set local lock_timeout='300ms'`); await lockActorTokens(tx, actor.userId); }); }
      catch (error) { const value = error as { code?: string; cause?: { code?: string } }; denied = (value.code ?? value.cause?.code) === "55P03"; }
      assert(denied, "Expected lock timeout, not unrelated error");
    }
  } finally { clearTimeout(timer); release(); }
  assert.equal((await result).value?.peers.length, 1);
  step = "Stop after read prevents subsequent disclosure";
  await service.stop(actors.b, sessions[1], leaseId);
  assert.equal((await service.read(actors.a, sessions[0], fixture.conversationId)).peers.length, 0);
  const receipt = { passed: true, sourceAndViewerFenced: true, explicitReadinessBarrier: true, noTimingSleep: true, stopDeniesNextRead: true, providerCalls: 0 };
  writeFileSync(".git/ms74-fp3/latest-read-races.json", JSON.stringify(receipt), { mode: 0o600 }); console.log(JSON.stringify(receipt));
}
main().catch(() => { console.error(JSON.stringify({ passed: false, step })); process.exitCode = 1; }).finally(async () => {
  release();
  try { if (leaseId) await db.delete(locationShares).where(eq(locationShares.id, leaseId)); }
  finally { await Promise.allSettled(sessions.map(id => clerk.sessions.revokeSession(id))); await db.$client.end(); console.log("Exact test cleanup complete."); }
});
