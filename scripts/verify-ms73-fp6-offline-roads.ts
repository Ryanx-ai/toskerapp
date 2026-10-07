/** Deterministic adapter/projection tests. fetch is replaced; zero external requests or budget writes. */
import assert from "node:assert/strict";
import {getRoadProvider} from "../src/server/maps/road-provider";
import {projectRoad} from "../src/server/maps/road-projection";
import {PlaceProviderError} from "../src/server/maps/provider";
import {roadKey} from "../src/lib/maps/road-contract";
const points=[{id:"sg",latitude:1.2837,longitude:103.8607},{id:"north",latitude:1.436,longitude:103.786},{id:"jb",latitude:1.461,longitude:103.763}];
const segments=points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]);
const properties={distance:30000,time:3000,distance_units:"meters",legs:[{distance:25000,time:2400},{distance:5000,time:600}]};
const raw=(coords:unknown=segments,props:unknown=properties)=>({features:[{geometry:{type:"MultiLineString",coordinates:coords},properties:props}]});
const original=globalThis.fetch;
async function main(){
  for(const mode of["drive","walk"] as const){globalThis.fetch=async()=>Response.json(raw());const r=await getRoadProvider().route(points,mode,new AbortController().signal);assert.equal(r.key,roadKey(points,mode));assert.equal(r.estimate?.legs?.[1].toId,"jb");}
  for(const status of[400,404,429,500,503]){globalThis.fetch=async()=>new Response(null,{status});await assert.rejects(()=>getRoadProvider().route(points,"drive",new AbortController().signal),e=>e instanceof PlaceProviderError&&e.code===(status===429?"rate":"unavailable"));}
  for(const name of["TimeoutError","AbortError"]){globalThis.fetch=async()=>{throw new DOMException("sensitive transport context",name);};await assert.rejects(()=>getRoadProvider().route(points,"drive",new AbortController().signal),e=>e instanceof PlaceProviderError&&!e.message.includes("sensitive"));}
  for(const value of[{features:[]},raw([segments[0]]),raw([[[999,0],[103.786,1.436]],segments[1]]),raw([[...segments[1]].reverse(),[...segments[0]].reverse()])])assert.throws(()=>projectRoad(value,points,"drive"));
  for(const legs of[[{distance:-1,time:2400},properties.legs[1]],[{distance:25000,time:"bad"},properties.legs[1]],[{distance:1,time:1},properties.legs[1]]]){const r=projectRoad(raw(segments,{...properties,legs}),points,"drive");assert.equal(r.estimate?.metres,30000);assert.equal(r.estimate?.legs,undefined);}
  assert.equal(projectRoad(raw(segments,{...properties,time:NaN}),points,"drive").estimate,undefined);
  console.log("PASS deterministic Drive/Walk/SG-JB, 400/404/429/5xx/timeout/cancel/no-route, malformed geometry/order/metrics and inconsistent totals; zero real provider requests");
}
main().catch(e=>{console.error({failure:"FP6 offline roads",message:e instanceof assert.AssertionError?e.message.split("\n")[0]:"Details suppressed"});process.exitCode=1;}).finally(()=>{globalThis.fetch=original;});
