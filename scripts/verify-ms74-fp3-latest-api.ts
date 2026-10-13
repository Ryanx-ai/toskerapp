/** Local route/Clerk/Ably/DB smoke. Never accepts a remote target. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { Realtime } from "ably";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationShares, locationLatest } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { conversationChannel } from "../src/lib/realtime-contract";
import { LOCATION_CHANGED, validLocationView } from "../src/lib/shared-location-contract";
const origin = "http://localhost:3100", db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const sessions: string[] = [], leases: string[] = [], clients: Realtime[] = [], timings: { action: string; status: number; ms: number }[] = [];
let stage = "recovery", events = 0;
async function main() {
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal((await db.select().from(locationShares).where(inArray(locationShares.userId, [actors.a.userId, actors.b.userId]))).length, 0);
  for (const actor of [actors.a, actors.b]) sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
  async function request(role: number, body: Record<string, unknown>, path = "/api/location-sharing") {
    const token = await clerk.sessions.getToken(sessions[role]), start = performance.now();
    const response = await fetch(origin + path, { method: "POST", headers: { Origin: origin, Authorization: `Bearer ${token.jwt}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    timings.push({ action: String(body.action ?? "token"), status: response.status, ms: Math.round(performance.now() - start) });
    assert.equal(response.status, 200, "Local API rejected request");
    return response.json();
  }
  stage = "subscriber readiness";
  const token = await request(1, { conversationId: fixture.conversationId }, "/api/realtime/token");
  const receiver = new Realtime({ token: token.token, clientId: actors.b.userId, logLevel: 0 }); clients.push(receiver);
  const channel = receiver.channels.get(conversationChannel(fixture.conversationId));
  await channel.subscribe(LOCATION_CHANGED, message => { assert.deepEqual(message.data, { version: 1 }); events++; });
  await channel.attach(); assert.equal(channel.state, "attached");
  stage = "broad API";
  const lease = await request(0, { action: "begin", conversationId: fixture.conversationId, precision: "area", consent: "area-latest-v2" }); leases.push(lease.id);
  let received: () => void = () => {};
  const receipt = new Promise<boolean>(resolve => { const timer = setTimeout(() => resolve(false), 10000); received = () => { clearTimeout(timer); resolve(true); }; });
  await channel.subscribe(LOCATION_CHANGED, received);
  await request(0, { action: "send", id: lease.id, point: { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, expectedRevision: 0, requestId: randomUUID() });
  assert(await receipt, "Invalidation deadline");
  stage = "authorized peer read latency";
  const view = await request(1, { action: "current", conversationId: fixture.conversationId });
  assert(validLocationView(view, fixture.conversationId)); assert.equal(view.peers.length, 1);
  assert(timings.at(-1)!.ms < 5000, "Read exceeds fail-closed view deadline");
  stage = "Stop route";
  await request(0, { action: "stop", id: lease.id });
  assert.equal((await db.select().from(locationLatest).where(eq(locationLatest.leaseId, lease.id))).length, 0);
  assert.equal((await request(1, { action: "current", conversationId: fixture.conversationId })).peers.length, 0);
  const result = { passed: true, timings, contentFreeEvents: events, providerLookups: 0, canonicalUnchanged: true };
  writeFileSync(".git/ms74-fp3/latest-api.json", JSON.stringify(result), { mode: 0o600 }); console.log(JSON.stringify(result));
}
main().catch(error => { console.error(JSON.stringify({ passed: false, stage, timings, kind: error?.name, detail: error instanceof assert.AssertionError ? error.message.split("\n")[0] : "Private details suppressed" })); process.exitCode = 1; })
  .finally(async () => {
    for (const client of clients) client.close();
    try { if (leases.length) await db.delete(locationShares).where(inArray(locationShares.id, leases)); console.log(JSON.stringify({ exactTestPayloadCleanup: true })); }
    finally { await Promise.allSettled(sessions.map(id => clerk.sessions.revokeSession(id))); await db.$client.end(); }
  });
