"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { connections, notifications, profiles, users } from "@/server/db/schema";

const pairKey = (left: string, right: string) => [left, right].sort().join(":");

export async function listConnectionsAction() {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const rows = await db.select().from(connections).where(or(eq(connections.requesterId, actor.userId), eq(connections.addresseeId, actor.userId)));
  return Promise.all(rows.map(async (connection) => {
    const otherId = connection.requesterId === actor.userId ? connection.addresseeId : connection.requesterId;
    const [person] = await db.select({ userId: users.id, displayName: profiles.displayName, username: profiles.username, tid: users.tid }).from(users).innerJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, otherId)).limit(1);
    return { id: connection.id, status: connection.status, direction: connection.addresseeId === actor.userId ? "incoming" as const : "outgoing" as const, person };
  }));
}

export async function requestConnectionAction(targetUserId: string) {
  const actor = await requireCurrentActor();
  if (targetUserId === actor.userId) throw new Error("You cannot connect with yourself.");
  const db = getDatabase();
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!target) throw new Error("That person could not be found.");
  const [created] = await db.insert(connections).values({ requesterId: actor.userId, addresseeId: target.id, pairKey: pairKey(actor.userId, target.id) }).onConflictDoNothing().returning({ id: connections.id });
  if (created) await db.insert(notifications).values({ userId: target.id, actorId: actor.userId, type: "connection_request" });
  revalidatePath("/friends");
  return { created: Boolean(created) };
}

export async function acceptConnectionAction(connectionId: string) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const [accepted] = await db.update(connections).set({ status: "accepted", updatedAt: new Date() }).where(and(eq(connections.id, connectionId), eq(connections.addresseeId, actor.userId), eq(connections.status, "pending"))).returning({ requesterId: connections.requesterId });
  if (!accepted) throw new Error("Connection request is not available.");
  await db.insert(notifications).values({ userId: accepted.requesterId, actorId: actor.userId, type: "connection_accepted" });
  revalidatePath("/friends");
}
