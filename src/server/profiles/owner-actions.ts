"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { ProfileConflictError, updateOwnProfile, type OwnProfileChange } from "./owner-profile";
import { readOwnProfile } from "./own-read";
import { publishProfileMetadata, publishOwnSettingsMetadata } from "./metadata";

export async function updateOwnProfileAction(input: OwnProfileChange, expectedRevision: number) {
  const actor = await requireCurrentActor();
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error("Reload your saved profile before editing.");
  try {
    const saved = await updateOwnProfile(getDatabase(), actor, input, expectedRevision);
    revalidatePath("/", "layout");
    after(() => Object.keys(input).every(key => key === "bannerPreference" || key === "interfaceAccent") ? publishOwnSettingsMetadata(actor.userId) : publishProfileMetadata(actor.userId));
    return { ok: true as const, profile: saved };
  } catch(error) {
    if (error instanceof ProfileConflictError) return { ok: false as const, reason: "conflict" as const };
    throw error;
  }
}
export async function readOwnProfileAction() {
  return readOwnProfile(getDatabase(), (await requireCurrentActor()).userId);
}
export async function readOwnBannerPreferenceAction() {
  return (await readOwnProfileAction()).bannerPreference;
}
