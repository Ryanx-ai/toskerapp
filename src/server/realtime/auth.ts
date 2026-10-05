import "server-only";

import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { hallScope } from "@/server/hall/service";
import { conversationChannel, typingChannel, userChannel, isConversationId, REALTIME_TOKEN_TTL } from "@/lib/realtime-contract";
import { getRealtimeServer } from "./provider";
import { lockActorTokens } from "./access-lock";
import { lockPinScope, scopeForConversation } from "@/server/map-pins/scope";

export async function issueConversationToken(db: ToskerDatabase, actor: AuthenticatedActor, conversationId?: string) {
  if (conversationId !== undefined && !isConversationId(conversationId)) throw new Error("Invalid conversation.");
  return db.transaction(async (tx) => {
  await lockActorTokens(tx, actor.userId);
  // No token may finish issuance across a concurrent membership withdrawal.
  if (conversationId) {
    await hallScope(tx, actor, conversationId);
    // A retained participant row cannot authorize a revoked Personal relationship
    // or an unrelated Sandbox/source Pin subscription.
    await lockPinScope(tx,actor,await scopeForConversation(tx,actor,conversationId),"share");
  }
  return getRealtimeServer().auth.requestToken({
    clientId: actor.userId,
    ttl: REALTIME_TOKEN_TTL,
    capability: {
      [userChannel(actor.userId)]: ["subscribe"],
      ...(conversationId ? {
        [conversationChannel(conversationId)]: ["subscribe"],
        [typingChannel(conversationId)]: ["subscribe", "publish"],
      } : {}),
    },
  });
  });
}
