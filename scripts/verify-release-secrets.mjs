import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Run with the existing dotenv harness. Report only file paths, never values.
const keys = ["DATABASE_URL", "CLERK_SECRET_KEY", "ABLY_API_KEY", "ROOM_INVITE_ENCRYPTION_KEY"];
const secrets = keys.map(key => {
  assert(process.env[key]?.length >= 12, `Required server configuration missing: ${key}`);
  return process.env[key];
});
const ignored = execFileSync("git", ["check-ignore", ".env.local"], { encoding: "utf8" }).trim();
assert.equal(ignored, ".env.local");
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
assert(!tracked.some(path => /(^|\/)\.env(\.|$)/.test(path) && path !== ".env.example"), "No local environment files may be tracked");
const ownedNew = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z", "scripts"], { encoding: "utf8" }).split("\0").filter(Boolean);
const newDocs = ["docs/MS7-1-OWNER-LIFECYCLE-REVIEW.md", "docs/MS7-1-FOUNDER-WALKTHROUGH.md", "docs/MS7-6-PROVISIONING-BACKLOG.md"];
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)]);
}
const bundles = files(".next/static").filter(path => /\.(?:js|css|map)$/.test(path));
const candidates = [...new Set([...tracked, ...ownedNew, ...newDocs, ...bundles])].filter(path => statSync(path).isFile());
const leaks = candidates.filter(path => {
  const content = readFileSync(path);
  return secrets.some(value => [value, JSON.stringify(value).slice(1, -1), encodeURIComponent(value)].some(variant => content.includes(Buffer.from(variant))));
});
assert.deepEqual(leaks, [], "Server credential match in listed paths; do not print matched content");
assert(!Object.keys(process.env).some(key => /^NEXT_PUBLIC_.*(?:SECRET|ABLY_API_KEY|DATABASE_URL|ROOM_INVITE_ENCRYPTION_KEY)/.test(key)), "No public server-secret variable");
console.log(JSON.stringify({ secretScan: "PASS", sourceAndOwnedFiles: candidates.length - bundles.length, clientBundles: bundles.length, localEnvironmentIgnored: true, credentialsPrinted: false }));
