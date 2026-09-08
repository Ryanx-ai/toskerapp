import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { InvalidHistoryRequest, readMessageHistory } from "@/server/conversations/history";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const url = new URL(request.url);
  if (request.headers.get("origin") && request.headers.get("origin") !== url.origin) return Response.json({ error: "Access denied" }, { status: 403, headers });
  try {
    const actor = await requireCurrentActor();
    if ([...url.searchParams.keys()].some((key) => !["before", "after", "target", "ids"].includes(key))) throw new InvalidHistoryRequest();
    const page = await readMessageHistory(getDatabase(), actor, (await params).conversationId, {
      before: url.searchParams.get("before") ?? undefined, after: url.searchParams.get("after") ?? undefined,
      target: url.searchParams.get("target") ?? undefined, ids: url.searchParams.has("ids") ? url.searchParams.get("ids")!.split(",") : undefined,
    });
    return Response.json(page, { headers });
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationDeniedError ? 403 : error instanceof InvalidHistoryRequest ? 400 : 503;
    return Response.json({ error: status === 503 ? "Messages couldn't be loaded" : "Access denied" }, { status, headers });
  }
}
