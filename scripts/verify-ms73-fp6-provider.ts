/** Deliberate bounded real-provider cases. Existing counters are never reset/raised. */
import assert from "node:assert/strict";
import {eq} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
import {mapProviderUsage} from "../src/server/db/schema";
import {resolveQaActors} from "./lib/ms73-fixtures";
import {getRoadProvider,reserveRoadRequest} from "../src/server/maps/road-provider";
import {getPlaceProvider,reservePlaceRequest,PlaceProviderError} from "../src/server/maps/provider";
import {roadKey,routeBounds,type RoadMode} from "../src/lib/maps/road-contract";
import {normalizedPlaceQuery} from "../src/lib/maps/place-search";
const db=getDatabase();
const p=(id:string,latitude:number,longitude:number)=>({id,latitude,longitude});
const bt=p("bukit-timah",1.3424,103.7763),mbs=p("mbs",1.2837,103.8607),jewel=p("jewel",1.3602,103.9898),west=p("jurong",1.333,103.742),north=p("woodlands",1.436,103.786),jb=p("johor-bahru",1.461,103.763),manual=p("manual-checkpoint",1.286,103.854);
const cases:Record<string,{points:ReturnType<typeof p>[];mode:RoadMode}>={"bt-mbs":{points:[bt,mbs],mode:"drive"},"bt-jewel":{points:[bt,jewel],mode:"drive"},"west-changi":{points:[west,jewel],mode:"drive"},"north-changi":{points:[north,jewel],mode:"drive"},"sg-jb":{points:[mbs,jb],mode:"drive"},"three-drive":{points:[west,north,jewel],mode:"drive"},"short-walk":{points:[manual,mbs],mode:"walk"},"manual-poi":{points:[manual,mbs],mode:"drive"},"reordered-poi":{points:[jewel,mbs,bt],mode:"drive"},"moved-checkpoint":{points:[{...manual,latitude:1.289},mbs],mode:"drive"}};
async function main(){
  const {a}=await resolveQaActors(db),mode=process.argv[2];
  const [usage]=await db.select().from(mapProviderUsage).where(eq(mapProviderUsage.scope,"geoapify:roads:day"));
  const used=usage?.window===new Date().toISOString().slice(0,10)?usage.used:0;
  console.log({utcDay:new Date().toISOString().slice(0,10),reservedRoadCredits:used,dailyAppLimit:60});
  if(mode==="--budget")return;
  if(mode==="--search"){
    for(const query of["MBS","JB","Bukit Timah","Jewel Changi"]){
      await reservePlaceRequest(db,a.userId);const results=await getPlaceProvider().search(normalizedPlaceQuery(query),new AbortController().signal);
      console.log({search:query,results:results.map(p=>({name:p.title,address:p.address,source:p.provider,license:p.license})),explicitSelectionRequired:true});
      await new Promise(r=>setTimeout(r,1500));
    }return;
  }
  assert.equal(mode,"--road");const name=process.argv[3],c=cases[name];assert(c,"Explicit named case required");
  const cost=2*(c.points.length-1);if(used+cost>60){console.log({gate:"BLOCKED existing road allowance",case:name,requiredCredits:cost});process.exitCode=3;return;}
  await reserveRoadRequest(db,a.userId,c.points.length);
  const road=await getRoadProvider().route(c.points,c.mode,new AbortController().signal);
  assert.equal(road.key,roadKey(c.points,c.mode));assert.equal(road.segments.length,c.points.length-1);assert.equal(road.estimate?.legs?.length,c.points.length-1);assert(routeBounds(c.points,road));
  console.log({case:name,mode:c.mode,geometry:"validated regional geometry",points:road.segments.reduce((n,s)=>n+s.length,0),metres:road.estimate?.metres,seconds:road.estimate?.seconds,legs:road.estimate?.legs,fit:"includes current detours",creditsReserved:cost,trafficBorderTollAccuracyClaim:false});
}
main().catch(e=>{console.error({failure:"FP6 provider case",kind:e?.name,message:e instanceof PlaceProviderError?e.message:e instanceof assert.AssertionError?e.message.split("\n")[0]:"Details suppressed"});process.exitCode=1;}).finally(()=>db.$client.end());
