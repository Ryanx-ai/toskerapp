/** Bounded synthetic HTTP sender for browser receiver acceptance. Review DB only. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationShares } from "../src/server/db/schema";
import { isIsolatedReview } from "../src/server/accounts/isolated-review";
import { resolveQaActors } from "./lib/ms73-fixtures";

const db = getDatabase(), origin = "http://localhost:3000";
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const lines = createInterface({ input: process.stdin, terminal: false });
const receiptPath = `.git/ms74-fp3/review-peer-${Date.now()}.json`;
const receipt: { role?: string; startedAt: string; sessionId?: string; leaseId?: string; status: string;
  checks: { action: string; status: number; ms: number }[] } = {
  startedAt: new Date().toISOString(), status: "prepared", checks: [],
};
function save() { writeFileSync(receiptPath, JSON.stringify(receipt), { mode: 0o600 }); }
let revision = 0;
let sessionRevoked = false;
async function request(body: Record<string, unknown>) {
  assert(receipt.sessionId);
  const jwt = await clerk.sessions.getToken(receipt.sessionId);
  const started = performance.now();
  const response = await fetch(origin + "/api/location-sharing", { method: "POST", headers: {
    Origin: origin, Authorization: `Bearer ${jwt.jwt}`, "Content-Type": "application/json",
  }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const check = { action: String(body.action), status: response.status, ms: Math.round(performance.now()-started) };
  receipt.checks.push(check); save(); console.log(JSON.stringify(check));
  assert.equal(response.status, 200);
  return response.json();
}
async function stop() {
  if (!receipt.leaseId) return;
  await request({ action: "stop", id: receipt.leaseId });
  receipt.leaseId = undefined; revision = 0; save();
}
async function main() {
  assert(isIsolatedReview());
  const role = process.argv[2]; assert(role === "a" || role === "b");
  receipt.role = role; save();
  const actors = await resolveQaActors(db);
  const fixture = JSON.parse(readFileSync(".git/ms74-fp3/review-fixture.json", "utf8"));
  assert.equal(fixture.status, "committed");
  assert.equal((await db.select().from(locationShares).where(eq(locationShares.userId, actors[role].userId))).length, 0);
  receipt.sessionId = (await clerk.sessions.createSession({ userId: actors[role].authSubject })).id;
  receipt.status = "active"; save();
  console.log("Review peer ready: area | precise | refresh | current | stop | logout | quit; synthetic only, 12-minute bound.");
  for await (const command of lines) {
    if (command === "quit") break;
    if (command === "logout") {
      // Exercise the real endpoint while a receiver can still display this
      // helper's snapshot. Never revoke a browser/founder session by inference.
      const jwt = await clerk.sessions.getToken(receipt.sessionId);
      const headers = { Origin: origin, Authorization: `Bearer ${jwt.jwt}`, "Content-Type": "application/json" };
      const started = performance.now();
      const response = await fetch(origin + "/api/realtime/logout", {
        method: "POST", headers, signal: AbortSignal.timeout(15000),
      });
      const check = { action: "logout", status: response.status, ms: Math.round(performance.now() - started) };
      receipt.checks.push(check); save(); console.log(JSON.stringify(check));
      assert.equal(response.status, 200);
      const session = await clerk.sessions.getSession(receipt.sessionId);
      assert.equal(session.status, "revoked"); sessionRevoked = true;
      assert.equal((await db.select().from(locationShares).where(eq(locationShares.userId, actors[role].userId))).length, 0);
      receipt.leaseId = undefined; revision = 0; save();
      const denied = await fetch(origin + "/api/location-sharing", {
        method: "POST", headers, body: JSON.stringify({ action: "current", conversationId: fixture.conversationId }),
        signal: AbortSignal.timeout(15000),
      });
      assert([401, 403].includes(denied.status));
      console.log(JSON.stringify({ logoutRevokedOwnedSession: true, oldBearerDenied: denied.status, remainingActorConsents: 0 }));
      break;
    }
    if (command === "stop") { await stop(); continue; }
    if (command === "current") {
      const view = await request({ action: "current", conversationId: fixture.conversationId });
      console.log(JSON.stringify({ peerCount: view.peers.length, precisions: view.peers.map((p: { snapshot: { precision: string } })=>p.snapshot.precision) }));
      continue;
    }
    if (command === "area" || command === "precise") {
      await stop();
      const value = await request({ action: "begin", conversationId: fixture.conversationId,
        precision: command, consent: `${command}-latest-v2` });
      receipt.leaseId = value.id; revision = 0; save();
    } else if (command !== "refresh") { console.log("Unknown command; no action."); continue; }
    assert(receipt.leaseId);
    const value = await request({ action: "send", id: receipt.leaseId,
      point: { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, expectedRevision: revision, requestId: randomUUID() });
    revision = value.revision;
    console.log(JSON.stringify({ accepted: true, precision: value.precision, revision }));
  }
}
const timer = setTimeout(()=>lines.close(), 12*60000);
for (const signal of ["SIGINT","SIGTERM"] as const) process.once(signal,()=>lines.close());
main().catch(error=>{ console.error(JSON.stringify({ reviewPeer: "FAIL", type: error?.name })); process.exitCode=1; })
  .finally(async()=>{
    clearTimeout(timer); lines.close();
    let cleanupFailed = false;
    try {
      await stop();
    } catch { cleanupFailed = true; }
    // A failed Stop must not prevent revoking this harness-owned session.
    try {
      if (receipt.sessionId && !sessionRevoked) await clerk.sessions.revokeSession(receipt.sessionId);
    } catch { cleanupFailed = true; }
    receipt.status = cleanupFailed ? "cleanup-required" : "closed"; save();
    if (cleanupFailed) { process.exitCode=1; console.error("Review peer cleanup needs receipt-based recovery."); }
    else console.log("Exact review peer session revoked; consent stopped.");
    await db.$client.end();
  });
