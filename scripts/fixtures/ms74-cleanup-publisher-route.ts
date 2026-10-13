/** STAGING-ONLY fixture. Never copy this route/trigger into a canonical build.
 * Bootstraps a Production-origin test from a platform-private queue, without
 * exporting a Production token or adding a public maintenance endpoint. */
import { QueueClient } from "@vercel/queue";
import { getVercelOidcToken } from "@vercel/oidc";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { LOCATION_CLEANUP_TOPIC } from "@/server/location-sharing/cleanup-consumer";

export const maxDuration = 10;
const queue = new QueueClient({ region: "iad1", telemetry: { isEnabled: false } });
const callback = queue.handleCallback(async (input, metadata) => {
  const nonce = process.env.TOSKER_LOCATION_PROBE_NONCE;
  if (metadata.topicName !== "tosker-cleanup-publisher-probe-v1" || !nonce || !input
    || typeof input !== "object" || Object.keys(input).length !== 1
    || (input as { nonce?: unknown }).nonce !== nonce) throw new Error("Probe denied.");
  const token = await getVercelOidcToken();
  if (JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).environment !== "production") {
    throw new Error("Probe environment mismatch.");
  }
  const db = getDatabase();
  const row = (await db.execute(sql`select floor(extract(epoch from expires_at)*1000)::bigint due
    from location_cleanup_reservations where id=${nonce}::uuid and armed=false
    and expires_at>clock_timestamp() and expires_at<clock_timestamp()+interval '5 minutes'
    and not exists(select 1 from location_latest)`)).rows[0];
  if (!row) throw new Error("Probe reservation unavailable.");
  const message = { version: 1, kind: "expiry", dueAt: Number(row.due) };
  const options = { retentionSeconds: 3600, idempotencyKey: `production-early:${nonce}` };
  // Deliberately early and duplicate: the real consumer must defer then delete.
  await queue.send(LOCATION_CLEANUP_TOPIC, message, options);
  await queue.send(LOCATION_CLEANUP_TOPIC, message, options);
  await queue.send(LOCATION_CLEANUP_TOPIC, { version: 1, kind: "invalid", nonce },
    { retentionSeconds: 3600, idempotencyKey: `production-poison:${nonce}` });
  console.info(JSON.stringify({ event: "cleanup-production-probe", published: 3, coordinates: 0 }));
}, { retry: () => ({ acknowledge: true }) });

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "production" || !process.env.VERCEL_DEPLOYMENT_ID
    || !process.env.TOSKER_LOCATION_PROBE_NONCE) return new Response(null, { status: 403 });
  return callback(request);
}
