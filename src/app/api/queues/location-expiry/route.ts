import { QueueClient } from "@vercel/queue";
import { consumeCleanup, retryCleanup } from "@/server/location-sharing/cleanup-consumer";
import { cleanupStore } from "@/server/location-sharing/cleanup-store";

export const maxDuration = 10;
const queue = new QueueClient({ region: "iad1", telemetry: { isEnabled: false } });
// vercel.json makes this function private at the platform boundary. The local
// app must never expose an equivalent public cleanup route.
const callback = queue.handleCallback(async (message, metadata) => {
  await consumeCleanup(cleanupStore, message, metadata.topicName);
}, { visibilityTimeoutSeconds: 15, retry: (error, metadata) => retryCleanup(error, metadata.deliveryCount) });
export async function POST(request: Request) {
  if (!process.env.VERCEL_DEPLOYMENT_ID || !["production", "preview"].includes(process.env.VERCEL_ENV ?? "")) {
    return new Response(null, { status: 403 });
  }
  return callback(request);
}
