import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { mentionSuggestions } from "@/server/conversations/mentions";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const url = new URL(request.url);
  if (request.headers.get("origin") && request.headers.get("origin") !== url.origin) return Response.json({ error: "Access denied" }, { status: 403, headers });
  try {
    const actor = await requireCurrentActor();
    if (url.searchParams.getAll("q").length > 1 || [...url.searchParams.keys()].some((key) => key !== "q") || (url.searchParams.get("q") ?? "").length > 80) return Response.json({ error: "Invalid query" }, { status: 400, headers });
    return Response.json({ members: await mentionSuggestions(getDatabase(), actor, (await params).conversationId, url.searchParams.get("q") ?? "") }, { headers });
  } catch (error) {
    return Response.json({ error: "Members unavailable" }, { status: error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationDeniedError ? 403 : 503, headers });
  }
}
