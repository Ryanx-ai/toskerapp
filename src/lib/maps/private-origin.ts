import { inPlanningRegion } from "./planning-region";
import type { RoadPoint } from "./road-contract";
export const ORIGIN_CONSENT = "geoapify-current-origin-v1";
export const PRIVATE_ORIGIN_ID = "private-origin";
export function privateOriginPoint(input: unknown): RoadPoint | null {
  if (!input || typeof input !== "object") return null;
  const value=input as Record<string,unknown>;
  if(value.consent!==ORIGIN_CONSENT || typeof value.latitude!=="number" || typeof value.longitude!=="number" || !inPlanningRegion(value.latitude,value.longitude))return null;
  return {id:PRIVATE_ORIGIN_ID,latitude:value.latitude,longitude:value.longitude};
}
