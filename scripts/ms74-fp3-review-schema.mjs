// One-time schema initialization for the founder-approved EMPTY Free review DB.
// No environment auto-loading, retained-data export, or production fallback.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const REVIEW_HOST = "ep-fancy-sunset-b7sape5m.c-13.us-east-1.aws.neon.tech";
const env = dotenv.parse(readFileSync(".git/ms74-fp3/review-database.env"));
const direct = new URL(env.DATABASE_URL_UNPOOLED);
assert.equal(direct.hostname, REVIEW_HOST);
assert.equal(direct.pathname, "/neondb");
assert.equal(direct.searchParams.get("sslmode"), "require");
assert.ok(direct.password);
for (const file of [".env.local", ".env.development.local"]) {
  const original = dotenv.parse(readFileSync(file));
  assert.notEqual(new URL(original.DATABASE_URL).hostname.replace("-pooler.", "."), REVIEW_HOST);
}
const fingerprints = Object.fromEntries([".env.local", ".env.development.local"].map(file =>
  [file, createHash("sha256").update(readFileSync(file)).digest("hex")]));
const sql = neon(env.DATABASE_URL_UNPOOLED);
const [before] = await sql`select current_database() as database, current_setting('server_version') as version,
  (select count(*)::int from information_schema.tables where table_schema not in ('pg_catalog','information_schema')) as tables`;
assert.equal(before.database, "neondb");
assert.equal(before.tables, 0, "Only a completely empty database may be initialized; inspect before any retry.");
assert.equal(readMigrationFiles({ migrationsFolder: "drizzle" }).length, 33);
assert.equal(process.argv[2], "--apply-empty-review-schema", "Explicit one-time apply argument required.");
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: env.DATABASE_URL_UNPOOLED, max: 1 });
try {
  console.log("Empty isolated review database verified; applying existing 33 migrations transactionally.");
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  // Existing strict migration/catalog verifier; environment contains only review URL.
  execFileSync(process.execPath, ["scripts/verify-migration-history.mjs"], {
    env: { ...process.env, DATABASE_URL: env.DATABASE_URL_UNPOOLED }, stdio: ["ignore", "pipe", "pipe"],
  });
  const [{ tables }] = await sql`select count(*)::int as tables from information_schema.tables where table_schema='public'`;
  const names = await sql`select tablename from pg_tables where schemaname='public'`;
  let rowCount = 0;
  for (const { tablename } of names) {
    assert.match(tablename, /^[a-z_]+$/);
    const [count] = await sql.query(`select count(*)::int as n from public."${tablename}"`);
    rowCount += count.n;
  }
  assert.equal(rowCount, 0, "Schema initialization must not seed retained or sample application data.");
  for (const [file, hash] of Object.entries(fingerprints)) {
    assert.equal(createHash("sha256").update(readFileSync(file)).digest("hex"), hash);
  }
  const receipt = { at: new Date().toISOString(), project: "falling-mode-50310792",
    branch: "br-morning-heart-b7c20j2x", host: REVIEW_HOST,
    sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    before, migrations: 33, catalogVerified: true, publicTables: tables,
    applicationRows: rowCount, originalEnvironmentFilesUnchanged: true };
  writeFileSync(".git/ms74-fp3/review-schema.json", JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify(receipt));
} catch (error) {
  // Do not emit connection strings, SQL payloads, or third-party error bodies.
  console.error(JSON.stringify({ schemaInitialization: "FAILED", type: error?.name, code: error?.code ?? null,
    instruction: "Inspect the exact review database before retry; never redirect to retained main." }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
