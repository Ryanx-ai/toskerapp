import { count, eq, isNotNull } from "drizzle-orm";

import { getDatabase } from "../src/server/db/client";
import { connections, hallItems, notifications, roomCapabilities } from "../src/server/db/schema";

const db = getDatabase();

async function main() {
  const [{ acceptedConnections }] = await db.select({ acceptedConnections: count() }).from(connections).where(eq(connections.status, "accepted"));
  const [{ hallNotes }] = await db.select({ hallNotes: count() }).from(hallItems).where(eq(hallItems.kind, "note"));
  const [{ pinnedReferences }] = await db.select({ pinnedReferences: count() }).from(hallItems).where(isNotNull(hallItems.sourceMessageId));
  const capabilities = await db.select({ roomId: roomCapabilities.roomId, key: roomCapabilities.capabilityKey }).from(roomCapabilities);
  const uniqueCapabilities = capabilities.length === new Set(capabilities.map((item) => `${item.roomId}:${item.key}`)).size;
  const [{ notificationCount }] = await db.select({ notificationCount: count() }).from(notifications);
  if (acceptedConnections < 1 || hallNotes < 1 || pinnedReferences < 1 || !uniqueCapabilities || notificationCount < 1) throw new Error("Shared-state verification failed.");
  console.log(JSON.stringify({ sharedState: "ok", acceptedConnections, hallNotes, pinnedReferences, installedCapabilities: capabilities.length, uniqueCapabilities, notificationCount }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Shared-state verification failed.");
  process.exitCode = 1;
});
