/** Bounded anonymous fault probes on the existing private staged consumer. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { QueueClient } from "@vercel/queue";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { LOCATION_CLEANUP_TOPIC } from "../src/server/location-sharing/cleanup-consumer";
const db=getDatabase(),deploymentId=process.env.FP3_QUEUE_DEPLOYMENT;
assert.equal(process.env.NODE_ENV,"production","Hosted publisher must not use SDK development-mode unpinned sends");
const oidc=process.env.VERCEL_OIDC_TOKEN;
assert(oidc&&JSON.parse(Buffer.from(oidc.split('.')[1],'base64url').toString()).environment==='production',
  "Publisher token environment must match the staged Production consumer");
assert.equal(deploymentId,"dpl_oawCafcbstwoCDdz3BE4fMtzeHZn");
const queue=new QueueClient({region:"iad1",deploymentId,telemetry:{isEnabled:false}});
const reservation=randomUUID(),poison=randomUUID();let phase="empty-state";
async function main(){
  assert.equal(Number((await db.execute(sql`select count(*) n from location_latest`)).rows[0].n),0);
  const oldFailure=String((await db.execute(sql`select failure_at from location_cleanup_health where slot=1`)).rows[0]?.failure_at??"");
  const row=(await db.execute(sql`insert into location_cleanup_reservations(id,created_at,expires_at,armed)
    values(${reservation}::uuid,now()-interval '280 seconds',now()+interval '20 seconds',false)
    returning floor(extract(epoch from expires_at)*1000)::bigint due`)).rows[0];
  const dueAt=Number(row.due);
  writeFileSync(".git/ms74-fp3/hosted-retry-intent.json",JSON.stringify({deploymentId,reservation,poison,dueAt}),{mode:0o600});
  const message={version:1,kind:"expiry",dueAt},options={retentionSeconds:3600,idempotencyKey:reservation};
  phase="early-duplicate";
  // Deliberately omit delay: actual early delivery must defer, not acknowledge.
  await queue.send(LOCATION_CLEANUP_TOPIC,message,options);
  await queue.send(LOCATION_CLEANUP_TOPIC,message,options);
  assert.equal((await db.execute(sql`select 1 from location_cleanup_reservations where id=${reservation}::uuid and expires_at>clock_timestamp()`)).rows.length,1);
  // Strict parser rejects this coordinate-free envelope. Eight capped retries,
  // no public endpoint, location row or database outage injection.
  phase="bounded-invalid-envelope";
  await queue.send(LOCATION_CLEANUP_TOPIC,{version:1,kind:"invalid",nonce:poison},{retentionSeconds:3600,idempotencyKey:poison});
  let failure=oldFailure,transitions=0,deletionAt=0,lastTransition=0;
  const deadline=Date.now()+420000;
  while(Date.now()<deadline){
    const state=(await db.execute(sql`select failure_at,
      (select count(*)::int from location_cleanup_reservations where id=${reservation}::uuid) pending
      from location_cleanup_health where slot=1`)).rows[0];
    const value=String(state.failure_at??"");
    if(value!==failure){failure=value;transitions++;lastTransition=Date.now();console.log(JSON.stringify({anonymousFailureReceipt:transitions}));}
    if(!deletionAt&&Number(state.pending)===0){deletionAt=Date.now();assert(deletionAt>=dueAt&&deletionAt-dueAt<60000);}
    assert(transitions<=8);
    if(transitions===8&&Date.now()-lastTransition>70000)break;
    await new Promise(r=>setTimeout(r,2000));
  }
  assert.equal(transitions,8);assert(Date.now()-lastTransition>70000);assert(deletionAt);
  const receipt={passed:true,realHostedQueue:true,earlyDuplicateDeferredUntilDue:true,expiryUpperBoundMs:deletionAt-dueAt,
    failureReceipts:transitions,noNinthDeliveryObservedMs:Date.now()-lastTransition,noCoordinates:true,canonicalAcceptance:false,at:new Date().toISOString()};
  writeFileSync(".git/ms74-fp3/hosted-retry.json",JSON.stringify(receipt),{mode:0o600});console.log(JSON.stringify(receipt));
}
main().catch(()=>{console.error(JSON.stringify({hostedRetry:false,phase,detailsSuppressed:true}));process.exitCode=1;}).finally(()=>db.$client.end());
