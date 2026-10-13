import { auth } from "@clerk/nextjs/server";
import { requireCurrentActor } from "@/server/auth/clerk";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { getDatabase } from "@/server/db/client";
import { locationService } from "@/server/location-sharing/service";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Forbidden" }, 403);
  try {
    const actor = await requireCurrentActor(), { sessionId } = await auth();
    if (!sessionId) throw new AuthenticationRequiredError();
    const text = await request.text();
    if (text.length > 1000) throw new TypeError();
    const input = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError();
    const allowed: Record<string, string[]> = {
      begin: ["action", "conversationId", "precision", "consent"], send: ["action", "id", "point"],
      stop: ["action", "id"], validate: ["action", "id", "conversationId"],
    };
    const keys = allowed[input.action];
    if (!keys || Object.keys(input).some(k => !keys.includes(k))) throw new TypeError();
    const service = locationService(getDatabase());
    switch (input.action) {
      case "begin":
        if (input.consent !== (input.precision === "precise" ? "precise-snapshot-v1" : "area-snapshot-v1")) throw new TypeError();
        return reply(await service.begin(actor, sessionId, input.conversationId, input.precision));
      case "send": return reply(await service.send(actor, sessionId, input.id, input.point, request.signal));
      case "stop": await service.stop(actor, sessionId, input.id); return reply({ stopped: true });
      case "validate": return reply(await service.validate(actor, sessionId, input.id, input.conversationId));
    }
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationDeniedError ? 403
      : error instanceof TypeError || error instanceof SyntaxError ? 400 : 503;
    // No SDK details, input, location, token, URL or provider response in logs.
    return reply({ error: status === 503 ? "Sharing unavailable. Stop or wait for expiry; no automatic retry." : "Location sharing unavailable." }, status);
  }
}
