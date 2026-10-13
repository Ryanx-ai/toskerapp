/** Development bootstrap -> private staged Production publisher -> real consumer.
 * Only the bootstrap uses a local OIDC token; cleanup jobs originate in Production. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { QueueClient } from "@vercel/queue";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
const intent = JSON.parse(readFileSync(".git/ms74-fp3/production-publisher-intent.json", "utf8"));
assert(/^dpl_[A-Za-z0-9]+$/.test(intent.deploymentId));
assert(/^[0-9a-f-]{36}$/.test(intent.nonce));
assert.equal(intent.canonical, false);
assert.equal(process.env.NODE_ENV, "production");
const db = getDatabase();
let phase = "empty-state";
async function main() {
  assert.equal(Number((await db.execute(sql`select count(*) n from location_latest`)).rows[0].n), 0);
  const oldFailure = String((await db.execute(sql`select failure_at from location_cleanup_health where slot=1`)).rows[0]?.failure_at ?? "");
  const row = (await db.execute(sql`insert into location_cleanup_reservations(id,created_at,expires_at,armed)
    values(${intent.nonce}::uuid,now()-interval '270 seconds',now()+interval '30 seconds',false)
    returning floor(extract(epoch from expires_at)*1000)::bigint due`)).rows[0];
  const dueAt = Number(row.due);
  writeFileSync(".git/ms74-fp3/production-publisher-run.json", JSON.stringify({ ...intent, dueAt }), { mode: 0o600 });
  phase = "bootstrap";
  const queue = new QueueClient({ region: "iad1", deploymentId: intent.deploymentId, telemetry: { isEnabled: false } });
  await queue.send("tosker-cleanup-publisher-probe-v1", { nonce: intent.nonce },
    { retentionSeconds: 3600, idempotencyKey: intent.nonce });
  phase = "production-consumer-retries";
  let failure = oldFailure, transitions = 0, deletionAt = 0, lastTransition = 0;
  const deadline = Date.now() + 480000;
  while (Date.now() < deadline) {
    const state = (await db.execute(sql`select failure_at,
      (select count(*)::int from location_cleanup_reservations where id=${intent.nonce}::uuid) pending
      from location_cleanup_health where slot=1`)).rows[0];
    const value = String(state.failure_at ?? "");
    if (value !== failure) {
      failure = value; transitions++; lastTransition = Date.now();
      console.log(JSON.stringify({ anonymousFailureReceipt: transitions }));
    }
    if (!deletionAt && Number(state.pending) === 0) {
      deletionAt = Date.now();
      assert(deletionAt >= dueAt && deletionAt - dueAt < 60000);
      console.log(JSON.stringify({ productionExpiryUpperBoundMs: deletionAt - dueAt }));
    }
    assert(transitions <= 8);
    if (transitions === 8 && Date.now() - lastTransition > 70000) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  assert.equal(transitions, 8); assert(Date.now() - lastTransition > 70000); assert(deletionAt);
  const receipt = { passed: true, productionOrigin: true, earlyDuplicateDeferredUntilDue: true,
    expiryUpperBoundMs: deletionAt - dueAt, failureReceipts: transitions,
    noNinthDeliveryObservedMs: Date.now() - lastTransition, coordinates: 0,
    canonicalAcceptance: false, at: new Date().toISOString() };
  writeFileSync(".git/ms74-fp3/production-publisher.json", JSON.stringify(receipt), { mode: 0o600 });
  console.log(JSON.stringify(receipt));
}
main().catch(() => {
  console.error(JSON.stringify({ productionPublisherPassed: false, phase, detailsSuppressed: true }));
  process.exitCode = 1;
}).finally(() => db.$client.end());
