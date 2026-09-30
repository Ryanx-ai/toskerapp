import assert from "node:assert/strict";
import { getDatabase } from "../src/server/db/client";
import { getRoadProvider, reserveRoadRequest } from "../src/server/maps/road-provider";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { PlaceProviderError } from "../src/server/maps/provider";
const db=getDatabase();
async function main(){
  assert.equal(process.argv[2],"--bounded-one-request");
  const {a}=await resolveQaActors(db);
  const points=[{id:"qa-mbs",latitude:1.2837,longitude:103.8607},{id:"qa-merlion",latitude:1.2868,longitude:103.8545},{id:"qa-national-gallery",latitude:1.2903,longitude:103.8519}];
  await reserveRoadRequest(db,a.userId,points.length);
  const road=await getRoadProvider().route(points,"walk",new AbortController().signal);
  assert.equal(road.segments.length,2);assert(road.segments.every(s=>s.length>2));
  console.log(JSON.stringify({smoke:"PASS",cases:"Marina Bay Sands → Merlion → National Gallery",mode:road.mode,segments:road.segments.length,geometryPoints:road.segments.reduce((n,s)=>n+s.length,0),reservedCredits:4,baseCredits:2,attribution:road.attribution,credentialsPrinted:false,stored:false}));
}
main().catch(e=>{console.error(e instanceof PlaceProviderError?e.message:e instanceof assert.AssertionError?e.message:"Sanitized routing smoke failure");process.exitCode=1;}).finally(()=>db.$client.end());
