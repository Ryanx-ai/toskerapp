import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/server/db/client";
import { users } from "@/server/db/schema";

export type AuthenticatedActor = {
  userId: string;
  authProvider: string;
  authSubject: string;
};

export class AuthenticationRequiredError extends Error {
  readonly code = "AUTHENTICATION_REQUIRED";
}

/**
 * Provider adapters pass their verified server session here. Request bodies,
 * query strings, and client state must never supply these identity fields.
 */
export async function requireActor(identity: {
  provider: string;
  subject: string;
} | null): Promise<AuthenticatedActor> {
  if (!identity) {
    throw new AuthenticationRequiredError("Authentication is required.");
  }

  const [user] = await getDatabase()
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.authProvider, identity.provider),
        eq(users.authSubject, identity.subject),
      ),
    )
    .limit(1);

  if (!user) {
    throw new AuthenticationRequiredError(
      "The authenticated identity has no Tosker user.",
    );
  }

  return {
    userId: user.id,
    authProvider: identity.provider,
    authSubject: identity.subject,
  };
}
