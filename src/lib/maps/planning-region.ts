// Explicit founder-review region, not all Malaysia/worldwide.
export const PLANNING_REGION = { west:103.45, south:1.15, east:104.30, north:1.75 } as const;
export function inPlanningRegion(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= PLANNING_REGION.south && latitude <= PLANNING_REGION.north && longitude >= PLANNING_REGION.west && longitude <= PLANNING_REGION.east;
}
export const PLACE_REGION_FILTER = `countrycode:sg,my|rect:${PLANNING_REGION.west},${PLANNING_REGION.south},${PLANNING_REGION.east},${PLANNING_REGION.north}`;
/** Approximate, local-only area label; never a reverse-geocode disclosure. */
export function localOriginArea(latitude: number, longitude: number) {
  if(latitude>=1.325&&latitude<=1.36&&longitude>=103.77&&longitude<=103.81)return "Bukit Timah area · approximate";
  return "Current location · only you";
}
