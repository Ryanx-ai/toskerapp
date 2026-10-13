/** Real DB + isolated Clerk sessions; injected cleanup publisher, NOT hosted acceptance. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { durableLocationService } from "../src/server/location-sharing/durable-service";
import { parseCleanupMessage } from "../src/server/location-sharing/cleanup-policy";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db=getDatabase(),clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY});
const sessions:string[]=[],obligations:string[]=[];let phase="ownership",failedPhase:string|undefined,allowCapacity=true;
async function main(){
  assert(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
  const {a,b,founder}=await resolveQaActors(db),fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
  assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
  assert.equal((await db.execute(sql`select 1 from rooms r join room_memberships m on m.room_id=r.id where r.id=${fixture.roomId}::uuid
    and r.owner_id=${a.userId}::uuid and r.slug=${fixture.slug} and m.user_id=${founder.userId}::uuid`)).rows.length,1);
  assert.equal(Number((await db.execute(sql`select count(*) n from location_shares`)).rows[0].n),0);
  assert.equal(Number((await db.execute(sql`select count(*) n from location_cleanup_reservations where expires_at<clock_timestamp()-interval '1 minute'`)).rows[0].n),0,
    "Finish pending retention-failure recovery before testing admission");
  assert.equal(Number((await db.execute(sql`select count(*) n from invite_rate_limits where user_id in (${a.userId}::uuid,${b.userId}::uuid)
    and operation in ('location-consent','location-snapshot')`)).rows[0].n),0);
  const checks:string[]=[],notices:string[]=[];
  const deps={capacity:()=>allowCapacity,readBudget:async()=>{},
    session:async(actor:typeof a,id:string)=>{const s=await clerk.sessions.getSession(id);assert.equal(s.userId,actor.authSubject);assert.equal(s.status,"active");assert(s.expireAt>Date.now());},
    notify:async(id:string)=>{notices.push(id);},
    publisher:async(input:unknown,options:{retentionSeconds:number;delaySeconds?:number;idempotencyKey:string})=>{
      const message=parseCleanupMessage(input);assert.equal(options.retentionSeconds,3600);
      if(message.kind==="readiness")await db.execute(sql`update location_cleanup_health set ready_ack_at=clock_timestamp()
        where slot=1 and ready_nonce=${message.nonce}::uuid`);
      else{obligations.push(options.idempotencyKey);assert(options.delaySeconds!>=1&&options.delaySeconds!<=300);}
    },
  };
  const service=durableLocationService(db,deps),point={latitude:1.2834,longitude:103.8607,accuracy:50},signal=new AbortController().signal;
  try{
    for(const actor of[a,b]){
      sessions.push((await clerk.sessions.createSession({userId:actor.authSubject})).id);
      writeFileSync(".git/ms74-fp3/durable-service-intent.json",JSON.stringify({sessions,at:new Date().toISOString()}),{mode:0o600});
    }
    phase="broad";let lease=await service.begin(a,sessions[0],fixture.conversationId,"area",signal);
    const request=randomUUID(),sent=await service.send(a,sessions[0],lease.id,point,0,request,signal);assert(!("point" in sent));
    const row=(await db.execute(sql`select latitude,longitude,accuracy,worker_run_id,cleanup_armed from location_latest where lease_id=${lease.id}::uuid`)).rows[0];
    assert.deepEqual(row,{latitude:null,longitude:null,accuracy:null,worker_run_id:null,cleanup_armed:true});
    assert.equal((await service.read(b,sessions[1],fixture.conversationId)).peers.length,1);
    assert.equal((await service.send(a,sessions[0],lease.id,point,0,request,signal)).revision,1);
    await assert.rejects(service.send(a,sessions[0],lease.id,point,0,randomUUID(),signal));checks.push("broad null coordinates, A to B, idempotent retry and revision fencing");
    phase="precise";const old=lease;lease=await service.begin(a,sessions[0],fixture.conversationId,"precise",signal);
    const precise=await service.send(a,sessions[0],lease.id,point,0,randomUUID(),signal);assert.deepEqual(precise.point,point);
    await service.stop(a,sessions[0],old.id);assert.equal((await service.read(b,sessions[1],fixture.conversationId)).peers[0].snapshot.id,lease.id);
    const refreshed=await service.send(a,sessions[0],lease.id,point,1,randomUUID(),signal);assert.equal(refreshed.expiresAt,lease.expiresAt);
    allowCapacity=false;await assert.rejects(service.begin(b,sessions[1],fixture.conversationId,"area",signal));
    await service.stop(a,sessions[0],lease.id);allowCapacity=true;assert.equal((await service.read(b,sessions[1],fixture.conversationId)).peers.length,0);
    checks.push("precise consent, fixed expiry refresh, old Stop isolation, Stop independent of admission health");
    phase="reverse-and-isolation";lease=await service.begin(b,sessions[1],fixture.conversationId,"area",signal);
    await service.send(b,sessions[1],lease.id,point,0,randomUUID(),signal);assert.equal((await service.read(a,sessions[0],fixture.conversationId)).peers.length,1);
    await assert.rejects(service.read(b,sessions[1],fixture.selectedChatId));await assert.rejects(service.begin(b,sessions[1],fixture.selectedChatId,"area",signal));
    await service.stop(b,sessions[1],lease.id);checks.push("B to A and unauthorized selected Subroom denial");
    phase="Stop-during-projection";let entered!:()=>void,release!:()=>void;
    const barrier=new Promise<void>(resolve=>{entered=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
    const blocked=durableLocationService(db,{...deps,area:async()=>{entered();await gate;return{label:"Central Region",source:"ura"};}});
    lease=await blocked.begin(a,sessions[0],fixture.conversationId,"precise",signal);
    const inflight=blocked.send(a,sessions[0],lease.id,point,0,randomUUID(),signal);const rejection=assert.rejects(inflight);
    await barrier;await blocked.stop(a,sessions[0],lease.id);release();await rejection;
    assert.equal((await service.read(b,sessions[1],fixture.conversationId)).peers.length,0);checks.push("Stop during projection cannot resurrect payload");
    phase="enqueue-failure";
    const failed=durableLocationService(db,{...deps,publisher:async(input,options)=>{
      if(parseCleanupMessage(input).kind==="expiry")obligations.push(options.idempotencyKey);
      throw new Error("simulated queue failure");
    }});
    await assert.rejects(failed.begin(a,sessions[0],fixture.conversationId,"precise",signal));
    assert.equal(Number((await db.execute(sql`select count(*) n from location_latest`)).rows[0].n),0);
    assert.equal(Number((await db.execute(sql`select count(*) n from location_shares`)).rows[0].n),0);checks.push("enqueue failure stores no consent/payload");
    writeFileSync(".git/ms74-fp3/durable-service.json",JSON.stringify({passed:true,checks,realClerkSessions:true,cleanupPublisherInjected:true,
      hostedApplicationAcceptance:false,providerCalls:0,notices:notices.length,at:new Date().toISOString()}),{mode:0o600});
    console.log(JSON.stringify({durableService:"PASS",checks,realClerkSessions:true,cleanupPublisherInjected:true,hostedApplicationAcceptance:false,providerCalls:0}));
  }catch(error){failedPhase=phase;throw error;}finally{
    phase="exact-cleanup";
    for(const actor of[a,b])if(sessions.length)await db.execute(sql`delete from location_shares where user_id=${actor.userId}::uuid
      and session_id in (${sql.join(sessions.map(id=>sql`${id}`),sql`, `)})`);
    // Delete only exact reservations captured by this run's publisher seam.
    for(const id of obligations)await db.execute(sql`delete from location_cleanup_reservations where id=${id}::uuid`);
    for(const id of sessions)await clerk.sessions.revokeSession(id);
    await db.execute(sql`delete from invite_rate_limits where user_id in (${a.userId}::uuid,${b.userId}::uuid) and operation in ('location-consent','location-snapshot')`);
  }
}
main().catch(()=>{console.error(JSON.stringify({durableService:"FAIL",phase:failedPhase??phase,detailsSuppressed:true}));process.exitCode=1;}).finally(()=>db.$client.end());
