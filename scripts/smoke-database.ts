import { count } from "drizzle-orm";

import { getDatabase } from "../src/server/db/client";
import { users } from "../src/server/db/schema";

async function main() {
  const [{ userCount }] = await getDatabase()
    .select({ userCount: count() })
    .from(users);

  console.log(JSON.stringify({ applicationDatabaseClient: "ok", userCount }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database smoke failed.");
  process.exitCode = 1;
});
