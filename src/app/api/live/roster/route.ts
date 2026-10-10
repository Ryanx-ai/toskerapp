import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { liveRoster } from "@/server/live/roster";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  try {
    const actor = await requireCurrentActor();
    const body = await request.text();
    if (body.length > 6000) return Response.json({ error: "Invalid request" }, { status: 400, headers });
    return Response.json({ participants: await liveRoster(getDatabase(), actor, JSON.parse(body)) }, { headers });
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationDeniedError ? 403
      : error instanceof SyntaxError || error instanceof TypeError ? 400 : 503;
    return Response.json({ error: status === 503 ? "Live is temporarily unavailable" : "Access denied" }, { status, headers });
  }
}
