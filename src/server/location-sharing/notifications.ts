import "server-only";
import { randomUUID } from "node:crypto";
import { getRealtimeServer } from "@/server/realtime/provider";
import { conversationChannel } from "@/lib/realtime-contract";
import { LOCATION_CHANGED } from "@/lib/shared-location-contract";

/** Invalidation only. Never include a lease, identity, position or label. */
export async function notifyLocationChanged(conversationId: string) {
  await getRealtimeServer().channels.get(conversationChannel(conversationId)).publish({ id: randomUUID(), name: LOCATION_CHANGED, data: { version: 1 } });
}
/** Call only after commit. Missed hints recover through bounded authorized reads. */
export async function notifyLocationContexts(contexts: string[]) {
  await Promise.allSettled([...new Set(contexts)].map(notifyLocationChanged));
}
