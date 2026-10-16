import "server-only";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { users, profiles } from "@/server/db/schema";
import type { BootstrapIdentity } from "./bootstrap";

/** Server-only opt-in, bound to the empty review project. Never an auth bypass. */
export function isIsolatedReview(env: NodeJS.ProcessEnv = process.env) {
  if (!env.TOSKER_ISOLATED_REVIEW) return false;
  if (env.TOSKER_ISOLATED_REVIEW !== "ms74-fp3-20261016" || env.VERCEL !== undefined
    || env.NEON_PROJECT_ID !== "falling-mode-50310792") throw new Error("Review environment mismatch.");
  const database = new URL(env.DATABASE_URL ?? "");
  if (database.hostname !== "ep-fancy-sunset-b7sape5m-pooler.c-13.us-east-1.aws.neon.tech"
    || database.pathname !== "/neondb") throw new Error("Review database mismatch.");
  return true;
}

/** Auth() has already verified the Clerk subject. Resolve only preseeded actors;
 * do not request/import Clerk names, avatars, emails, settings or new accounts. */
export async function isolatedReviewIdentity(subject: string): Promise<BootstrapIdentity | null> {
  if (!isIsolatedReview()) return null;
  const rows = await getDatabase().select({ username: profiles.username, displayName: profiles.displayName,
    avatar: profiles.avatarUrl, tid: users.tid }).from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(users.authProvider, "clerk"), eq(users.authSubject, subject))).limit(2);
  const row = rows[0];
  const labels: Record<string, string> = {
    "tosker-user-a-clerk-test": "Review Participant A",
    "tosker-user-b-clerk-test": "Review Participant B",
    "fp3-isolated-founder-review": "Founder Review",
  };
  if (rows.length !== 1 || row.avatar !== null || labels[row.username] !== row.displayName
    || (row.username === "fp3-isolated-founder-review" && row.tid !== "8V3X7P1")) {
    throw new Error("Preseeded synthetic review identity required.");
  }
  // Deliberately omit avatarUrl: bootstrap must not synchronize provider photos.
  return { provider: "clerk", subject, displayName: row.displayName, usernameHint: row.username };
}
