import "server-only";
import { AuthenticationRequiredError, type AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { lockActorTokens } from "./access-lock";
import { revokeActorRealtime } from "./provider";

/** Recheck provider session under the issuance lock, not only a cached JWT.
 * No session metadata, IP address or device details are retained or returned. */
export async function assertRealtimeSession(actor: AuthenticatedActor, sessionId: string) {
  const { clerkClient } = await import("@clerk/nextjs/server");
  const session = await (await clerkClient()).sessions.getSession(sessionId);
  if (session.userId !== actor.authSubject || session.status !== "active" || session.expireAt <= Date.now()) {
    throw new AuthenticationRequiredError("Session ended.");
  }
}

export async function endRealtimeSession(db: ToskerDatabase, actor: AuthenticatedActor, sessionId: string) {
  const { clerkClient } = await import("@clerk/nextjs/server");
  await db.transaction(async tx => {
    await lockActorTokens(tx, actor.userId);
    await assertRealtimeSession(actor, sessionId);
    // Existing clientId revocation also interrupts other devices for this actor.
    // Still-valid sessions can reauthorize. No other Clerk session is revoked.
    await revokeActorRealtime(actor.userId);
    await (await clerkClient()).sessions.revokeSession(sessionId);
    // A waiting token request now rechecks session status and fails closed.
  });
}
