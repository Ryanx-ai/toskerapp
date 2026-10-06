import assert from "node:assert/strict";
import {projectRoad} from "../src/server/maps/road-projection";
import {routeBounds,roadKey} from "../src/lib/maps/road-contract";
const points=[{id:"west",latitude:1.35,longitude:103.75},{id:"north",latitude:1.43,longitude:103.8},{id:"airport",latitude:1.36,longitude:103.99}];
const geometry={type:"MultiLineString",coordinates:[[[103.75,1.35],[103.7,1.41],[103.8,1.43]],[[103.8,1.43],[103.94,1.4],[103.99,1.36]]]};
const properties={distance:42000,distance_units:"meters",time:3600,legs:[{distance:14000,time:1200},{distance:28000,time:2400}]};
const response=(p:unknown)=>({features:[{geometry,properties:p}]});
const road=projectRoad(response(properties),points,"drive");
assert.deepEqual(road.estimate?.legs,[{fromId:"west",toId:"north",metres:14000,seconds:1200},{fromId:"north",toId:"airport",metres:28000,seconds:2400}]);
for(const legs of [[properties.legs[0]],[{distance:1,time:1},properties.legs[1]],[{distance:-14000,time:1200},properties.legs[1]],[{distance:14000,time:NaN},properties.legs[1]],[{distance:"14000",time:1200},properties.legs[1]]]){
  const projected=projectRoad(response({...properties,legs}),points,"walk");assert.equal(projected.estimate?.legs,undefined,"bad/missing legs are not inferred from totals");assert.equal(projected.estimate?.metres,42000);
}
assert.equal(projectRoad(response({...properties,time:NaN}),points,"drive").estimate,undefined);
assert.equal(projectRoad(response({...properties,distance_units:"miles"}),points,"drive").estimate,undefined);
assert.deepEqual(routeBounds(points,road,[{latitude:1.3,longitude:104.01}]),[[103.7,1.3],[104.01,1.43]],"extra saved Pins must not invalidate current route geometry fit");
assert.deepEqual(routeBounds(points,{...road,key:roadKey([...points].reverse(),"drive")}),[[103.75,1.35],[103.99,1.43]],"stale geometry excluded");
console.log("PASS exact leg identities/order/metric totals, malformed/negative/missing/mismatched/unknown-unit metrics omitted, fit includes current detours and extra Pins but no stale roads; no provider calls");
