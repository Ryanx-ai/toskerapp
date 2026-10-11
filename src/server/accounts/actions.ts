"use server";

import { requireCurrentActor } from "@/server/auth/clerk";
import { getWorkspaceNavigation } from "./bootstrap";
import { getDatabase } from "@/server/db/client";
import { readOwnProfile } from "@/server/profiles/own-read";

export async function refreshWorkspaceNavigationAction() {
  const actor = await requireCurrentActor();
  const [navigation, ownProfile] = await Promise.all([getWorkspaceNavigation(actor.userId), readOwnProfile(getDatabase(), actor.userId)]);
  // Background identity reconciliation must not refresh the route. Only this
  // authenticated actor's own projection is added; peer navigation stays masked.
  return { ...navigation, ownProfile, displayName: ownProfile.displayName, username: ownProfile.username, presenceStatus: ownProfile.presenceStatus };
}
