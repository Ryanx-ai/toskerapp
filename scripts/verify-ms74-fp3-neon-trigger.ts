import assert from "node:assert/strict";
import { neonCleanupHandler } from "../src/server/location-sharing/neon-trigger";

async function main() {
  let calls = 0;
  const handler = neonCleanupHandler(async () => { calls++; }, () => true);
  const payload = { version: 1, invocation_id: "synthetic-canary", trigger: { type: "schedule", name: "tosker-fp3-rescue" }, data: { scheduled_at: "2026-10-14T00:00:00Z" } };
  const make = (body: unknown = payload, header = "synthetic-canary") => new Request("https://example.invalid/", { method: "POST", headers: { "content-type": "application/json", "x-neon-trigger-invocation-id": header }, body: JSON.stringify(body) });
  assert.equal((await handler(new Request("https://example.invalid/"))).status, 404);
  assert.equal((await handler(make(payload, ""))).status, 403);
  assert.equal((await neonCleanupHandler(async () => { calls++; }, () => false)(make())).status, 403);
  assert.equal((await handler(make({ ...payload, invocation_id: "mismatch" }))).status, 400);
  assert.equal((await handler(make({ ...payload, trigger: { type: "schedule", name: "wrong" } }))).status, 400);
  assert.equal((await handler(make({ ...payload, data: { scheduled_at: "invalid" } }))).status, 400);
  assert.equal((await handler(make({ junk: "x".repeat(3000) }))).status, 413);
  assert.equal(calls, 0);
  assert.equal((await handler(make())).status, 204); assert.equal(calls, 1);
  assert.equal((await neonCleanupHandler(async () => { throw new Error("private detail"); }, () => true)(make())).status, 503);
  console.log(JSON.stringify({ neonTriggerUnit: "PASS", guardedCases: 7, success: true, genericFailure: true, hostedAttestationProven: false }));
}
void main();
