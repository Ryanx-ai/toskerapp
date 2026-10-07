import "server-only";
import { eq, sql } from "drizzle-orm";
import type { PlaceCandidate } from "@/lib/trip-contract";
import type { ToskerDatabase } from "@/server/db/client";
import { mapProviderUsage } from "@/server/db/schema";
import { inPlanningRegion, PLACE_REGION_FILTER } from "@/lib/maps/planning-region";
import { credibleNearby } from "@/lib/maps/nearby-place";
import { rankPlaceCandidates } from "@/lib/maps/place-search";

export class PlaceProviderError extends Error {
  constructor(readonly code: "rate" | "unavailable", message: string) { super(message); }
}
export type PlaceProvider = { search(query: string, signal: AbortSignal): Promise<PlaceCandidate[]>; reverse(latitude: number, longitude: number, signal: AbortSignal): Promise<PlaceCandidate | null> };

/** Separate server geocoding sub-budget leaves headroom for browser basemap tiles.
 * Counters are global across instances, not a per-process approximation. */
export async function reservePlaceRequest(db: ToskerDatabase, userId: string) {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('tosker-ms73-geocoding-budget', 0))`);
    const now = new Date();
    const windows = [
      { scope: "geoapify:day", window: now.toISOString().slice(0, 10), limit: 120, gap: 1100 },
      { scope: `geoapify:actor:${userId}`, window: now.toISOString().slice(0, 16), limit: 12, gap: 1100 },
    ];
    for (const bucket of windows) {
      const [old] = await tx.select().from(mapProviderUsage).where(eq(mapProviderUsage.scope, bucket.scope));
      const used = old?.window === bucket.window ? old.used : 0;
      if (used >= bucket.limit || (old && now.getTime() - old.lastAt.getTime() < bucket.gap)) throw new PlaceProviderError("rate", "Place lookup is paused to stay within the Development allowance. Wait before trying again; saved places are still available.");
      await tx.insert(mapProviderUsage).values({ scope: bucket.scope, window: bucket.window, used: used + 1, lastAt: now }).onConflictDoUpdate({ target: mapProviderUsage.scope, set: { window: bucket.window, used: used + 1, lastAt: now } });
    }
  });
}

const bounded = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, max) : "";
function project(value: Record<string, unknown>): PlaceCandidate | null {
  if (!["sg","my"].includes(String(value.country_code)) || typeof value.lat !== "number" || typeof value.lon !== "number" || !inPlanningRegion(value.lat,value.lon)) return null;
  const source = value.datasource as Record<string, unknown> | undefined;
  // Preserve the actual source/license, including OpenAddresses; never assume OSM.
  const attribution = bounded(source?.attribution || source?.sourcename, 450), license = bounded(source?.license, 120);
  if (!attribution || !license) return null; // Unknown storage provenance is not silently saved.
  return { title: bounded(value.name || value.address_line1 || value.formatted, 120), address: bounded(value.formatted, 400), latitude: value.lat, longitude: value.lon, source: "search", provider: "geoapify", providerId: bounded(value.place_id, 1024) || null, attribution: `Geoapify · ${attribution}`, license };
}

function geoapifyProvider(): PlaceProvider {
  async function request(kind: "autocomplete" | "reverse", params: Record<string, string>, signal: AbortSignal) {
    const key = process.env.GEOAPIFY_SEARCH_KEY;
    if (!key) throw new PlaceProviderError("unavailable", "Place lookup is not configured. Saved trip places remain available.");
    const url = new URL(`https://api.geoapify.com/v1/geocode/${kind}`);
    url.search = new URLSearchParams({ ...params, format: "json", lang: "en", apiKey: key }).toString();
    try {
      const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]), cache: "no-store", redirect: "error" });
      if (response.status === 429) throw new PlaceProviderError("rate", "Place lookup allowance reached. Try later; saved places are still available.");
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (!Array.isArray(result.results)) throw new Error();
      const raw:Record<string,unknown>[]=result.results.slice(0,5);
      const projected=raw.map(value=>project(value)).filter((p):p is PlaceCandidate=>!!p);
      if(kind==="reverse"&&projected[0]){
        const nearby=raw.filter(value=>{const p=project(value);return p&&p.attribution===projected[0].attribution&&p.license===projected[0].license&&credibleNearby(value,{latitude:Number(params.lat),longitude:Number(params.lon)});});
        const names=[...new Set(nearby.map(value=>bounded(value.name,80)))].slice(0,3);
        // Context stays attached to the exact manual coordinate; no POI conversion.
        if(names.length)projected[0]={...projected[0],address:`Near ${names.join(" / ")} · ${projected[0].address}`.slice(0,400)};
      }
      return projected;
    } catch (error) {
      if (error instanceof PlaceProviderError) throw error;
      // Never propagate request URLs/response bodies/SDK errors or log raw queries.
      throw new PlaceProviderError("unavailable", "Place lookup could not finish. Check your connection and try again.");
    }
  }
  return {
    search: async (query, signal) => rankPlaceCandidates(await request("autocomplete", { text: query, limit: "5", filter: PLACE_REGION_FILTER, bias: "proximity:103.8198,1.3521" }, signal),query),
    reverse: async (latitude, longitude, signal) => (await request("reverse", { lat: String(latitude), lon: String(longitude), limit: "5" }, signal))[0] ?? null,
  };
}
/** Replace here for a later provider evaluation; Room/card services remain vendor-neutral. */
export function getPlaceProvider(): PlaceProvider { return geoapifyProvider(); }
