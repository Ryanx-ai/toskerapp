import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required when the Tosker database is accessed.",
    );
  }

  return drizzle(neon(databaseUrl), { schema });
}

export type ToskerDatabase = ReturnType<typeof createDatabase>;

let database: ToskerDatabase | undefined;

/** Build-safe lazy access. Do not instantiate environment clients at import time. */
export function getDatabase(): ToskerDatabase {
  database ??= createDatabase();
  return database;
}
