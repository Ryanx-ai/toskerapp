/** FP6 rollback-only service/contract tests; no provider calls or retained fixtures. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { conversations, subrooms, conversationParticipants } from "../src/server/db/schema";
import { createQaFixture, resolveQaActors } from "./lib/ms73-fixtures";
import { mutateTrip, readTrip } from "../src/server/trips/service";
import { normalizedPlaceQuery, canSearchPlaces, contextPlaceSuggestions, rankPlaceCandidates } from "../src/lib/maps/place-search";
const db = getDatabase(), rollback = new Error("FP6 rollback");
async function main() {
  assert.equal(normalizedPlaceQuery(" mBs "), "Marina Bay Sands");
  assert.equal(normalizedPlaceQuery("ＪＢ"), "Johor Bahru");
  assert.equal(normalizedPlaceQuery("MBS clinic"), "MBS clinic");
  assert.equal(normalizedPlaceQuery("JB Hi-Fi"), "JB Hi-Fi");
  assert(canSearchPlaces("JB")); assert(!canSearchPlaces("M"));
  assert.equal(rankPlaceCandidates([{title:"Everest Jewellery"},{title:"Jewel Changi Airport"},{title:"Apple Jewel Changi"}],"Jewel Changi")[0].title,"Jewel Changi Airport");
  try { await db.transaction(async tx => {
    const d = tx as unknown as ToskerDatabase, {a,b,founder} = await resolveQaActors(tx);
    const fixture = await createQaFixture(d, "FP6 atomic first-add rollback regression");
    const [sandbox] = await tx.select().from(conversations).where(and(eq(conversations.kind,"sandbox"), eq(conversations.ownerId,a.userId)));
    const [personal]=await tx.select().from(conversations).where(and(eq(conversations.kind,"personal"),eq(conversations.directKey,[a.userId,b.userId].sort().join(":"))));assert(personal);
    const [sub]=await tx.insert(subrooms).values({roomId:fixture.id,name:"FP6 rollback shared subroom",createdBy:a.userId,visibility:"everyone"}).returning();
    const [chat]=await tx.insert(conversations).values({kind:"room",roomId:fixture.id,subroomId:sub.id,title:sub.name}).returning();
    await tx.insert(conversationParticipants).values([a,b,founder].map(actor=>({conversationId:chat.id,userId:actor.userId})));
    const scopes = [fixture.slug, `sandbox--${sandbox.id}`,`personal--${personal.id}`,`${fixture.slug}--${sub.id}`];
    for (const scope of scopes) {
      assert.equal((await readTrip(d,a,scope)).routes.length,0,"Do not use retained QA planning for empty-state test");
      const candidate = {title:"Marina Bay Sands", source:"search" as const, provider:"qa", providerId:"fp6-qa-mbs", latitude:1.2837, longitude:103.8607, address:"Synthetic QA Singapore", attribution:"QA", license:"QA"};
      const input = {roomSlug:scope, expectedRevision:(await readTrip(d,a,scope)).revision, requestId:randomUUID(), command:{type:"add" as const, candidate, routeId:null}};
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
      if(scope.startsWith(fixture.slug))assert.deepEqual(await readTrip(d,b,scope),await readTrip(d,founder,scope));
      else if(scope.startsWith("sandbox--"))await assert.rejects(()=>readTrip(d,b,scope));
      else {assert.deepEqual(await readTrip(d,b,scope),state);await assert.rejects(()=>readTrip(d,founder,scope));}
      const commands=[{type:"rename-checkpoint",placeId:manual.resultId!,title:"QA rename"},{type:"place-icon",placeId:manual.resultId!,icon:"home"},{type:"move-checkpoint",placeId:manual.resultId!,latitude:1.291,longitude:103.86},{type:"skip-place",placeId:manual.resultId!,skipped:true},{type:"comment",placeId:manual.resultId!,body:"Rollback-only QA"},{type:"lock-position",routeId:state.routes[0].id,position:0,locked:true},{type:"order",routeId:state.routes[0].id,placeIds:state.places.map(p=>p.id)},{type:"nuke-place",placeId:randomUUID()}];
      for(const command of commands){
        // Every mutation must reject forged scope before inspecting the command.
        await assert.rejects(()=>mutateTrip(d,a,{...input,roomSlug:`missing-${randomUUID()}`,requestId:randomUUID(),expectedRevision:state.revision,command:command as Parameters<typeof mutateTrip>[2]["command"]}));
      }
    }
    throw rollback;
  }); } catch(e) { if(e!==rollback)throw e; }
  console.log("PASS FP6 aliases/context; atomic Route1+add/replay/conflict/POI protection/manual rename; Sandbox/accepted Personal/Room/Subroom and forged mutation scopes; all writes rolled back");
}
main().catch(e=>{console.error({failure:"FP6 regression",kind:e?.name,assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined});process.exitCode=1;}).finally(()=>db.$client.end());
