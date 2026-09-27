import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { presenceStatus, profiles } from "@/server/db/schema";
import { PROFILE_AUDIENCES, IDENTITY_ACCENTS, normalizeProfileText, type ProfileAudience, type IdentityAccent } from "@/lib/profile-contract";
import { BANNER_PREFERENCES, type BannerPreference } from "@/lib/banner-preference";
import { IDENTITY_BANNERS, IDENTITY_FRAMES, INTERFACE_ACCENTS, type IdentityBanner, type IdentityFrame, type InterfaceAccent } from "@/lib/profile-contract";
import { normalizeUsernameEdit } from "@/lib/username-contract";
import { UsernameError } from "./username";

export type OwnProfileChange = { username?: string; displayName?: string; presenceStatus?: (typeof presenceStatus.enumValues)[number]; namecardBio?: string; detailsAudience?: ProfileAudience; statusAudience?: ProfileAudience; identityAccent?: IdentityAccent; bannerPreference?: BannerPreference; identityBanner?: IdentityBanner; identityFrame?: IdentityFrame; interfaceAccent?: InterfaceAccent };
export class ProfileConflictError extends Error {}
export async function updateOwnProfile(db: Pick<ToskerDatabase, "update" | "select">, actor: AuthenticatedActor, input: OwnProfileChange, expectedRevision?: number) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length || Object.keys(input).some(key => !["username", "displayName", "presenceStatus", "namecardBio", "detailsAudience", "statusAudience", "identityAccent", "bannerPreference", "identityBanner", "identityFrame", "interfaceAccent"].includes(key))) throw new Error("Invalid profile fields.");
  if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) throw new Error("Invalid profile revision.");
  const changes: OwnProfileChange = {};
  if ("username" in input) {
    if (expectedRevision === undefined) throw new Error("Reload your profile before editing your username.");
    try { changes.username = normalizeUsernameEdit(input.username); }
    catch (error) { throw new UsernameError((error as Error).message); }
    // Protect legacy mixed-case handles too. All current provisioning/edit writers
    // emit lowercase; the existing unique index is the final concurrent-write guard.
    const collision = await db.select({ id: profiles.userId }).from(profiles).where(and(sql`lower(${profiles.username}) = ${changes.username}`, ne(profiles.userId, actor.userId))).limit(1);
    if (collision.length) throw new UsernameError("That username is already taken. Try another.");
  }
  if ("identityBanner" in input) {
    if (!IDENTITY_BANNERS.includes(input.identityBanner!)) throw new Error("Choose a valid banner.");
    changes.identityBanner = input.identityBanner;
  }
  if ("identityFrame" in input) {
    if (!IDENTITY_FRAMES.includes(input.identityFrame!)) throw new Error("Choose a valid avatar frame.");
    changes.identityFrame = input.identityFrame;
  }
  if ("interfaceAccent" in input) {
    if (!INTERFACE_ACCENTS.includes(input.interfaceAccent!)) throw new Error("Choose a valid interface accent.");
    changes.interfaceAccent = input.interfaceAccent;
  }
  if ("bannerPreference" in input) {
    if (!BANNER_PREFERENCES.includes(input.bannerPreference!)) throw new Error("Choose a valid banner preference.");
    changes.bannerPreference = input.bannerPreference;
  }
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
  const [saved] = await db.update(profiles).set({ ...changes, ...("namecardBio" in changes ? { namecardBio: changes.namecardBio || null } : {}), updatedAt: new Date() }).where(and(eq(profiles.userId, actor.userId), expectedRevision === undefined ? undefined : eq(profiles.revision, expectedRevision))).returning({ username: profiles.username, displayName: profiles.displayName, presenceStatus: profiles.presenceStatus, namecardBio: profiles.namecardBio, detailsAudience: profiles.detailsAudience, statusAudience: profiles.statusAudience, identityAccent: profiles.identityAccent, bannerPreference: profiles.bannerPreference, revision: profiles.revision, identityBanner: profiles.identityBanner, identityFrame: profiles.identityFrame, interfaceAccent: profiles.interfaceAccent });
  if (!saved) throw new ProfileConflictError("Your profile changed elsewhere. Reload the saved profile before trying again.");
  return saved;
}
