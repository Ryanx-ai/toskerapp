/** Existing owned isolated Room only. All membership mutations roll back. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {and,eq,sql} from "drizzle-orm";
import {getDatabase,type ToskerDatabase} from "../src/server/db/client";
import type {AuthenticatedActor} from "../src/server/auth/actor";
import {AuthorizationDeniedError,requireRoomOwner} from "../src/server/auth/authorize";
import {roomMemberships,conversations} from "../src/server/db/schema";
import {readTrip,mutateTrip} from "../src/server/trips/service";
import {readPins} from "../src/server/map-pins/service";
import {readMessageHistory} from "../src/server/conversations/history";
import {hallScope} from "../src/server/hall/service";
import {updateRoom} from "../src/server/rooms/lifecycle";
import {locationCapacityVerified} from "../src/server/location-sharing/capacity";
import {REVIEW_HOST,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
assert.equal(new URL(process.env.DATABASE_URL!).hostname,REVIEW_HOST);assert.equal(process.env.NEON_PROJECT_ID,REVIEW_PROJECT);
const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));assert.equal(fixture.project,REVIEW_PROJECT);assert.equal(fixture.status,"committed");
const db=getDatabase(),rollback=new Error("isolated boundary rollback"),evidence={pass:false,checks:[] as string[],membershipPreserved:false,sharingEnabled:false};
const actor=(userId:string):AuthenticatedActor=>({userId,authProvider:"qa-server-test",authSubject:"isolated-service-test"});
const a=actor(fixture.qaUserIds[0]),b=actor(fixture.qaUserIds[1]),f=actor(fixture.founderId);
async function run(){
 const founder=await db.execute(sql`select id from users where tid='8V3X7P1' limit 2`);assert.equal(founder.rows.length,1);assert.equal(founder.rows[0].id,f.userId);
 const owned=await db.execute(sql`select id from rooms where id=${fixture.roomId}::uuid and slug=${fixture.slug} and owner_id=${a.userId}::uuid and created_at=${fixture.createdAt}::timestamptz`);assert.equal(owned.rows.length,1);
 const before=await db.select().from(roomMemberships).where(eq(roomMemberships.roomId,fixture.roomId));assert.equal(before.length,3);
 await assert.rejects(()=>db.transaction(async tx=>{
  const test=tx as unknown as ToskerDatabase;
  await requireRoomOwner(tx,a,fixture.roomId);await assert.rejects(()=>requireRoomOwner(tx,b,fixture.roomId),AuthorizationDeniedError);await assert.rejects(()=>requireRoomOwner(tx,f,fixture.roomId),AuthorizationDeniedError);
  await assert.rejects(()=>updateRoom(test,b,{roomId:fixture.roomId,name:"Forbidden QA edit",tags:[]}),AuthorizationDeniedError);
  for(const who of [a,b,f]){await readTrip(test,who,fixture.slug);await readPins(test,who,fixture.slug);await hallScope(tx,who,fixture.conversationId);await readMessageHistory(test,who,fixture.conversationId);}
  evidence.checks.push("Exact-TID founder is an ordinary explicit member, not owner; A owner/B member/founder read permitted; B management rejected");
  for(const who of [a,f])await readTrip(test,who,`${fixture.slug}--${fixture.selectedId}`);
  await assert.rejects(()=>readTrip(test,b,`${fixture.slug}--${fixture.selectedId}`),AuthorizationDeniedError);
  await assert.rejects(()=>readPins(test,b,`${fixture.slug}--${fixture.selectedId}`),AuthorizationDeniedError);
  await assert.rejects(()=>hallScope(tx,b,fixture.selectedChatId),AuthorizationDeniedError);
  await assert.rejects(()=>readMessageHistory(test,b,fixture.selectedChatId),AuthorizationDeniedError);
  evidence.checks.push("Selected Subroom Map/Pins/Board/Chat reject unauthorized B; founder explicit access retained");
  const [sandbox]=await tx.select().from(conversations).where(and(eq(conversations.kind,"sandbox"),eq(conversations.ownerId,a.userId)));assert(sandbox);
  await readTrip(test,a,`sandbox--${sandbox.id}`);await assert.rejects(()=>readTrip(test,b,`sandbox--${sandbox.id}`),AuthorizationDeniedError);await assert.rejects(()=>readPins(test,b,`sandbox--${sandbox.id}`),AuthorizationDeniedError);
  const [personal]=await tx.select().from(conversations).where(and(eq(conversations.kind,"personal"),eq(conversations.directKey,[a.userId,b.userId].sort().join(":"))));assert(personal,"Existing isolated A/B Personal pair required");
  await readTrip(test,a,`personal--${personal.id}`);await readTrip(test,b,`personal--${personal.id}`);await assert.rejects(()=>readTrip(test,f,`personal--${personal.id}`),AuthorizationDeniedError);await assert.rejects(()=>readMessageHistory(test,f,personal.id),AuthorizationDeniedError);
  evidence.checks.push("Sandbox owner-only and exact accepted Personal pair; founder cannot access unrelated Personal context");
  await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId,fixture.roomId),eq(roomMemberships.userId,b.userId)));
  for(const call of [()=>readTrip(test,b,fixture.slug),()=>readPins(test,b,fixture.slug),()=>hallScope(tx,b,fixture.conversationId),()=>readMessageHistory(test,b,fixture.conversationId),()=>mutateTrip(test,b,{roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:0,command:{type:"create-route",name:"Forbidden",color:"gold"}})])await assert.rejects(call,AuthorizationDeniedError);
  await readTrip(test,f,fixture.slug);
  evidence.checks.push("Removed B denied Map/Pins/Board/Chat/mutation despite stale participant records; founder membership stable");
  throw rollback;
 }),error=>error===rollback);
 const after=await db.select().from(roomMemberships).where(eq(roomMemberships.roomId,fixture.roomId));assert.deepEqual(after.sort((x,y)=>x.userId.localeCompare(y.userId)),before.sort((x,y)=>x.userId.localeCompare(y.userId)));evidence.membershipPreserved=true;
 assert(!locationCapacityVerified());assert(!process.env.TOSKER_LOCATION_DURABLE_ENABLED);evidence.checks.push("Expired/absent capacity remains fail-closed; no sharing enabled or provider calls");evidence.pass=true;
}
run().catch(error=>{console.error(JSON.stringify({pass:false,kind:error instanceof assert.AssertionError?"assertion":error.name,code:error?.cause?.code??error?.code??null}));process.exitCode=1;}).finally(async()=>{const path=`.git/ms74-fp4/boundaries-${Date.now()}.json`;writeFileSync(path,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,receipt:path}));await db.$client.end();});
