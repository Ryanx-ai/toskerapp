"use server";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { requireCurrentActor } from "@/server/auth/clerk";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { conversations, rooms } from "@/server/db/schema";
import { publishTripChanged } from "@/server/realtime/provider";
import { verifyCandidate } from "@/server/maps/candidate-token";
import { mutateTrip, readTrip, TripError } from "./service";
import type { TripCommand, TripResult, TripSnapshot } from "@/lib/trip-contract";

export async function readTripAction(roomSlug: string): Promise<TripResult<TripSnapshot>> {
  try { return { ok: true, value: await readTrip(getDatabase(), await requireCurrentActor(), roomSlug) }; }
  catch (error) { return failure(error); }
}
type ClientCommand = Exclude<TripCommand, { type: "add" }> | { type: "add"; token: string; routeId: string | null };
export async function mutateTripAction(input: { roomSlug: string; expectedRevision: number; requestId: string; command: ClientCommand }): Promise<TripResult<{ revision: number; resultId: string | null; replayed: boolean }>> {
  try {
    const actor = await requireCurrentActor(), db = getDatabase();
    if (!input || JSON.stringify(input).length > 16000) throw new TripError("invalid", "This change is too large.");
    const command = input.command.type === "add" ? { type: "add" as const, candidate: verifyCandidate(input.command.token, actor.userId, input.roomSlug), routeId: input.command.routeId } : input.command;
    const value = await mutateTrip(db, actor, { ...input, command });
    const [chat] = await db.select({ id: conversations.id }).from(conversations).innerJoin(rooms, eq(rooms.id, conversations.roomId)).where(and(eq(rooms.slug, input.roomSlug), eq(conversations.isPrimary, true))).limit(1);
    if (chat) await publishTripChanged(chat.id);
    return { ok: true, value };
  } catch (error) { return failure(error); }
}
function failure(error: unknown): { ok: false; code: "denied" | "conflict" | "invalid" | "limit" | "retry-mismatch" | "unavailable"; message: string } {
  if (error instanceof AuthenticationRequiredError || error instanceof AuthorizationDeniedError) return { ok: false, code: "denied", message: "Your Room access is no longer available." };
  if (error instanceof TripError) return { ok: false, code: error.code, message: error.message };
  return { ok: false, code: "unavailable", message: "The trip could not be confirmed. Retry the same change or reload its saved state." };
}
