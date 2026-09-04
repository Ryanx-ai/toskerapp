"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { presenceStatus, profiles } from "@/server/db/schema";

export type PresenceStatus = (typeof presenceStatus.enumValues)[number];

export async function setPresenceStatusAction(status: PresenceStatus) {
  const actor = await requireCurrentActor();
  if (!presenceStatus.enumValues.includes(status)) throw new Error("Invalid status.");
  const db = getDatabase();
  await db.update(profiles).set({ presenceStatus: status, updatedAt: new Date() }).where(eq(profiles.userId, actor.userId));
  revalidatePath("/");
  return { status };
}
