"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { roomMemberships } from "@/server/db/schema";
import { publishUserActivity } from "@/server/realtime/provider";
import { cancelInvitation, generateShareInvitation, invitationCandidates, invitationManagement, respondToInvitation, sendDirectInvitations } from "./invitation-service";

async function refresh(roomId: string, extra: string[] = []) {
  const members = await getDatabase().select({ id: roomMemberships.userId }).from(roomMemberships).where(eq(roomMemberships.roomId, roomId));
  revalidatePath("/app");
  await Promise.all([...new Set([...members.map((row) => row.id), ...extra])].map((id) => publishUserActivity(id)));
}
export async function invitationCandidatesAction(roomId: string, query: string, mode: "friends" | "username") {
  return invitationCandidates(getDatabase(), await requireCurrentActor(), roomId, query, mode);
}
export async function invitationManagementAction(roomId: string) {
  return invitationManagement(getDatabase(), await requireCurrentActor(), roomId);
}
export async function sendDirectInvitationsAction(input: Parameters<typeof sendDirectInvitations>[2]) {
  const result = await sendDirectInvitations(getDatabase(), await requireCurrentActor(), input);
  await refresh(input.roomId, result.map((row) => row.userId));
  return result;
}
export async function respondToInvitationAction(id: string, accept: boolean) {
  const actor = await requireCurrentActor();
  const result = await respondToInvitation(getDatabase(), actor, id, accept);
  await refresh(result.roomId, [actor.userId, result.inviterId]);
  return { roomSlug: result.roomSlug };
}
export async function generateShareInvitationAction(roomId: string, hours: number) {
  const result = await generateShareInvitation(getDatabase(), await requireCurrentActor(), roomId, hours);
  await refresh(roomId);
  return result;
}
export async function cancelInvitationAction(roomId: string, id: string) {
  const recipient = await cancelInvitation(getDatabase(), await requireCurrentActor(), roomId, id);
  await refresh(roomId, recipient ? [recipient] : []);
}
