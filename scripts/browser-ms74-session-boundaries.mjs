/** Normal QA sessions; no founder account/profile changes. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { Rest } from "ably";
import { loginLive, liveReady, liveJoined, liveCount, installLiveMetrics, leaveLiveBeforeClose } from "./lib/ms74-browser.mjs";
const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8")); assert.equal(fixture.run, "ms74-fp1-20261010");
const browser = await chromium.launch({ headless: true }), ca = await browser.newContext(), cb = await browser.newContext();
for (const c of [ca, cb]) { await installLiveMetrics(c); await c.route("**/*geoapify.com/**", r => r.abort()); }
const a = await ca.newPage(), b = await cb.newPage(); let a2, step = "login";
const evidence = { cases: [], errors: [] };
for (const p of [a, b]) p.on("pageerror", e => evidence.errors.push({ step, name: e.name }));
const join = async p => { await liveReady(p); await p.getByRole("button", { name: "Join Live", exact: true }).click(); await liveJoined(p); };
const post = (p, path, body) => p.evaluate(async ({ path, body }) => {
  const token = await window.Clerk.session.getToken();
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
}, { path, body });
const record = () => { evidence.cases.push(step); console.log(JSON.stringify({ pass: true, step })); };
try {
  await loginLive(a, "a", fixture); await loginLive(b, "b", fixture); await liveCount(a, 0); await liveCount(b, 0); await join(a); await liveCount(b, 1);
  step = "temporary token503 stops safely without declaring access revoked";
  await a.evaluate(() => { window.__qaAccessLost = 0; window.addEventListener("tosker:conversation-access-lost", () => window.__qaAccessLost++); });
  await a.route("**/api/realtime/token", r => r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "QA temporary failure" }) }));
  await a.locator('a.conversation-row[href="/personal/my-room"]').click();
  await a.getByRole("button", { name: "Reload workspace", exact: true }).waitFor({ timeout: 30000 });
  assert.equal(await a.evaluate(() => window.__qaAccessLost), 0); await liveCount(b, 0);
  await a.unroute("**/api/realtime/token"); await a.getByRole("button", { name: "Reload workspace", exact: true }).click();
  await a.locator(`a.conversation-row[href="/room/${fixture.slug}"]`).click(); await a.waitForURL(url => url.pathname === `/room/${fixture.slug}`);
  await a.getByRole("link", { name: "Live", exact: true }).click(); await liveReady(a); assert.equal(await a.getByRole("button", { name: "Join Live", exact: true }).count(), 1); record();
  step = "actual Settings logout closes both same-session tabs and revokes bearer";
  await join(a); a2 = await ca.newPage(); await a2.goto(`http://localhost:3000/room/${fixture.slug}/live`); await join(a2); await liveCount(b, 1);
  const issued = await post(a, "/api/realtime/token", { conversationId: fixture.conversationId }); assert.equal(issued.status, 200);
  await a.getByRole("link", { name: "Settings", exact: true }).click(); await a.waitForURL("**/settings");
  await a.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Account", exact: true }).click();
  await a.getByRole("button", { name: "Log out", exact: true }).click();
  await a.waitForFunction(() => window.Clerk?.loaded && !window.Clerk.session, {}, { timeout: 30000 });
  await a2.waitForFunction(() => !document.querySelector('.live-panel[data-phase="connected"]'), {}, { timeout: 30000 }); await liveCount(b, 0);
  const rest = new Rest({ token: issued.data.token, logLevel: 0, httpRequestTimeout: 5000 });
  await assert.rejects(() => rest.channels.get(`tosker:live:${fixture.conversationId}`).presence.get(), e => [401, 403].includes(e.statusCode)); record();
  await a2.close(); a2 = undefined;
  step = "next identity starts a clean document with explicit Join";
  await loginLive(a, "b", fixture); await liveCount(a, 0); assert.equal(await a.getByRole("button", { name: "Join Live", exact: true }).count(), 1);
  const bToken = await post(a, "/api/realtime/token", { conversationId: fixture.conversationId }); assert.equal(bToken.status, 200); assert.notEqual(bToken.data.clientId, issued.data.clientId);
  await join(a); await liveCount(b, 1); assert.equal(await a.locator(`[data-live-user="${issued.data.clientId}"]`).count(), 0); record();
  assert.equal(evidence.errors.length, 0);
  evidence.transport = await a.evaluate(() => window.__liveQa.snapshot()); assert.equal(evidence.transport.maxConnections, 1);
  writeFileSync(".git/ms74-recovery/browser/session-boundaries.json", JSON.stringify({ pass: true, ...evidence }, null, 2)); console.log(JSON.stringify({ pass: true, cases: evidence.cases, unexpectedErrors: evidence.errors.length }));
} catch (error) { console.error(JSON.stringify({ pass: false, step, name: error.name, detail: String(error.message).slice(0, 220), panels: await Promise.all([a, b].map(p => p.locator(".live-panel").innerText().catch(() => "no Live panel"))) })); process.exitCode = 1; }
finally { await Promise.all([a, b, a2].filter(Boolean).map(p => leaveLiveBeforeClose(p).catch(() => {}))); await browser.close(); }
