/** Add one explicit representative Pin from an existing licensed Review Card. Never edits that Card. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, roomMemberships } from "../src/server/db/schema";
import { resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";
import { readTrip,validateCandidate } from "../src/server/trips/service";
import { mutatePin,readPins,pinAudience } from "../src/server/map-pins/service";
import { publishTripChanged,publishUserActivity } from "../src/server/realtime/provider";
const db=getDatabase();
async function main(){
  assert(["--inspect","--apply"].includes(process.argv[2]));
  const {a,founder}=await resolveQaActors(db);
  const fixture=JSON.parse(readFileSync("docs/MS7-3-QA-FIXTURES.json","utf8")).retained[0] as QaFixture;
  const [room]=await db.select().from(rooms).where(eq(rooms.id,fixture.id));
  assert(fixture.retained&&room?.slug===fixture.slug&&room.name===fixture.name&&room.ownerId===fixture.ownerId&&room.createdAt.toISOString()===fixture.createdAt);
  assert.equal((await db.select().from(roomMemberships).where(and(eq(roomMemberships.roomId,room.id),eq(roomMemberships.userId,founder.userId)))).length,1);
  const trip=await readTrip(db,a,fixture.slug);
  const matches=trip.places.filter(p=>p.title==="Marina Bay Sands"&&p.provider&&p.providerId&&p.license&&p.attribution);
  assert(matches.length>0,"STOP: exact licensed representative Card missing");
  assert.equal(new Set(matches.map(p=>JSON.stringify(validateCandidate(p)))).size,1,"STOP: ambiguous named Card");
  if(process.argv[2]==="--apply"){
    await mutatePin(db,a,{scope:fixture.slug,requestId:"f74b0000-2026-4000-8000-000000000001",command:{type:"create",candidate:validateCandidate(matches[0]),state:"want-to-go"}});
    const audience=await pinAudience(db,a,fixture.slug);
    await Promise.all([publishTripChanged(audience.conversationId),...audience.userIds.map(id=>publishUserActivity(id))]);
  }
  const pins=await readPins(db,founder,fixture.slug);
  console.log({room:fixture.slug,founderUniqueAndMember:true,retained:true,pins:pins.pins.map(p=>({id:p.id,title:p.title,state:p.state})),routesUnchanged:true});
}
main().catch(()=>{console.error("STOP: Founder Review guard failed; no unsafe fallback; inspect assertions");process.exitCode=1;}).finally(()=>db.$client.end());
