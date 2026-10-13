/** Pure policy for the pending durable adapter. Does not enable hosted sharing.
 * Timestamps supplied here must come from the database, never a request body.
 * Queue envelopes intentionally cannot identify a person/context/location. */
export const CLEANUP_RETENTION_SECONDS = 3600;
export const CLEANUP_MAX_DELIVERIES = 8;
export const CLEANUP_CONSENT_MS = 300000;
export const CLEANUP_HEALTH_MS = 60000;
export const CLEANUP_RESCUE_HEALTH_MS = 3900000;
export const CLEANUP_DAILY_CONSENTS = 100;

export type CleanupMessage =
  | { version: 1; kind: "expiry"; dueAt: number }
  | { version: 1; kind: "readiness"; nonce: string };

export class CleanupPolicyError extends Error {
  constructor() { super("Cleanup admission unavailable."); }
}
const timestamp = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const noncePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Strictly reject extra fields, including accidental coordinates in envelopes. */
export function parseCleanupMessage(input: unknown): CleanupMessage {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CleanupPolicyError();
  const value = input as Record<string, unknown>;
  if (value.version !== 1 || Object.keys(value).length !== 3) throw new CleanupPolicyError();
  if (value.kind === "expiry" && timestamp(value.dueAt)) return { version: 1, kind: "expiry", dueAt: value.dueAt };
  if (value.kind === "readiness" && typeof value.nonce === "string" && noncePattern.test(value.nonce)) {
    return { version: 1, kind: "readiness", nonce: value.nonce };
  }
  throw new CleanupPolicyError();
}

/** Reserve this fixed expiry BEFORE publishing; never slide it after the ACK. */
export function cleanupReservation(databaseNow: number) {
  if (!timestamp(databaseNow) || !timestamp(databaseNow + CLEANUP_CONSENT_MS)) throw new CleanupPolicyError();
  return { createdAt: databaseNow, expiresAt: databaseNow + CLEANUP_CONSENT_MS };
}

export function expiryPublication(expiresAt: number, databaseNow: number) {
  if (!timestamp(databaseNow) || !timestamp(expiresAt) || expiresAt <= databaseNow || expiresAt - databaseNow > CLEANUP_CONSENT_MS) {
    throw new CleanupPolicyError();
  }
  return {
    message: parseCleanupMessage({ version: 1, kind: "expiry", dueAt: expiresAt }),
    options: { delaySeconds: Math.ceil((expiresAt - databaseNow) / 1000), retentionSeconds: CLEANUP_RETENTION_SECONDS },
  };
}

/** Called inside the eventual admission transaction AFTER queue ACK; checking
 * this policy cannot replace actor/context/session locks or durable DB fences. */
export function assertCleanupAdmission(input: {
  databaseNow: number; createdAt: number; expiresAt: number; armed: boolean;
  consumerReadyAt: number | null; rescueSucceededAt: number | null;
  overdueRows: number; reservedToday: number; capacityVerified: boolean;
}) {
  const { databaseNow: now, createdAt, expiresAt, consumerReadyAt, rescueSucceededAt } = input;
  const fresh = (at: number | null, window: number) => timestamp(at) && at <= now && now - at < window;
  if (!timestamp(now) || !timestamp(createdAt) || !timestamp(expiresAt) || createdAt > now || expiresAt <= now
    || expiresAt - createdAt !== CLEANUP_CONSENT_MS || input.armed !== true || input.capacityVerified !== true
    || !fresh(consumerReadyAt, CLEANUP_HEALTH_MS) || !fresh(rescueSucceededAt, CLEANUP_RESCUE_HEALTH_MS)
    || input.overdueRows !== 0 || !Number.isInteger(input.reservedToday) || input.reservedToday < 1
    || input.reservedToday > CLEANUP_DAILY_CONSENTS) throw new CleanupPolicyError();
}

/** Early delivery must NOT acknowledge a future deletion obligation. Cleanup
 * SQL must still predicate on DB clock; a due message never supplies a cutoff. */
export function cleanupDelivery(message: unknown, databaseNow: number) {
  const parsed = parseCleanupMessage(message);
  if (!timestamp(databaseNow)) throw new CleanupPolicyError();
  if (parsed.kind === "readiness") return { kind: "readiness" as const, nonce: parsed.nonce };
  if (parsed.dueAt - databaseNow > CLEANUP_CONSENT_MS) throw new CleanupPolicyError();
  if (parsed.dueAt > databaseNow) return { kind: "defer" as const, afterSeconds: Math.ceil((parsed.dueAt - databaseNow) / 1000) };
  return { kind: "sweep" as const };
}

/** Exhaustion requires fail-closed admission plus independent rescue. It is
 * never counted as successful deletion or a passing retention measurement. */
export function cleanupRetry(deliveryCount: number, earlyDelaySeconds?: number) {
  if (!Number.isInteger(deliveryCount) || deliveryCount < 1) throw new CleanupPolicyError();
  if (deliveryCount >= CLEANUP_MAX_DELIVERIES) return { kind: "exhausted" as const };
  if (earlyDelaySeconds !== undefined && (!Number.isInteger(earlyDelaySeconds) || earlyDelaySeconds < 1 || earlyDelaySeconds > 300)) throw new CleanupPolicyError();
  return { kind: "retry" as const, afterSeconds: earlyDelaySeconds ?? Math.min(60, 5 * 2 ** (deliveryCount - 1)) };
}
