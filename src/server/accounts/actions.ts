"use server";

import { requireCurrentActor } from "@/server/auth/clerk";
import { getWorkspaceNavigation } from "./bootstrap";

export async function refreshWorkspaceNavigationAction() {
  return getWorkspaceNavigation((await requireCurrentActor()).userId);
}
