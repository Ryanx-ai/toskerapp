import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { conversations, locationShares, roomMemberships, rooms } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { locationService } from "../src/server/location-sharing/service";
import { retireLocationLease } from "../src/server/location-sharing/lifecycle";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
import { LOCATION_TTL, validLocationSnapshot, type LocationSnapshot } from "../src/lib/shared-location-contract";

const db=getDatabase();let step="ownership";
async function main(){
  const actors=await resolveQaActors(db),fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
  assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
  const [room]=await db.select().from(rooms).where(eq(rooms.id,fixture.roomId));
  assert(room&&room.ownerId===actors.a.userId&&room.slug===fixture.slug&&room.createdAt.toISOString()===fixture.createdAt);
  const members=await db.select().from(roomMemberships).where(eq(roomMemberships.roomId,room.id));
  assert(members.some(r=>r.userId===actors.founder.userId));
  const rollback=new Error("rollback synthetic sharing QA");
  await assert.rejects(()=>db.transaction(async tx=>{
    await tx.execute(sql`set local statement_timeout='30s'`);
    const delivered:{recipient:string;snapshot:LocationSnapshot}[]=[],retired:string[]=[];
    let lookups=0,sessionActive=true;
    const service=locationService(tx as unknown as ToskerDatabase,{
      session:async(actor,id)=>{assert.equal(id,`qa-${actor.userId}`);if(!sessionActive)throw new AuthorizationDeniedError();},
      area:async()=>{lookups++;return {label:"Singapore Central",source:"ura"};},
      publish:async(recipient,snapshot)=>{delivered.push({recipient,snapshot});},
      retire:async(transaction,userId,ids)=>retireLocationLease(transaction,userId,ids,async row=>{retired.push(row.id);}),
      retirement:async row=>{retired.push(row.id);},
    });
    const session=`qa-${actors.a.userId}`,point={latitude:1.2834,longitude:103.8607,accuracy:50}; // synthetic public landmark, never device position
    step="explicit consent / default broad";
    const broad=await service.begin(actors.a,session,fixture.conversationId,"area");
    assert.equal(broad.audienceCount,2);assert(broad.expiresAt<=Date.now()+LOCATION_TTL);assert.equal(delivered.length,0);
    const sent=await service.send(actors.a,session,broad.id,point,new AbortController().signal);
    assert(validLocationSnapshot(sent));assert.equal(sent.point,undefined);assert.equal(delivered.length,2);
    assert.deepEqual(delivered.map(d=>d.recipient).sort(),[actors.b.userId,actors.founder.userId].sort());
    assert.equal((await service.validate(actors.b,`qa-${actors.b.userId}`,broad.id,fixture.conversationId)).precision,"area");
    step="forgery / no Sandbox / context leakage";
    await assert.rejects(()=>service.send(actors.b,`qa-${actors.b.userId}`,broad.id,point,new AbortController().signal),AuthorizationDeniedError);
    await assert.rejects(()=>service.begin(actors.b,`qa-${actors.b.userId}`,fixture.selectedChatId,"area"),AuthorizationDeniedError);
    await assert.rejects(()=>service.validate(actors.b,`qa-${actors.b.userId}`,broad.id,fixture.everyoneChatId),AuthorizationDeniedError);
    const [sandbox]=await tx.select().from(conversations).where(and(eq(conversations.kind,"sandbox"),eq(conversations.ownerId,actors.a.userId)));
    await assert.rejects(()=>service.begin(actors.a,session,sandbox.id,"area"),AuthorizationDeniedError);
    await assert.rejects(()=>service.begin(actors.a,session,randomUUID(),"area"),AuthorizationDeniedError);
    await assert.rejects(()=>service.send(actors.a,session,broad.id,{...point,extra:"forged"},new AbortController().signal),TypeError);
    assert.equal(lookups,1);
    step="Stop / old lease rejection / precise opt-in";
    await service.stop(actors.a,session,broad.id);assert(retired.includes(broad.id));
    await assert.rejects(()=>service.send(actors.a,session,broad.id,point,new AbortController().signal),AuthorizationDeniedError);
    const precise=await service.begin(actors.a,session,fixture.conversationId,"precise");
    const preciseSent=await service.send(actors.a,session,precise.id,point,new AbortController().signal);
    assert(validLocationSnapshot(preciseSent));assert.deepEqual(preciseSent.point,point);
    assert(!validLocationSnapshot({...preciseSent,precision:"area"}));
    assert(!validLocationSnapshot({...sent,expiresAt:Date.now()-1}));
    const refreshed=await service.send(actors.a,session,precise.id,point,new AbortController().signal);
    assert.equal(refreshed.expiresAt,precise.expiresAt);
    step="membership revoked with stale participant / no further delivery";
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId,room.id),eq(roomMemberships.userId,actors.b.userId)));
    await assert.rejects(()=>service.validate(actors.b,`qa-${actors.b.userId}`,precise.id,fixture.conversationId),AuthorizationDeniedError);
    delivered.length=0;await service.send(actors.a,session,precise.id,point,new AbortController().signal);
    assert.deepEqual(delivered.map(d=>d.recipient),[actors.founder.userId]);
    step="sender session loss";sessionActive=false;
    await assert.rejects(()=>service.send(actors.a,session,precise.id,point,new AbortController().signal),AuthorizationDeniedError);
    step="schema privacy";
    const [stored]=await tx.select().from(locationShares).where(eq(locationShares.userId,actors.a.userId));
    assert.deepEqual(Object.keys(stored).sort(),["conversationId","createdAt","expiresAt","id","precision","sessionId","userId"]);
    throw rollback;
  }),error=>error===rollback);
  assert.equal((await db.select().from(roomMemberships).where(eq(roomMemberships.roomId,room.id))).length,members.length);
  const result={pass:true,fixture:fixture.slug,syntheticOnly:true,rollback:true,externalPublishes:0,providerCalls:0,cases:["metadata-first consent","broad contains no point","precise explicit choice","exact audience","forged actor/lease/context denied","Sandbox denied","selected Subroom denied","Stop invalidation","refresh fixed expiry","stale member excluded","sender session loss","no persistent coordinates"]};
  writeFileSync(".git/ms74-fp3/sharing-service.json",JSON.stringify(result),{mode:0o600});console.log(JSON.stringify(result));
}
main().catch(error=>{console.error(JSON.stringify({pass:false,step,kind:error?.name,detail:error instanceof assert.AssertionError?error.message.split("\n")[0]:"Private details suppressed"}));process.exitCode=1;}).finally(()=>db.$client.end());
