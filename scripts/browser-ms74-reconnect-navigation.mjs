import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, liveReady, liveJoined, liveCount, installLiveMetrics, leaveLiveBeforeClose } from "./lib/ms74-browser.mjs";
const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
const origin = process.env.MS74_ORIGIN ?? "http://localhost:3000";
assert(["http://localhost:3000", "https://toskerapp.vercel.app"].includes(origin));
const browser = await chromium.launch({ headless: true }), context = await browser.newContext();
await installLiveMetrics(context); await context.route("**/*geoapify.com/**", r => r.abort());
const page = await context.newPage(), evidence = { origin, cycles: [], errors: [], backgroundRsc: 0 };
let observeRefresh = false;
page.on("pageerror", e => evidence.errors.push(e.name));
page.on("request", r => { if (observeRefresh && new URL(r.url()).pathname.endsWith("/live") && r.headers().rsc === "1" && !r.headers()["next-router-prefetch"]) evidence.backgroundRsc++; });
try {
  await loginLive(page, "a", fixture, origin); await liveCount(page, 0);
  for (let i = 0; i < 3; i++) {
    await liveReady(page); await page.getByRole("button", { name: "Join Live", exact: true }).click(); await liveJoined(page);
    observeRefresh = true;
    await context.setOffline(true); await page.evaluate(() => window.__liveQa.cut());
    await page.locator('.live-panel[data-phase="reconnecting"]').waitFor();
    await context.setOffline(false); await page.evaluate(() => { window.__liveQa.restore(); window.dispatchEvent(new Event("online")); });
    await liveJoined(page);
    const at = performance.now();
    // No settling sleep, roster read or CDP roundtrip between connection and click.
    await page.getByRole("link", { name: "Board", exact: true }).click(); await page.waitForURL("**/hall", { timeout: 15000 });
    const navigationMs = Math.round(performance.now() - at);
    const refreshed = page.waitForResponse(r => new URL(r.url()).pathname === "/api/workspace" && r.status() === 200);
    await page.evaluate(() => window.dispatchEvent(new Event("tosker:profile-refresh")));
    await refreshed; assert(new URL(page.url()).pathname.endsWith("/hall"), "Background reconciliation must not undo navigation");
    observeRefresh = false;
    evidence.cycles.push({ navigationMs, stayedOnBoard: true });
    await page.getByRole("link", { name: "Live", exact: true }).click(); await liveReady(page); await liveCount(page, 0);
  }
  assert.equal(evidence.backgroundRsc, 0); assert.equal(evidence.errors.length, 0);
  evidence.transport = await page.evaluate(() => window.__liveQa.snapshot()); assert.equal(evidence.transport.maxConnections, 1);
  writeFileSync(`.git/ms74-recovery/browser/reconnect-navigation${origin.startsWith("https") ? "-canonical" : ""}.json`, JSON.stringify({ pass: true, ...evidence }, null, 2)); console.log(JSON.stringify({ pass: true, cycles: evidence.cycles, backgroundRsc: 0, unexpectedErrors: 0 }));
} finally { await leaveLiveBeforeClose(page).catch(() => {}); await browser.close(); }
