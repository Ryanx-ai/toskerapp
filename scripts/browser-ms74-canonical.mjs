/** Bounded deployed A/B read/ephemeral-presence smoke; no fixture/content writes. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, liveReady, liveCount, liveJoined, liveButton, installLiveMetrics, leaveLiveBeforeClose } from "./lib/ms74-browser.mjs";
const origin = process.env.MS74_ORIGIN ?? "https://toskerapp.vercel.app";
assert(["http://localhost:3000", "https://toskerapp.vercel.app"].includes(origin));
const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
const content = JSON.parse(readFileSync(".git/ms74-recovery/browser/content-receipt.json", "utf8"));
assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(content.fixture, fixture.slug);
const secrets = ["DATABASE_URL", "CLERK_SECRET_KEY", "ABLY_API_KEY", "ROOM_INVITE_ENCRYPTION_KEY", "GEOAPIFY_SEARCH_KEY"].map(k => { assert(process.env[k]?.length >= 12, `Missing scan input: ${k}`); return process.env[k]; });
const browser = await chromium.launch({ headless: true }), ca = await browser.newContext(), cb = await browser.newContext();
for (const c of [ca, cb]) { await installLiveMetrics(c); await c.route("**/*geoapify.com/**", r => r.abort()); }
const a = await ca.newPage(), b = await cb.newPage(), evidence = { origin, at: new Date().toISOString(), cases: [], errors: [], denied: [], assets: 0, assetReadFailures: 0, secretMatches: 0, joins: [] }, checks = [], assets = new Set();
for (const p of [a, b]) {
  p.on("pageerror", e => evidence.errors.push(e.name));
  p.on("response", r => {
    const url = new URL(r.url());
    if (url.origin !== origin || !url.pathname.startsWith("/_next/static/") || !/\.(js|css)$/.test(url.pathname) || assets.has(url.pathname)) return;
    assets.add(url.pathname);
    // A full-document Clerk redirect can discard CDP response bodies. Fetch
    // that same immutable public asset if needed; never silently skip its scan.
    checks.push(r.body().catch(async () => { const response = await p.request.get(`${origin}${url.pathname}`); assert.equal(response.status(), 200); return response.body(); }).then(body => { evidence.assets++; if (secrets.some(s => [s, JSON.stringify(s).slice(1, -1), encodeURIComponent(s)].some(v => body.includes(Buffer.from(v))))) evidence.secretMatches++; }).catch(() => { evidence.assetReadFailures++; }));
  });
}
const post = (p, path, conversationId) => p.evaluate(async ({ path, conversationId }) => (await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId }) })).status, { path, conversationId });
const join = async (p, peer, count) => { await liveReady(p); const at = performance.now(); await liveButton(p, "Join Live").click(); await liveJoined(p); const joinedMs = Math.round(performance.now() - at); await liveCount(peer, count); evidence.joins.push({ joinedMs, peerMs: Math.round(performance.now() - at) }); };
try {
  await loginLive(a, "a", fixture, origin); await loginLive(b, "b", fixture, origin); await liveCount(a, 0); await liveCount(b, 0);
  for (const path of ["/api/live/join", "/api/realtime/token"]) { const status = await post(b, path, fixture.selectedChatId); assert.equal(status, 403); evidence.denied.push({ path, status }); }
  await join(a, b, 1); await join(b, a, 2); await liveButton(a, "Leave Live").click(); await liveCount(b, 1);
  await join(a, b, 2); await a.getByRole("link", { name: "Board", exact: true }).click(); await a.waitForURL("**/hall"); await liveCount(b, 1);
  await a.getByText(content.title, { exact: true }).waitFor(); evidence.cases.push("A/B Join, Leave, surface exit and retained Board note");
  await liveButton(b, "Leave Live").click(); await liveReady(b);
  await a.goto(`${origin}/room/${fixture.slug}`, { waitUntil: "domcontentloaded" }); await a.getByText(content.body, { exact: true }).waitFor(); evidence.cases.push("Retained Chat content readable after Live navigation");
  await b.reload({ waitUntil: "domcontentloaded" }); await liveReady(b); await liveCount(b, 0); assert.equal(await liveButton(b, "Join Live").count(), 1); evidence.cases.push("Reload has no retained Join intent");
  for (const p of [a, b]) { const t = await p.evaluate(() => window.__liveQa.snapshot()); assert(t.maxConnections <= 1 && t.payloadSafe); }
  await Promise.all(checks); assert(evidence.assets > 0); assert.equal(evidence.assetReadFailures, 0); assert.equal(evidence.secretMatches, 0); assert.equal(evidence.errors.length, 0);
  writeFileSync(`.git/ms74-recovery/browser/canonical${origin.startsWith("http:") ? "-local" : ""}.json`, JSON.stringify({ pass: true, ...evidence }, null, 2)); console.log(JSON.stringify({ pass: true, ...evidence }));
} finally { await Promise.all([a, b].map(p => leaveLiveBeforeClose(p).catch(() => {}))); await browser.close(); }
