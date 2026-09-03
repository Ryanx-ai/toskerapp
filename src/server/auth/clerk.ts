import "server-only";

import { auth } from "@clerk/nextjs/server";

import { requireActor } from "./actor";

export async function requireCurrentActor() {
  const { userId } = await auth();

  return requireActor(
    userId ? { provider: "clerk", subject: userId } : null,
  );
}
