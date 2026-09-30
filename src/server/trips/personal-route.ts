import "server-only";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { authorizeTripScope } from "./scope";

export async function requirePersonalMapRoute(slug: string) {
  const { userId } = await auth();
  if (!userId || !slug.startsWith("chat-")) notFound();
  try { await authorizeTripScope(getDatabase(), await requireCurrentActor(), `personal--${slug.slice(5)}`); }
  catch { notFound(); }
}
