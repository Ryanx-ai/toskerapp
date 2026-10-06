import "server-only";
import { roadKey, type RoadGeometry, type RoadMode, type RoadPoint } from "@/lib/maps/road-contract";

const metric=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"?v as Record<string,unknown>:{};
/** Whitelist provider fields. Detailed response/URLs never leave this adapter or persist. */
export function projectRoad(raw:unknown,points:RoadPoint[],mode:RoadMode):RoadGeometry {
  const features=object(raw).features, feature=object(Array.isArray(features)?features[0]:null), geometry=object(feature.geometry);
  const segments=geometry.type==="MultiLineString"?geometry.coordinates:geometry.type==="LineString"&&points.length===2?[geometry.coordinates]:null;
  if(!Array.isArray(segments)||segments.length!==points.length-1)throw new Error("Invalid road legs");
  let count=0;
  for(const segment of segments){
    if(!Array.isArray(segment)||segment.length<2)throw new Error("Invalid road segment");
    for(const point of segment){
      // All approved waypoints are Singapore-only: reject bad projection/outlier geometry.
      if(!Array.isArray(point)||!Number.isFinite(point[0])||!Number.isFinite(point[1])||point[0]<103.5||point[0]>104.2||point[1]<1.1||point[1]>1.6)throw new Error("Invalid Singapore road coordinate");
      if(++count>30000)throw new Error("Road geometry too large");
    }
  }
  const result:RoadGeometry={key:roadKey(points,mode),mode,segments:segments.map(s=>s.map((p:number[])=>[p[0],p[1]])),attribution:"Geoapify · © OpenStreetMap contributors (ODbL)"};
  const props=object(feature.properties);
  if(metric(props.distance)&&metric(props.time)&&props.distance<=500000&&props.time<=604800&&props.distance_units==="meters"){
    const names=new Map<string,{name:string;metres:number;index:number}>();let index=0;
    if(Array.isArray(props.legs))for(const leg of props.legs.slice(0,7)){
      const steps=object(leg).steps;
      if(Array.isArray(steps))for(const step of steps.slice(0,3000)){
        const s=object(step),name=typeof s.name==="string"?s.name.replace(/[\u0000-\u001f]/g," ").split(",")[0].trim().slice(0,100):"";
        if(name&&metric(s.distance)&&s.distance>0&&s.distance<=props.distance){const old=names.get(name);names.set(name,{name,metres:(old?.metres??0)+s.distance,index:old?.index??index++});}
      }
    }
    // Major named segments, then restore route order. No inferred road names or instructions.
    const guidance=[...names.values()].filter(s=>s.metres>=100&&s.metres<=Number(props.distance)).sort((a,b)=>b.metres-a.metres).slice(0,4).sort((a,b)=>a.index-b.index).map(({name,metres})=>({name,metres}));
    result.estimate={metres:props.distance,seconds:props.time,guidance};
    // Each provider leg must correspond to one adjacent pair in the exact saved
    // waypoint order. Never infer per-leg time from distance or split a total.
    if (Array.isArray(props.legs) && props.legs.length === points.length - 1) {
      const legs = props.legs.map(object);
      if (legs.every(leg => metric(leg.distance) && metric(leg.time) && leg.distance <= 500000 && leg.time <= 604800)) {
        const distance = legs.reduce((sum, leg) => sum + Number(leg.distance), 0), time = legs.reduce((sum, leg) => sum + Number(leg.time), 0);
        // Small provider rounding tolerance only; reject internally inconsistent metrics.
        if (Math.abs(distance - props.distance) <= legs.length && Math.abs(time - props.time) <= legs.length) {
          result.estimate.legs = legs.map((leg, index) => ({ fromId: points[index].id, toId: points[index + 1].id, metres: Number(leg.distance), seconds: Number(leg.time) }));
        }
      }
    }
  }
  return result;
}
