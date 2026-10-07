/** FP6 rollback-only service/contract tests; no provider calls or retained fixtures. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { conversations } from "../src/server/db/schema";
import { createQaFixture, resolveQaActors } from "./lib/ms73-fixtures";
import { mutateTrip, readTrip } from "../src/server/trips/service";
import { normalizedPlaceQuery, canSearchPlaces, contextPlaceSuggestions } from "../src/lib/maps/place-search";
const db = getDatabase(), rollback = new Error("FP6 rollback");
async function main() {
  assert.equal(normalizedPlaceQuery(" mBs "), "Marina Bay Sands");
  assert.equal(normalizedPlaceQuery("ＪＢ"), "Johor Bahru");
  assert.equal(normalizedPlaceQuery("MBS clinic"), "MBS clinic");
  assert.equal(normalizedPlaceQuery("JB Hi-Fi"), "JB Hi-Fi");
  assert(canSearchPlaces("JB")); assert(!canSearchPlaces("M"));
  try { await db.transaction(async tx => {
    const d = tx as unknown as ToskerDatabase, {a,b,founder} = await resolveQaActors(tx);
    const fixture = await createQaFixture(d, "FP6 atomic first-add rollback regression");
    const [sandbox] = await tx.select().from(conversations).where(and(eq(conversations.kind,"sandbox"), eq(conversations.ownerId,a.userId)));
    const scopes = [fixture.slug, `sandbox--${sandbox.id}`];
    for (const scope of scopes) {
      assert.equal((await readTrip(d,a,scope)).routes.length,0,"Do not use retained QA planning for empty-state test");
      const candidate = {title:"Marina Bay Sands", source:"search" as const, provider:"qa", providerId:"fp6-qa-mbs", latitude:1.2837, longitude:103.8607, address:"Synthetic QA Singapore", attribution:"QA", license:"QA"};
      const input = {roomSlug:scope, expectedRevision:0, requestId:randomUUID(), command:{type:"add" as const, candidate, routeId:null}};
      const added = await mutateTrip(d,a,input);
      assert((await mutateTrip(d,a,input)).replayed);
      let state = await readTrip(d,a,scope);
      assert.equal(state.routes.length,1); assert.equal(state.routes[0].name,"Route 1"); assert.equal(state.places.length,1);
      assert.equal(state.places[0].id,added.resultId);
      await assert.rejects(()=>mutateTrip(d,b,{...input,requestId:randomUUID()}));
      await assert.rejects(()=>mutateTrip(d,a,{...input,expectedRevision:state.revision,requestId:randomUUID()}));
      await assert.rejects(()=>mutateTrip(d,a,{...input,expectedRevision:state.revision,requestId:randomUUID(),command:{type:"rename-checkpoint",placeId:added.resultId!,title:"Fake POI"}}));
      const manual = await mutateTrip(d,a,{...input,expectedRevision:state.revision,requestId:randomUUID(),command:{type:"add",routeId:state.routes[0].id,candidate:{...candidate,source:"pin",provider:null,providerId:null,title:"Checkpoint",latitude:1.29}}});
      state=await readTrip(d,a,scope); assert.equal(state.places.find(p=>p.id===manual.resultId)?.title,"Checkpoint 1");
      await mutateTrip(d,a,{...input,expectedRevision:state.revision,requestId:randomUUID(),command:{type:"rename-checkpoint",placeId:manual.resultId!,title:"Silly home"}});
      state=await readTrip(d,a,scope); assert.equal(state.places.find(p=>p.id===manual.resultId)?.address,"Synthetic QA Singapore");
      const started=performance.now();
      for(let i=0;i<1000;i++)assert.equal(contextPlaceSuggestions(state.places,"MBS")[0]?.id,added.resultId);
      console.log(JSON.stringify({test:"local suggestions",iterations:1000,milliseconds:Math.round(performance.now()-started),contextOnly:true}));
      if(scope===fixture.slug)assert.deepEqual(await readTrip(d,b,scope),await readTrip(d,founder,scope));
      else await assert.rejects(()=>readTrip(d,b,scope));
    }
    throw rollback;
  }); } catch(e) { if(e!==rollback)throw e; }
  console.log("PASS FP6 aliases/collisions/context suggestions; atomic Route1+add/replay/conflict/POI protection/manual rename/Room+Sandbox auth; all writes rolled back");
}
main().catch(e=>{console.error({failure:"FP6 regression",kind:e?.name,assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined});process.exitCode=1;}).finally(()=>db.$client.end());
