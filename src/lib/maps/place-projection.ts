import type { PlaceCandidate } from "../trip-contract";

const bounded = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, max) : "";
export function validWorldPoint(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}
/** Discovery is worldwide. Routing eligibility is deliberately a separate policy. */
export function projectGeoapifyPlace(value: Record<string, unknown>): PlaceCandidate | null {
  if (!validWorldPoint(value.lat, value.lon)) return null;
  const source = value.datasource as Record<string, unknown> | undefined;
  const attribution = bounded(source?.attribution || source?.sourcename, 450), license = bounded(source?.license, 120);
  const title = bounded(value.name || value.address_line1 || value.formatted, 120);
  const providerId = bounded(value.place_id, 1024);
  // Never silently strip stable identity or invent storage provenance.
  if (!attribution || !license || !title || !providerId) return null;
  return { title, address: bounded(value.formatted, 400), latitude: value.lat, longitude: value.lon as number, source: "search", provider: "geoapify", providerId, attribution: `Geoapify · ${attribution}`, license };
}
