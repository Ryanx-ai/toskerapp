import { and, count, eq } from "drizzle-orm";

import { ensureToskerAccount } from "../src/server/accounts/bootstrap";
import { getDatabase } from "../src/server/db/client";
import { conversations, profiles, users } from "../src/server/db/schema";

const subject = `ms5-bootstrap-check-${crypto.randomUUID()}`;
const db = getDatabase();

async function main() {
  try {
    const input = {
      provider: "clerk" as const,
      subject,
      displayName: "MS5 Bootstrap Check",
      usernameHint: "ms5-bootstrap-check",
    };
    const first = await ensureToskerAccount(input);
    const second = await ensureToskerAccount(input);

    const [{ userCount }] = await db
      .select({ userCount: count() })
      .from(users)
      .where(eq(users.authSubject, subject));
    const [{ profileCount }] = await db
      .select({ profileCount: count() })
      .from(profiles)
      .where(eq(profiles.userId, first.userId));
    const [{ sandboxCount }] = await db
      .select({ sandboxCount: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.ownerId, first.userId),
          eq(conversations.kind, "sandbox"),
        ),
      );

    const stable =
      first.userId === second.userId &&
      first.tid === second.tid &&
      first.sandboxConversationId === second.sandboxConversationId;

    if (!stable || userCount !== 1 || profileCount !== 1 || sandboxCount !== 1) {
      throw new Error("Account bootstrap is not idempotent.");
    }

    console.log(
      JSON.stringify({
        bootstrap: "ok",
        stableIdentity: true,
        userCount,
        profileCount,
        sandboxCount,
      }),
    );
  } finally {
    await db.delete(users).where(eq(users.authSubject, subject));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Bootstrap check failed.");
  process.exitCode = 1;
});
