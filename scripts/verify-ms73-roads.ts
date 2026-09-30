import assert from "node:assert/strict";
import { getRoadProvider } from "../src/server/maps/road-provider";
import { PlaceProviderError } from "../src/server/maps/provider";
import { roadKey, supportedRoadPoints } from "../src/lib/maps/road-contract";
const points = [{id:"a",latitude:1.2837,longitude:103.8607},{id:"b",latitude:1.2868,longitude:103.8545},{id:"c",latitude:1.2903,longitude:103.8519}];
const original = globalThis.fetch, key = process.env.GEOAPIFY_SEARCH_KEY;
async function main(){
  assert(key);assert(supportedRoadPoints(points));assert(!supportedRoadPoints(points.slice(0,1)));assert(!supportedRoadPoints(Array.from({length:9},()=>points[0])));assert(!supportedRoadPoints([{...points[0],latitude:0},points[1]]));
  assert.notEqual(roadKey(points,"walk"),roadKey([...points].reverse(),"walk"));assert.notEqual(roadKey(points,"walk"),roadKey(points,"drive"));
  const segments=[[[103.8607,1.2837],[103.8545,1.2868]],[[103.8545,1.2868],[103.8519,1.2903]]];
  globalThis.fetch=async(input,init)=>{const url=new URL(String(input));assert.equal(url.origin,"https://api.geoapify.com");assert.equal(url.searchParams.get("apiKey"),key);assert.equal(init?.redirect,"error");assert.equal(init?.cache,"no-store");return Response.json({features:[{geometry:{type:"MultiLineString",coordinates:segments},properties:{unnecessary:"must not leave adapter"}}]});};
  const geometry=await getRoadProvider().route(points,"walk",new AbortController().signal);assert.deepEqual(geometry.segments,segments);assert.equal(geometry.key,roadKey(points,"walk"));assert(!JSON.stringify(geometry).includes(key!));assert(!JSON.stringify(geometry).includes("unnecessary"));
  for(const value of [{features:[]},{features:[{geometry:{type:"MultiLineString",coordinates:[segments[0]]}}]},{features:[{geometry:{type:"MultiLineString",coordinates:[[[999,1],[2,3]],segments[1]]}}]}]){globalThis.fetch=async()=>Response.json(value);await assert.rejects(()=>getRoadProvider().route(points,"walk",new AbortController().signal),e=>e instanceof PlaceProviderError&&e.code==="unavailable");}
  globalThis.fetch=async()=>new Response(null,{status:429});await assert.rejects(()=>getRoadProvider().route(points,"walk",new AbortController().signal),e=>e instanceof PlaceProviderError&&e.code==="rate");
  globalThis.fetch=async()=>{throw new Error("provider transport details must stay private");};await assert.rejects(()=>getRoadProvider().route(points,"walk",new AbortController().signal),e=>e instanceof PlaceProviderError&&!e.message.includes("transport details"));
  console.log("PASS road bounds/mode/order identity, subset projection, malformed legs/coordinates, rate/error sanitization; zero provider requests");
}
main().finally(()=>{globalThis.fetch=original;}).catch(()=>{console.error("Road contract test failed; sensitive details suppressed");process.exitCode=1;});
