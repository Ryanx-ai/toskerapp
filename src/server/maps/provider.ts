import "server-only";
import { eq, sql } from "drizzle-orm";
import type { PlaceCandidate } from "@/lib/trip-contract";
import type { ToskerDatabase } from "@/server/db/client";
import { mapProviderUsage } from "@/server/db/schema";
import { projectGeoapifyPlace as project } from "@/lib/maps/place-projection";
import { credibleNearby } from "@/lib/maps/nearby-place";
import { rankPlaceCandidates } from "@/lib/maps/place-search";
import { projectBroadArea } from "@/lib/maps/area-label";

export class PlaceProviderError extends Error {
  constructor(readonly code: "rate" | "unavailable", message: string) { super(message); }
}
export type PlaceProvider = { search(query: string, signal: AbortSignal): Promise<PlaceCandidate[]>; reverse(latitude: number, longitude: number, signal: AbortSignal): Promise<(PlaceCandidate & { nearby?: PlaceCandidate[] }) | null>; area(latitude:number,longitude:number,signal:AbortSignal):Promise<string|null> };

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

function geoapifyProvider(): PlaceProvider {
  async function rawRequest(kind: "autocomplete" | "reverse", params: Record<string, string>, signal: AbortSignal):Promise<Record<string,unknown>[]> {
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
      return raw;
    } catch (error) {
      if (error instanceof PlaceProviderError) throw error;
      throw new PlaceProviderError("unavailable", "Place lookup could not finish. Check your connection and try again.");
    }
  }
  async function request(kind: "autocomplete" | "reverse", params: Record<string, string>, signal: AbortSignal) {
    try {
      const raw=await rawRequest(kind,params,signal);
      const projected: (PlaceCandidate & { nearby?: PlaceCandidate[] })[]=raw.map(value=>project(value)).filter((p):p is PlaceCandidate=>!!p);
      if(kind==="reverse"&&projected[0]){
        const nearby=raw.filter(value=>{const p=project(value);return p&&p.attribution===projected[0].attribution&&p.license===projected[0].license&&credibleNearby(value,{latitude:Number(params.lat),longitude:Number(params.lon)});});
        const names=[...new Set(nearby.map(value=>bounded(value.name,80)))].slice(0,3);
        // Context stays attached to the exact manual coordinate; no POI conversion.
        if(names.length)projected[0]={...projected[0],address:`Near ${names.join(" / ")} · ${projected[0].address}`.slice(0,400)};
        // Explicit alternatives, each with its own verified provenance and identity.
        // The manual candidate stays at the clicked point; nothing auto-selects these.
        const seen=new Set<string>();
        projected[0].nearby=raw.filter(value=>credibleNearby(value,{latitude:Number(params.lat),longitude:Number(params.lon)})).map(project).filter((p):p is PlaceCandidate=>{
          if(!p?.providerId||seen.has(p.providerId))return false;seen.add(p.providerId);return true;
        }).slice(0,3);
      }
      return projected;
    } catch (error) {
      if (error instanceof PlaceProviderError) throw error;
      // Never propagate request URLs/response bodies/SDK errors or log raw queries.
      throw new PlaceProviderError("unavailable", "Place lookup could not finish. Check your connection and try again.");
    }
  }
  return {
    search: async (query, signal) => rankPlaceCandidates(await request("autocomplete", { text: query, limit: "5", bias: "countrycode:none" }, signal),query),
    reverse: async (latitude, longitude, signal) => (await request("reverse", { lat: String(latitude), lon: String(longitude), limit: "5" }, signal))[0] ?? null,
    area: async (latitude,longitude,signal) => {
      // Explicit consent upstream; broad lookup minimizes precision sent to the provider.
      const values=await rawRequest("reverse",{lat:latitude.toFixed(2),lon:longitude.toFixed(2),type:"city",limit:"1"},signal);
      return values.map(projectBroadArea).find(Boolean)??null;
    },
  };
}
/** Replace here for a later provider evaluation; Room/card services remain vendor-neutral. */
export function getPlaceProvider(): PlaceProvider { return geoapifyProvider(); }
