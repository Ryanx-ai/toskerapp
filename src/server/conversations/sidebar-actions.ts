"use server";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { publishUserActivity } from "@/server/realtime/provider";
import { changeSidebarPin, type SidebarPinChange } from "./sidebar-pins";

export async function changeSidebarPinAction(conversationId: string, change: SidebarPinChange) {
  const actor = await requireCurrentActor();
  const result = await changeSidebarPin(getDatabase(), actor, conversationId, change);
  await publishUserActivity(actor.userId);
  return result;
}
