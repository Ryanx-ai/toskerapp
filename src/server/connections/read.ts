import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import type { ToskerReader } from "@/server/db/client";
import { connections, connectionNicknames, profiles, users } from "@/server/db/schema";
import { projectedProfileStatus } from "@/server/profiles/projection";

/** One viewer-scoped query, including pending rows; no per-avatar fetch. */
export async function readConnections(db: ToskerReader, viewerId: string) {
  const peer = sql<string>`case when ${connections.requesterId} = ${viewerId} then ${connections.addresseeId} else ${connections.requesterId} end`;
  return db.select({
    id: connections.id, status: connections.status,
    direction: sql<"incoming" | "outgoing">`case when ${connections.addresseeId} = ${viewerId} then 'incoming' else 'outgoing' end`,
    person: {
      userId: users.id, displayName: profiles.displayName, username: profiles.username, tid: users.tid,
      avatarUrl: profiles.avatarUrl, presenceStatus: projectedProfileStatus(viewerId),
      nickname: sql<string | null>`case when ${connections.status} = 'accepted' then ${connectionNicknames.nickname} else null end`,
    },
  }).from(connections).innerJoin(users, eq(users.id, peer)).innerJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(connectionNicknames, and(eq(connectionNicknames.connectionId, connections.id), eq(connectionNicknames.userId, viewerId)))
    .where(or(eq(connections.requesterId, viewerId), eq(connections.addresseeId, viewerId)));
}
