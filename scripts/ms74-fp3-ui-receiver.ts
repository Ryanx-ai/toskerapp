/** Read-only isolated B observer for explicit synthetic browser-A consent QA. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClerkClient } from "@clerk/backend";
import { Realtime } from "ably";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationLatest } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { conversationChannel } from "../src/lib/realtime-contract";
import { LOCATION_CHANGED, validLocationView } from "../src/lib/shared-location-contract";

const origin = "http://localhost:3000", db = getDatabase();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const lines = createInterface({ input: process.stdin, terminal: false });
const results: { check: string; ms: number; passed: boolean }[] = [];
let sessionId: string | undefined, client: Realtime | undefined, notices = 0;
async function request(body: Record<string, unknown>, path = "/api/location-sharing") {
  assert(sessionId);
  const token = await clerk.sessions.getToken(sessionId), started = performance.now();
  const response = await fetch(origin + path, { method: "POST", headers: { Origin: origin, Authorization: `Bearer ${token.jwt}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, "Authorized observer request failed");
  return { value: await response.json(), ms: Math.round(performance.now() - started) };
}
async function main() {
  assert(process.env.VERCEL === undefined);
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  sessionId = (await clerk.sessions.createSession({ userId: actors.b.authSubject })).id;
  const { value: token } = await request({ conversationId: fixture.conversationId }, "/api/realtime/token");
  client = new Realtime({ token: token.token, clientId: actors.b.userId, logLevel: 0 });
  const channel = client.channels.get(conversationChannel(fixture.conversationId));
  await channel.subscribe(LOCATION_CHANGED, message => {
    if (JSON.stringify(message.data) !== JSON.stringify({ version: 1 })) { console.error("Non-content-free notification rejected; private details suppressed."); process.exitCode = 1; lines.close(); return; }
    notices++; console.log(JSON.stringify({ contentFreeNotice: true, notices }));
  });
  await channel.attach(); assert.equal(channel.state, "attached");
  let previous: { id: string; expiresAt: number; revision: number } | undefined;
  console.log("Receiver ready: empty | area | precise | refresh | quit. No sender mutations. Eight-minute bound.");
  for await (const command of lines) {
    if (command === "quit") break;
    assert(["empty", "area", "precise", "refresh"].includes(command));
    const { value, ms } = await request({ action: "current", conversationId: fixture.conversationId });
    assert(validLocationView(value, fixture.conversationId));
    if (command === "empty") { assert.equal(value.peers.length, 0); previous = undefined; }
    else {
      assert.equal(value.peers.length, 1);
      const snapshot = value.peers[0].snapshot;
      assert.equal(value.peers[0].identity.userId, actors.a.userId);
      const rows = await db.select().from(locationLatest).where(eq(locationLatest.leaseId, snapshot.id));
      assert.equal(rows.length, 1);
      if (command === "area") { assert.equal(snapshot.precision, "area"); assert.equal(rows[0].latitude, null); assert.equal(rows[0].longitude, null); assert.equal(rows[0].accuracy, null); }
      if (command === "precise") { assert.equal(snapshot.precision, "precise"); assert.deepEqual(snapshot.point, { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }); }
      if (command === "refresh") { assert(previous); assert.equal(snapshot.id, previous.id); assert.equal(snapshot.expiresAt, previous.expiresAt); assert.equal(snapshot.revision, previous.revision + 1); }
      previous = snapshot;
    }
    results.push({ check: command, ms, passed: true });
    console.log(JSON.stringify(results.at(-1)));
  }
}
const timeout = setTimeout(() => lines.close(), 8 * 60000);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => lines.close());
main().catch(error => { console.error(JSON.stringify({ passed: false, kind: error?.name, detail: "Observer assertion failed; private values suppressed" })); process.exitCode = 1; }).finally(async () => {
  clearTimeout(timeout); lines.close(); client?.close();
  if (sessionId) await clerk.sessions.revokeSession(sessionId).catch(() => {});
  await db.$client.end();
  const receipt = JSON.stringify({ results, notices, observerPassed: !process.exitCode, senderMutation: false, canonicalUnchanged: true });
  writeFileSync(`.git/ms74-fp3/ui-receiver-${Date.now()}.json`, receipt, { mode: 0o600, flag: "wx" });
  writeFileSync(".git/ms74-fp3/latest-ui-receiver.json", receipt, { mode: 0o600 });
  console.log("Observer closed; its exact session revoked. Sender state unchanged.");
});
