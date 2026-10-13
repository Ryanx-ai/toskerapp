/** Exact-scope capability probe. No app release, data writes, keys, or billing.
 * Load the founder-provided temporary key through Node --env-file, never argv.
 * No response body/environment is printed. All artifacts stay under .git. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { build } from "esbuild";
const project = "lucky-queen-41711352", branch = "br-billowing-block-aumzuk79", slug = "toskerfp3rescue";
const root = `https://console.neon.tech/api/v2/projects/${project}/branches/${branch}`;
const dir = ".git/ms74-fp3/neon-canary", mode = process.argv[2];
assert(["deploy", "status", "schedule", "disable"].includes(mode));
assert(process.env.NEON_API_KEY);
mkdirSync(dir, { recursive: true, mode: 0o700 });
async function api(path, options = {}) {
  const response = await fetch(root + path, { ...options, headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}`, ...options.headers }, signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Neon ${options.method ?? "GET"} ${path} HTTP ${response.status}`);
  return data;
}
function save(name, data) { writeFileSync(`${dir}/${name}.json`, JSON.stringify({ at: new Date().toISOString(), ...data }), { mode: 0o600 }); }
async function main() {
  const { branch: actual } = await api(""); assert.equal(actual.id, branch); assert.equal(actual.default, true);
  if (mode === "deploy") {
    const current = await api("/functions");
    assert(Array.isArray(current.functions) && !current.functions.some(f => f.slug === slug), "Refuse unknown overwrite; inspect saved deployment first");
    await build({ entryPoints: ["functions/location-rescue.ts"], outfile: `${dir}/index.mjs`, bundle: true, platform: "node", target: "node24", format: "esm", logLevel: "silent",
      banner: { js: "import{createRequire as ___cr}from'node:module';const require=___cr(import.meta.url);" } });
    const bundle = readFileSync(`${dir}/index.mjs`);
    assert(!bundle.includes(Buffer.from(process.env.NEON_API_KEY)));
    assert(!/\b(?:DELETE|INSERT|UPDATE|ALTER|CREATE TABLE)\b/.test(readFileSync("functions/location-rescue.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")), "Canary is read-only");
    execFileSync("zip", ["-j", "-q", `${dir}/function.zip`, `${dir}/index.mjs`]);
    const form = new FormData(); form.set("zip", new Blob([readFileSync(`${dir}/function.zip`)]), "function.zip");
    form.set("runtime", "nodejs24"); form.set("environment", JSON.stringify({ TOSKER_CLEANUP_MODE: "canary" }));
    save("intent", { project, branch, slug, gitSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), sourceSha256: createHash("sha256").update(bundle).digest("hex"), mode: "read-only-canary" });
    const data = await api(`/functions/${slug}/deployments`, { method: "POST", body: form });
    const d = data.deployment ?? data;
    const receipt = { slug, status: d.status ?? d.state ?? null, deploymentId: d.deployment_id ?? d.id ?? null };
    save("deployment", receipt); console.log(JSON.stringify(receipt));
  } else if (mode === "status") {
    const data = await api(`/functions/${slug}`); const f = data.function ?? data;
    const receipt = { slug, status: f.status ?? f.state ?? null, url: f.invocation_url ?? null,
      deploymentStatus: f.deployment?.status ?? f.latest_deployment?.status ?? null, responseKeys: Object.keys(f).filter(k => !/env|secret|key/i.test(k)) };
    save("status", receipt); console.log(JSON.stringify(receipt));
  } else if (mode === "schedule") {
    assert(existsSync(`${dir}/deployment.json`));
    const existing = await api("/triggers"); assert(Array.isArray(existing.triggers));
    assert(!existing.triggers.some(t => t.name === "tosker-fp3-rescue"));
    // Hourly from the outset; first occurrence in ~1–2 minutes. Never leave an
    // accidental per-minute loop consuming the Free database's idle tail.
    const minute = new Date(Date.now() + 120000).getUTCMinutes();
    const data = await api("/triggers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "schedule", function_slug: slug, name: "tosker-fp3-rescue", schedule: { cron: `${minute} * * * *` }, function_path: "/", enabled: true }) });
    const t = data.trigger; assert(t.trigger_id && t.function_slug === slug);
    const receipt = { triggerId: t.trigger_id, nextRunAt: t.next_run_at, enabled: t.enabled, schedule: t.schedule };
    save("trigger", receipt); console.log(JSON.stringify(receipt));
  } else {
    const owned = JSON.parse(readFileSync(`${dir}/trigger.json`, "utf8"));
    const current = (await api(`/triggers/${owned.triggerId}`)).trigger;
    assert.equal(current.function_slug, slug); assert.equal(current.name, "tosker-fp3-rescue");
    const data = await api(`/triggers/${owned.triggerId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "schedule", enabled: false }) });
    assert.equal(data.trigger.enabled, false); save("disabled", { triggerId: owned.triggerId, disabled: true }); console.log("Owned canary trigger disabled");
  }
}
main().catch(error => { console.error(JSON.stringify({ canaryFailed: true, detail: /^Neon (GET|POST|PATCH) /.test(error.message) ? error.message : "Local precondition/build failed; private details suppressed" })); process.exitCode = 1; });
