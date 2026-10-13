import { auth } from "@clerk/nextjs/server";
import { requireCurrentActor } from "@/server/auth/clerk";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { getDatabase } from "@/server/db/client";
import { latestLocationService, LocationRevisionConflict } from "@/server/location-sharing/latest-service";
import { durableLocationService } from "@/server/location-sharing/durable-service";
import { locationCapacityVerified } from "@/server/location-sharing/capacity";
export const runtime = "nodejs";
export const maxDuration = 10;
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const hosted = process.env.VERCEL !== undefined;
  if (!hosted && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) return reply({ error: "Sharing unavailable." }, 503);
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Forbidden" }, 403);
  try {
    const actor = await requireCurrentActor(), { sessionId } = await auth();
    if (!sessionId) throw new AuthenticationRequiredError();
    const text = await request.text();
    if (text.length > 1000) throw new TypeError();
    const input = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError();
    const allowed: Record<string, string[]> = {
      begin: ["action", "conversationId", "precision", "consent"], send: ["action", "id", "point", "expectedRevision", "requestId"],
      stop: ["action", "id"], current: ["action", "conversationId"],
    };
    const keys = allowed[input.action];
    if (!keys || Object.keys(input).some(k => !keys.includes(k))) throw new TypeError();
    // Default remains closed on every deployment. Only an explicitly staged,
    // verified Production release may admit/read hosted snapshots. Stop stays
    // available even when the release/capacity gate is withdrawn.
    if (hosted && input.action !== "stop" && (process.env.VERCEL_ENV !== "production"
      || !process.env.VERCEL_DEPLOYMENT_ID || process.env.TOSKER_LOCATION_DURABLE_ENABLED !== "1")) {
      return reply({ error: "Sharing unavailable." }, 503);
    }
    const service = hosted
      ? durableLocationService(getDatabase(), { capacity: locationCapacityVerified })
      : latestLocationService(getDatabase());
    switch (input.action) {
      case "begin":
        if (input.consent !== (input.precision === "precise" ? "precise-latest-v2" : "area-latest-v2")) throw new TypeError();
        return reply(await service.begin(actor, sessionId, input.conversationId, input.precision, request.signal));
      case "send": return reply(await service.send(actor, sessionId, input.id, input.point, input.expectedRevision, input.requestId, request.signal));
      case "stop": await service.stop(actor, sessionId, input.id); return reply({ stopped: true });
      case "current": return reply(await service.read(actor, sessionId, input.conversationId));
    }
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationDeniedError ? 403
      : error instanceof LocationRevisionConflict ? 409 : error instanceof TypeError || error instanceof SyntaxError ? 400 : 503;
    // No SDK details, input, location, token, URL or provider response in logs.
    return reply({ error: status === 503 ? "Sharing unavailable. Stop or wait for expiry; no automatic retry." : "Location sharing unavailable." }, status);
  }
}
