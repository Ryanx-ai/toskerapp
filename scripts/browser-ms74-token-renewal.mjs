/** Real ten-minute application token lifecycle. No shortened TTL or auth bypass. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, liveReady, liveJoined, liveCount, installLiveMetrics, leaveLiveBeforeClose } from "./lib/ms74-browser.mjs";
const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
assert.equal(fixture.run, "ms74-fp1-20261010");
const browser = await chromium.launch({ headless: true }), context = await browser.newContext();
await installLiveMetrics(context); await context.route("**/*geoapify.com/**", route => route.abort());
const page = await context.newPage(), tokens = [], errors = [];
page.on("pageerror", error => errors.push(error.name));
page.on("response", async response => {
  if (new URL(response.url()).pathname === "/api/realtime/token" && response.status() === 200) {
    const details = await response.json().catch(() => null);
    if (details) tokens.push({ observedAt: Date.now(), issued: details.issued, expires: details.expires, liveGrants: Object.keys(JSON.parse(details.capability)).filter(k => k.startsWith("tosker:live:")) });
  }
});
try {
  await loginLive(page, "a", fixture);
  await page.goto(`http://localhost:3000/room/${fixture.slug}/subroom/${fixture.selectedId}/live`);
  await liveReady(page); await page.getByRole("button", { name: "Join Live", exact: true }).click(); await liveJoined(page); await liveCount(page, 1);
  const before = tokens.length, start = Date.now(), last = tokens.at(-1);
  assert.equal(last.expires - last.issued, 600000);
  console.log(JSON.stringify({ step: "waiting for natural 10-minute token renewal", context: "owned scoped QA Subroom", tokenTtlMs: 600000 }));
  while (tokens.length === before && Date.now() - start < 660000) await new Promise(resolve => setTimeout(resolve, 1000));
  assert(tokens.length > before, "SDK must renew the real application token");
  await liveJoined(page); await liveCount(page, 1);
  assert.deepEqual(tokens.at(-1).liveGrants, [`tosker:live:${fixture.selectedChatId}`]);
  const transport = await page.evaluate(() => window.__liveQa.snapshot());
  assert.equal(transport.maxConnections, 1); assert.equal(transport.liveChannels, 1); assert(transport.payloadSafe); assert.equal(errors.length, 0);
  const evidence = { pass: true, elapsedMs: Date.now() - start, tokenTtlMs: 600000, automaticRenewals: tokens.length - before, exactContext: true, remainedJoined: true, errors, transport };
  writeFileSync(".git/ms74-recovery/browser/token-renewal.json", JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} catch (error) { console.error(JSON.stringify({ pass: false, name: error.name, detail: String(error.message).slice(0, 200) })); process.exitCode = 1; }
finally { await leaveLiveBeforeClose(page).catch(() => {}); await browser.close(); }
