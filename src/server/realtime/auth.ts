import "server-only";

import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { hallScope } from "@/server/hall/service";
import { conversationChannel, typingChannel, userChannel, isConversationId, REALTIME_TOKEN_TTL } from "@/lib/realtime-contract";
import { getRealtimeServer } from "./provider";

export async function issueConversationToken(db: ToskerDatabase, actor: AuthenticatedActor, conversationId?: string) {
  if (conversationId !== undefined && !isConversationId(conversationId)) throw new Error("Invalid conversation.");
  // Participation alone is insufficient: recheck current Room/Subroom visibility.
  if (conversationId) await hallScope(db, actor, conversationId);
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
}
