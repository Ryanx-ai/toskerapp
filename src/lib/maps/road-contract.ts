import { inPlanningRegion } from "./planning-region";
export type RoadMode = "drive" | "walk";
export type RoadPoint = { id: string; latitude: number; longitude: number };
export type RoadLegEstimate = { fromId: string; toId: string; metres: number; seconds: number };
export type RoadGeometry = { key: string; mode: RoadMode; segments: number[][][]; attribution: string; estimate?: { metres: number; seconds: number; guidance: { name: string; metres: number }[]; legs?: RoadLegEstimate[] } };
export const roadKey = (places: RoadPoint[], mode: RoadMode) => JSON.stringify([mode, ...places.map(p => [p.id,p.latitude,p.longitude])]);
export const supportedRoadPoints = (places: RoadPoint[]) => places.length >= 2 && places.length <= 8 && places.every(p => inPlanningRegion(p.latitude,p.longitude));

export const roadDistance = (metres: number) => metres < 1000 ? `${Math.round(metres)} m` : `${(metres/1000).toFixed(1)} km`;
export const roadDuration = (seconds: number) => { const minutes=Math.max(1,Math.ceil(seconds/60)); return minutes<60 ? `~${minutes} min` : `~${Math.floor(minutes/60)} h ${minutes%60} min`; };

/** Camera includes the selected route's current road detours, never stale/ghost geometry. */
export function routeBounds(places: RoadPoint[], road?: RoadGeometry, extra: Pick<RoadPoint,"latitude"|"longitude">[] = []): [[number,number],[number,number]] | null {
  if (!places.length && !extra.length) return null;
  const points=[...places,...extra].map(p=>[p.longitude,p.latitude]);
  if(road && road.key===roadKey(places,road.mode))points.push(...road.segments.flat());
  let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
  for(const [lon,lat] of points){if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)return null;west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);}
  return [[west,south],[east,north]];
}
