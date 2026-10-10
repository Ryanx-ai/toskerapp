import { auth } from "@clerk/nextjs/server";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { endRealtimeSession } from "@/server/realtime/session";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  try {
    const actor = await requireCurrentActor();
    const { sessionId } = await auth();
    if (!sessionId) throw new AuthenticationRequiredError("Session required.");
    await endRealtimeSession(getDatabase(), actor, sessionId);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return Response.json({ error: "Sign-out could not be completed. Try again." }, { status: error instanceof AuthenticationRequiredError ? 401 : 503, headers });
  }
}
