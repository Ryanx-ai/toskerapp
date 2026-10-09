import { requireCurrentActor } from "@/server/auth/clerk";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { getDatabase } from "@/server/db/client";
import { authorizePinScope } from "@/server/map-pins/scope";
import { getPlaceProvider, PlaceProviderError, reservePlaceRequest } from "@/server/maps/provider";
import { signCandidate } from "@/server/maps/candidate-token";
import type { PlaceCandidate } from "@/lib/trip-contract";
import { normalizedPlaceQuery, canSearchPlaces } from "@/lib/maps/place-search";
import { readTrip } from "@/server/trips/service";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Request origin unavailable." }, 403);
    const actor = await requireCurrentActor(), db = getDatabase(), { slug } = await context.params;
    await authorizePinScope(db, actor, slug);
    const body = await request.text(); if (body.length > 512) return reply({ error: "Lookup is too large." }, 400);
    const input = JSON.parse(body), provider = getPlaceProvider();
    let candidates: PlaceCandidate[] = [], nearby: PlaceCandidate[] = [], notice = "";
    if (input.kind === "context" && typeof input.placeId === "string") {
      const place = (await readTrip(db, actor, slug)).places.find(p => p.id === input.placeId && !p.archived);
      if (!place) return reply({ error: "This context location is no longer available." }, 404);
      candidates = [place];
    } else if (input.kind === "search" && typeof input.query === "string" && canSearchPlaces(input.query) && input.query.length <= 160) {
      await reservePlaceRequest(db, actor.userId);
      candidates = await provider.search(normalizedPlaceQuery(input.query), request.signal);
    } else if (input.kind === "pin" && Number.isFinite(input.latitude) && Number.isFinite(input.longitude) && Math.abs(input.latitude) <= 90 && Math.abs(input.longitude) <= 180) {
      // The point is selected manually, never device location. Reverse results are context ONLY.
      const candidate: PlaceCandidate = { title: "Checkpoint", latitude: input.latitude, longitude: input.longitude, source: "pin", provider: null, providerId: null, address: "", attribution: "", license: "" };
      try {
        await reservePlaceRequest(db, actor.userId);
        const context = await provider.reverse(input.latitude, input.longitude, request.signal);
        if (context) {
          nearby = context.nearby ?? [];
          candidate.address = context.address; candidate.attribution = context.attribution; candidate.license = context.license; candidate.provider = context.provider;
          // No providerId: a reverse polygon/nearby POI is NOT this exact manually placed pin.
          notice = "Nearby address context only. Your pin stays exactly where you placed it.";
        } else notice = "No nearby address found. You can confirm these coordinates.";
      } catch { notice = "Address lookup unavailable. You can still preview and confirm these coordinates."; }
      candidates = [candidate];
    } else return reply({ error: "Enter at least 3 characters or choose a valid map point." }, 400);
    await authorizePinScope(db, actor, slug); // Reauthorize every source context after external I/O.
    if (request.signal.aborted) return reply({ error: "Lookup cancelled." }, 408);
    return reply({ candidates: candidates.map(candidate => ({ candidate, token: signCandidate(candidate, actor.userId, slug) })), nearby: nearby.map(candidate => ({ candidate, token: signCandidate(candidate, actor.userId, slug) })), notice });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof AuthorizationDeniedError) return reply({ error: "Your Room access is no longer available." }, 403);
    if (error instanceof PlaceProviderError) return reply({ error: error.message }, error.code === "rate" ? 429 : 503);
    return reply({ error: "Place lookup is unavailable. Try again later." }, 503);
  }
}
