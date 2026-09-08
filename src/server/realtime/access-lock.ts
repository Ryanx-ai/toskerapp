import "server-only";
import { sql } from "drizzle-orm";
import type { ToskerDatabase } from "@/server/db/client";

/** Used only inside a transaction. Issuance and withdrawal share this lock. */
export async function lockActorTokens(tx: Pick<ToskerDatabase, "execute">, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`tosker-token:${userId}`}, 0))`);
}
