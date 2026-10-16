import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import type { ToskerTransaction } from "@/server/db/client";
import { locationCleanupWorkers } from "@/server/db/schema";
import { isConversationId } from "@/lib/realtime-contract";
import { validSnapshotPoint } from "@/lib/shared-location-contract";
import { isIsolatedReview } from "@/server/accounts/isolated-review";

export const LOCAL_LOCATION_WORKER_FILE = resolve(process.cwd(), ".git/ms74-fp3/latest-worker.json");
export const WORKER_HEALTH_MS = 15000;
export type LocalLocationWorker = { runId: string; userIds: string[]; conversationIds: string[]; endsAt: number };

/** Deliberate temporary admission gate, NOT production retention infrastructure.
 * No env switch can enable deployed storage; moving past this requires review. */
export async function localLocationWorker(userId: string, conversationId?: string): Promise<LocalLocationWorker> {
  if (process.env.VERCEL !== undefined) throw new Error("Local synthetic QA only.");
  let config: LocalLocationWorker;
  try { config = JSON.parse(await readFile(LOCAL_LOCATION_WORKER_FILE, "utf8")); }
  catch { throw new Error("Supervised cleanup worker unavailable."); }
  if (!isConversationId(config.runId) || !Array.isArray(config.userIds) || config.userIds.length !== (isIsolatedReview() ? 3 : 2)
    || !config.userIds.every(isConversationId) || !config.userIds.includes(userId)
    || !Array.isArray(config.conversationIds) || !config.conversationIds.every(isConversationId)
    || (conversationId !== undefined && !config.conversationIds.includes(conversationId))
    || !Number.isFinite(config.endsAt) || config.endsAt <= Date.now()) throw new Error("Local QA admission denied.");
  return config;
}

export async function lockHealthyLocationWorker(tx: ToskerTransaction, config: LocalLocationWorker, requireRemainingMs = 0) {
  const [worker] = await tx.select().from(locationCleanupWorkers).where(and(
    eq(locationCleanupWorkers.slot, 1), eq(locationCleanupWorkers.runId, config.runId),
    sql`${locationCleanupWorkers.lastSweepAt} > clock_timestamp() - interval '15 seconds'`,
    sql`${locationCleanupWorkers.lastSweepAt} <= clock_timestamp()`,
    sql`${locationCleanupWorkers.endsAt} > clock_timestamp() + ${requireRemainingMs} * interval '1 millisecond'`,
  // Fence worker deletion/generation changes, not its non-key heartbeat update.
  // FOR SHARE would let slow authorized reads starve the cleanup heartbeat.
  )).for("key share");
  if (!worker || worker.endsAt.getTime() !== config.endsAt) throw new Error("Cleanup worker unavailable; sharing is closed.");
  return worker;
}

/** Only public, explicitly synthetic test fixes can reach projection/storage.
 * Never use a founder/Jenn device location to exercise this wave. */
export function assertSyntheticLocationPoint(point: unknown) {
  if (!validSnapshotPoint(point) || point.accuracy !== 50
    || ![[1.2834, 103.8607], [1.286, 103.859]].some(([lat, lon]) => point.latitude === lat && point.longitude === lon)) {
    throw new TypeError("Synthetic QA location required.");
  }
}
