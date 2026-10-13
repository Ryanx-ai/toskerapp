import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { locationShares } from "@/server/db/schema";
import type { ToskerTransaction } from "@/server/db/client";
import { getRealtimeServer } from "@/server/realtime/provider";
import { conversationChannel, userChannel } from "@/lib/realtime-contract";
import { LOCATION_RETIRED } from "@/lib/shared-location-contract";

/** Delete under actor/context locks; callers send hints AFTER commit. The optional
 * publisher supports historical ephemeral-service tests, not the latest API. */
export async function retireLocationLease(tx: ToskerTransaction, userId: string, contextIds?: string[], publish?: typeof publishLocationRetirement) {
  if (contextIds && !contextIds.length) return;
  const rows = await tx.delete(locationShares).where(and(eq(locationShares.userId, userId), contextIds ? inArray(locationShares.conversationId, contextIds) : undefined)).returning();
  if (publish) for (const row of rows) await publish({ id: row.id, conversationId: row.conversationId, userId });
}
export async function publishLocationRetirement(data: { id: string; conversationId: string; userId: string }) {
  // Clear contains no location, name, precision or address. A disconnected peer
  // clears locally; an active peer tombstones the opaque lease even if Stop races.
  await Promise.all([conversationChannel(data.conversationId), userChannel(data.userId)].map(channel =>
    getRealtimeServer().channels.get(channel).publish({ id: randomUUID(), name: LOCATION_RETIRED, data, extras: { ephemeral: true } })));
}
