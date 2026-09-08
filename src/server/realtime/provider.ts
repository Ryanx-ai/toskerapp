import "server-only";

import { Rest } from "ably";
import { randomUUID } from "node:crypto";
import { conversationChannel, userChannel, MESSAGE_CHANGED, USER_ACTIVITY } from "@/lib/realtime-contract";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { conversationParticipants } from "@/server/db/schema";

let client: Rest | undefined;

export function getRealtimeServer() {
  const key = process.env.ABLY_API_KEY;
  if (!key) throw new Error("Realtime is not configured.");
  // Never serialize SDK errors/options: they can contain authentication details.
  return client ??= new Rest({ key, logLevel: 0, httpRequestTimeout: 5000 });
}

/** Room withdrawal calls this under the actor issuance lock before committing.
 * Failure rolls back withdrawal; success is never reported with live old tokens.
 * Administrative removals must use the same boundary, not direct membership SQL.
 */
export async function revokeActorRealtime(userId: string) {
  const result = await getRealtimeServer().auth.revokeTokens([{ type: "clientId", value: userId }], { allowReauthMargin: false });
  if (result.failureCount || result.successCount !== 1) throw new Error("Realtime access revocation failed.");
}

/** Best-effort acceleration AFTER Neon commits; delivery failure is not send failure. */
export async function publishMessageChanged(conversationId: string) {
  if (!process.env.ABLY_API_KEY) return;
  try {
    await getRealtimeServer().channels.get(conversationChannel(conversationId)).publish({
      id: randomUUID(), name: MESSAGE_CHANGED, data: { version: 1 },
    });
  } catch {
    console.warn("[realtime] Message signal unavailable; canonical reconciliation retained.");
  }
}

export async function publishUserActivity(userId: string, scope?: { conversationId: string; surface: "chat" | "hall" }) {
  if (!process.env.ABLY_API_KEY) return;
  try {
    await getRealtimeServer().channels.get(userChannel(userId)).publish({ id: randomUUID(), name: USER_ACTIVITY, data: { version: 1, ...scope } });
  } catch { console.warn("[realtime] Activity signal unavailable; canonical reconciliation retained."); }
}

/** Signals carry no content; each recipient must reauthorize every canonical fetch. */
export async function publishConversationActivity(conversationId: string, surface: "chat" | "hall") {
  if (!process.env.ABLY_API_KEY) return;
  try {
    const participants = await getDatabase().select({ userId: conversationParticipants.userId }).from(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId));
    await Promise.all(participants.map(({ userId }) => publishUserActivity(userId, { conversationId, surface })));
  } catch { console.warn("[realtime] Recipient signal unavailable; canonical reconciliation retained."); }
}
