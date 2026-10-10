import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { Rest } from "ably";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client.ts";
import { rooms, roomMemberships, conversationParticipants, subroomAccess } from "../src/server/db/schema.ts";
import { withdrawRoomMember } from "../src/server/rooms/lifecycle.ts";
import { resolveQaActors } from "./lib/ms73-fixtures.ts";
import { loginLive, liveReady, liveCount, liveJoined, liveButton, installLiveMetrics } from "./lib/ms74-browser.mjs";

const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
const origin = "http://localhost:3000", output = ".git/ms74-recovery/browser";
mkdirSync(output, { recursive: true, mode: 0o700 });
const db = getDatabase(), actors = await resolveQaActors(db);
const [room] = await db.select().from(rooms).where(eq(rooms.id, fixture.roomId));
assert(room?.slug === fixture.slug && room.ownerId === actors.a.userId && fixture.founderId === actors.founder.userId);
const browser = await chromium.launch({ headless: true });
const ca = await browser.newContext({ viewport: { width: 1440, height: 900 } }), cb = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
for (const context of [ca, cb]) { await installLiveMetrics(context); await context.route("**/*geoapify.com/**", route => route.abort()); }
const a = await ca.newPage(), b = await cb.newPage(), evidence = { cases: [], errors: [], failedApi: [] }, requestCounts = {};
let step = "login", restore;
const record = (name, value = true) => { evidence.cases.push({ name, value }); console.log(JSON.stringify({ step: name, value })); writeFileSync(`${output}/acceptance-progress.json`, JSON.stringify(evidence, null, 2)); };
for (const page of [a, b]) {
  page.on("pageerror", error => evidence.errors.push(error.name));
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/live") || path.startsWith("/api/realtime")) requestCounts[path] = (requestCounts[path] ?? 0) + 1; });
  page.on("response", response => { const path = new URL(response.url()).pathname; if (path.startsWith("/api/") && response.status() >= 400) evidence.failedApi.push({ actor: page === a ? "a" : "b", path, status: response.status(), step }); });
}
const post = (page, path, body) => page.evaluate(async ({ path, body }) => { const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, data: await r.json() }; }, { path, body });
const join = async page => { await liveReady(page); await liveButton(page, "Join Live").click(); await liveJoined(page); };
const deniedToken = async token => { const rest = new Rest({ token: token.token, logLevel: 0, httpRequestTimeout: 5000 }); await assert.rejects(() => rest.channels.get(`tosker:live:${fixture.conversationId}`).presence.get(), error => [401, 403].includes(error.statusCode)); };
try {
  await loginLive(a, "a", fixture); await loginLive(b, "b", fixture);
  await liveCount(a, 0); await liveCount(b, 0);
  step = "API authorization";
  assert.equal((await post(b, "/api/live/roster", { conversationId: fixture.selectedChatId, userIds: [] })).status, 403);
  assert.equal((await post(b, "/api/realtime/token", { conversationId: fixture.selectedChatId })).status, 403);
  assert.equal((await post(a, "/api/live/roster", { conversationId: fixture.conversationId, userIds: [], latitude: 1 })).status, 400);
  assert.equal((await post(a, "/api/realtime/token", { conversationId: fixture.conversationId, clientId: actors.founder.userId })).status, 400);
  const hostile = await fetch(`${origin}/api/live/roster`, { method: "POST", headers: { Origin: "https://untrusted.invalid", "Content-Type": "application/json" }, body: "{}" }); assert.equal(hostile.status, 403);
  record(step);
  step = "multi-tab deduplication";
  await join(a); await join(b); await liveCount(a, 2);
  const a2 = await ca.newPage(); await a2.goto(`${origin}/room/${fixture.slug}/live`); await join(a2); await liveCount(b, 2);
  await liveButton(a, "Leave Live").click(); await liveCount(b, 2);
  await liveButton(a2, "Leave Live").click(); await liveCount(b, 1); await a2.close(); record(step);
  step = "surface navigation leaves";
  await join(a); await liveCount(b, 2); await a.getByRole("link", { name: "Board", exact: true }).click(); await liveCount(b, 1);
  await a.getByRole("link", { name: "Live", exact: true }).click(); await liveReady(a); assert.equal(await liveButton(a, "Join Live").count(), 1); record(step);
  step = "background signal leaves and foreground does not rejoin";
  await join(a); await a.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); }); await liveCount(b, 1);
  await a.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); }); await liveReady(a); assert.equal(await liveButton(a, "Join Live").count(), 1); record(step);
  step = "unexpected transport loss and reconnect";
  await join(a); await ca.setOffline(true); await a.evaluate(() => window.__liveQa.cut());
  await a.locator('.live-panel[data-phase="reconnecting"]').waitFor({ timeout: 10000 });
  let start = performance.now(); await ca.setOffline(false); await a.evaluate(() => { window.__liveQa.restore(); window.dispatchEvent(new Event("online")); }); await liveJoined(a); await liveCount(b, 2); record(step, Math.round(performance.now() - start));
  step = "offline expiry then explicit rejoin";
  // Cut immediately after reconnect to cover the debounced profile-refresh race.
  await ca.setOffline(true); start = performance.now(); await a.evaluate(() => window.__liveQa.cut());
  // Provider grace begins after disconnect detection, which itself may take30s.
  await b.waitForFunction(() => document.querySelectorAll("[data-live-user]").length === 1, {}, { timeout: 60000 }); const peerExpiryMs = Math.round(performance.now() - start);
  await a.locator('.live-panel[data-phase="disconnected"]').waitFor({ timeout: 40000 });
  await ca.setOffline(false); await a.evaluate(() => { window.__liveQa.restore(); window.dispatchEvent(new Event("online")); }); await liveReady(a); assert.equal(await liveButton(a, "Join Live").count(), 1); record(step, { peerExpiryMs });
  step = "membership revocation invalidates stale token";
  await join(a); const oldB = await post(b, "/api/realtime/token", { conversationId: fixture.conversationId }); assert.equal(oldB.status, 200);
  const [membership] = await db.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, room.id), eq(roomMemberships.userId, actors.b.userId)));
  const [childGrant] = await db.select().from(subroomAccess).where(and(eq(subroomAccess.subroomId, fixture.everyoneId), eq(subroomAccess.userId, actors.b.userId)));
  restore = async () => { await db.transaction(async tx => { await tx.select().from(rooms).where(eq(rooms.id, room.id)).for("update"); await tx.insert(roomMemberships).values(membership).onConflictDoNothing(); await tx.insert(subroomAccess).values(childGrant).onConflictDoNothing(); await tx.insert(conversationParticipants).values([fixture.conversationId, fixture.everyoneChatId].map(conversationId => ({ conversationId, userId: actors.b.userId }))).onConflictDoNothing(); }); };
  await withdrawRoomMember(db, actors.a, room.id, actors.b.userId);
  await liveCount(a, 1); await deniedToken(oldB.data);
  assert.equal((await post(b, "/api/live/roster", { conversationId: fixture.conversationId, userIds: [] })).status, 403);
  assert.equal((await post(b, "/api/realtime/token", { conversationId: fixture.conversationId })).status, 403);
  await restore(); restore = undefined; record(step);
  step = "logout and in-flight issuance";
  await b.goto(`${origin}/room/${fixture.slug}/live`); await join(b); await liveCount(a, 2);
  const tokenBeforeLogout = await post(b, "/api/realtime/token", { conversationId: fixture.conversationId }); assert.equal(tokenBeforeLogout.status, 200);
  const cookies = await cb.cookies(origin), oldCookie = cookies.map(c => `${c.name}=${c.value}`).join("; ");
  const [raceToken, logout] = await Promise.all([post(b, "/api/realtime/token", { conversationId: fixture.conversationId }), post(b, "/api/realtime/logout")]);
  assert.equal(logout.status, 200); await deniedToken(tokenBeforeLogout.data); if (raceToken.status === 200) await deniedToken(raceToken.data); else assert([401, 403].includes(raceToken.status));
  const replay = await fetch(`${origin}/api/realtime/token`, { method: "POST", headers: { Origin: origin, Cookie: oldCookie, "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: fixture.conversationId }), redirect: "manual" }); assert.equal(replay.status, 401);
  await liveCount(a, 1); record(step, { oldTokenDenied: true, staleSessionDenied: true, raceTokenStatus: raceToken.status });
  evidence.requests = requestCounts; evidence.transport = await a.evaluate(() => window.__liveQa.snapshot());
  writeFileSync(`${output}/acceptance-progress.json`, JSON.stringify(evidence, null, 2));
  assert(evidence.transport.payloadSafe, "Live payload must remain minimal"); assert(evidence.transport.maxConnections <= 1, `Transport concurrency ${JSON.stringify(evidence.transport)}`); assert.equal(evidence.errors.length, 0);
  writeFileSync(`${output}/acceptance.json`, JSON.stringify({ pass: true, ...evidence }, null, 2)); console.log(JSON.stringify({ pass: true, evidence }));
} catch (error) {
  evidence.transport = await a.evaluate(() => window.__liveQa?.snapshot()).catch(() => null);
  writeFileSync(`${output}/acceptance-progress.json`, JSON.stringify(evidence, null, 2));
  await a.screenshot({ path: `${output}/acceptance-failure.png`, fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ pass: false, step, error: error.name, detail: error instanceof assert.AssertionError ? error.message : String(error.message).slice(0, 250), diagnostics: await Promise.all([a, b].map(page => page.evaluate(() => ({ path: location.pathname, text: document.body.innerText.slice(0, 500), session: window.Clerk?.session?.status, online: navigator.onLine })))), states: await Promise.all([a, b].map(page => page.locator(".live-panel").innerText().catch(() => "no panel"))) })); process.exitCode = 1;
} finally { await restore?.(); await browser.close(); await db.$client.end(); }
