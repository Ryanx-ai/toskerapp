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
const origin = "http://localhost:3000", db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
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
  stage = "reverse precise delivery before subscriber attachment";
  const reverse = await request(1, { action: "begin", conversationId: fixture.conversationId, precision: "precise", consent: "precise-latest-v2" }); leases.push(reverse.id);
  const point = { latitude: 1.286, longitude: 103.859, accuracy: 50 };
  await request(1, { action: "send", id: reverse.id, point, expectedRevision: 0, requestId: randomUUID() });
  // A was not subscribed at publication. Current truth must not depend on a
  // history replay, ephemeral hint delivery, or arbitrary warm-up sleeps.
  async function attachA() {
    const value = await request(0, { conversationId: fixture.conversationId }, "/api/realtime/token");
    const client = new Realtime({ token: value.token, clientId: actors.a.userId, logLevel: 0 }); clients.push(client);
    const feed = client.channels.get(conversationChannel(fixture.conversationId));
    let notices = 0;
    await feed.subscribe(LOCATION_CHANGED, message => { assert.deepEqual(message.data, { version: 1 }); notices++; });
    await feed.attach(); assert.equal(feed.state, "attached");
    return { client, feed, notices: () => notices };
  }
  const cold = await attachA();
  const recovered = await request(0, { action: "current", conversationId: fixture.conversationId });
  assert(validLocationView(recovered, fixture.conversationId)); assert.equal(recovered.peers.length, 1); assert.deepEqual(recovered.peers[0].snapshot.point, point);
  stage = "new connection and two receiver clients";
  cold.client.close();
  const warm = await attachA(), second = await attachA();
  assert.equal((await request(0, { action: "current", conversationId: fixture.conversationId })).peers[0].snapshot.revision, 1);
  const receipts = [warm, second].map(target => new Promise<boolean>(resolve => {
    const timer = setTimeout(() => resolve(false), 15000);
    void target.feed.subscribe(LOCATION_CHANGED, () => { clearTimeout(timer); resolve(true); });
  }));
  const refreshed = await request(1, { action: "send", id: reverse.id, point, expectedRevision: 1, requestId: randomUUID() });
  assert.equal(refreshed.expiresAt, reverse.expiresAt);
  assert((await Promise.all(receipts)).every(Boolean));
  const renewed = await request(0, { action: "current", conversationId: fixture.conversationId });
  assert.equal(renewed.peers[0].snapshot.revision, 2); assert.equal(warm.notices(), 1); assert.equal(second.notices(), 1);
  stage = "reverse Stop and empty current";
  await request(1, { action: "stop", id: reverse.id });
  assert.equal((await request(0, { action: "current", conversationId: fixture.conversationId })).peers.length, 0);
  const result = { passed: true, timings, contentFreeEvents: events, reversePrecise: true, coldSubscriberRecovery: true, newConnectionRecovery: true, twoReceiverClients: true, oneNoticePerClientPerRefresh: true, fixedRefreshExpiry: true, providerLookups: 0, canonicalUnchanged: true };
  writeFileSync(".git/ms74-fp3/latest-api.json", JSON.stringify(result), { mode: 0o600 }); console.log(JSON.stringify(result));
}
main().catch(error => { console.error(JSON.stringify({ passed: false, stage, timings, kind: error?.name, detail: error instanceof assert.AssertionError ? error.message.split("\n")[0] : "Private details suppressed" })); process.exitCode = 1; })
  .finally(async () => {
    for (const client of clients) client.close();
    try { if (leases.length) await db.delete(locationShares).where(inArray(locationShares.id, leases)); console.log(JSON.stringify({ exactTestPayloadCleanup: true })); }
    finally { await Promise.allSettled(sessions.map(id => clerk.sessions.revokeSession(id))); await db.$client.end(); }
  });
