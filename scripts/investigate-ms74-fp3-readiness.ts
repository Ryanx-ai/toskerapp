/** Diagnostic only: retained non-canonical FP3; never publishes persistent locations.
 * Anonymous monotonic timings only. No application or provider configuration changes.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { createClerkClient } from "@clerk/backend";
import { Realtime, Rest, type Message } from "ably";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, roomMemberships } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { userChannel, conversationChannel } from "../src/lib/realtime-contract";
import { LOCATION_SNAPSHOT, LOCATION_RETIRED, validLocationSnapshot } from "../src/lib/shared-location-contract";

const origin = "https://tosker-gotiyll8r-pangea6.vercel.app";
const db = getDatabase();
const start = performance.now();
const trace: Array<{ stage: string; ms: number; trial: number }> = [];
const samples: Array<Record<string, unknown>> = [];
let trial = 0;
const mark = (stage: string) => {
  const ms = Math.round((performance.now() - start) * 10) / 10;
  trace.push({ stage, ms, trial }); return ms;
};
// This is an observation deadline, never a delay before publishing.
function observed(channel: ReturnType<Realtime["channels"]["get"]>, name: string, predicate: (m: Message) => boolean) {
  let dispose = () => {};
  const promise = new Promise<number | null>(resolve => {
    const finish = (value: number | null) => { dispose(); resolve(value); };
    const listener = (m: Message) => { if (predicate(m)) finish(mark(`${name}.receipt`)); };
    const timer = setTimeout(() => finish(null), 12000);
    dispose = () => { clearTimeout(timer); channel.unsubscribe(name, listener); };
    void channel.subscribe(name, listener).catch(() => finish(null));
  });
  return { promise, dispose };
}
async function main() {
  assert(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
  const deployment = JSON.parse(readFileSync(".git/ms74-fp3/deployment.json", "utf8"));
  assert.equal(deployment.sha, "02645001515baf629e26d70d504c9a66844997ee");
  assert.equal(`https://${deployment.url}`, origin);
  const actors = await resolveQaActors(db);
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
  const [room] = await db.select().from(rooms).where(eq(rooms.id, fixture.roomId));
  assert(room && room.ownerId === actors.a.userId && room.slug === fixture.slug && room.createdAt.toISOString() === fixture.createdAt);
  const members = await db.select().from(roomMemberships).where(eq(roomMemberships.roomId, room.id));
  assert(members.some(m => m.userId === actors.founder.userId));
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const sessions: string[] = [], clients: Realtime[] = [];
  const publisher = new Rest({ key: process.env.ABLY_API_KEY, logLevel: 0, httpRequestTimeout: 5000 });
  let active: { role: number; id: string } | undefined;
  const request = async (role: number, path: string, body: object) => {
    const token = await clerk.sessions.getToken(sessions[role]);
    return new Promise<Record<string, any>>((resolve, reject) => {
      const child = spawn("/Users/ryanc/.npm/_npx/69f9afb961c37556/node_modules/.bin/vercel", ["curl", path, "--deployment", origin, "--scope", "pangea6", "--", "--config", "-", "--silent", "--max-time", "25", "--include"], { stdio: ["pipe", "pipe", "pipe"] });
      let output = ""; child.stdout.on("data", chunk => output += chunk); child.stderr.resume();
      child.on("error", () => reject(new Error("request unavailable")));
      child.on("close", code => {
        try {
          assert.equal(code, 0);
          const boundary = output.indexOf("\r\n\r\n"); assert(boundary > 0);
          assert.equal(Number(output.slice(0, boundary).split("\r\n")[0].split(" ")[1]), 200);
          resolve(JSON.parse(output.slice(boundary + 4)));
        } catch { reject(new Error("request failed; details suppressed")); }
      });
      const entry = (name: string, value: string) => `${name} = ${JSON.stringify(value)}\n`;
      child.stdin.end(entry("request", "POST") + entry("header", `Authorization: Bearer ${token.jwt}`) + entry("header", `Origin: ${origin}`) + entry("header", "Content-Type: application/json") + entry("data", JSON.stringify(body)));
    });
  };
  try {
    for (const actor of [actors.a, actors.b]) sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
    for (const role of [0, 1]) {
      const peer = 1 - role, actor = [actors.a, actors.b][peer];
      const token = await request(peer, "/api/realtime/token", { conversationId: fixture.conversationId });
      const capability = JSON.parse(token.capability);
      assert(!Object.keys(capability).some(k => k.includes("*")));
      assert(capability[userChannel(actor.userId)].includes("subscribe"));
      mark("subscriber.creation");
      const client = new Realtime({ token: token.token, clientId: actor.userId, logLevel: 0 }); clients.push(client);
      const feed = client.channels.get(userChannel(actor.userId));
      const clears = client.channels.get(conversationChannel(fixture.conversationId));
      mark("subscription.attach.begin");
      await Promise.all([feed.attach(), clears.attach()]);
      assert.equal(feed.state, "attached"); assert.equal(client.connection.state, "connected");
      mark("subscription.ready");
      for (const mode of ["attached", "receipt-confirmed"] as const) {
        trial++;
        if (mode === "receipt-confirmed") {
          for (const ephemeral of [false, true]) {
            const nonce = randomUUID(), name = "fp3.readiness.probe";
            const probe = observed(feed, name, message => message.data?.nonce === nonce);
            mark(ephemeral ? "probe.ephemeral.publish" : "probe.ordinary.publish");
            await publisher.channels.get(userChannel(actor.userId)).publish({ name, data: { version: 1, nonce }, ...(ephemeral ? { extras: { ephemeral: true } } : {}) });
            mark("probe.provider.ack");
            assert.notEqual(await probe.promise, null, "readiness probe missing");
          }
          mark("subscription.receipt-confirmed");
        }
        const lease = await request(role, "/api/location-sharing", { action: "begin", conversationId: fixture.conversationId, precision: "area", consent: "area-snapshot-v1" });
        active = { role, id: lease.id };
        assert.equal(lease.audienceCount, 2);
        const incoming = observed(feed, LOCATION_SNAPSHOT, message => message.data?.id === lease.id);
        const publishAt = mark("snapshot.request.begin");
        const snapshot = await request(role, "/api/location-sharing", { action: "send", id: lease.id, point: { latitude: 1.2834, longitude: 103.8607, accuracy: 50 } });
        const responseAt = mark("snapshot.api.accepted");
        assert(validLocationSnapshot(snapshot)); assert.equal(snapshot.point, undefined); assert.equal(snapshot.source, "ura");
        const receivedAt = await incoming.promise;
        const retirement = observed(clears, LOCATION_RETIRED, message => message.data?.id === lease.id);
        const stopAt = mark("stop.request.begin");
        await request(role, "/api/location-sharing", { action: "stop", id: lease.id }); active = undefined;
        mark("stop.api.accepted");
        const retiredAt = await retirement.promise;
        samples.push({ direction: role === 0 ? "A-to-B" : "B-to-A", mode, received: receivedAt !== null, requestToResponseMs: responseAt - publishAt, requestToReceiptMs: receivedAt === null ? null : receivedAt - publishAt, stopToReceiptMs: retiredAt === null ? null : retiredAt - stopAt });
        console.log(JSON.stringify({ trial, completed: true, delivered: receivedAt !== null, retirementDelivered: retiredAt !== null }));
      }
      client.close();
    }
  } finally {
    let clean = true;
    if (active) await request(active.role, "/api/location-sharing", { action: "stop", id: active.id }).catch(() => { clean = false; });
    for (const client of clients) client.close();
    for (const id of sessions) await clerk.sessions.revokeSession(id).catch(() => { clean = false; });
    const result = { at: new Date().toISOString(), deploymentSha: deployment.sha, canonicalChanged: false, samples, trace, cleanupComplete: clean, syntheticOnly: true, providerGeocodingCalls: 0, method: "single-process monotonic clock; authenticated deployed API and real scoped SDK receivers; local ordinary+ephemeral readiness probe", unobservable: ["server authorization timing", "server publish initiation/ACK timing", "browser reconciliation/render"], deadlineMs: 12000 };
    writeFileSync(`.git/ms74-fp3/readiness-${Date.now()}.json`, JSON.stringify(result, null, 2), { mode: 0o600, flag: "wx" });
    assert(clean, "cleanup incomplete");
  }
}
main().catch(() => { console.error("Readiness diagnostic stopped; private details suppressed; inspect anonymous receipt."); process.exitCode = 1; }).finally(() => db.$client.end());
