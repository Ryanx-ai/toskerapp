import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client.ts";
import { rooms, roomMemberships, conversations, messages, hallItems } from "../src/server/db/schema.ts";
import { resolveQaActors } from "./lib/ms73-fixtures.ts";
import { loginLive, liveReady, liveCount, liveJoined, liveButton, installLiveMetrics, leaveLiveBeforeClose, traceLivePort } from "./lib/ms74-browser.mjs";
const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8")), db = getDatabase(), actors = await resolveQaActors(db);
assert.equal(fixture.run, "ms74-fp1-20261010");
const [room] = await db.select().from(rooms).where(eq(rooms.id, fixture.roomId));
assert(room?.slug === fixture.slug && room.ownerId === actors.a.userId && room.createdAt.toISOString() === fixture.createdAt);
assert((await db.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, room.id), eq(roomMemberships.userId, actors.founder.userId)))).length === 1);
const [personal] = await db.select().from(conversations).where(and(eq(conversations.kind, "personal"), eq(conversations.directKey, [actors.a.userId, actors.b.userId].sort().join(":")))); assert(personal);
const browser = await chromium.launch({ headless: true }), ca = await browser.newContext(), cb = await browser.newContext();
for (const c of [ca, cb]) { await installLiveMetrics(c); await c.route("**/*geoapify.com/**", route => route.abort()); }
const transportOnly = process.argv.includes("--transport-only");
const a = await ca.newPage(), b = await cb.newPage(), evidence = { transportOnly, cases: [], errors: [], grants: [] };
let step = "login";
for (const p of [a, b]) {
  p.on("pageerror", e => evidence.errors.push({ step, name: e.name }));
  p.on("response", async r => { if (new URL(r.url()).pathname === "/api/realtime/token" && r.status() === 200) {
    const data = await r.json().catch(() => null); if (data) evidence.grants.push({ actor: p === a ? "a" : "b", step, channels: Object.keys(JSON.parse(data.capability)).filter(k => k.startsWith("tosker:live:")) });
  } });
}
const record = async () => {
  const transport = await a.evaluate(() => window.__liveQa.snapshot());
  const cdp = await ca.newCDPSession(a);
  const { result } = await cdp.send("Runtime.evaluate", { expression: "window", objectGroup: "owner-check" });
  const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId });
  await cdp.send("Runtime.releaseObjectGroup", { objectGroup: "owner-check" }); await cdp.detach();
  const sdkHandlers = Object.fromEntries(["beforeunload", "online", "offline"].map(name => [name, listeners.filter(l => l.type === name).length]));
  evidence.cases.push({ step, sdkHandlers, transport }); console.log(JSON.stringify({ pass: true, step, sdkHandlers, connections: transport.connections, maxConnections: transport.maxConnections })); writeFileSync(".git/ms74-recovery/browser/contexts-progress.json", JSON.stringify(evidence, null, 2));
};
const join = async p => { await liveReady(p); await traceLivePort(p); await liveButton(p, "Join Live").click(); await liveJoined(p); };
const openLive = async p => { await p.getByRole("link", { name: "Live", exact: true }).click(); await p.waitForURL("**/live"); await liveReady(p); };
const context = async (p, child) => {
  await p.getByRole("button", { name: /^Switch Room context:/ }).click();
  const path = `/room/${fixture.slug}${child ? `/subroom/${child}` : ""}`;
  await p.getByRole("navigation", { name: "Room and Subrooms", exact: true }).locator(`a[href="${path}"]`).click();
  await p.waitForURL(url => url.pathname === path); await openLive(p);
  console.log(JSON.stringify({ contextOpened: child ?? "parent", actor: p === a ? "a" : "b", state: await p.locator(".live-panel").getAttribute("data-phase") }));
};
try {
  await loginLive(a, "a", fixture); await loginLive(b, "b", fixture); await liveCount(a, 0); await liveCount(b, 0);
  await a.evaluate(() => { window.__ms74Document = "same-workspace"; });
  await join(a); await join(b); await liveCount(a, 2);
  step = "Room to Subroom cancels participation and preserves exact scopes";
  await context(a, fixture.everyoneId); await liveCount(b, 1); await liveCount(a, 0); await join(a); await liveCount(a, 1);
  await context(b, fixture.everyoneId); await liveCount(b, 1); await join(b); await liveCount(a, 2);
  await context(a); await liveCount(b, 1); await liveCount(a, 0); await record();
  step = "late Join followed by navigation cannot survive";
  await liveButton(a, "Join Live").click();
  await a.getByRole("link", { name: "Board", exact: true }).click(); await a.waitForURL("**/hall");
  await openLive(a); await liveCount(a, 0); assert.equal(await liveButton(a, "Join Live").count(), 1); await record();
  step = "simultaneous disconnect and isolated-context recovery";
  await join(a);
  await Promise.all([ca.setOffline(true), cb.setOffline(true)]);
  await Promise.all([a, b].map(p => p.evaluate(() => window.__liveQa.cut())));
  await Promise.all([a, b].map(p => p.locator('.live-panel[data-phase="reconnecting"]').waitFor({ timeout: 10000 })));
  await Promise.all([ca.setOffline(false), cb.setOffline(false)]);
  await Promise.all([a, b].map(p => p.evaluate(() => { window.__liveQa.restore(); window.dispatchEvent(new Event("online")); })));
  await Promise.all([liveJoined(a), liveJoined(b)]); await liveCount(a, 1); await liveCount(b, 1); await record();
  // Deliberately navigate immediately: profile reconciliation must not race
  // navigation through a background router.refresh(). No settling sleep.
  step = "Sandbox navigation releases Live without sharing";
  await a.locator('a.conversation-row[href="/personal/my-room"]').click(); await a.waitForURL("**/personal/my-room");
  assert.equal(await a.locator(".live-panel").count(), 0); assert.equal(await a.getByRole("link", { name: "Live", exact: true }).count(), 0);
  await a.waitForFunction(() => window.__liveQa.snapshot().liveChannels === 0); await record();
  step = "accepted Personal pair uses independent exact context";
  for (const p of [a, b]) { await p.locator(`a.conversation-row[href="/personal/chat-${personal.id}"]`).click(); await p.waitForURL(`**/personal/chat-${personal.id}`); await openLive(p); }
  await liveCount(a, 0); await join(a); await liveCount(b, 1); await join(b); await liveCount(a, 2);
  assert(evidence.grants.some(g => g.channels[0] === `tosker:live:${personal.id}`)); await record();
  step = transportOnly ? "return to owned Room after context switching" : "return to owned Room preserves Chat and Board delivery";
  for (const p of [a, b]) { await p.locator(`a.conversation-row[href="/room/${fixture.slug}"]`).click(); await p.waitForURL(url => url.pathname === `/room/${fixture.slug}`); }
  if (!transportOnly) {
  const suffix = randomUUID().slice(0, 8), body = `MS7.4 FP1 QA ${suffix}: transport-owner Chat delivery. No media or location.`, title = `MS7.4 FP1 QA ${suffix}`;
  // Persist exact ownership BEFORE creating safe content; keep for Founder Walk.
  const content = { fixture: fixture.slug, conversationId: fixture.conversationId, authorId: actors.a.userId, body, title, retainedForFounderWalk: true };
  writeFileSync(".git/ms74-recovery/browser/content-receipt.json", JSON.stringify(content, null, 2));
  await a.getByPlaceholder("Message…", { exact: true }).fill(body); await a.getByRole("button", { name: "Send message", exact: true }).click();
  await b.getByText(body, { exact: true }).waitFor({ timeout: 30000 });
  for (const p of [a, b]) { await p.getByRole("link", { name: "Board", exact: true }).click(); await p.waitForURL("**/hall"); }
  await a.getByRole("button", { name: "New Note", exact: true }).click(); await a.getByRole("textbox", { name: "Title", exact: true }).fill(title); await a.getByRole("textbox", { name: "Note", exact: true }).fill("Safe retained QA: Board delivery after Live/context switching."); await a.getByRole("button", { name: "Add note", exact: true }).click();
  await b.getByText(title, { exact: true }).waitFor({ timeout: 30000 });
  const [message] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.conversationId, fixture.conversationId), eq(messages.authorId, actors.a.userId), eq(messages.body, body)));
  const [note] = await db.select({ id: hallItems.id }).from(hallItems).where(and(eq(hallItems.conversationId, fixture.conversationId), eq(hallItems.authorId, actors.a.userId), eq(hallItems.title, title)));
  assert(message && note); writeFileSync(".git/ms74-recovery/browser/content-receipt.json", JSON.stringify({ ...content, messageId: message.id, noteId: note.id }, null, 2));
  }
  await openLive(a); await liveCount(a, 0); assert.equal(await a.evaluate(() => window.__ms74Document), "same-workspace"); await record();
  evidence.transport = await a.evaluate(() => window.__liveQa.snapshot());
  assert.equal(evidence.transport.maxConnections, 1); assert.equal(evidence.transport.liveChannels, 1); assert(evidence.transport.payloadSafe); assert.equal(evidence.errors.length, 0);
  writeFileSync(".git/ms74-recovery/browser/contexts.json", JSON.stringify({ pass: true, ...evidence }, null, 2)); console.log(JSON.stringify({ pass: true, cases: evidence.cases, transport: evidence.transport }));
} catch (error) {
  evidence.finalStates = await Promise.all([a, b].map(p => p.evaluate(() => ({ path: location.pathname, phase: document.querySelector(".live-panel")?.getAttribute("data-phase"), panel: document.querySelector(".live-panel")?.innerText, trace: window.__livePortTrace, transport: window.__liveQa.snapshot() }))));
  console.error(JSON.stringify({ pass: false, step, name: error.name, detail: String(error.message).slice(0, 250), states: evidence.finalStates })); writeFileSync(".git/ms74-recovery/browser/contexts-progress.json", JSON.stringify(evidence, null, 2)); process.exitCode = 1;
}
finally { await Promise.all([a, b].map(p => leaveLiveBeforeClose(p).catch(() => {}))); await browser.close(); await db.$client.end(); }
