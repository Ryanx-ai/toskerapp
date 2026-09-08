import { AuthenticationRequiredError } from "@/server/auth/actor";
import { refreshWorkspaceNavigationAction } from "@/server/accounts/actions";
import { listNotificationsAction } from "@/server/shared-state/actions";
import { listConversationPreferencesAction } from "@/server/conversations/preference-actions";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
/** Read-only refresh; each existing service authenticates and filters current access. */
export async function GET(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Access denied" }, { status: 403, headers });
  try {
    const [activity, navigation, preferences] = await Promise.all([listNotificationsAction(), refreshWorkspaceNavigationAction(), listConversationPreferencesAction()]);
    const muted = new Set(preferences.filter((pref) => pref.muted || pref.inheritedMute).map((pref) => pref.conversationId));
    return Response.json({ activity: activity.map((item) => ({ ...item, muted: Boolean(!item.isMention && item.conversationId && muted.has(item.conversationId) && ["message", "hall_note", "hall_pin"].includes(item.type)) })), navigation, preferences }, { headers });
  } catch (error) {
    return Response.json({ error: "Workspace updates unavailable" }, { status: error instanceof AuthenticationRequiredError ? 401 : 503, headers });
  }
}
