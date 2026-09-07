import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { issueConversationToken } from "@/server/realtime/auth";
import { isConversationId } from "@/lib/realtime-contract";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  // No cross-origin token issuance, wildcard CORS, or client-supplied identity.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  try {
    const actor = await requireCurrentActor();
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => key !== "conversationId") || (input.conversationId !== undefined && !isConversationId(input.conversationId))) {
      return Response.json({ error: "Invalid request" }, { status: 400, headers });
    }
    const token = await issueConversationToken(getDatabase(), actor, input.conversationId);
    return Response.json(token, { headers });
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401
      : error instanceof AuthorizationDeniedError ? 403 : error instanceof SyntaxError ? 400 : 503;
    return Response.json({ error: status === 503 ? "Realtime temporarily unavailable" : "Access denied" }, { status, headers });
  }
}
