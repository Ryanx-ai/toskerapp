import type { TripPlace } from "@/lib/trip-contract";

// Bounded regional shorthand, not a place database. Never invent coordinates or
// replace canonical result names. Expand whole queries only to avoid collisions.
const aliases: Record<string, string> = { mbs: "Marina Bay Sands", jb: "Johor Bahru" };
export const normalizedPlaceQuery = (query: string) => {
  const text = query.normalize("NFKC").trim().replace(/\s+/g, " ");
  return aliases[text.toLowerCase()] ?? text;
};
export const canSearchPlaces = (query: string) => normalizedPlaceQuery(query).length >= 3;
export function contextPlaceSuggestions(places: TripPlace[], query: string) {
  const typed = query.trim().toLocaleLowerCase(), normalized = normalizedPlaceQuery(query).toLocaleLowerCase();
  if (typed.length < 2) return [];
  const seen = new Set<string>();
  return [...places].reverse().filter(place => {
    if (place.archived || !`${place.title} ${place.address}`.toLocaleLowerCase().includes(normalized)) return false;
    const key = `${place.providerId ?? ""}:${place.latitude}:${place.longitude}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 5);
}
