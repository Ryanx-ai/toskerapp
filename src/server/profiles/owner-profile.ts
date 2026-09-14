import "server-only";
import { eq } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { presenceStatus, profiles } from "@/server/db/schema";

export type OwnProfileChange = { displayName?: string; presenceStatus?: (typeof presenceStatus.enumValues)[number] };
export async function updateOwnProfile(db: Pick<ToskerDatabase, "update">, actor: AuthenticatedActor, input: OwnProfileChange) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length || Object.keys(input).some(key => key !== "displayName" && key !== "presenceStatus")) throw new Error("Invalid profile fields.");
  const changes: OwnProfileChange = {};
  if ("displayName" in input) {
    if (typeof input.displayName !== "string" || !input.displayName.trim() || input.displayName.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(input.displayName)) throw new Error("Use a display name of 1–80 characters, without control characters.");
    changes.displayName = input.displayName.trim();
  }
  if ("presenceStatus" in input) {
    if (!presenceStatus.enumValues.includes(input.presenceStatus!)) throw new Error("Choose a valid status.");
    changes.presenceStatus = input.presenceStatus;
  }
  const [saved] = await db.update(profiles).set({ ...changes, updatedAt: new Date() }).where(eq(profiles.userId, actor.userId)).returning({ displayName: profiles.displayName, presenceStatus: profiles.presenceStatus });
  if (!saved) throw new Error("Profile unavailable.");
  return saved;
}
