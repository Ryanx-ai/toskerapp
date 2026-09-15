import "server-only";
import { eq } from "drizzle-orm";
import type { ToskerReader } from "@/server/db/client";
import { profiles } from "@/server/db/schema";

/** Caller supplies only its trusted authenticated actor, never a target from UI. */
export async function readOwnProfile(db: ToskerReader, userId: string) {
  const [profile] = await db.select({ displayName: profiles.displayName, presenceStatus: profiles.presenceStatus, namecardBio: profiles.namecardBio,
    detailsAudience: profiles.detailsAudience, statusAudience: profiles.statusAudience, identityAccent: profiles.identityAccent, revision: profiles.revision,
  }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) throw new Error("Profile unavailable.");
  return profile;
}
export type OwnProfile = Awaited<ReturnType<typeof readOwnProfile>>;
