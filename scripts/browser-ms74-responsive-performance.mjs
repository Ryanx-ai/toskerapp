import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client.ts";
import { rooms, roomMemberships } from "../src/server/db/schema.ts";
import { resolveQaActors } from "./lib/ms73-fixtures.ts";
import { loginLive, liveReady, liveCount, liveJoined, liveButton, installLiveMetrics } from "./lib/ms74-browser.mjs";

const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
assert.equal(fixture.run, "ms74-fp1-20261010");
const db = getDatabase(), actors = await resolveQaActors(db), output = ".git/ms74-recovery/browser";
const [room] = await db.select().from(rooms).where(eq(rooms.id, fixture.roomId)); assert(room?.slug === fixture.slug && room.ownerId === actors.a.userId);
const [original] = await db.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, room.id), eq(roomMemberships.userId, actors.a.userId)));
const browser = await chromium.launch({ headless: true });
const ca = await browser.newContext({ viewport: { width: 1440, height: 900 } }), cb = await browser.newContext({ viewport: { width: 1440, height: 900 } });
for (const context of [ca, cb]) { await installLiveMetrics(context); await context.route("**/*geoapify.com/**", route => route.abort()); }
const a = await ca.newPage(), b = await cb.newPage(), evidence = { widths: [], samples: [], resources: [], errors: [], requests: { token: 0, roster: 0 } };
let step = "setup";
for (const page of [a, b]) { page.on("pageerror", error => evidence.errors.push(error.name)); page.on("request", r => { const path = new URL(r.url()).pathname; if (path === "/api/realtime/token") evidence.requests.token++; if (path === "/api/live/roster") evidence.requests.roster++; }); }
const save = () => writeFileSync(`${output}/responsive-performance-progress.json`, JSON.stringify(evidence, null, 2));
try {
  // Only a Room nickname owned by this QA run, never a profile or founder field.
  await db.update(roomMemberships).set({ nickname: "QA LongNameParticipantWithoutSpaces123456" }).where(and(eq(roomMemberships.roomId, room.id), eq(roomMemberships.userId, actors.a.userId)));
  await loginLive(a, "a", fixture); await loginLive(b, "b", fixture);
  await liveCount(a, 0); await liveCount(b, 0);
  await liveButton(b, "Join Live").click(); await liveJoined(b);
  await liveReady(a); await liveButton(a, "Join Live").focus(); await a.keyboard.press("Enter"); await liveJoined(a); await liveCount(a, 2); await liveCount(b, 2);
  assert(await a.getByText("QA LongNameParticipantWithoutSpaces123456", { exact: true }).count());
  step = "responsive and reduced motion";
  for (const [width, height] of [[320, 740], [390, 844], [430, 932], [768, 1024], [1440, 900], [1728, 1000], [844, 390]]) {
    await a.setViewportSize({ width, height }); await a.emulateMedia({ reducedMotion: "reduce" });
    await liveButton(a, "Leave Live").focus();
    const layout = await a.evaluate(() => {
      const p = document.querySelector(".live-panel"), button = p.querySelector(".live-action"), rect = button.getBoundingClientRect(), style = getComputedStyle(button);
      return { bodyOverflow: document.documentElement.scrollWidth > innerWidth + 1, panelOverflow: p.scrollWidth > p.clientWidth + 1, target: { width: rect.width, height: rect.height }, focused: document.activeElement === button, focusOutline: style.outlineStyle, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, companion: !!document.querySelector(".planning-chat"), animation: getComputedStyle(p).animationName };
    });
    assert(!layout.bodyOverflow && !layout.panelOverflow); assert(layout.target.width >= 44 && layout.target.height >= 44); assert(layout.focused && layout.focusOutline !== "none"); assert(layout.reducedMotion && layout.animation === "none");
    if (width < 1100) assert(!layout.companion);
    await a.screenshot({ path: `${output}/live-${width}x${height}.png`, fullPage: true }); evidence.widths.push({ width, height, ...layout }); save();
  }
  await a.setViewportSize({ width: 1440, height: 900 }); await liveButton(a, "Leave Live").click(); await liveCount(b, 1);
  step = "20 bounded lifecycle cycles";
  const cdp = await ca.newCDPSession(a); await cdp.send("Performance.enable");
  const metrics = async cycle => {
    await cdp.send("HeapProfiler.collectGarbage"); const { metrics } = await cdp.send("Performance.getMetrics");
    const selected = Object.fromEntries(metrics.filter(m => ["JSHeapUsedSize", "JSEventListeners", "Nodes", "Documents"].includes(m.name)).map(m => [m.name, m.value]));
    const transport = await a.evaluate(() => window.__liveQa.snapshot()); assert(transport.maxConnections <= 1 && transport.connections === 1); assert(transport.payloadSafe); assert(transport.incoming + transport.outgoing < 10000);
    evidence.resources.push({ cycle, ...selected, transport }); save();
  };
  await metrics(0);
  for (let cycle = 1; cycle <= 20; cycle++) {
    await liveReady(a); const started = performance.now(); await liveButton(a, "Join Live").click(); await liveJoined(a); const joinMs = Math.round(performance.now() - started); await liveCount(b, 2); const peerMs = Math.round(performance.now() - started);
    await liveButton(a, "Leave Live").click(); await liveCount(b, 1); evidence.samples.push({ cycle, joinMs, peerMs });
    if (cycle % 5 === 0) { await metrics(cycle); console.log(JSON.stringify({ step, cycle })); }
    if (cycle % 5 === 0 && cycle < 20) { await a.getByRole("link", { name: "Board", exact: true }).click(); await a.waitForURL("**/hall"); await a.locator(".live-panel").waitFor({ state: "detached" }); await a.getByRole("link", { name: "Live", exact: true }).click(); await a.waitForURL("**/live"); await liveReady(a); }
  }
  step = "idle event frequency";
  await new Promise(resolve => setTimeout(resolve, 1500)); const before = { ...evidence.requests }; await new Promise(resolve => setTimeout(resolve, 2500)); assert.deepEqual(evidence.requests, before); evidence.idleNoPolling = true;
  const warmed = evidence.resources.find(r => r.cycle === 5), end = evidence.resources.at(-1);
  evidence.heapGrowthFromCycle5 = end.JSHeapUsedSize - warmed.JSHeapUsedSize; evidence.listenerGrowthFromCycle5 = end.JSEventListeners - warmed.JSEventListeners;
  assert(evidence.heapGrowthFromCycle5 < 8 * 1024 * 1024); assert(evidence.listenerGrowthFromCycle5 <= 10);
  const percentile = key => evidence.samples.map(s => s[key]).sort((x, y) => x - y)[18]; evidence.joinP95Ms = percentile("joinMs"); evidence.peerP95Ms = percentile("peerMs"); evidence.proposedLatencyTargetMet = evidence.joinP95Ms < 2000 && evidence.peerP95Ms < 2000;
  assert.equal(evidence.errors.length, 0);
  writeFileSync(`${output}/responsive-performance.json`, JSON.stringify({ pass: true, ...evidence }, null, 2)); console.log(JSON.stringify({ pass: true, widths: evidence.widths.length, cycles: evidence.samples.length, joinP95Ms: evidence.joinP95Ms, peerP95Ms: evidence.peerP95Ms, proposedLatencyTargetMet: evidence.proposedLatencyTargetMet, heapGrowthFromCycle5: evidence.heapGrowthFromCycle5, listenerGrowthFromCycle5: evidence.listenerGrowthFromCycle5, requests: evidence.requests }));
} catch (error) {
  evidence.transport = await a.evaluate(() => window.__liveQa?.snapshot());
  evidence.finalPanels = await Promise.all([a, b].map(p => p.locator(".live-panel").innerText().catch(() => "missing"))); save();
  await a.screenshot({ path: `${output}/responsive-failure.png`, fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ pass: false, step, error: error.name, detail: String(error.message).slice(0, 400) })); process.exitCode = 1;
} finally { await db.update(roomMemberships).set({ nickname: original.nickname, nicknameRevision: original.nicknameRevision }).where(and(eq(roomMemberships.roomId, room.id), eq(roomMemberships.userId, actors.a.userId))); await browser.close(); await db.$client.end(); }
