"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { connectionNicknames, connections, notifications, profiles, users } from "@/server/db/schema";
import { publishUserActivity } from "@/server/realtime/provider";
import { acknowledgeDestination } from "@/server/attention/service";

export async function acknowledgeFriendRequestsAction(ids: string[]) {
  const actor = await requireCurrentActor();
  await acknowledgeDestination(getDatabase(), actor, ids);
  if (ids.length) await publishUserActivity(actor.userId);
}

const pairKey = (left: string, right: string) => [left, right].sort().join(":");

export async function listConnectionsAction() {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const rows = await db.select().from(connections).where(or(eq(connections.requesterId, actor.userId), eq(connections.addresseeId, actor.userId)));
  return Promise.all(rows.map(async (connection) => {
    const otherId = connection.requesterId === actor.userId ? connection.addresseeId : connection.requesterId;
    const [person] = await db.select({ userId: users.id, displayName: profiles.displayName, username: profiles.username, tid: users.tid, presenceStatus: profiles.presenceStatus }).from(users).innerJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, otherId)).limit(1);
    const [nickname] = await db.select({ value: connectionNicknames.nickname }).from(connectionNicknames).where(and(eq(connectionNicknames.connectionId, connection.id), eq(connectionNicknames.userId, actor.userId))).limit(1);
    return { id: connection.id, status: connection.status, direction: connection.addresseeId === actor.userId ? "incoming" as const : "outgoing" as const, person: person ? { ...person, nickname: nickname?.value ?? null } : undefined };
  }));
}

async function requireAcceptedConnection(connectionId: string, actorId: string) {
  const db = getDatabase();
  const [connection] = await db.select().from(connections).where(and(eq(connections.id, connectionId), eq(connections.status, "accepted"), or(eq(connections.requesterId, actorId), eq(connections.addresseeId, actorId)))).limit(1);
  if (!connection) throw new Error("That connection is not available.");
  return db;
}

export async function setConnectionNicknameAction(input: { connectionId: string; nickname: string }) {
  const actor = await requireCurrentActor();
  const db = await requireAcceptedConnection(input.connectionId, actor.userId);
  const nickname = input.nickname.trim().slice(0, 60);
  if (!nickname) throw new Error("Enter a nickname.");
  await db.insert(connectionNicknames).values({ connectionId: input.connectionId, userId: actor.userId, nickname, updatedAt: new Date() }).onConflictDoUpdate({ target: [connectionNicknames.connectionId, connectionNicknames.userId], set: { nickname, updatedAt: new Date() } });
  revalidatePath("/friends");
  await publishUserActivity(actor.userId);
  return { nickname };
}

export async function removeConnectionNicknameAction(connectionId: string) {
  const actor = await requireCurrentActor();
  const db = await requireAcceptedConnection(connectionId, actor.userId);
  await db.delete(connectionNicknames).where(and(eq(connectionNicknames.connectionId, connectionId), eq(connectionNicknames.userId, actor.userId)));
  revalidatePath("/friends");
  await publishUserActivity(actor.userId);
}

export async function requestConnectionAction(targetUserId: string) {
  const actor = await requireCurrentActor();
  if (targetUserId === actor.userId) throw new Error("You cannot connect with yourself.");
  const db = getDatabase();
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!target) throw new Error("That person could not be found.");
  const created = await db.transaction(async (tx) => {
    const [created] = await tx.insert(connections).values({ requesterId: actor.userId, addresseeId: target.id, pairKey: pairKey(actor.userId, target.id) }).onConflictDoNothing().returning({ id: connections.id });
    if (created) await tx.insert(notifications).values({ userId: target.id, actorId: actor.userId, type: "connection_request" });
    return created;
  });
  await Promise.all([publishUserActivity(target.id), publishUserActivity(actor.userId)]);
  revalidatePath("/friends");
  return { created: Boolean(created) };
}

export async function acceptConnectionAction(connectionId: string) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const accepted = await db.transaction(async (tx) => {
    const [changed] = await tx.update(connections).set({ status: "accepted", updatedAt: new Date() }).where(and(eq(connections.id, connectionId), eq(connections.addresseeId, actor.userId), eq(connections.status, "pending"))).returning({ requesterId: connections.requesterId });
    if (changed) await tx.insert(notifications).values({ userId: changed.requesterId, actorId: actor.userId, type: "connection_accepted" });
    const [existing] = changed ? [changed] : await tx.select({ requesterId: connections.requesterId }).from(connections).where(and(eq(connections.id, connectionId), eq(connections.addresseeId, actor.userId), eq(connections.status, "accepted"))).limit(1);
    if (!existing) throw new Error("Connection request is not available.");
    await tx.update(notifications).set({ readAt: new Date(), destinationReadAt: new Date() }).where(and(eq(notifications.userId, actor.userId), eq(notifications.actorId, existing.requesterId), eq(notifications.type, "connection_request")));
    return existing;
  });
  await Promise.all([publishUserActivity(accepted.requesterId), publishUserActivity(actor.userId)]);
  revalidatePath("/friends");
}
