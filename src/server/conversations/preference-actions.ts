"use server";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { publishUserActivity } from "@/server/realtime/provider";
import { changeConversationPreference, listConversationPreferences, type PreferenceMutation } from "./preferences";

export async function setConversationPreferenceAction(conversationId: string, change: PreferenceMutation) {
  const actor = await requireCurrentActor();
  await changeConversationPreference(getDatabase(), actor, conversationId, change);
  await publishUserActivity(actor.userId);
}
export async function listConversationPreferencesAction() {
  return listConversationPreferences(getDatabase(), await requireCurrentActor());
}
