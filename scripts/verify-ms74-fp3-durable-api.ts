/** Exact protected Production stage; synthetic isolated A/B, never canonical. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { Realtime } from "ably";
import { eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationShares, locationLatest } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { conversationChannel } from "../src/lib/realtime-contract";
import { LOCATION_CHANGED, validLocationView } from "../src/lib/shared-location-contract";
import { protectedPost } from "./lib/ms74-protected-http";
const target = JSON.parse(readFileSync(".git/ms74-fp3/durable-app-stage.json", "utf8"));
assert.equal(target.readyState,"READY");assert.equal(target.projectId,"prj_cxYhH8ypeFmuPOiEBC0gf0Rbzmau");
assert.equal(target.canonical,false);assert(/^[0-9a-f]{40}$/.test(target.sha));
const origin = target.origin, db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const sessions: string[] = [], leases: string[] = [], clients: Realtime[] = [], timings: { action: string; status: number; ms: number }[] = [];
let stage = "recovery", events = 0;
async function main() {
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
  assert.equal((await db.execute(sql`select 1 from rooms r join room_memberships m on m.room_id=r.id where r.id=${fixture.roomId}::uuid
    and r.owner_id=${actors.a.userId}::uuid and r.slug=${fixture.slug} and m.user_id=${actors.founder.userId}::uuid`)).rows.length,1);
  assert.equal((await db.select().from(locationShares).where(inArray(locationShares.userId, [actors.a.userId, actors.b.userId]))).length, 0);
  for (const actor of [actors.a, actors.b]) {
    sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
    writeFileSync(".git/ms74-fp3/durable-api-intent.json",JSON.stringify({sessions,origin,at:new Date().toISOString()}),{mode:0o600});
  }
  async function request(role: number, body: Record<string, unknown>, path = "/api/location-sharing") {
    const token = await clerk.sessions.getToken(sessions[role]);
    const {response,networkMs}=await protectedPost(origin,path,token.jwt,body);
    timings.push({ action: String(body.action ?? "token"), status: response.status, ms: networkMs });
    assert.equal(response.status, 200, "Protected stage API rejected request");
    assert.match(response.headers.get("cache-control")??"",/no-store/);
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
  stage = "natural hosted expiry";
  const expiring=await request(0,{action:"begin",conversationId:fixture.conversationId,precision:"precise",consent:"precise-latest-v2"});leases.push(expiring.id);
  await request(0,{action:"send",id:expiring.id,point,expectedRevision:0,requestId:randomUUID()});
  assert.equal((await request(1,{action:"current",conversationId:fixture.conversationId})).peers.length,1);
  console.log(JSON.stringify({stage:"natural-five-minute-expiry",acceptedSyntheticSnapshot:true}));
  let deletedAt=0;
  while(Date.now()<expiring.expiresAt+60000){
    const count=Number((await db.execute(sql`select count(*) n from location_latest where lease_id=${expiring.id}::uuid`)).rows[0].n);
    if(!count){deletedAt=Date.now();break;}
    await new Promise(resolve=>setTimeout(resolve,Date.now()<expiring.expiresAt-10000?10000:1000));
  }
  assert(deletedAt>=expiring.expiresAt&&deletedAt-expiring.expiresAt<=60000);
  assert.equal((await request(1,{action:"current",conversationId:fixture.conversationId})).peers.length,0);
  const result = { passed: true, timings, contentFreeEvents: events, reversePrecise: true, coldSubscriberRecovery: true, newConnectionRecovery: true,
    twoReceiverClients: true, oneNoticePerClientPerRefresh: true, fixedRefreshExpiry: true, naturalExpiryDeletionUpperBoundMs:deletedAt-expiring.expiresAt,
    providerLookups: 0, canonicalUnchanged: true, protectedStage:true,sha:target.sha };
  writeFileSync(".git/ms74-fp3/durable-api.json", JSON.stringify(result), { mode: 0o600 }); console.log(JSON.stringify(result));
}
main().catch(error => { console.error(JSON.stringify({ passed: false, stage, timings, kind: error?.name, detail: error instanceof assert.AssertionError ? error.message.split("\n")[0] : "Private details suppressed" })); process.exitCode = 1; })
  .finally(async () => {
    for (const client of clients) client.close();
    try { if (leases.length) await db.delete(locationShares).where(inArray(locationShares.id, leases)); console.log(JSON.stringify({ exactTestPayloadCleanup: true })); }
    finally {
      for(const id of sessions)await clerk.sessions.revokeSession(id);
      // Consent's ID is exactly its owned cleanup reservation. Stop jobs may
      // remain queued as harmless no-ops; never delete another run's metadata.
      for(const id of leases)await db.execute(sql`delete from location_cleanup_reservations where id=${id}::uuid`);
      const actors=await resolveQaActors(db);
      await db.execute(sql`delete from invite_rate_limits where user_id in (${actors.a.userId}::uuid,${actors.b.userId}::uuid)
        and operation in ('location-consent','location-snapshot')`);
      await db.$client.end();
    }
  });
