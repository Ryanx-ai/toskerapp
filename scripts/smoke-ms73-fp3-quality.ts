import assert from "node:assert/strict";
import { getDatabase } from "../src/server/db/client";
import { getPlaceProvider,reservePlaceRequest } from "../src/server/maps/provider";
import { getRoadProvider,reserveRoadRequest } from "../src/server/maps/road-provider";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db=getDatabase();
async function main(){
  assert(["--two-public-searches","--two-public-roads"].includes(process.argv[2]));
  const {a}=await resolveQaActors(db);
  if(process.argv[2]==="--two-public-searches")for(const query of ["Marina Bay Sands, Singapore","East Coast Park, Singapore"]){
    await reservePlaceRequest(db,a.userId);
    const results=await getPlaceProvider().search(query,new AbortController().signal);
    console.log(JSON.stringify({publicQaQuery:query,results:results.map(p=>({title:p.title,address:p.address,latitude:p.latitude,longitude:p.longitude})),saved:false}));
    await new Promise(r=>setTimeout(r,1200));
  }else{
    // Explicit public test coordinates, not claimed provider-selected venues or corrected data.
    const points=[{id:"qa-west",latitude:1.3045,longitude:103.7739},{id:"qa-mbs",latitude:1.2846936,longitude:103.86073899722182},{id:"qa-east",latitude:1.305948,longitude:103.929666}];
    for(const mode of ["drive","walk"] as const){
      await reserveRoadRequest(db,a.userId,points.length);
      const road=await getRoadProvider().route(points,mode,new AbortController().signal);
      assert(road.segments.every(s=>s.length>2));assert(road.estimate);
      console.log(JSON.stringify({publicQaRoute:"West public test point → MBS → East Coast public test point",mode,segments:road.segments.length,points:road.segments.reduce((n,s)=>n+s.length,0),estimate:road.estimate,reservedCredits:4,stored:false}));
      await new Promise(r=>setTimeout(r,5200));
    }
  }
}
main().catch(()=>{console.error("Quality smoke failed; sensitive transport details suppressed");process.exitCode=1;}).finally(()=>db.$client.end());
