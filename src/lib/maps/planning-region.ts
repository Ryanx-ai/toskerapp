// Validated road-routing region only; worldwide discovery must not use this gate.
export const PLANNING_REGION = { west:103.45, south:1.15, east:104.30, north:1.75 } as const;
export function inPlanningRegion(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= PLANNING_REGION.south && latitude <= PLANNING_REGION.north && longitude >= PLANNING_REGION.west && longitude <= PLANNING_REGION.east;
}
/** Approximate, local-only area label; never a reverse-geocode disclosure. */
export function localOriginArea() {
  // A coordinate rectangle is not an administrative area. Never guess a label.
  return "Current location";
}
