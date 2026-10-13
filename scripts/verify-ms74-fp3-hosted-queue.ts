/** Metadata-only hosted push acceptance. Does not enable location admission. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { QueueClient } from "@vercel/queue";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { LOCATION_CLEANUP_TOPIC } from "../src/server/location-sharing/cleanup-consumer";
const db = getDatabase(), deploymentId = process.env.FP3_QUEUE_DEPLOYMENT;
assert.equal(process.env.NODE_ENV,"production","Hosted publisher must not use SDK development-mode unpinned sends");
const oidc=process.env.VERCEL_OIDC_TOKEN;
assert(oidc&&JSON.parse(Buffer.from(oidc.split('.')[1],'base64url').toString()).environment==='production',
  "Publisher token environment must match the staged Production consumer");
assert.equal(deploymentId, "dpl_oawCafcbstwoCDdz3BE4fMtzeHZn");
const queue = new QueueClient({ region: "iad1", deploymentId, telemetry: { isEnabled: false } });
const nonce=randomUUID(), reservation=randomUUID();
let phase="readiness", armed=false;
async function until(check:()=>Promise<boolean>,deadline:number) {
  do { if(await check()) return; await new Promise(r=>setTimeout(r,1000)); } while(Date.now()<deadline);
  throw new Error("Explicit receipt deadline exceeded");
}
async function main() {
  const started=Date.now();
  await db.execute(sql`insert into location_cleanup_health(slot,ready_nonce,ready_requested_at) values(1,${nonce}::uuid,clock_timestamp())
    on conflict(slot) do update set ready_nonce=excluded.ready_nonce,ready_requested_at=excluded.ready_requested_at,ready_ack_at=null`);
  await queue.send(LOCATION_CLEANUP_TOPIC,{version:1,kind:"readiness",nonce},{retentionSeconds:3600,idempotencyKey:nonce});
  const publishedAt=Date.now();
  await until(async()=>Boolean((await db.execute(sql`select 1 from location_cleanup_health where slot=1 and ready_nonce=${nonce}::uuid and ready_ack_at>=ready_requested_at`)).rows.length),Date.now()+25000);
  const acknowledgedAt=Date.now();
  console.log(JSON.stringify({hostedQueueReadiness:true,publishMs:publishedAt-started,receiptMs:acknowledgedAt-started}));
  phase="delayed-expiry";
  const [row]=(await db.execute(sql`insert into location_cleanup_reservations(id,created_at,expires_at,armed)
    values(${reservation}::uuid,now()-interval '280 seconds',now()+interval '20 seconds',false)
    returning floor(extract(epoch from expires_at)*1000)::bigint due`)).rows;
  const dueAt=Number(row.due);
  writeFileSync(".git/ms74-fp3/queue-test-intent.json",JSON.stringify({deploymentId,reservation,dueAt,nonce}),{mode:0o600});
  await queue.send(LOCATION_CLEANUP_TOPIC,{version:1,kind:"expiry",dueAt},{retentionSeconds:3600,delaySeconds:Math.max(1,Math.ceil((dueAt-Date.now())/1000)),idempotencyKey:reservation});
  armed=true;
  // Provider ACK precedes arming. No location payload participates in this test.
  await db.execute(sql`update location_cleanup_reservations set armed=true where id=${reservation}::uuid`);
  assert.equal((await db.execute(sql`select 1 from location_cleanup_reservations where id=${reservation}::uuid and expires_at>clock_timestamp()`)).rows.length,1);
  console.log(JSON.stringify({delayedWorkAcknowledged:true,unexpiredReservationSurvived:true}));
  await until(async()=>!(await db.execute(sql`select 1 from location_cleanup_reservations where id=${reservation}::uuid`)).rows.length,dueAt+60000);
  const observedDeletionAt=Date.now();
  assert(observedDeletionAt>=dueAt && observedDeletionAt-dueAt<=60000);
  const receipt={hostedQueuePassed:true,deploymentId,readinessMs:acknowledgedAt-started,expiryDeletionUpperBoundMs:observedDeletionAt-dueAt,
    coordinatePayloads:0,publishedMessages:2,at:new Date().toISOString()};
  writeFileSync(".git/ms74-fp3/hosted-queue-test.json",JSON.stringify(receipt),{mode:0o600});
  console.log(JSON.stringify(receipt));
}
main().catch(error=>{ console.error(JSON.stringify({hostedQueuePassed:false,phase,armed,errorType:error?.name ?? "Error",detailsSuppressed:true}));process.exitCode=1; })
  .finally(()=>db.$client.end());
