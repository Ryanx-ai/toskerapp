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
/** Prefer literal name matches within the bounded provider result set. Never invent a place. */
export function rankPlaceCandidates<T extends {title:string}>(candidates:T[],query:string):T[] {
  const normalize=(s:string)=>s.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
  const q=normalize(query),words=q.split(" ").filter(Boolean);
  const score=(title:string)=>{const name=normalize(title);return name===q?0:name.startsWith(q+" ")?1:words.every(w=>name.split(" ").includes(w))?2:3;};
  return candidates.map((candidate,index)=>({candidate,index,rank:score(candidate.title)})).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(p=>p.candidate);
}
