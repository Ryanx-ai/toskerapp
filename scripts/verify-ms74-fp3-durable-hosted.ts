/** Actual hosted cleanup + real isolated sessions; not browser/canonical acceptance. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync,writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { QueueClient } from "@vercel/queue";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { durableLocationService } from "../src/server/location-sharing/durable-service";
import { LOCATION_CLEANUP_TOPIC } from "../src/server/location-sharing/cleanup-consumer";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db=getDatabase(),deploymentId=process.env.FP3_QUEUE_DEPLOYMENT;
assert.equal(deploymentId,"dpl_oawCafcbstwoCDdz3BE4fMtzeHZn");
const queue=new QueueClient({region:"iad1",deploymentId,telemetry:{isEnabled:false}});
const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY});
const sessions:string[]=[],obligations:string[]=[];let phase="ownership";
async function main(){
  phase="test-auth-environment";assert(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
  phase="resolve-actors";
  const {a,b,founder}=await resolveQaActors(db),fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
  phase="fixture-identity";assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
  phase="fixture-membership";
  assert.equal((await db.execute(sql`select 1 from rooms r join room_memberships m on m.room_id=r.id where r.id=${fixture.roomId}::uuid
    and r.owner_id=${a.userId}::uuid and r.slug=${fixture.slug} and m.user_id=${founder.userId}::uuid`)).rows.length,1);
  phase="empty-consents";assert.equal(Number((await db.execute(sql`select count(*) n from location_shares`)).rows[0].n),0);
  phase="empty-qa-rates";
  assert.equal(Number((await db.execute(sql`select count(*) n from invite_rate_limits where user_id in (${a.userId}::uuid,${b.userId}::uuid)
    and operation in ('location-consent','location-snapshot')`)).rows[0].n),0);
  const service=durableLocationService(db,{capacity:()=>true,notify:async()=>{},
    session:async(actor,id)=>{const s=await clerk.sessions.getSession(id);assert.equal(s.userId,actor.authSubject);assert.equal(s.status,"active");assert(s.expireAt>Date.now());},
    publisher:async(message,options)=>{if((message as {kind:string}).kind==="expiry")obligations.push(options.idempotencyKey);
      writeFileSync(".git/ms74-fp3/durable-hosted-intent.json",JSON.stringify({deploymentId,sessions,obligations}),{mode:0o600});
      return queue.send(LOCATION_CLEANUP_TOPIC,message,options);},
  });
  try{
    for(const actor of[a,b]){
      sessions.push((await clerk.sessions.createSession({userId:actor.authSubject})).id);
      writeFileSync(".git/ms74-fp3/durable-hosted-intent.json",JSON.stringify({deploymentId,sessions,obligations}),{mode:0o600});
    }
    // A due metadata-only job also drains anonymous failed-admission remnants;
    // deletion still uses DB clock and the exact fixed expiry predicate.
    phase="drain-expired-metadata";
    await queue.send(LOCATION_CLEANUP_TOPIC,{version:1,kind:"expiry",dueAt:Date.now()-1000},{retentionSeconds:3600,idempotencyKey:randomUUID()});
    const drainDeadline=Date.now()+20000;
    while(Number((await db.execute(sql`select count(*) n from location_cleanup_reservations where expires_at<clock_timestamp()-interval '1 minute'`)).rows[0].n)){
      assert(Date.now()<drainDeadline);await new Promise(r=>setTimeout(r,500));
    }
    phase="real-hosted-admission";const signal=new AbortController().signal,start=performance.now();
    const lease=await service.begin(a,sessions[0],fixture.conversationId,"precise",signal),admissionMs=Math.round(performance.now()-start);
    await service.send(a,sessions[0],lease.id,{latitude:1.2834,longitude:103.8607,accuracy:50},0,randomUUID(),signal);
    phase="read-latency";const samples:number[]=[];
    for(let i=0;i<5;i++){const t=performance.now();const view=await service.read(b,sessions[1],fixture.conversationId);samples.push(Math.round(performance.now()-t));assert.equal(view.peers.length,1);}
    console.log(JSON.stringify({hostedCleanupArmed:true,syntheticSnapshot:true,admissionMs,serviceReadMs:samples,naturalExpiryPending:true}));
    phase="natural-expiry";
    // Poll only aggregate row counts. No mutation of the consent deadline and no
    // local cleanup worker: the hosted delayed job must remove the real row.
    let removedAt=0;
    while(Date.now()<lease.expiresAt+60000){
      const count=Number((await db.execute(sql`select count(*) n from location_latest where lease_id=${lease.id}::uuid`)).rows[0].n);
      if(!count){removedAt=Date.now();break;}
      await new Promise(r=>setTimeout(r,Date.now()<lease.expiresAt-10000?10000:1000));
    }
    assert(removedAt>=lease.expiresAt&&removedAt-lease.expiresAt<=60000);
    assert.equal((await service.read(b,sessions[1],fixture.conversationId)).peers.length,0);
    assert.equal((await db.execute(sql`select 1 from location_shares where id=${lease.id}::uuid`)).rows.length,0);
    const receipt={passed:true,realHostedQueue:true,realClerkSessions:true,localWorker:false,syntheticOnly:true,
      naturalFiveMinuteExpiry:true,activeRowDeletionUpperBoundMs:removedAt-lease.expiresAt,admissionMs,serviceReadMs:samples,
      browserAcceptance:false,canonicalAcceptance:false,providerLocationCalls:0,at:new Date().toISOString()};
    writeFileSync(".git/ms74-fp3/durable-hosted.json",JSON.stringify(receipt),{mode:0o600});console.log(JSON.stringify(receipt));
  }finally{
    phase="exact-cleanup";
    for(const actor of[a,b])if(sessions.length)await db.execute(sql`delete from location_shares where user_id=${actor.userId}::uuid
      and session_id in (${sql.join(sessions.map(id=>sql`${id}`),sql`, `)})`);
    for(const id of obligations)await db.execute(sql`delete from location_cleanup_reservations where id=${id}::uuid`);
    for(const id of sessions)await clerk.sessions.revokeSession(id);
    await db.execute(sql`delete from invite_rate_limits where user_id in (${a.userId}::uuid,${b.userId}::uuid) and operation in ('location-consent','location-snapshot')`);
  }
}
main().catch(()=>{console.error(JSON.stringify({durableHosted:false,phase,detailsSuppressed:true}));process.exitCode=1;}).finally(()=>db.$client.end());
