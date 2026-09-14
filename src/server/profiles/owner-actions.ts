"use server";
import { revalidatePath } from "next/cache";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { updateOwnProfile, type OwnProfileChange } from "./owner-profile";

export async function updateOwnProfileAction(input: OwnProfileChange) {
  const saved = await updateOwnProfile(getDatabase(), await requireCurrentActor(), input);
  revalidatePath("/", "layout");
  return saved;
}
