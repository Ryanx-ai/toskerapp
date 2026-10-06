import assert from "node:assert/strict";
import { routeLegPresentation } from "../src/lib/maps/route-presentation";
import { roadKey } from "../src/lib/maps/road-contract";
import type { TripPlace } from "../src/lib/trip-contract";
const points: TripPlace[] = [0,1,2,3].map(n=>({id:String(n),title:`QA ${n}`,note:"",latitude:1.28+n*.001,longitude:103.85+n*.001,source:"pin",provider:null,providerId:null,address:"",attribution:"",license:"",archived:false}));
const leg=(i:number,selected:string|null,ghost=false)=>routeLegPresentation(points,i,selected,ghost,false,"walk");
assert.equal(leg(0,"0")?.opacity,.95);assert.equal(leg(1,"0")?.opacity,.25);
assert.equal(leg(0,"1")?.opacity,.95);assert.equal(leg(1,"1")?.opacity,.95);assert.equal(leg(2,"1")?.opacity,.25);
assert.equal(leg(2,"3")?.opacity,.95);assert.equal(leg(2,null)?.opacity,.95);assert.equal(leg(1,"1",true)?.opacity,.3);
// FP5 supersedes prefix emphasis: only the edges touching the selected point.
assert.equal(leg(0,"2")?.opacity,.25);assert.equal(leg(1,"2")?.opacity,.95);assert.equal(leg(2,"2")?.opacity,.95);
assert.equal(leg(0,"3")?.opacity,.25);assert.equal(leg(1,"3")?.opacity,.25);
assert.equal(routeLegPresentation(points,0,null,false,true,"walk"),null);
const road={key:roadKey(points,"walk"),mode:"walk" as const,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"QA"};
assert(routeLegPresentation(points,0,null,false,true,"walk",road));
assert.equal(routeLegPresentation([...points].reverse(),0,null,false,true,"walk",road),null);
assert.equal(routeLegPresentation(points,0,null,false,true,"drive",road),null);
console.log("PASS FP5 adjacent-only start/middle/end selection and deselect, ghost distinction, no fake roads on missing/stale/mode change; zero provider requests");
