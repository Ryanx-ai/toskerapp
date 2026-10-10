import "server-only";

import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { requireConversationParticipant } from "@/server/auth/authorize";
import { conversationChannel, typingChannel, userChannel, isConversationId, REALTIME_TOKEN_TTL } from "@/lib/realtime-contract";
import { getRealtimeServer } from "./provider";
import { lockActorTokens } from "./access-lock";
import { lockPinScope, scopeForConversation } from "@/server/map-pins/scope";
import { liveChannel } from "@/lib/live-contract";
import { assertRealtimeSession } from "./session";

export async function issueConversationToken(db: ToskerDatabase, actor: AuthenticatedActor, conversationId?: string, sessionId?: string) {
  if (conversationId !== undefined && !isConversationId(conversationId)) throw new Error("Invalid conversation.");
  return db.transaction(async (tx) => {
  await lockActorTokens(tx, actor.userId);
  // HTTP issuance always supplies the verified Clerk session. Internal QA calls
  // use isolated, server-resolved actors and do not accept request identity.
  // No token may finish issuance across a concurrent membership withdrawal.
  await Promise.all([sessionId ? assertRealtimeSession(actor, sessionId) : undefined, (async () => {
    if (!conversationId) return;
    await requireConversationParticipant(tx, actor, conversationId);
    // A retained participant row cannot authorize a revoked Personal relationship
    // or an unrelated Sandbox/source Pin subscription.
    await lockPinScope(tx,actor,await scopeForConversation(tx,actor,conversationId),"share");
  })()]);
  const token = await getRealtimeServer().auth.requestToken({
    clientId: actor.userId,
    ttl: REALTIME_TOKEN_TTL,
    capability: {
      [userChannel(actor.userId)]: ["subscribe"],
      ...(conversationId ? {
        [conversationChannel(conversationId)]: ["subscribe"],
        [typingChannel(conversationId)]: ["subscribe", "publish"],
        [liveChannel(conversationId)]: ["subscribe", "presence"],
      } : {}),
    },
  });
  if (conversationId) {
    const operations: unknown = JSON.parse(token.capability)[liveChannel(conversationId)];
    if (!Array.isArray(operations) || !operations.includes("presence") || !operations.includes("subscribe")) {
      throw new Error("Live permission unavailable.");
    }
  }
  return token;
  });
}
