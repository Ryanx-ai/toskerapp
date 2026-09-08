import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { InvalidSearchRequest, searchConversation } from "@/server/conversations/search";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const url = new URL(request.url);
  if (request.headers.get("origin") && request.headers.get("origin") !== url.origin) return Response.json({ error: "Access denied" }, { status: 403, headers });
  try {
    const actor = await requireCurrentActor();
    if ([...url.searchParams.keys()].some((key) => !["q", "before"].includes(key) || url.searchParams.getAll(key).length !== 1)) throw new InvalidSearchRequest();
    const page = await searchConversation(getDatabase(), actor, (await params).conversationId, url.searchParams.get("q") ?? "", url.searchParams.get("before") ?? undefined);
    return Response.json(page, { headers });
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationDeniedError ? 403 : error instanceof InvalidSearchRequest ? 400 : 503;
    return Response.json({ error: status === 503 ? "Search couldn't be loaded" : "Search unavailable" }, { status, headers });
  }
}
