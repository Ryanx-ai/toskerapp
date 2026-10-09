/** Bounded real-provider stages. Persist each response; never silently repeat an attempted road call. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { getDatabase } from "../src/server/db/client.ts";
import { readTrip } from "../src/server/trips/service.ts";
import { resolveQaActors, cleanupQaFixture } from "./lib/ms73-fixtures.ts";
import { routingPlaces } from "../src/lib/trip-contract.ts";
import { roadKey, roadDistance } from "../src/lib/maps/road-contract.ts";
import { ensureFp6QaLogin } from "./lib/fp6-browser.mjs";
const stage = process.argv[2]; assert(["--short", "--long", "--origin"].includes(stage));
const fixture = JSON.parse(readFileSync(".git/fp8-recovery/fixture.json", "utf8")).fixture;
const file = ".git/fp8-recovery/live-truth.json", receipt = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { routes: {}, searches: {}, roads: {}, checks: [] };
const save = () => writeFileSync(file, JSON.stringify(receipt, null, 2), { mode: 0o600 });
const db = getDatabase(), actors = await resolveQaActors(db); await cleanupQaFixture(db, fixture, false);
const budget = (await db.execute(sql`select "window",used from map_provider_usage where scope=${"geoapify:roads:day"}`)).rows[0];
const todayUsed = budget?.window === new Date().toISOString().slice(0,10) ? Number(budget.used) : 0;
// Recover a harness-only response race: no request reached the provider interceptor.
if(stage==="--origin" && receipt.roads["private-origin"] && !receipt.roads["private-origin"].attemptedAt) {
  assert.equal(receipt.roads["private-origin"].geometry?.key,receipt.roads["short-drive"]?.geometry?.key);
  receipt.ignoredHarnessResponse="Shared replay response matched an overly broad test waiter; no private provider attempt was dispatched.";
  delete receipt.roads["private-origin"]; save();
}
const required = stage === "--short" ? ["short-drive","short-walk"].filter(label=>!receipt.roads[label]?.uiVerified).length*4 : stage === "--long" ? (receipt.roads["long-drive"]?.uiVerified?0:4) : 2;
if (todayUsed + required > 60) { await db.$client.end(); throw new Error("STOP: insufficient approved road quota; wait for reset, never alter counters"); }
const origin = "http://localhost:3000", browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, geolocation: { latitude: 1.34, longitude: 103.775, accuracy: 10 }, permissions: ["geolocation"] });
const page = await context.newPage(), errors = []; let armed = null, step = "authentication";
page.on("pageerror", e => errors.push(e.name));
// Keep basemap traffic bounded while testing real geocoding/routing. Canonical gets a separate real-basemap check.
await context.route("https://maps.geoapify.com/**", r => r.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "qa", type: "background", paint: { "background-color": "#142025" } }] } }));
await context.route("**/api/trips/*/roads", async route => {
  assert.equal(decodeURIComponent(new URL(route.request().url()).pathname.split("/")[3]), fixture.slug);
  if (!armed) { errors.push("Unarmed road request blocked before provider"); return route.fulfill({ status: 429, json: { error: "QA guard: unexpected road request blocked" } }); }
  const label = armed; armed = null; receipt.roads[label] = { attemptedAt: new Date().toISOString() }; save(); await route.continue();
});
const button = name => page.getByRole("button", { name, exact: true });
const mode = () => page.getByRole("combobox", { name: "Travel mode", exact: true });
const read = () => readTrip(db, actors.a, fixture.slug);
async function selectRoute(name) {
  await mode().selectOption("planning");
  let plan = await read(), matches = plan.routes.filter(r => r.name === name); assert(matches.length <= 1);
  if (!matches.length) {
    await button("Route").click(); await page.getByLabel("Route name", { exact: true }).fill(name); await button("Save route").click(); await button(name).waitFor({ timeout: 60000 });
    plan = await read(); matches = plan.routes.filter(r => r.name === name); assert.equal(matches.length, 1);
  }
  if (receipt.routes[name]) assert.equal(matches[0].id, receipt.routes[name]);
  receipt.routes[name] = matches[0].id; save(); await button(name).click(); return matches[0].id;
}
async function addSearch(routeId, query, match, reviewedAddress) {
  const existing = receipt.searches[query];
  if (existing?.savedId) { assert((await read()).places.some(p => p.id === existing.savedId)); return; }
  assert(!existing?.attempted || (reviewedAddress && !existing.reviewedRetry), "Unfinished search: recover response before repeating provider traffic");
  receipt.searches[query] = { ...existing, attempted: true, ...(existing?.attempted ? { reviewedRetry: true, reviewedAddress } : {}) }; save();
  const pending = page.waitForResponse(r => r.url().includes("/places") && r.request().method() === "POST" && r.request().postDataJSON()?.query === query, { timeout: 30000 });
  await page.getByLabel("Search places", { exact: true }).fill(query); const response = await pending; assert(response.ok());
  const data = await response.json();
  receipt.searches[query].observed = data.candidates.map(p => ({ title: p.candidate.title, address: p.candidate.address, latitude: p.candidate.latitude, longitude: p.candidate.longitude })); save();
  // Deliberate venue selection, never "save result zero". Ambiguous/missing match stops for inspection.
  const matches = data.candidates.filter(p => match.test(p.candidate.title) && (!reviewedAddress || p.candidate.address === reviewedAddress)); assert.equal(matches.length, 1, "Exact QA venue must resolve uniquely");
  const chosen = matches[0].candidate;
  await page.getByRole("list", { name: "Place search results" }).getByRole("button").filter({ has: page.getByText(chosen.address, { exact: true }) }).click();
  await page.getByRole("region", { name: "Place preview" }).waitFor();
  const before = await read(); assert(!before.places.some(p => p.providerId === chosen.providerId && before.memberships.some(m => m.placeId === p.id && m.routeId === routeId)));
  await button("Add to Route").click(); await page.getByText("Added to this route.", { exact: true }).waitFor({ timeout: 60000 });
  const after = await read(), card = routingPlaces(after, routeId).find(p => p.providerId === chosen.providerId); assert(card);
  assert.equal(card.latitude, chosen.latitude); assert.equal(card.longitude, chosen.longitude);
  receipt.searches[query].savedId = card.id; receipt.searches[query].selection = "Unique explicit venue-name match, previewed, then Add to Route"; save(); await page.keyboard.press("Escape");
}
async function road(label, trigger, points, travelMode) {
  assert(!receipt.roads[label], "Road already attempted: inspect its durable receipt, do not replay");
  armed = label; const pending = page.waitForResponse(r => r.url().includes("/roads") && r.request().method() === "POST" && Boolean(r.request().postDataJSON()?.origin)===(label==="private-origin"), { timeout: 90000 });
  await trigger(); const response = await pending, body = await response.json();
  receipt.roads[label] = { ...receipt.roads[label], status: response.status(), serverTiming: response.headers()["server-timing"], geometry: body.geometry, error: body.error }; save();
  assert(response.ok(), `Real road ${label} returned ${response.status()}`);
  const g = body.geometry; assert.equal(g.key, roadKey(points, travelMode)); assert.equal(g.segments.length, points.length - 1); assert.equal(g.estimate.legs.length, points.length - 1); assert(g.segments.flat().length > points.length * 2);
  receipt.checks.push(`${label}: real provider geometry and per-leg metrics match current ordered IDs`); save(); return g;
}
try {
  await page.goto(`${origin}/room/${fixture.slug}/map`); await ensureFp6QaLogin(page, "a"); await page.goto(`${origin}/room/${fixture.slug}/map`); await page.locator('[data-map-state="ready"]').waitFor({ timeout: 60000 });
  if (stage === "--short" || stage === "--long") {
    const short = stage === "--short", name = short ? "FP8 Short — Singapore" : "FP8 Long — Singapore";
    step = `create/search ${name}`; const routeId = await selectRoute(name);
    const searches = short ? [["Merlion Park", /^merlion park$/i, "Merlion Park, Singapore 049213, Singapore"], ["Gardens by the Bay", /^gardens by the bay$/i, "Gardens by the Bay, 11 Marina Gardens Drive, Singapore 019396, Singapore"], ["Marina Bay Sands", /^marina bay sands$/i, "Marina Bay Sands, 10 Bayfront Avenue, Singapore 018956, Singapore"]] : [["Jurong East MRT", /jurong east/i], ["Woodlands MRT", /^woodlands(?: mrt)?$/i], ["Jewel Changi Airport", /^jewel(?: changi airport)?$/i]];
    for (const [query, match, address] of searches) { step = `search ${query}`; await addSearch(routeId, query, match, address); }
    const points = routingPlaces(await read(), routeId); assert.equal(points.length, 3);
    for (const travelMode of short ? ["drive", "walk"] : ["drive"]) {
      const label = `${short ? "short" : "long"}-${travelMode}`; if (receipt.roads[label]?.uiVerified) continue;
      step = label; const g = await road(label, () => mode().selectOption(travelMode), points, travelMode);
      await page.getByLabel("Route summary", { exact: true }).locator("summary").getByText(new RegExp(roadDistance(g.estimate.metres).replace(".", "\\."))).waitFor();
      await button("Fit trip").click(); await page.screenshot({ path: `.git/fp8-recovery/${label}.png` });
      receipt.roads[label].uiVerified = true; save();
      await mode().selectOption("planning"); await new Promise(resolve => setTimeout(resolve, 6100));
    }
  } else {
    step = "private origin"; const routeId = await selectRoute("FP8 Short — Singapore"), saved = routingPlaces(await read(), routeId); assert.equal(saved.length, 3);
    // Restore a previously validated shared road only in this test harness, avoiding another paid calculation.
    const shared = receipt.roads["short-drive"]?.geometry; assert(shared && shared.key === roadKey(saved, "drive"));
    await page.route("**/api/trips/*/roads", async route => { if (!route.request().postDataJSON().origin) return route.fulfill({ json: { geometry: shared } }); await route.fallback(); });
    await mode().selectOption("drive"); await button("Locate me").click(); await page.locator("[data-private-origin]").waitFor();
    await button("Route from here").click(); const points = [{ id: "private-origin", latitude: 1.34, longitude: 103.775 }, saved[0]];
    const g = await road("private-origin", () => button("Allow private route").click(), points, "drive");
    await page.locator("[data-private-origin]").getByText(new RegExp(roadDistance(g.estimate.metres).replace(".", "\\."))).waitFor();
    receipt.originTiming = await page.evaluate(() => Object.fromEntries(performance.getEntriesByType("mark").filter(e => e.name.startsWith("tosker-map:")).map(e => [e.name, Math.round(e.startTime)]))); receipt.originEmulated = true; save();
    await button("Clear my location").click(); assert.equal(await page.locator("[data-private-origin]").count(), 0);
  }
  assert.deepEqual(errors, []); receipt.checks.push(`${stage} completed without page errors`); save(); console.log({ passed: stage, checks: receipt.checks, realRoads: Object.fromEntries(Object.entries(receipt.roads).map(([label, r]) => [label, { status: r.status, metres: r.geometry?.estimate?.metres, seconds: r.geometry?.estimate?.seconds, providerTiming: r.serverTiming }])) });
} catch (error) { await page.screenshot({ path: ".git/fp8-recovery/truth-failure.png", fullPage: true }).catch(() => {}); console.error({ failure: "FP8 real provider gate", step, kind: error.name, assertion: error instanceof assert.AssertionError ? error.message.split("\n")[0] : undefined }); process.exitCode = 1; }
finally { await browser.close(); await db.$client.end(); }
