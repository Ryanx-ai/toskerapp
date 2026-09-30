export type RoadMode = "drive" | "walk";
export type RoadPoint = { id: string; latitude: number; longitude: number };
export type RoadGeometry = { key: string; mode: RoadMode; segments: number[][][]; attribution: string };
export const roadKey = (places: RoadPoint[], mode: RoadMode) => JSON.stringify([mode, ...places.map(p => [p.id,p.latitude,p.longitude])]);
export const supportedRoadPoints = (places: RoadPoint[]) => places.length >= 2 && places.length <= 8 && places.every(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && p.latitude >= 1.20 && p.latitude <= 1.48 && p.longitude >= 103.6 && p.longitude <= 104.05);
