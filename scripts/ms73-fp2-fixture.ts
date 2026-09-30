import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, roomMemberships } from "../src/server/db/schema";
import { readTrip, readTripComments, mutateTrip } from "../src/server/trips/service";
import { publishTripChanged } from "../src/server/realtime/provider";
import { cleanupQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";
const db=getDatabase();
async function main(){
  if(process.argv[2]==="--prime-review-comments") {
    const {a,b,founder}=await resolveQaActors(db);
    const f=JSON.parse(readFileSync("docs/MS7-3-QA-FIXTURES.json","utf8")).retained[0] as QaFixture;
    const [room]=await db.select().from(rooms).where(eq(rooms.id,f.id));
    assert(f.retained&&room&&room.slug===f.slug&&room.name===f.name&&room.ownerId===a.userId&&room.createdAt.toISOString()===f.createdAt,"Exact retained review ownership required");
    for(const actor of [a,b,founder]) assert.equal((await db.select().from(roomMemberships).where(and(eq(roomMemberships.roomId,f.id),eq(roomMemberships.userId,actor.userId)))).length,1);
    const before=await readTrip(db,a,f.slug),place=before.places.find(p=>p.title==="Marina Bay Sands");assert(place&&!place.archived);
    assert((place.commentCount??0)<=2,"Existing discussion: do not seed over retained comments");
    const texts=["FP2 QA — A: Meet by the entrance after we confirm the plan. This is a safe demonstration comment, not a booking.","FP2 QA — B: I can see A’s note here. Place names stay canonical; our planning context belongs in comments."];
    for(const [i,actor] of [a,b].entries()) {
      const comments=await readTripComments(db,actor,f.slug,place.id);
      if(comments.comments.some(c=>c.body===texts[i]&&c.authorId===actor.userId))continue;
      assert(comments.comments.every(c=>texts.includes(c.body)),"Retained non-QA discussion: stop priming");
      await mutateTrip(db,actor,{roomSlug:f.slug,expectedRevision:(await readTrip(db,actor,f.slug)).revision,requestId:randomUUID(),command:{type:"comment",placeId:place.id,body:texts[i]}});
    }
    const after=await readTrip(db,founder,f.slug);
    assert.deepEqual(after.routes,before.routes);assert.deepEqual(after.memberships,before.memberships);
    assert.deepEqual(after.places.map(p=>({...p,commentCount:0})),before.places.map(p=>({...p,commentCount:0})));
    assert.equal((await readTripComments(db,founder,f.slug,place.id)).comments.length,2);
    await publishTripChanged(f.conversationId);
    console.log("PASS exact-owned Founder Review primed with two safe A/B comments; founder can read; existing places/routes/content unchanged");return;
  }
  assert(["--inspect","--cleanup-apply"].includes(process.argv[2]));
  const receipt=JSON.parse(readFileSync("docs/MS7-3-FP2-BROWSER-FIXTURE.json","utf8")) as QaFixture;
  assert.equal(receipt.purpose,"FP2 comments/retry/revocation/Nuke + browser acceptance");
  console.log(await cleanupQaFixture(db,receipt,process.argv[2]==="--cleanup-apply"));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:"Sanitized fixture inspection failure; retain and inspect");process.exitCode=1;}).finally(()=>db.$client.end());
