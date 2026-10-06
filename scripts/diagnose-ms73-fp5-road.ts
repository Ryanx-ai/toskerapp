/** One explicitly budgeted, shadow-owned QA route diagnostic. Never prints provider bodies or URLs. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {sql} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
import {resolveQaActors} from "./lib/ms73-fixtures";
import {readTrip} from "../src/server/trips/service";
import {routingPlaces} from "../src/lib/trip-contract";
import {getRoadProvider,reserveRoadRequest} from "../src/server/maps/road-provider";
const db=getDatabase();
async function main(){
  const {schema}=JSON.parse(readFileSync(".git/fp5-recovery/browser-schema.json","utf8"));
  assert(/^fp5_rehearsal_[a-f0-9]{32}$/.test(schema));
  assert.equal((await db.execute(sql`select current_schema() as name`)).rows[0].name,schema);
  const {fixture}=JSON.parse(readFileSync(".git/fp5-recovery/browser-fixture.json","utf8")),{a}=await resolveQaActors(db);
  const snapshot=await readTrip(db,a,fixture.slug),route=snapshot.routes.find(r=>r.name==="FP5 cross-island QA");assert(route);
  const points=routingPlaces(snapshot,route.id);assert.equal(points.length,3);
  const mode=process.argv[2];assert(mode==="walk"||mode==="drive");
  const original=globalThis.fetch;
  globalThis.fetch=async(...args)=>{
    const response=await original(...args);
    if(!response.ok){
      const body=(await response.clone().text()).toLowerCase();
      let parsed:Record<string,unknown>={};try{parsed=JSON.parse(body);}catch{}
      console.log(JSON.stringify({status:response.status,contentType:response.headers.get("content-type"),length:body.length,fields:Object.keys(parsed).filter(k=>/^[a-z_]{1,30}$/.test(k)),numericCode:typeof parsed.code==="number"?parsed.code:null,noRoute:/route.*(not found|could not|cannot|unable)|no.*route/.test(body),distanceLimit:/distance|length|too long|maximum/.test(body),badParameter:/parameter|invalid|validation|must be/.test(body),keyRestriction:/key|access|permission|forbidden/.test(body),waypointFailure:/waypoint|point|location|edge/.test(body),routingFailure:/routing|path|costing|correlat|travers/.test(body),badRequest:/bad request/.test(body)}));
    }
    return response;
  };
  await reserveRoadRequest(db,a.userId,points.length);
  const road=await getRoadProvider().route(points,mode,new AbortController().signal);
  console.log(JSON.stringify({mode,segments:road.segments.map(s=>s.length),estimate:road.estimate}));
}
main().catch(()=>{console.error("Diagnostic route unavailable; see sanitized status flags only.");process.exitCode=1;}).finally(()=>db.$client.end());
