import "server-only";
import { and, eq } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { presenceStatus, profiles } from "@/server/db/schema";
import { PROFILE_AUDIENCES, IDENTITY_ACCENTS, normalizeProfileText, type ProfileAudience, type IdentityAccent } from "@/lib/profile-contract";

export type OwnProfileChange = { displayName?: string; presenceStatus?: (typeof presenceStatus.enumValues)[number]; namecardBio?: string; detailsAudience?: ProfileAudience; statusAudience?: ProfileAudience; identityAccent?: IdentityAccent };
export class ProfileConflictError extends Error {}
export async function updateOwnProfile(db: Pick<ToskerDatabase, "update">, actor: AuthenticatedActor, input: OwnProfileChange, expectedRevision?: number) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length || Object.keys(input).some(key => !["displayName", "presenceStatus", "namecardBio", "detailsAudience", "statusAudience", "identityAccent"].includes(key))) throw new Error("Invalid profile fields.");
  if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) throw new Error("Invalid profile revision.");
  const changes: OwnProfileChange = {};
  if ("displayName" in input) {
    changes.displayName = normalizeProfileText(input.displayName, 80, true);
  }
  if ("presenceStatus" in input) {
    if (!presenceStatus.enumValues.includes(input.presenceStatus!)) throw new Error("Choose a valid status.");
    changes.presenceStatus = input.presenceStatus;
  }
  if ("namecardBio" in input) changes.namecardBio = normalizeProfileText(input.namecardBio, 160);
  for (const field of ["detailsAudience", "statusAudience"] as const) if (field in input) {
    if (!PROFILE_AUDIENCES.includes(input[field]!)) throw new Error("Choose a valid audience.");
    changes[field] = input[field];
  }
  if ("identityAccent" in input) {
    if (!IDENTITY_ACCENTS.includes(input.identityAccent!)) throw new Error("Choose a valid identity accent.");
    changes.identityAccent = input.identityAccent;
  }
  const [saved] = await db.update(profiles).set({ ...changes, ...("namecardBio" in changes ? { namecardBio: changes.namecardBio || null } : {}), updatedAt: new Date() }).where(and(eq(profiles.userId, actor.userId), expectedRevision === undefined ? undefined : eq(profiles.revision, expectedRevision))).returning({ displayName: profiles.displayName, presenceStatus: profiles.presenceStatus, namecardBio: profiles.namecardBio, detailsAudience: profiles.detailsAudience, statusAudience: profiles.statusAudience, identityAccent: profiles.identityAccent, revision: profiles.revision });
  if (!saved) throw new ProfileConflictError("Your profile changed elsewhere. Reload the saved profile before trying again.");
  return saved;
}
