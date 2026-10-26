/** Bounded synthetic content in the exact retained isolated FP4 fixture. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {sql} from "drizzle-orm";
import {getDatabase,type ToskerDatabase} from "../src/server/db/client";
import {readTrip,mutateTrip} from "../src/server/trips/service";
import type {TripCommand} from "../src/lib/trip-contract";
import {REVIEW_HOST,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
assert.equal(process.argv[2],"--seed-owned");
assert.equal(new URL(process.env.DATABASE_URL!).hostname,REVIEW_HOST);assert.equal(process.env.NEON_PROJECT_ID,REVIEW_PROJECT);
const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8")),path=".git/ms74-fp4/review-content.json";
assert.equal(fixture.status,"committed");assert(!existsSync(path),"Recover existing content receipt, never seed twice");
const record={status:"prepared",project:REVIEW_PROJECT,roomId:fixture.roomId,slug:fixture.slug,at:new Date().toISOString(),routes:[] as string[],places:[] as string[],retained:true};
writeFileSync(path,JSON.stringify(record,null,2),{flag:"wx",mode:0o600});
const db=getDatabase();
async function run(){await db.transaction(async tx=>{
 const founder=await tx.execute(sql`select u.id from users u join room_memberships m on m.user_id=u.id where u.tid='8V3X7P1' and m.room_id=${fixture.roomId}::uuid`);assert.equal(founder.rows.length,1);assert.equal(founder.rows[0].id,fixture.founderId);
 const owner=await tx.execute(sql`select u.id,u.auth_provider,u.auth_subject from users u join profiles p on p.user_id=u.id join rooms r on r.owner_id=u.id where p.username='tosker-user-a-clerk-test' and r.id=${fixture.roomId}::uuid and r.slug=${fixture.slug} and r.created_at=${fixture.createdAt}::timestamptz`);assert.equal(owner.rows.length,1);assert.equal(owner.rows[0].id,fixture.ownerId);
 const actor={userId:String(owner.rows[0].id),authProvider:String(owner.rows[0].auth_provider),authSubject:String(owner.rows[0].auth_subject)},testDb=tx as unknown as ToskerDatabase;
 assert.equal((await readTrip(testDb,actor,fixture.slug)).revision,0,"Fresh owned Room only");
 const change=async(command:TripCommand)=>mutateTrip(testDb,actor,{roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:(await readTrip(testDb,actor,fixture.slug)).revision,command});
 for(const [name,color] of [["Marina QA","gold"],["Day 2 QA","rose"],["Transfers QA","sky"]] as const)record.routes.push((await change({type:"create-route",name,color})).resultId!);
 for(let i=0;i<4;i++)record.places.push((await change({type:"add",routeId:record.routes[0],candidate:{title:`FP4 synthetic point ${i+1}`,latitude:1.2834+i*.001,longitude:103.8607+i*.001,source:"pin",provider:null,providerId:null,address:"Synthetic QA — not a verified venue",attribution:"",license:""}})).resultId!);
 await change({type:"comment",placeId:record.places[1],body:"FP4 synthetic comment: retained when this card moves."});
 await change({type:"star-place",placeId:record.places[1],starred:true});
 await change({type:"edit-place",placeId:record.places[1],title:"FP4 synthetic point 2",note:"Synthetic review content only. No live location."});
 const snapshot=await readTrip(testDb,actor,fixture.slug);assert.equal(snapshot.places.length,4);assert.equal(snapshot.routes.length,3);
});record.status="committed";writeFileSync(path,JSON.stringify(record,null,2),{mode:0o600});console.log(JSON.stringify({pass:true,isolated:true,routes:3,places:4,founderMember:true,retained:true}));}
run().catch(()=>{console.error("STOP: isolated content setup failed; inspect prepared receipt, no automatic retry");process.exitCode=1;}).finally(()=>db.$client.end());
