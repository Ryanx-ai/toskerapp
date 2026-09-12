import "server-only";
import { eq } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireRoomOwner } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerTransaction } from "@/server/db/client";
import { rooms, subrooms } from "@/server/db/schema";

/** Caller holds the parent Room update lock. No visibility or access is changed. */
export async function normalizeSubroomOrder(tx: ToskerTransaction, roomId: string) {
  const rows = await tx.select({ id: subrooms.id, position: subrooms.position }).from(subrooms)
    .where(eq(subrooms.roomId, roomId)).orderBy(subrooms.position, subrooms.createdAt, subrooms.id);
  for (const [position, row] of rows.entries()) {
    if (row.position !== position) await tx.update(subrooms).set({ position }).where(eq(subrooms.id, row.id));
  }
  return rows.map((row) => row.id);
}

export async function reorderSubrooms(db: ToskerDatabase, actor: AuthenticatedActor, input: { roomId: string; expectedIds: string[]; orderedIds: string[] }) {
  const valid = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 500 && value.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)) && new Set(value).size === value.length;
  if (!valid(input.expectedIds) || !valid(input.orderedIds)) throw new Error("Invalid Subroom order.");
  return db.transaction(async (tx) => {
    await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, input.roomId)).for("update");
    await requireRoomOwner(tx, actor, input.roomId);
    const current = await normalizeSubroomOrder(tx, input.roomId);
    if (current.length !== input.expectedIds.length || current.some((id, i) => id !== input.expectedIds[i])) return { conflict: true as const };
    if (current.length !== input.orderedIds.length || input.orderedIds.some((id) => !current.includes(id))) throw new Error("Choose only this Room's Subrooms.");
    for (const [position, id] of input.orderedIds.entries()) await tx.update(subrooms).set({ position }).where(eq(subrooms.id, id));
    return { conflict: false as const };
  });
}
