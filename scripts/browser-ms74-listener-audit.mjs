/** Observation only: locate retained global handlers without entering Live. */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, liveReady } from "./lib/ms74-browser.mjs";
const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(), page = await context.newPage(), samples = [];
await context.route("**/*geoapify.com/**", route => route.abort());
try {
  await loginLive(page, "a", fixture);
  const cdp = await context.newCDPSession(page);
  const sample = async cycle => {
    await cdp.send("HeapProfiler.collectGarbage");
    const { result } = await cdp.send("Runtime.evaluate", { expression: "window", objectGroup: "ms74-listeners" });
    const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId });
    const counts = {};
    for (const listener of listeners) counts[listener.type] = (counts[listener.type] ?? 0) + 1;
    samples.push({ cycle, counts });
    await cdp.send("Runtime.releaseObjectGroup", { objectGroup: "ms74-listeners" });
  };
  await sample(0);
  for (let cycle = 1; cycle <= 2; cycle++) {
    await page.getByRole("link", { name: "Board", exact: true }).click(); await page.waitForURL("**/hall");
    await page.locator(".live-panel").waitFor({ state: "detached" });
    await page.getByRole("link", { name: "Live", exact: true }).click(); await page.waitForURL("**/live"); await liveReady(page);
    await sample(cycle);
  }
  writeFileSync(".git/ms74-recovery/browser/listener-audit.json", JSON.stringify({ observationOnly: true, samples }, null, 2));
  console.log(JSON.stringify({ observationOnly: true, samples }));
} finally { await browser.close(); }
