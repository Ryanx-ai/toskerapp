import "server-only";
import { eq, sql } from "drizzle-orm";
import type { ToskerDatabase } from "@/server/db/client";
import { mapProviderUsage } from "@/server/db/schema";
import { PlaceProviderError } from "./provider";
import { supportedRoadPoints, type RoadMode, type RoadPoint, type RoadGeometry } from "@/lib/maps/road-contract";
import { projectRoad } from "./road-projection";

export type RoadProvider = { route(points: RoadPoint[], mode: RoadMode, signal: AbortSignal): Promise<RoadGeometry> };
/** Conservative reservation: two credits per leg, 60/day, 3 explicit calculations/minute per actor. */
export async function reserveRoadRequest(db: ToskerDatabase, actorId: string, count: number) {
  if (count < 2 || count > 8) throw new PlaceProviderError("unavailable", "Route calculation supports 2–8 Singapore / southern Johor places.");
  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('tosker-ms73-geocoding-budget', 0))`);
    const now=new Date();
    for(const b of [{scope:"geoapify:roads:day",window:now.toISOString().slice(0,10),limit:60,cost:2*(count-1),gap:1500},{scope:`geoapify:roads:actor:${actorId}`,window:now.toISOString().slice(0,16),limit:3,cost:1,gap:5000}]){
      const [old]=await tx.select().from(mapProviderUsage).where(eq(mapProviderUsage.scope,b.scope));
      const used=old?.window===b.window ? old.used : 0;
      if(used+b.cost>b.limit || (old && now.getTime()-old.lastAt.getTime()<b.gap))throw new PlaceProviderError("rate","Route calculation paused within the Development allowance. Try later; your trip is unchanged.");
      await tx.insert(mapProviderUsage).values({scope:b.scope,window:b.window,used:used+b.cost,lastAt:now}).onConflictDoUpdate({target:mapProviderUsage.scope,set:{window:b.window,used:used+b.cost,lastAt:now}});
    }
  });
}

/** Replaceable adapter; no provider response bodies, request URLs or coordinates are logged. */
export function getRoadProvider():RoadProvider {
  return { async route(points,mode,signal) {
    if(!supportedRoadPoints(points) || !["drive","walk"].includes(mode))throw new PlaceProviderError("unavailable","Route calculation supports 2–8 Singapore / southern Johor places.");
    const key=process.env.GEOAPIFY_SEARCH_KEY;
    if(!key)throw new PlaceProviderError("unavailable","Route calculation is not configured.");
    const url=new URL("https://api.geoapify.com/v1/routing");
    url.search=new URLSearchParams({waypoints:points.map(p=>`${p.latitude},${p.longitude}`).join("|"),mode,format:"geojson",units:"metric",details:"route_details",apiKey:key}).toString();
    // Road names use the same response and existing two-credit/leg reservation.
    // No optimization, elevation, navigation execution or live traffic.
    try {
      const response=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(12000)]),cache:"no-store",redirect:"error"});
      if(response.status===429)throw new PlaceProviderError("rate","Route calculation allowance reached. Try later.");
      if(response.status===400||response.status===404)throw new PlaceProviderError("unavailable","The provider could not calculate this route. Check your points and travel mode, then retry. Saved places stay unchanged.");
      if(!response.ok)throw new Error();
      const raw=await response.text();if(raw.length>1_500_000)throw new Error();
      try { return projectRoad(JSON.parse(raw),points,mode); }
      catch { throw new PlaceProviderError("unavailable","The returned route could not be verified. Try another route or travel mode. Saved places stay unchanged."); }
    } catch(error){if(error instanceof PlaceProviderError)throw error;throw new PlaceProviderError("unavailable","Route calculation could not finish. Your saved places and order are unchanged.");}
  }};
}
