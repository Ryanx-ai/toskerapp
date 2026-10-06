/** Exact-owned fixture membership changes only; founder membership is never altered. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms } from "../src/server/db/schema";
import { cleanupQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";
import { grantRoomMembership, withdrawRoomMember } from "../src/server/rooms/lifecycle";
import { publishUserActivity } from "../src/server/realtime/provider";
const db=getDatabase();
async function main(){
  const mode=process.argv[2]; assert(["--remove-b","--restore-b"].includes(mode));
  const {fixture}=JSON.parse(readFileSync(".git/fp4b-recovery/browser-fixture.json","utf8")) as {fixture:QaFixture};
  await cleanupQaFixture(db,fixture,false);
  const {a,b}=await resolveQaActors(db);
  if(mode==="--remove-b")await withdrawRoomMember(db,a,fixture.id,b.userId);
  else await db.transaction(async tx=>{
    const [room]=await tx.select().from(rooms).where(eq(rooms.id,fixture.id)).for("update");
    assert(room?.slug===fixture.slug&&room.ownerId===a.userId);
    await grantRoomMembership(tx,b,room);
  });
  await publishUserActivity(b.userId);
  console.log({mode,room:fixture.slug,founderUntouched:true});
}
main().catch(()=>{console.error("STOP: exact-owned FP4B access check failed; details suppressed");process.exitCode=1;}).finally(()=>db.$client.end());
