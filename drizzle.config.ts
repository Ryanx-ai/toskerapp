import { defineConfig } from "drizzle-kit";

const localFallbackUrl =
  "postgresql://tosker:tosker@127.0.0.1:5432/tosker";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Generation/checking are offline. Migration scripts load .env.local and a
    // missing URL deliberately falls back only to an unreachable local service.
    url: process.env.DATABASE_URL ?? localFallbackUrl,
  },
  strict: true,
  verbose: true,
});
