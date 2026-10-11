import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, liveReady, liveCount, liveJoined, liveButton, installLiveMetrics, leaveLiveBeforeClose, traceLivePort } from "./lib/ms74-browser.mjs";

const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
const browser = await chromium.launch({ headless: true });
const ca = await browser.newContext(), cb = await browser.newContext();
for (const c of [ca, cb]) await installLiveMetrics(c);
const a = await ca.newPage(), b = await cb.newPage(), samples = [];
const join = async p => { await liveReady(p); await liveButton(p, "Join Live").click(); await liveJoined(p); };
try {
  await loginLive(a, "a", fixture); await loginLive(b, "b", fixture);
  await join(a); await join(b); await liveCount(b, 2);
  await traceLivePort(a); await traceLivePort(b);
  await ca.setOffline(true); await a.evaluate(() => window.__liveQa.cut());
  await a.locator('.live-panel[data-phase="reconnecting"]').waitFor();
  await ca.setOffline(false); await a.evaluate(() => { window.__liveQa.restore(); window.dispatchEvent(new Event("online")); });
  await liveJoined(a); await liveCount(b, 2);
  const started = performance.now();
  await ca.setOffline(true); await a.evaluate(() => window.__liveQa.cut());
  for (let i = 0; i < 18; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const states = await Promise.all([a, b].map(p => p.evaluate(() => ({ phase: document.querySelector(".live-panel")?.getAttribute("data-phase"), count: document.querySelectorAll("[data-live-user]").length, trace: window.__livePortTrace, transport: window.__liveQa.snapshot() }))));
    const sample = { elapsed: Math.round(performance.now() - started), states }; samples.push(sample);
    console.log(JSON.stringify({ elapsed: sample.elapsed, states: states.map(s => ({ phase: s.phase, count: s.count, connections: s.transport.connections, last: s.transport.recent.slice(-3) })) }));
    if (states[1].count === 1) break;
  }
} finally {
  writeFileSync(".git/ms74-recovery/browser/disconnect-diagnosis.json", JSON.stringify({ diagnosticOnly: true, samples }, null, 2));
  await ca.setOffline(false); await a.evaluate(() => window.__liveQa?.restore()).catch(() => {});
  await Promise.all([a, b].map(p => leaveLiveBeforeClose(p).catch(() => {}))); await browser.close();
}
