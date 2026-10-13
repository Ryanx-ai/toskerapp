/** Supervised synthetic API peer for manual browser acceptance. Localhost only. */
import assert from "node:assert/strict";
import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationShares } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
const origin = "http://localhost:3000", db = getDatabase();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
let sessionId: string | undefined, lease: string | undefined, revision = 0;
const lines = createInterface({ input: process.stdin, terminal: false });
async function request(body: Record<string, unknown>) {
  assert(sessionId);
  const token = await clerk.sessions.getToken(sessionId), start = performance.now();
  const response = await fetch(origin + "/api/location-sharing", { method: "POST", headers: { Origin: origin, Authorization: `Bearer ${token.jwt}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  console.log(JSON.stringify({ action: body.action, status: response.status, ms: Math.round(performance.now() - start) }));
  assert.equal(response.status, 200);
  return response.json();
}
async function stop() { if (lease) { await request({ action: "stop", id: lease }); lease = undefined; revision = 0; } }
async function main() {
  assert(process.env.VERCEL === undefined);
  const actors = await resolveQaActors(db), role = process.argv[2];
  assert(role === "a" || role === "b");
  const actor = actors[role], fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal((await db.select().from(locationShares).where(eq(locationShares.userId, actor.userId))).length, 0);
  sessionId = (await clerk.sessions.createSession({ userId: actor.authSubject })).id;
  console.log("Ready: area | precise | refresh | stop | quit. Public synthetic landmark only. Auto-close in eight minutes.");
  for await (const command of lines) {
    if (command === "quit") break;
    if (command === "stop") { await stop(); continue; }
    if (command === "area" || command === "precise") {
      await stop();
      const value = await request({ action: "begin", conversationId: fixture.conversationId, precision: command, consent: `${command}-latest-v2` });
      lease = value.id; revision = 0;
    } else if (command !== "refresh") { console.log("Unknown command; no action."); continue; }
    assert(lease);
    const value = await request({ action: "send", id: lease, point: { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, expectedRevision: revision, requestId: randomUUID() });
    revision = value.revision;
    console.log(JSON.stringify({ syntheticSnapshotAccepted: true, precision: value.precision, revision }));
  }
}
const timeout = setTimeout(() => lines.close(), 8 * 60000);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => lines.close());
main().catch(() => { console.error("Local peer failed; private details suppressed."); process.exitCode = 1; }).finally(async () => {
  clearTimeout(timeout); lines.close();
  try { if (lease) await db.delete(locationShares).where(eq(locationShares.id, lease)); }
  finally { if (sessionId) await clerk.sessions.revokeSession(sessionId).catch(() => {}); await db.$client.end(); console.log("Exact peer consent/payload cleanup complete; created session revoked."); }
});
