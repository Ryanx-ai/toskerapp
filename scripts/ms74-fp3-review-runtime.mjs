// Explicit isolated review environment. Never alter existing local/Vercel envs.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";

export const REVIEW_PROJECT = "falling-mode-50310792";
export const REVIEW_HOST = "ep-fancy-sunset-b7sape5m-pooler.c-13.us-east-1.aws.neon.tech";
export function reviewEnvironment() {
  const credentials = dotenv.parse(readFileSync(".git/ms74-fp3/review-database.env"));
  const pooled = new URL(credentials.DATABASE_URL);
  const direct = new URL(credentials.DATABASE_URL_UNPOOLED);
  assert.equal(pooled.hostname, REVIEW_HOST);
  assert.equal(direct.hostname, REVIEW_HOST.replace("-pooler.", "."));
  assert.equal(pooled.pathname, "/neondb");
  assert.equal(direct.pathname, pooled.pathname);
  assert.equal(pooled.searchParams.get("sslmode"), "require");
  const local = dotenv.parse(readFileSync(".env.local"));
  const development = dotenv.parse(readFileSync(".env.development.local"));
  for (const original of [local, development]) {
    assert.notEqual(new URL(original.DATABASE_URL).hostname.replace("-pooler.", "."), direct.hostname);
  }
  // Keep runtime essentials only; never inherit arbitrary provider/production credentials.
  const env = Object.fromEntries(["PATH", "HOME", "TMPDIR", "LANG", "TERM", "SHELL"]
    .filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
  // Block Next dotenv fallback for every configured key, including retired management keys.
  for (const file of readdirSync(".").filter(file => /^\.env(?:\..+)?$/.test(file))) {
    for (const key of Object.keys(dotenv.parse(readFileSync(file)))) {
      assert.notEqual(key, "VERCEL", "Unexpected hosted env file: inspect before local start.");
      env[key] = "";
    }
  }
  const source = { ...local, ...development };
  for (const key of ["ABLY_API_KEY", "CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "ROOM_INVITE_ENCRYPTION_KEY", "GEOAPIFY_SEARCH_KEY", "NEXT_PUBLIC_GEOAPIFY_MAP_KEY"]) {
    assert.ok(source[key], `Missing approved Development variable ${key}`);
    env[key] = source[key];
  }
  assert.ok(env.CLERK_SECRET_KEY.startsWith("sk_test_"), "Development Clerk instance required.");
  assert.ok(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_test_"));
  Object.assign(env, credentials, {
    NEON_PROJECT_ID: REVIEW_PROJECT, PGHOST: pooled.hostname, PGHOST_UNPOOLED: direct.hostname,
    PGDATABASE: "neondb", PGUSER: decodeURIComponent(pooled.username), PGPASSWORD: decodeURIComponent(pooled.password),
    POSTGRES_URL: pooled.href, POSTGRES_URL_NON_POOLING: direct.href, POSTGRES_PRISMA_URL: direct.href,
    POSTGRES_URL_NO_SSL: "", POSTGRES_DATABASE: "neondb", POSTGRES_HOST: pooled.hostname,
    POSTGRES_USER: decodeURIComponent(pooled.username), POSTGRES_PASSWORD: decodeURIComponent(pooled.password),
    NEON_API_KEY: "", NEON_AUTH_BASE_URL: "", VITE_NEON_AUTH_URL: "", VERCEL_OIDC_TOKEN: "",
    NODE_ENV: "production", WS_NO_BUFFER_UTIL: "1", NEXT_PUBLIC_LOCATION_QA_UI: "",
    TOSKER_ISOLATED_REVIEW: "ms74-fp3-20261016",
    TOSKER_LOCATION_DURABLE_ENABLED: "", TOSKER_LOCATION_CAPACITY_VERIFIED_AT: "",
  });
  return env;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  assert.ok(["check", "build", "start"].includes(mode), "Use check, build or start.");
  const env = reviewEnvironment();
  if (mode === "check") {
    console.log(JSON.stringify({ reviewOnly: true, project: REVIEW_PROJECT, host: REVIEW_HOST,
      developmentClerk: true, browserMapKeyPresent: true, originalEnvFilesUntouched: true,
      retiredManagementCredentialDisabled: true, productionQueueCredentialsDisabled: true }));
  } else {
    const args = mode === "build" ? ["build"] : ["start", "--hostname", "localhost", "--port", "3000"];
    const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...args], { env, stdio: "inherit" });
    for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
    child.on("exit", code => { process.exitCode = code ?? 1; });
  }
}
