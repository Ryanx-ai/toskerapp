import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, liveReady, liveJoined, liveCount, leaveLiveBeforeClose } from "./lib/ms74-browser.mjs";
const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
const browser = await chromium.launch({ headless: true }), context = await browser.newContext(), page = await context.newPage();
const evidence = { samples: [], requests: [] }, started = new WeakMap();
await context.route("**/*geoapify.com/**", r => r.abort());
page.on("request", r => started.set(r, performance.now()));
page.on("response", r => { const path = new URL(r.url()).pathname; if (["/api/realtime/token", "/api/live/join", "/api/live/roster"].includes(path)) evidence.requests.push({ path, status: r.status(), ms: Math.round(performance.now() - started.get(r.request())) }); });
try {
  await loginLive(page, "a", fixture); await liveCount(page, 0);
  for (let i = 0; i < 3; i++) {
    await liveReady(page); const at = performance.now(); await page.getByRole("button", { name: "Join Live", exact: true }).click(); await liveJoined(page);
    evidence.samples.push(Math.round(performance.now() - at)); await page.getByRole("button", { name: "Leave Live", exact: true }).click(); await liveReady(page);
  }
  writeFileSync(`.git/ms74-recovery/browser/join-diagnosis${process.argv.includes("--after") ? "-after" : "-before"}.json`, JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence));
} finally { await leaveLiveBeforeClose(page).catch(() => {}); await browser.close(); }
