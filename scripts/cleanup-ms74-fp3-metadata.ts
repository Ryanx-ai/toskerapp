/** Exact FP3 QA metadata only. No Room/content/founder cleanup. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { inviteRateLimits, locationShares, rooms, roomMemberships } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db=getDatabase(),apply=process.argv.includes("--apply"),operations=["location-consent","location-snapshot"];
async function main(){
  const fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8")),baseline=JSON.parse(readFileSync(".git/ms74-fp3/protected-baseline.json","utf8"));
  assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
  await db.transaction(async tx=>{
    await tx.execute(sql`set transaction isolation level serializable`);
    const actors=await resolveQaActors(tx),ids=[actors.a.userId,actors.b.userId];
    assert(!ids.includes(actors.founder.userId));
    const [room]=await tx.select().from(rooms).where(eq(rooms.id,fixture.roomId));assert(room&&room.slug===fixture.slug&&room.ownerId===actors.a.userId);
    assert((await tx.select().from(roomMemberships).where(eq(roomMemberships.roomId,room.id))).some(r=>r.userId===actors.founder.userId));
    assert(!baseline.data.invite_rate_limits.some((r:{user_id:string;operation:string})=>ids.includes(r.user_id)&&operations.includes(r.operation)),"Never remove pre-existing rate metadata");
    const predicate=and(inArray(inviteRateLimits.userId,ids),inArray(inviteRateLimits.operation,operations));
    const rates=await tx.select().from(inviteRateLimits).where(predicate);
    assert(rates.every(r=>r.windowStart.getTime()>=Date.parse(baseline.at)));
    const leases=await tx.select().from(locationShares).where(inArray(locationShares.userId,ids));
    assert(leases.every(r=>r.conversationId===fixture.conversationId&&r.createdAt.getTime()>=Date.parse(baseline.at)&&r.expiresAt.getTime()<Date.now()),"Only expired exact-fixture FP3 QA consent may be removed");
    if(apply){
      writeFileSync(`.git/ms74-fp3/metadata-before-cleanup-${Date.now()}.json`,JSON.stringify({rates,leases}),{mode:0o600,flag:"wx"});
      if(rates.length)await tx.delete(inviteRateLimits).where(predicate);
      if(leases.length)await tx.delete(locationShares).where(inArray(locationShares.id,leases.map(r=>r.id)));
    }
    console.log(JSON.stringify({pass:true,apply,rateRows:rates.length,expiredConsentRows:leases.length,retainedRooms:3,founderUntouched:true,backupBeforeDelete:apply}));
  });
}
main().catch(e=>{console.error(JSON.stringify({pass:false,kind:e.name,detail:e instanceof assert.AssertionError?e.message.split("\n")[0]:"Private details suppressed"}));process.exitCode=1;}).finally(()=>db.$client.end());
