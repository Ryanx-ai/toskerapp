/** Explicit, owned synthetic fixture; never mutates the retained Founder Review Room. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, tripPlans, tripPlaces, tripRoutes, tripRoutePlaces } from "../src/server/db/schema";
import { readTrip, mutateTrip, TripError } from "../src/server/trips/service";
import { grantRoomMembership, withdrawRoomMember } from "../src/server/rooms/lifecycle";
import { cleanupQaFixture, createQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";
const db = getDatabase(), receipt = process.env.MS73_STRESS_RECEIPT ?? "docs/MS7-3-STRESS-FIXTURE.json";
async function main() {
  const { a,b,founder } = await resolveQaActors(db);
  if (process.argv[2] === "--create") {
    assert(!existsSync(receipt), "An existing stress receipt must be inspected, not replaced.");
    const fixture = await createQaFixture(db, "200 synthetic places, responsive and live revocation proof");
    console.log("Ownership receipt (retain for explicit dry-run cleanup):", JSON.stringify(fixture));
    await db.transaction(async tx => {
      const [room] = await tx.select().from(rooms).where(eq(rooms.id, fixture.id)).for("update");
      assert(room.ownerId === a.userId && room.slug === fixture.slug);
      const [plan] = await tx.insert(tripPlans).values({ roomId: fixture.id, revision: 1 }).returning();
      const [route] = await tx.insert(tripRoutes).values({ planId: plan.id, name: "200-place QA", color: "sage" }).returning();
      const places = Array.from({ length: 200 }, (_,i) => ({ id: randomUUID(), planId: plan.id, title: `QA ${String(i+1).padStart(3,"0")} — synthetic planning point`, note: i === 199 ? "Long safe QA note: " + "planning example ".repeat(45) : "Synthetic QA only, not a real venue", latitude: 1.30+Math.floor(i/20)*.001, longitude: 103.82+(i%20)*.001, source: "pin" }));
      await tx.insert(tripPlaces).values(places);
      await tx.insert(tripRoutePlaces).values(places.map((p,position) => ({ planId: plan.id, routeId: route.id, placeId: p.id, position })));
    });
    const begin = performance.now(), snapshot = await readTrip(db,a,fixture.slug);
    assert.equal(snapshot.places.length,200); assert.equal(snapshot.memberships.length,200);
    assert.deepEqual(await readTrip(db,founder,fixture.slug),snapshot);
    const routeId=snapshot.routes[0].id;
    await mutateTrip(db,b,{ roomSlug:fixture.slug,expectedRevision:1,requestId:randomUUID(),command:{type:"order",routeId,placeIds:snapshot.memberships.sort((a,b)=>b.position-a.position).map(m=>m.placeId)} });
    await assert.rejects(()=>mutateTrip(db,a,{ roomSlug:fixture.slug,expectedRevision:2,requestId:randomUUID(),command:{type:"add",routeId,candidate:{title:"Overflow QA",latitude:1.4,longitude:103.9,source:"pin",address:"",provider:null,providerId:null,attribution:"",license:""}} }),error=>error instanceof TripError && error.code==="limit");
    console.log(JSON.stringify({places:200,founderVisible:true,sharedReorder:true,overflowDenied:true,readReorderChecksMs:Math.round(performance.now()-begin),providerRequests:0}));
    return;
  }
  const fixture = JSON.parse(readFileSync(receipt,"utf8")) as QaFixture;
  console.log(await cleanupQaFixture(db,fixture)); // Exact ownership before any operation.
  if(process.argv[2]==="--cleanup-apply") console.log(await cleanupQaFixture(db,fixture,true));
  else if(process.argv[2]==="--withdraw-b") { await withdrawRoomMember(db,a,fixture.id,b.userId); console.log("B withdrawn from owned stress fixture; founder stable."); }
  else if(process.argv[2]==="--restore-b") { await db.transaction(async tx=>{const [room]=await tx.select().from(rooms).where(eq(rooms.id,fixture.id)).for("update");assert(room.slug===fixture.slug&&room.ownerId===a.userId);await grantRoomMembership(tx,b,room);});console.log("B restored to owned stress fixture; founder stable."); }
  else assert.equal(process.argv[2],"--cleanup-dry-run");
}
main().catch(error=>{console.error(error instanceof assert.AssertionError ? error.message : "Stress proof failed; inspect only the owned receipt. Sensitive details suppressed.");process.exitCode=1;}).finally(()=>db.$client.end());
