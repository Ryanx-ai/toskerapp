import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectGeoapifyPlace, validWorldPoint } from "../src/lib/maps/place-projection";
import { planningSegments, mapCoordinate, MERCATOR_LATITUDE } from "../src/lib/maps/world-geometry";
import { routeBounds, supportedRoadPoints } from "../src/lib/maps/road-contract";
import { getPlaceProvider } from "../src/server/maps/provider";
const source = {attribution:"OpenStreetMap",license:"ODbL"};
const candidates = [
  {name:"Tokyo",country_code:"jp",lat:35.6762,lon:139.6503},
  {name:"Kuala Lumpur",country_code:"my",lat:3.139,lon:101.6869},
  {name:"London",country_code:"gb",lat:51.5074,lon:-.1278},
  {name:"New York",country_code:"us",lat:40.7128,lon:-74.006},
  {name:"Sydney",country_code:"au",lat:-33.8688,lon:151.2093},
].map((p,i)=>({...p,formatted:`${p.name} test`,place_id:`synthetic-${i}`,datasource:source}));
for(const item of candidates) { const p=projectGeoapifyPlace(item); assert(p); assert.equal(p.providerId,item.place_id); assert.equal(p.latitude,item.lat); }
for(const patch of [{lat:NaN},{lat:91},{lon:181},{lon:Infinity},{lat:"35"},{datasource:{}},{place_id:""},{name:"",formatted:""}]) assert.equal(projectGeoapifyPlace({...candidates[0],...patch}),null);
assert(!validWorldPoint(null,0)); assert(validWorldPoint(-90,180));
assert(supportedRoadPoints([{id:"a",latitude:1.3,longitude:103.8},{id:"b",latitude:1.4,longitude:103.9}]));
assert(!supportedRoadPoints(candidates.slice(0,2).map((p,i)=>({id:String(i),latitude:p.lat,longitude:p.lon}))));
assert.deepEqual(planningSegments([179,10],[-179,12]),[[[179,10],[180,11]],[[-180,11],[-179,12]]]);
assert.deepEqual(planningSegments([-179,12],[179,10]),[[[-179,12],[-180,11]],[[180,11],[179,10]]]);
assert.deepEqual(planningSegments([10,20],[12,30]),[[[10,20],[12,30]]]);
assert.deepEqual(mapCoordinate(10,90),[10,MERCATOR_LATITUDE]);
assert.deepEqual(routeBounds([{id:"pole",latitude:-90,longitude:10}]),[[10,-MERCATOR_LATITUDE],[10,-MERCATOR_LATITUDE]]);
assert.equal(routeBounds([{id:"bad",latitude:NaN,longitude:10}]),null);
const savedFetch=globalThis.fetch, savedKey=process.env.GEOAPIFY_SEARCH_KEY;
async function main(){
  let calls=0;
  process.env.GEOAPIFY_SEARCH_KEY="synthetic-test-key";
  globalThis.fetch=async input=>{
    const url=new URL(String(input)); calls++;
    assert.equal(url.hostname,"api.geoapify.com"); assert.equal(url.searchParams.get("bias"),"countrycode:none"); assert(!url.searchParams.has("filter"));
    assert(!url.searchParams.has("lat")&&!url.searchParams.has("lon"));
    return Response.json({results:candidates});
  };
  assert.equal((await getPlaceProvider().search("Tokyo",new AbortController().signal)).length,5); assert.equal(calls,1);
  const source=readFileSync("src/components/trip-map-canvas.tsx","utf8"); assert.match(source,/minZoom: 0/); assert.match(source,/planningSegments/);
  assert.doesNotMatch(readFileSync("src/server/maps/provider.ts","utf8"),/inPlanningRegion|PLACE_REGION_FILTER/);
  console.log("PASS worldwide projection, stable identity/license, no automatic GPS bias, invalid coordinates, regional road guard, date-line split and polar camera; mocked provider only");
}
main().catch(()=>{console.error("FP3 Map contract check failed; payload suppressed");process.exitCode=1;}).finally(()=>{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.GEOAPIFY_SEARCH_KEY;else process.env.GEOAPIFY_SEARCH_KEY=savedKey;});
