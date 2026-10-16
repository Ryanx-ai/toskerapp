/** Founder-authorized hosted QA. Exact retained FP1 fixture, fresh normal A/B
 * sessions, synthetic GPS, no founder session or direct database mutation. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parse } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, installLiveMetrics, leaveLiveBeforeClose, liveJoined, liveCount } from "./lib/ms74-browser.mjs";

process.chdir("/Users/ryanc/Developer/toskerapp");
const phase = process.argv[2];
const mode = process.argv[3] ?? "privacy";
assert(["privacy", "live", "map", "expiry"].includes(mode));
assert(["stage", "canonical"].includes(phase));
const target = JSON.parse(readFileSync(`.git/ms74-fp3/final-${phase}-20261017.json`, "utf8"));
assert.equal(target.readyState, "READY");
assert.equal(target.projectId, "prj_cxYhH8ypeFmuPOiEBC0gf0Rbzmau");
assert.equal(target.sha, "a166934b6d348dd84ab9c78f35a73e9ce6f661b1");
assert.equal(target.canonical, phase === "canonical");
const origin = phase === "stage" ? "https://tosker-q9zhxkxl5-pangea6.vercel.app" : "https://toskerapp.vercel.app";
assert.equal(target.origin, origin);
const oidc = phase === "stage" ? process.env.VERCEL_OIDC_TOKEN : undefined;
if (phase === "stage") {
  assert(oidc);
  const claims = JSON.parse(Buffer.from(oidc.split(".")[1], "base64url").toString());
  assert(claims.exp * 1000 > Date.now() + 900000, "Fresh access token required");
}
const env = parse(readFileSync(".env.development.local"));
assert(env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
const review = parse(readFileSync(".git/ms74-fp3/review-database.env"));
assert.notEqual(new URL(env.DATABASE_URL).hostname, new URL(review.DATABASE_URL).hostname);
const sql = neon(env.DATABASE_URL);
const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
assert.equal(fixture.slug, "ms74-fp1-qa-a39d9eea");
const founders = await sql`select id from users where tid='8V3X7P1'`;
assert.equal(founders.length, 1);
const actors = await sql`select u.id,u.auth_subject,p.username from users u join profiles p on p.user_id=u.id
  where p.username in ('tosker-user-a-clerk-test','tosker-user-b-clerk-test') order by p.username`;
assert.equal(actors.length, 2); assert(!actors.some(a => a.id === founders[0].id));
assert.equal((await sql`select 1 from rooms where id=${fixture.roomId}::uuid and slug=${fixture.slug} and owner_id=${actors[0].id}::uuid`).length, 1);
for (const id of [...actors.map(a => a.id), founders[0].id]) assert.equal((await sql`select 1 from room_memberships where room_id=${fixture.roomId}::uuid and user_id=${id}::uuid`).length, 1);
const counts = async () => (await sql`select (select count(*)::int from location_latest) payloads,
  (select count(*)::int from location_shares where expires_at>clock_timestamp()) active_consents`)[0];
const initial = await counts(); assert.equal(initial.payloads, 0); assert.equal(initial.active_consents, 0);
const directory = ".git/ms74-fp3/browser"; mkdirSync(directory, { recursive: true, mode: 0o700 });
const receipt = `${directory}/hosted-${phase}-${mode}-${Date.now()}.json`;
const evidence = { pass: false, phase, mode, sha: target.sha, at: new Date().toISOString(), cases: [], api: [], errors: [], sessions: [], cleanupErrors: 0, mockedBasemap: mode !== "map", providerCalls: 0, clientAssets: [] };
const serverNames = ["DATABASE_URL", "CLERK_SECRET_KEY", "ABLY_API_KEY", "ROOM_INVITE_ENCRYPTION_KEY", "GEOAPIFY_SEARCH_KEY", "NEON_API_KEY"];
const serverValues = [...new Set([env, parse(readFileSync(".env.local"))].flatMap(e => serverNames.map(k => e[k]).filter(Boolean)))];
const scanned = new Set();
const save = () => writeFileSync(receipt, JSON.stringify(evidence, null, 2), { mode: 0o600 });
const record = (name, values = {}) => { evidence.cases.push({ name, ...values }); save(); console.log(JSON.stringify({ gate: name, ...values })); };
save();
const browser = await chromium.launch({ headless: true }), contexts = [], pages = [];
let step = "normal QA sign-in";
const marker = page => page.locator('[aria-label*="shared a temporary position"]');
const peers = page => page.getByRole("list", { name: "Shared location snapshots" });
const locate = page => page.getByRole("button", { name: "Locate", exact: true });
const response = (page, action) => page.waitForResponse(r => new URL(r.url()).pathname === "/api/location-sharing" && r.request().postDataJSON()?.action === action, { timeout: 45000 });
async function map(page) {
  await page.goto(`${origin}/room/${fixture.slug}/map`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-map-state="ready"]').waitFor({ timeout: 60000 });
  await locate(page).waitFor();
}
async function share(page, precision) {
  assert.equal(await locate(page).getAttribute("aria-pressed"), "false");
  await locate(page).click();
  await page.getByRole("heading", { name: "Share your location with this conversation?" }).waitFor();
  assert(await page.getByRole("radio", { name: "Broad area only (default)", exact: true }).isChecked());
  if (precision === "precise") await page.getByRole("radio", { name: "Precise position on peers’ Maps", exact: true }).check();
  const sent = response(page, "send");
  await page.getByRole("button", { name: precision === "precise" ? "Share precise position" : "Share broad area", exact: true }).click();
  assert.equal((await sent).status(), 200);
}
async function stop(page) {
  const stopped = response(page, "stop"); await locate(page).click();
  assert.equal((await stopped).status(), 200); assert.equal(await locate(page).getAttribute("aria-pressed"), "false");
}
async function removal(receiver, trigger) {
  await receiver.evaluate(() => {
    window.__removalStart = performance.now();
    window.__removal = new Promise(resolve => {
      const observer = new MutationObserver(() => {
        if (!document.querySelector('[aria-label*="shared a temporary position"]')) {
          observer.disconnect(); resolve(performance.now() - window.__removalStart);
        }
      }); observer.observe(document.body, { childList: true, subtree: true });
    });
  });
  await trigger(); await marker(receiver).waitFor({ state: "detached", timeout: 10000 });
  return Math.round(await receiver.evaluate(() => window.__removal));
}
function instrument(page) {
  page.on("pageerror", error => evidence.errors.push(error.name));
  const starts = new WeakMap();
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/location-sharing") starts.set(request, performance.now()); });
  page.on("response", async r => {
    const url = new URL(r.url());
    if (url.origin === origin && /\.(js|css)$/.test(url.pathname) && !scanned.has(url.pathname)) {
      scanned.add(url.pathname);
    }
    if (url.hostname.endsWith("geoapify.com") && mode === "map") evidence.providerCalls++;
    if (new URL(r.url()).pathname !== "/api/location-sharing") return;
    const item = { action: r.request().postDataJSON()?.action, status: r.status(), ms: Math.round(performance.now() - starts.get(r.request())) };
    evidence.api.push(item);
    if (item.action === "current" && item.status === 200) {
      const body = await r.json().catch(() => null);
      item.nonempty = (body?.peers?.length ?? 0) > 0;
    }
  });
}
try {
  if (mode === "map") {
    const denied = await fetch(`${origin}/api/location-sharing`, {method:"POST",headers:{"Content-Type":"application/json",Origin:origin,...(oidc?{"x-vercel-trusted-oidc-idp-token":oidc}:{})},body:JSON.stringify({action:"current",conversationId:fixture.conversationId}),redirect:"error"});
    assert.equal(denied.status,401);
    const body=await denied.json(); assert(!("peers" in body));
    record("Vercel access does not bypass application authentication");
  }
  for (const [index, actor] of (mode === "map" ? ["a"] : ["a", "b"]).entries()) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, geolocation: { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, permissions: ["geolocation"], serviceWorkers: "block" });
    contexts.push(context); await installLiveMetrics(context);
    // OIDC scoped to this immutable deployment only, never Clerk/Ably/providers.
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.hostname.endsWith("geoapify.com") && mode !== "map") {
        if (url.pathname.endsWith("style.json")) return route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "privacy-test-background", type: "background", paint: { "background-color": "#0d171b" } }] } });
        return route.abort();
      }
      if (oidc && url.origin === origin) return route.continue({ headers: { ...route.request().headers(), "x-vercel-trusted-oidc-idp-token": oidc } });
      return route.continue();
    });
    const page = await context.newPage(); pages.push(page); instrument(page);
    await loginLive(page, actor, fixture, origin);
    const identity = await page.evaluate(() => ({ subject: window.Clerk.user.id, session: window.Clerk.session.id }));
    assert.equal(identity.subject, actors[index].auth_subject);
    evidence.sessions.push({ id: identity.session, closed: false }); save();
    await map(page);
    assert.equal(await page.getByRole("button", { name: "Share location", exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Refresh snapshot", exact: true }).count(), 0);
  }
  const [a, b] = pages;
  record("fresh normal QA A/B; exact owned Room; synthetic GPS; production UI gates");
  if (mode === "privacy") {
  step = "broad A to B";
  await share(a, "area"); await peers(b).waitFor({ timeout: 30000 });
  assert.equal(await marker(b).count(), 0);
  const rows = await sql`select l.latitude,l.longitude from location_latest l join location_shares s on s.id=l.lease_id where s.conversation_id=${fixture.conversationId}::uuid`;
  assert(rows.length > 0 && rows.every(r => r.latitude === null && r.longitude === null));
  record("broad A to B without stored coordinates or precise marker");
  await stop(a); await peers(b).waitFor({ state: "detached", timeout: 10000 });
  step = "precise B to A and nonempty browser read sample";
  await share(b, "precise"); await marker(a).waitFor({ timeout: 30000 });
  const sampleStart = evidence.api.length;
  // Observe real application polling; no synthetic load or arbitrary readiness delay.
  while (evidence.api.slice(sampleStart).filter(r => r.action === "current" && r.nonempty).length < 20) {
    const r = await response(a, "current"); assert.equal(r.status(), 200);
    assert((await r.json()).peers.length > 0);
    assert(evidence.api.length - sampleStart < 100, "Nonempty sample failed to progress");
  }
  const sample = evidence.api.slice(sampleStart).filter(r => r.action === "current" && r.nonempty).map(r => r.ms).sort((x,y) => x-y);
  const p95 = sample[Math.ceil(sample.length * .95) - 1];
  record("bounded nonempty hosted browser sample; not beta load certification", { n: sample.length, p95Ms: p95, maxMs: sample.at(-1) });
  assert(p95 < 5000);
  step = "cold reload receiver";
  await map(a); await marker(a).waitFor({ timeout: 30000 });
  record("receiver reload recovers authorized precise snapshot");
  const second = await contexts[0].newPage(); pages.push(second); instrument(second);
  await map(second); await marker(second).waitFor({ timeout: 30000 });
  record("second receiver tab recovers current truth");
  step = "timed precise Stop";
  const ms = await removal(a, () => stop(b)); assert(ms <= 5000);
  await marker(second).waitFor({ state: "detached", timeout: 10000 });
  record("Locate OFF removes precise peer from both tabs", { firstAbsenceMs: ms });
  await second.close(); pages.pop();
  step = "precise A to B; disconnect and reconnect";
  await share(a, "precise"); await marker(b).waitFor({ timeout: 30000 });
  const networkMs = await removal(b, async () => { await contexts[1].setOffline(true); await b.evaluate(() => window.__liveQa.cut()); });
  assert(networkMs <= 5000); await stop(a);
  await contexts[1].setOffline(false); await b.evaluate(() => { window.__liveQa.restore(); window.dispatchEvent(new Event("online")); });
  assert.equal((await response(b, "current")).status(), 200); assert.equal(await marker(b).count(), 0);
  record("precise A to B; network-loss removal; reconnect no stale resurrection", { firstAbsenceMs: networkMs });
  }
  if (mode === "live") {
  step = "Live A/B continuity";
  for (const page of pages) {
    await page.goto(`${origin}/room/${fixture.slug}?surface=map&companion=live`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Join Live", exact: true }).click(); await liveJoined(page);
  }
  await liveCount(a, 2); await liveCount(b, 2);
  record("hosted Live A/B roster2 and bounded participant cards");
  for (const page of pages) {
    const metrics = await page.evaluate(() => window.__liveQa.snapshot());
    assert(metrics.maxConnections <= 1 && metrics.payloadSafe);
    step = "Live explicit Leave and peer reconciliation";
    // The persistent workspace header also offers Leave. Exercise the panel
    // control explicitly rather than treating two legitimate controls as one.
    await page.locator(".live-panel").getByRole("button", { name: "Leave Live", exact: true }).click({ timeout: 15000 });
    await page.locator(".live-panel").getByRole("button", { name: "Join Live", exact: true }).waitFor({ timeout: 15000 });
  }
  record("hosted bounded participant cards and real Live A/B Join/Leave");
  }
  if (mode === "map") {
    step = "real basemap and six-width composition";
    for (const width of [320,390,430,768,1440,1728]) {
      await a.setViewportSize({width,height:1000});
      const pane = a.getByRole("group",{name:"Visible workspace pane"});
      if (await pane.count()) await pane.getByRole("button",{name:"Map",exact:true}).click();
      // A breakpoint may remount the canvas. Observe the new renderer's load
      // signal rather than capturing its intentionally empty loading frame.
      await a.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await a.locator('[data-map-state="ready"]').waitFor({timeout:30000});
      await a.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const geometry = await a.evaluate(() => ({overflow:document.documentElement.scrollWidth>innerWidth+1, attribution:!!document.querySelector(".maplibregl-ctrl-attrib") }));
      assert(!geometry.overflow && geometry.attribution);
      await a.screenshot({path:`${directory}/hosted-${phase}-map-${width}.png`,fullPage:true});
      record("real Map responsive shell and attribution",{width,...geometry});
    }
    assert(evidence.providerCalls>0 && evidence.providerCalls<250);
  }
  if (mode === "expiry") {
    step = "natural hosted browser expiry and physical deletion";
    await share(a,"precise"); await marker(b).waitFor({timeout:30000});
    const lease = (await sql`select id,expires_at from location_shares where user_id=${actors[0].id}::uuid and conversation_id=${fixture.conversationId}::uuid`)[0];
    assert(lease); const expiry = Date.parse(lease.expires_at);
    record("natural five-minute expiry observation started");
    await marker(b).waitFor({state:"detached",timeout:310000});
    const firstAbsenceAt = Date.now();
    // Independent DB reads around the known expiry, never trigger a sweep locally.
    while (Date.now() < expiry) await new Promise(resolve => setTimeout(resolve,Math.min(1000,expiry-Date.now())));
    let deletedAt;
    while (Date.now()<expiry+60000) {
      if (!(await sql`select 1 from location_latest where lease_id=${lease.id}::uuid`).length) {deletedAt=Date.now();break;}
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
    assert(deletedAt && deletedAt-expiry<=60000);
    assert.equal(await marker(b).count(),0);
    record("natural expiry inaccessible; hosted queue deletes active payload",{firstAbsenceRelativeToExpiryMs:firstAbsenceAt-expiry,deletionObservedWithinMs:deletedAt-expiry});
  }
  // Re-read observed same-origin immutable assets explicitly. Browser response
  // bodies can disappear during normal sign-in redirects; never let an async
  // observer rejection bypass the owned-session teardown.
  for (const path of scanned) {
    const asset = await fetch(origin+path,{headers:oidc?{"x-vercel-trusted-oidc-idp-token":oidc}:{},redirect:"error"});
    assert.equal(asset.status,200); const body=Buffer.from(await asset.arrayBuffer());
    assert(!serverValues.some(v=>[v,JSON.stringify(v).slice(1,-1),encodeURIComponent(v)].some(x=>body.includes(Buffer.from(x)))),"Server credential match; content suppressed");
    evidence.clientAssets.push({path,sha256:createHash("sha256").update(body).digest("hex")});
  }
  assert(evidence.clientAssets.length>10);
  record("served client asset credential scan",{assets:evidence.clientAssets.length,serverValuesPrinted:false});
  assert.equal(evidence.errors.length, 0); evidence.pass = true;
} catch (error) {
  evidence.failedStep = step; evidence.failure = error.name;
  evidence.timeout = /Timeout \d+ms exceeded/.exec(error.message)?.[0];
  evidence.strictLocator = error.message.includes("strict mode violation");
  evidence.failureLine = error.stack?.match(/browser-ms74-fp3-hosted\.mjs:(\d+):\d+/)?.[1]; process.exitCode = 1;
} finally {
  for (const context of contexts) await context.setOffline(false).catch(() => {});
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    if (page.isClosed()) continue;
    // A naturally expired share can still have a private Locate marker. Clear
    // that UI without incorrectly requiring a new server Stop request.
    if (await locate(page).getAttribute("aria-pressed").catch(() => null) === "true") {
      await locate(page).click({timeout:10000}).catch(() => {});
    }
    await leaveLiveBeforeClose(page).catch(() => {});
    const closed = await page.evaluate(async () => {
      if (window.Clerk?.session?.status !== "active") return true;
      const r = await fetch("/api/realtime/logout", { method: "POST" });
      if (![200, 401, 403].includes(r.status)) return false;
      await window.Clerk.signOut(); return true;
    }).catch(() => false);
    if (evidence.sessions[index]) evidence.sessions[index].closed = closed;
    if (!closed) evidence.cleanupErrors++;
  }
  await browser.close(); evidence.finalCounts = await counts();
  if (evidence.cleanupErrors || evidence.finalCounts.payloads || evidence.finalCounts.active_consents) { evidence.pass = false; process.exitCode = 1; }
  save(); console.log(JSON.stringify({ pass: evidence.pass, phase, failedStep: evidence.failedStep, failure: evidence.failure, finalCounts: evidence.finalCounts, cleanupErrors: evidence.cleanupErrors, receipt }));
}
