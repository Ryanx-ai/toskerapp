import "server-only";

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";

function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required when the Tosker database is accessed.",
    );
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: databaseUrl });

  return drizzle(pool, { schema });
}

export type ToskerDatabase = ReturnType<typeof createDatabase>;

let database: ToskerDatabase | undefined;

/** Build-safe lazy access. Do not instantiate environment clients at import time. */
export function getDatabase(): ToskerDatabase {
  database ??= createDatabase();
  return database;
}
