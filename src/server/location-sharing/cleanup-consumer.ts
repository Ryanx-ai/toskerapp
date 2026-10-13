import { cleanupDelivery, cleanupRetry } from "./cleanup-policy";

export const LOCATION_CLEANUP_TOPIC = "tosker-location-expiry-v1";
export class CleanupDeferred extends Error {
  constructor(readonly afterSeconds: number) { super("Cleanup not yet due."); }
}
export class CleanupUnavailable extends Error {
  constructor() { super("Cleanup unavailable."); }
}
export type CleanupStore = {
  now(): Promise<number>;
  acknowledge(nonce: string): Promise<void>;
  sweep(): Promise<{ expiredConsents: number; expiredObligations: number }>;
  failure(): Promise<void>;
};

/** No caller fields may become deletion criteria. DB clock owns every sweep. */
export async function consumeCleanup(store: CleanupStore, input: unknown, topic: string) {
  try {
    if (topic !== LOCATION_CLEANUP_TOPIC) throw new CleanupUnavailable();
    const action = cleanupDelivery(input, await store.now());
    if (action.kind === "defer") throw new CleanupDeferred(action.afterSeconds);
    if (action.kind === "readiness") { await store.acknowledge(action.nonce); return; }
    await store.sweep();
  } catch (error) {
    if (error instanceof CleanupDeferred) throw error;
    // A failed DB may prevent recording this signal. Admission independently
    // requires fresh successful receipts and absence of overdue obligations.
    await store.failure().catch(() => undefined);
    throw new CleanupUnavailable(); // Never leak DB/provider errors through SDK logs.
  }
}

export function retryCleanup(error: unknown, deliveryCount: number) {
  const result = cleanupRetry(deliveryCount, error instanceof CleanupDeferred ? error.afterSeconds : undefined);
  return result.kind === "exhausted" ? { acknowledge: true as const } : { afterSeconds: result.afterSeconds };
}
