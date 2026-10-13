import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { locationShares } from "@/server/db/schema";
import type { ToskerTransaction } from "@/server/db/client";
import { conversationChannel, userChannel } from "@/lib/realtime-contract";
import { LOCATION_RETIRED } from "@/lib/shared-location-contract";
import { publishEphemeralBatch } from "./transport";

/** Coordinate-free invalidation only. Caller holds actor lock (then context lock
 * for membership changes). Throw on failure: never claim a successful withdrawal. */
export async function retireLocationLease(tx: ToskerTransaction, userId: string, contextIds?: string[], publish = publishLocationRetirement) {
  if (contextIds && !contextIds.length) return;
  const rows = await tx.delete(locationShares).where(and(eq(locationShares.userId, userId), contextIds ? inArray(locationShares.conversationId, contextIds) : undefined)).returning();
  for (const row of rows) await publish({ id: row.id, conversationId: row.conversationId, userId });
}
export async function publishLocationRetirement(data: { id: string; conversationId: string; userId: string }) {
  // Clear contains no location, name, precision or address. A disconnected peer
  // clears locally; an active peer tombstones the opaque lease even if Stop races.
  await publishEphemeralBatch([conversationChannel(data.conversationId), userChannel(data.userId)].map(channel => ({channel,name:LOCATION_RETIRED,data})));
}
