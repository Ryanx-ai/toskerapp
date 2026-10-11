import { auth } from "@clerk/nextjs/server";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { liveRoster } from "@/server/live/roster";
import { assertRealtimeSession } from "@/server/realtime/session";
import { isConversationId } from "@/lib/realtime-contract";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie, Authorization", "X-Content-Type-Options": "nosniff" };

/** Fresh consent-time authorization, NOT token issuance or a stored Join.
 * No credential/capability is returned. Ably still enforces the current exact
 * channel token; withdrawal/logout revoke that token under the existing lock.
 * A revocation racing this read therefore cannot mint fresh authority. */
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  try {
    const text = await request.text();
    if (text.length > 200) throw new TypeError("Invalid request");
    const input = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 1 || !isConversationId(input.conversationId)) throw new TypeError("Invalid request");
    const [actor, session] = await Promise.all([requireCurrentActor(), auth()]);
    if (!session.sessionId) throw new AuthenticationRequiredError("Session required");
    await Promise.all([assertRealtimeSession(actor, session.sessionId), liveRoster(getDatabase(), actor, { conversationId: input.conversationId, userIds: [] })]);
    return Response.json({ authorized: true }, { headers });
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationDeniedError ? 403
      : error instanceof SyntaxError || error instanceof TypeError ? 400 : 503;
    return Response.json({ error: status === 503 ? "Live is temporarily unavailable" : "Access denied" }, { status, headers });
  }
}
