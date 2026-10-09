/** Real auth/database/A-B; deterministic basemap/roads keep repeated UX checks provider-free. */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { getDatabase } from "../src/server/db/client.ts";
import { readTrip } from "../src/server/trips/service.ts";
import { resolveQaActors, cleanupQaFixture } from "./lib/ms73-fixtures.ts";
import { routingPlaces } from "../src/lib/trip-contract.ts";
import { ensureFp6QaLogin } from "./lib/fp6-browser.mjs";
const receipt = JSON.parse(readFileSync(".git/fp8-recovery/fixture.json", "utf8"));
assert(/^ms73-qa-[a-f0-9]{8}$/.test(receipt.fixture.slug) && !receipt.fixture.retained);
const db = getDatabase(), actors = await resolveQaActors(db), origin = process.env.FP8_ORIGIN ?? "http://localhost:3000";
await cleanupQaFixture(db, receipt.fixture, false);
const output = ".git/fp8-recovery/ui"; mkdirSync(output, { recursive: true, mode: 0o700 });
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ca = await browser.newContext({ viewport: { width: 1440, height: 900 } }), cb = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const a = await ca.newPage(), b = await cb.newPage(), calls = [], errors = [], evidence = {};
let step = "setup";
const button = (page, name) => page.getByRole("button", { name, exact: true });
const ready = async page => { await page.locator('[data-map-state="ready"]').waitFor({ timeout: 60000 }); await page.locator('[data-trip-revision]:not([data-trip-revision=""])').waitFor(); };
const marker = (page, n) => page.locator(".maplibregl-map").getByRole("button", { name: new RegExp(`^Select .* ${n}:`) });
const revision = page => page.locator("[data-trip-revision]").getAttribute("data-trip-revision");
const changed = async (page, before) => page.waitForFunction(value => document.querySelector("[data-trip-revision]")?.dataset.tripRevision !== value, before);
for (const [context, page, actor] of [[ca, a, actors.a], [cb, b, actors.b]]) {
  page.on("pageerror", error => errors.push(error.name));
  page.on("request", request => { if (request.url().includes("/pings")) calls.push({ forbiddenPingRequest: true }); });
  await context.route("https://maps.geoapify.com/**", route => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "qa", type: "background", paint: { "background-color": "#142025" } }] } }));
  await context.route("**/api/trips/*/roads", async route => {
    const slug = decodeURIComponent(new URL(route.request().url()).pathname.split("/")[3]); assert.equal(slug, receipt.fixture.slug);
    const body = route.request().postDataJSON(), plan = await readTrip(db, actor, slug);
    let points = routingPlaces(plan, body.routeId); if (body.origin) points = [{ id: "private-origin", ...body.origin }, points[0]];
    const key = JSON.stringify([body.mode, ...points.map(p => [p.id, p.latitude, p.longitude])]); calls.push({ private: !!body.origin, mode: body.mode });
    const legs = points.slice(1).map((p, i) => ({ fromId: points[i].id, toId: p.id, metres: 1000, seconds: 600 }));
    await route.fulfill({ json: { geometry: { key, mode: body.mode, segments: points.slice(1).map((p, i) => [[points[i].longitude, points[i].latitude], [p.longitude, points[i].latitude], [p.longitude, p.latitude]]), attribution: "Deterministic QA, not live routing evidence", estimate: { metres: 1000 * legs.length, seconds: 600 * legs.length, guidance: [], legs } } } });
  });
}
try {
  step = "authenticate A/B";
  for (const [page, actor] of [[a, "a"], [b, "b"]]) { await page.goto(`${origin}/room/${receipt.fixture.slug}/map`); await ensureFp6QaLogin(page, actor); await page.goto(`${origin}/room/${receipt.fixture.slug}/map`); await ready(page); }
  step = "private Pings";
  assert(await button(a, "Ping your location").isDisabled());
  await ca.grantPermissions(["geolocation"], { origin }); await ca.setGeolocation({ latitude: 1.301, longitude: 103.801, accuracy: 10 });
  await button(a, "Locate me").click(); await a.locator("[data-private-origin]").waitFor();
  if (!process.env.FP8_SKIP_EARLY) {
  for (const label of ["Heart", "Attention", "Question", "Here / Pulse"]) {
    await button(a, "Ping your location").click(); assert.equal(await a.getByRole("group", { name: "Private location ping choices" }).getByRole("button").count(), 4);
    const started = performance.now(); await button(a, `${label} ping · only you`).click();
    await a.getByRole("img", { name: `${label} above your location. Only you can see this ping.`, exact: true }).waitFor();
    evidence[`${label}ActivationMs`] = Math.round(performance.now() - started);
    assert.equal(await b.getByRole("img", { name: /above your location/ }).count(), 0);
    assert.equal(await a.getByRole("img", { name: /^You, accuracy/ }).count(), 1);
    await a.getByRole("img", { name: /above your location/ }).waitFor({ state: "detached", timeout: 5500 });
    assert.equal(await a.getByRole("img", { name: /^You, accuracy/ }).count(), 1);
  }
  assert.equal(calls.length, 0);
  await button(a, "Ping your location").click(); await a.keyboard.press("Escape"); assert.equal(await button(a, "Ping your location").getAttribute("aria-expanded"), "false");
  await button(a, "Ping your location").click(); await a.locator("canvas.maplibregl-canvas").click({ position: { x: 120, y: 180 } }); assert.equal(await button(a, "Ping your location").getAttribute("aria-expanded"), "false");
  console.log("PASS four private Pings, immediate/no extra Map click, expiry preserves You, no POST/provider/peer disclosure, Escape/outside");
  step = "rename/revert";
  await button(a, "Fit trip").click(); await marker(a, 2).click(); await button(a, "Rename checkpoint").click();
  await a.getByText("Default: Checkpoint 2", { exact: true }).waitFor();
  await a.getByLabel("Checkpoint name", { exact: true }).fill("FP8 meeting checkpoint"); let before = await revision(a); await button(a, "Save name").click(); await changed(a, before);
  await b.reload(); await ready(b); assert.equal((await readTrip(db, actors.b, receipt.fixture.slug)).places.some(p => p.title === "FP8 meeting checkpoint"), true);
  await button(a, "Rename checkpoint").click(); before = await revision(a); await button(a, "Revert to default").click(); await changed(a, before);
  assert.equal((await readTrip(db, actors.a, receipt.fixture.slug)).places.some(p => p.title === "FP8 meeting checkpoint"), false);
  before = await revision(a); await button(a, "Home").click(); await changed(a, before); await a.getByText("Tag saved.", { exact: true }).waitFor();
  await a.keyboard.press("Escape");
  console.log("PASS direct rename, persisted default/revert, A/B reload, immediate tag save feedback");
  }
  step = "road replay and consent timing";
  await a.getByRole("combobox", { name: "Travel mode", exact: true }).selectOption("drive");
  await a.getByLabel("Route summary", { exact: true }).getByText(/2\.0 km/).waitFor({ timeout: 30000 });
  const count = calls.length;
  step = "start replay"; await button(a, "Replay route direction").click(); await button(a, "Stop route replay").waitFor();
  await button(a, "Replay route direction").waitFor({ timeout: 5500 }); assert.equal(calls.length, count);
  step = "select first leg"; await marker(a, 1).click(); assert.equal(await a.locator("[data-shared-leg-tag]").count(), 1); await a.keyboard.press("Escape");
  await marker(a, 2).click(); assert.equal(await a.locator("[data-shared-leg-tag]").count(), 2); await a.keyboard.press("Escape"); assert.equal(calls.length, count);
  step = "private origin consent"; await button(a, "Route from here").click(); await button(a, "Keep location local").click(); assert.equal(calls.filter(c => c.private).length, 0);
  await button(a, "Route from here").click(); await button(a, "Allow private route").click();
  await a.locator("[data-private-origin]").getByText(/YOUR LEG · 1.0 km/).waitFor({ timeout: 35000 });
  evidence.timing = await a.evaluate(() => Object.fromEntries(performance.getEntriesByType("mark").filter(e => e.name.startsWith("tosker-map:")).map(e => [e.name, Math.round(e.startTime)])));
  assert.equal(calls.filter(c => c.private).length, 1); assert.equal(await b.locator("[data-private-origin]").count(), 0);
  console.log("PASS finite replay/no fetch, adjacent labels/no recalc, provider-consent boundary; timing", evidence.timing);
  step = "responsive/reduced motion";
  for (const [width, height] of [[320, 800], [390, 844], [430, 932], [768, 900], [1440, 900], [1728, 1000], [844, 390]]) {
    await a.setViewportSize({ width, height }); await button(a, "Ping your location").scrollIntoViewIfNeeded(); await button(a, "Ping your location").click();
    const bounds = await a.getByRole("group", { name: "Private location ping choices" }).boundingBox(); assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width);
    assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await a.screenshot({ path: `${output}/${width}x${height}.png`, fullPage: true }); await a.keyboard.press("Escape");
  }
  await a.emulateMedia({ reducedMotion: "reduce" }); await a.waitForFunction(()=>document.querySelector('[aria-label="Replay route direction"]')?.disabled); assert(await button(a, "Replay route direction").isDisabled());
  await button(a, "Ping your location").click(); await button(a, "Heart ping · only you").click();
  const ping = a.getByRole("img", { name: /Heart above your location/ }); await ping.waitFor();
  assert.equal(await ping.locator("span").evaluate(e => getComputedStyle(e).animationName), "none");
  await button(a, "Clear my location").click(); await ping.waitFor({ state: "detached" }); assert(await button(a, "Ping your location").isDisabled());
  assert.equal(calls.some(c => c.forbiddenPingRequest), false); assert.deepEqual(errors, []);
  writeFileSync(`${output}/result.json`, JSON.stringify({ passed: true, mockedProvider: true, evidence, calls, errors }, null, 2), { mode: 0o600 });
  console.log("PASS FP8 initial authenticated UI suite; seven viewports, reduced motion, no page errors. Live provider truth and full release gates remain separate.");
} catch (error) {
  await a.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  console.error({ failure: "FP8 browser", step, kind: error.name, operation: error.message.split("\n")[0], assertion: error instanceof assert.AssertionError ? error.message.split("\n")[0] : undefined }); process.exitCode = 1;
} finally { await browser.close(); await db.$client.end(); }
