import { AuthenticationRequiredError } from "@/server/auth/actor";
import { refreshWorkspaceNavigationAction } from "@/server/accounts/actions";
import { listNotificationsAction } from "@/server/shared-state/actions";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
/** Read-only refresh; each existing service authenticates and filters current access. */
export async function GET(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Access denied" }, { status: 403, headers });
  try {
    const [activity, navigation] = await Promise.all([listNotificationsAction(), refreshWorkspaceNavigationAction()]);
    return Response.json({ activity, navigation }, { headers });
  } catch (error) {
    return Response.json({ error: "Workspace updates unavailable" }, { status: error instanceof AuthenticationRequiredError ? 401 : 503, headers });
  }
}
