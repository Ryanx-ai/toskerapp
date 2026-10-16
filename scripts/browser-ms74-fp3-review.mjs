/** Founder-approved Playwright path: fresh normal QA logins, isolated DB and
 * synthetic GPS only. No stored auth, founder profile, network trace or GPS log.
 * Empty offline basemap isolates privacy tests; this is not visual Map evidence. */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { neon } from "@neondatabase/serverless";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { reviewEnvironment, REVIEW_PROJECT } from "./ms74-fp3-review-runtime.mjs";
import { loginLive, installLiveMetrics, leaveLiveBeforeClose, liveJoined, liveCount } from "./lib/ms74-browser.mjs";

const env = reviewEnvironment(), sql = neon(env.DATABASE_URL);
const fixture = JSON.parse(readFileSync(".git/ms74-fp3/review-fixture.json", "utf8"));
assert.equal(fixture.project, REVIEW_PROJECT); assert.equal(fixture.status, "committed");
assert.equal(fixture.run, "ms74-fp3-review-20261016");
const mode = process.argv[2] ?? "removal";
assert(["removal", "outage", "session", "pending", "late", "contexts", "private", "live", "live-responsive", "membership", "timeout"].includes(mode));
const counts = async () => (await sql`select
  (select count(*)::int from location_latest) payloads,
  (select count(*)::int from location_shares where expires_at>clock_timestamp()) active_consents,
  (select count(*)::int from location_cleanup_workers where ends_at>clock_timestamp()) workers`)[0];
const initial = await counts(); assert.equal(initial.payloads, 0); assert.equal(initial.active_consents, 0); assert.equal(initial.workers, 1);
const directory = ".git/ms74-fp3/browser"; mkdirSync(directory, { recursive: true, mode: 0o700 });
const receipt = `${directory}/review-${mode}-${Date.now()}.json`;
const evidence = { pass: false, mode, at: new Date().toISOString(), sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), cases: [], errors: [], api: [], mockedBasemap: true, providerCalls: 0, cleanupErrors: 0 };
const save = () => writeFileSync(receipt, JSON.stringify(evidence, null, 2), { mode: 0o600 });
const record = (name, values = {}) => { evidence.cases.push({ name, ...values }); save(); console.log(JSON.stringify({ gate: name, ...values })); };
let step = "fresh normal QA login";
const browser = await chromium.launch({ headless: true }), pages = [], contexts = [];
const marker = page => page.locator('[aria-label*="shared a temporary position"]');
const locate = page => page.getByRole("button", { name: "Locate", exact: true });
const actionResponse = (page, action) => page.waitForResponse(r => new URL(r.url()).pathname === "/api/location-sharing" && r.request().postDataJSON()?.action === action, { timeout: 45000 });
async function share(page, precision = "precise") {
  assert.equal(await locate(page).getAttribute("aria-pressed"), "false");
  await locate(page).click();
  await page.getByRole("heading", { name: "Share your location with this conversation?" }).waitFor();
  assert(await page.getByRole("radio", { name: "Broad area only (default)", exact: true }).isChecked());
  if (precision === "precise") await page.getByRole("radio", { name: "Precise position on peers’ Maps", exact: true }).check();
  const result = actionResponse(page, "send");
  await page.getByRole("button", { name: precision === "precise" ? "Share precise position" : "Share broad area", exact: true }).click();
  assert.equal((await result).status(), 200);
}
async function stop(page) {
  const response = actionResponse(page, "stop");
  await locate(page).click(); assert.equal((await response).status(), 200);
  assert.equal(await locate(page).getAttribute("aria-pressed"), "false");
}
async function removal(receiver, trigger) {
  assert(await marker(receiver).count() > 0);
  // A DOM observer provides same-process monotonic timing, not tool-roundtrip estimates.
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
  await trigger();
  await marker(receiver).waitFor({ state: "detached", timeout: 10000 });
  return Math.round(await receiver.evaluate(() => window.__removal));
}
try {
  for (const actor of ["a", "b"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, geolocation: { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, permissions: ["geolocation"] });
    contexts.push(context); await installLiveMetrics(context);
    await context.route("**/*geoapify.com/**", route => new URL(route.request().url()).pathname.endsWith("style.json")
      ? route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "privacy-test-background", type: "background", paint: { "background-color": "#0d171b" } }] } }) : route.abort());
    const page = await context.newPage(); pages.push(page);
    page.on("pageerror", error => evidence.errors.push(error.name));
    const starts = new WeakMap();
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/location-sharing") starts.set(request, performance.now()); });
    page.on("response", r => { if (new URL(r.url()).pathname === "/api/location-sharing") evidence.api.push({ action: r.request().postDataJSON()?.action, status: r.status(), ms: Math.round(performance.now() - starts.get(r.request())) }); });
    await loginLive(page, actor, fixture);
    await page.goto(`http://localhost:3000/room/${fixture.slug}/map`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-map-state="ready"]').waitFor({ timeout: 60000 });
    await locate(page).waitFor();
    assert.equal(await page.getByRole("button", { name: "Share location", exact: true }).count(), 0);
  }
  const [a, b] = pages;
  record("fresh isolated A/B normal sign-in; synthetic GPS; production-mode single Locate");
  if (mode === "removal") {
    step = "timed Locate OFF peer removal";
    await share(a); await marker(b).waitFor({ timeout: 30000 });
    const ms = await removal(b, () => stop(a));
    record("Locate OFF peer removal", { ms }); assert(ms <= 5000, "Peer removal exceeded five seconds");
    step = "receiver network failure deadline";
    await share(b); await marker(a).waitFor({ timeout: 30000 });
    const networkMs = await removal(a, async () => { await contexts[0].setOffline(true); await a.evaluate(() => window.__liveQa.cut()); });
    record("receiver network loss clears peer", { ms: networkMs }); assert(networkMs <= 5000);
    await stop(b);
    await contexts[0].setOffline(false); await a.evaluate(() => { window.__liveQa.restore(); window.dispatchEvent(new Event("online")); });
    const current = await actionResponse(a, "current"); assert.equal(current.status(), 200);
    assert.equal(await marker(a).count(), 0);
    record("receiver reconnect does not resurrect stopped snapshot");
  } else if (mode === "outage") {
    step = "unconfirmed Stop and explicit retry";
    await share(a); await marker(b).waitFor({ timeout: 30000 });
    let failStop = true;
    await a.route("**/api/location-sharing", route => route.request().postDataJSON()?.action === "stop" && failStop ? route.fulfill({ status: 503, json: { error: "Synthetic QA outage" } }) : route.continue());
    await locate(a).click(); await a.getByRole("alert").filter({ hasText: "Server deletion is unconfirmed" }).waitFor();
    assert.equal(await locate(a).getAttribute("aria-pressed"), "false");
    const beginCount = evidence.api.filter(x => x.action === "begin").length;
    failStop = false; await stop(a); await marker(b).waitFor({ state: "detached", timeout: 10000 });
    assert.equal(evidence.api.filter(x => x.action === "begin").length, beginCount);
    assert.equal(await a.getByRole("heading", { name: "Share your location with this conversation?" }).count(), 0);
    record("unconfirmed Stop stays truthful; Locate retries deletion without acquiring or reconsenting");
  } else if (mode === "session") {
    step = "session revocation timed peer removal";
    await share(a); await marker(b).waitFor({ timeout: 30000 });
    let result;
    const ms = await removal(b, async () => {
      result = await a.evaluate(async conversationId => {
        const token = await window.Clerk.session.getToken();
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
        const start = performance.now();
        const logout = await fetch("/api/realtime/logout", { method: "POST", headers });
        const duration = Math.round(performance.now() - start);
        const denied = await fetch("/api/location-sharing", { method: "POST", headers, body: JSON.stringify({ action: "current", conversationId }) });
        return { status: logout.status, oldToken: denied.status, duration };
      }, fixture.conversationId);
    });
    record("real browser session logout", { ...result, peerRemovalMs: ms });
    assert.equal(result.status, 200); assert([401, 403].includes(result.oldToken)); assert(ms <= 5000);
  } else if (mode === "timeout") {
    step = "synthetic geolocation timeout and error accessibility";
    // Controlled platform-error injection in a disposable authorized QA context,
    // not real device GPS or a change to authentication/application state.
    await a.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (_success, failure) => queueMicrotask(() => failure({ code: 3, message: "Synthetic QA timeout" }));
    });
    await locate(a).click();
    await a.getByText("Location timed out. Try again when ready.", { exact: true }).waitFor();
    assert.equal(await locate(a).getAttribute("aria-pressed"), "false");
    assert.equal(await a.locator("[data-private-origin]").count(), 0);
    assert.equal(evidence.api.filter(x => ["begin", "send"].includes(x.action)).length, 0);
    const widths = process.argv[3] === "remaining-widths" ? [390, 430, 768, 1440, 1728] : [320, 390, 430, 768, 1440, 1728];
    for (const width of widths) {
      await a.setViewportSize({ width, height: 1000 }); await a.emulateMedia({ reducedMotion: "reduce" });
      const foreground = a.getByRole("group", { name: "Visible workspace pane" });
      if (await foreground.count() && new URL(a.url()).searchParams.get("pane") !== "map") {
        await foreground.getByRole("button", { name: "Map", exact: true }).click();
        // The workspace intentionally focuses its newly selected pane on the
        // next frame. Observe that transition before testing keyboard traversal.
        await a.waitForFunction(() => document.activeElement?.getAttribute("data-workspace-pane") === "map", {}, { timeout: 5000 });
      }
      for (let tabs = 0; tabs < 40 && !await locate(a).evaluate(button => button === document.activeElement); tabs++) await a.keyboard.press("Tab");
      const geometry = await locate(a).evaluate(button => {
        const rect = button.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1, height: rect.height,
          focused: button === document.activeElement, outline: getComputedStyle(button).outlineStyle,
          onscreen: rect.top >= 0 && rect.bottom <= innerHeight };
      });
      evidence.observations ??= []; evidence.observations.push({ width, ...geometry }); save();
      assert(!geometry.overflow && geometry.height >= 44 && geometry.focused && geometry.outline !== "none" && geometry.onscreen);
      await a.screenshot({ path: `${directory}/review-timeout-${width}.png`, fullPage: true });
      record("synthetic timeout stays private; responsive keyboard Locate retry", { width, ...geometry });
    }
  } else if (mode === "membership") {
    step = "exact-owned receiver membership removal timing";
    const tag = `browser-${Date.now()}`;
    const membership = flag => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/ms74-fp3-review-membership.ts", flag, tag], { env, stdio: "ignore" });
      child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error("Exact membership operation failed; inspect owned receipt")));
    });
    try {
      await share(a); await marker(b).waitFor({ timeout: 30000 });
      const ms = await removal(b, () => membership("--remove-b"));
      record("receiver membership revocation peer removal", { ms }); assert(ms <= 5000);
      // The workspace may safely fall back to the viewer's Sandbox instead of
      // retaining the revoked Room's unavailable screen. Assert authorization,
      // not one particular fallback heading.
      const denied = await b.evaluate(async conversationId => {
        const token = await window.Clerk.session.getToken();
        const r = await fetch("/api/location-sharing", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "current", conversationId }) });
        return r.status;
      }, fixture.conversationId);
      assert.equal(denied, 403);
      assert.equal(await marker(b).count(), 0);
    } finally {
      const receipt = JSON.parse(readFileSync(`.git/ms74-fp3/review-membership-test-${tag}.json`, "utf8"));
      if (receipt.status === "removed") await membership("--restore-b");
      else assert.equal(receipt.status, "restored", "Membership needs receipt-based recovery");
    }
    await stop(a);
    record("exact original QA B membership restored; founder stable; no location restored");
  } else if (mode === "contexts") {
    const go = async (page, path) => {
      await page.goto(`http://localhost:3000${path}`, { waitUntil: "domcontentloaded" });
      await page.locator('[data-map-state="ready"]').waitFor({ timeout: 60000 });
    };
    for (const [name, path] of [
      ["everyone Subroom", `/room/${fixture.slug}/subroom/${fixture.everyoneId}/map`],
      ["Personal", `/personal/chat-${fixture.personalId}/map`],
    ]) {
      step = `${name} sender and receiver`;
      await go(a, path); await go(b, path);
      await share(a, "area");
      await b.getByRole("list", { name: "Shared location snapshots" }).waitFor({ timeout: 30000 });
      assert.equal(await marker(b).count(), 0);
      await stop(a); await b.getByRole("list", { name: "Shared location snapshots" }).waitFor({ state: "detached" });
      record(`${name}: explicit broad sender consent, authorized receiver, no precise marker, Stop`);
    }
    step = "selected Subroom exact audience";
    await go(a, `/room/${fixture.slug}/subroom/${fixture.selectedId}/map`);
    await go(b, `/room/${fixture.slug}/map`);
    await share(a);
    const response = await actionResponse(b, "current"); assert.equal(response.status(), 200);
    assert.equal((await response.json()).peers.length, 0); assert.equal(await marker(b).count(), 0);
    await b.goto(`http://localhost:3000/room/${fixture.slug}/subroom/${fixture.selectedId}/map`, { waitUntil: "domcontentloaded" });
    await b.getByText("404", { exact: true }).waitFor();
    assert.equal(await locate(b).count(), 0); await stop(a);
    record("selected Subroom sender allowed; unauthorized B denied; Room audience receives nothing");
    step = "Sandbox private only";
    await go(a, "/personal/my-room/map");
    const prior = evidence.api.filter(x => x.action === "begin").length;
    await locate(a).click(); await a.locator('[aria-label="You, accuracy about 50 metres. Visible only to you."]').waitFor();
    assert.equal(await a.getByRole("heading", { name: "Share your location with this conversation?" }).count(), 0);
    assert.equal(evidence.api.filter(x => x.action === "begin").length, prior);
    await locate(a).click(); assert.equal(await a.locator("[data-private-origin]").count(), 0);
    record("Sandbox Locate stays private without consent prompt or publication");
  } else if (mode === "private") {
    step = "private fixed origin and explicit renewal";
    await locate(a).click(); await a.getByRole("button", { name: "Keep private", exact: true }).click();
    const origin = a.locator("[data-private-origin]"); await origin.waitFor();
    const originalCard = await origin.innerText();
    await contexts[0].setGeolocation({ latitude: 1.286, longitude: 103.859, accuracy: 50 });
    await a.getByRole("button", { name: "Refresh my location marker", exact: true }).click();
    await a.getByRole("button", { name: "Refresh my location marker", exact: true }).waitFor();
    assert.equal(await origin.innerText(), originalCard);
    assert.equal(evidence.api.filter(x => x.action === "begin" || x.action === "send").length, 0);
    await locate(a).click(); assert.equal(await origin.count(), 0);
    await locate(a).click(); assert(await a.getByRole("radio", { name: "Broad area only (default)", exact: true }).isChecked());
    await a.keyboard.press("Escape"); assert(await locate(a).evaluate(el => el === document.activeElement));
    await locate(a).click();
    record("private marker refresh keeps origin presentation; no share; OFF clears; ON requires fresh broad-default consent");
    step = "permission denial";
    await contexts[0].clearPermissions();
    // Headless Chromium denies its unanswered permission prompt. No real GPS fallback exists.
    await locate(a).click(); await a.getByText("Location permission denied. You can allow it in browser settings.", { exact: true }).waitFor();
    assert.equal(await locate(a).getAttribute("aria-pressed"), "false"); assert.equal(await origin.count(), 0);
    record("permission denial stays OFF with no origin, share or consent prompt");
  } else if (mode === "live" || mode === "live-responsive") {
    step = "Live reconnect navigation";
    for (const p of pages) {
      await p.locator('[data-surface-trigger="live"]').click();
      await p.getByRole("button", { name: "Join Live", exact: true }).click(); await liveJoined(p);
    }
    await liveCount(a, 2); await liveCount(b, 2);
    if (mode === "live") {
    await a.evaluate(() => window.__liveQa.cut());
    await a.locator('.live-panel[data-phase="reconnecting"]').waitFor();
    await a.evaluate(() => { window.__liveQa.restore(); window.dispatchEvent(new Event("online")); });
    await liveJoined(a); await liveCount(a, 2); await liveCount(b, 2);
    await a.locator('[data-surface-trigger="hall"]').click(); await a.locator('.workspace-composition[data-layout="hall:live"]').waitFor();
    await a.locator('[data-surface-trigger="map"]').click(); await a.locator('.workspace-composition[data-layout="map:live"]').waitFor();
    await liveCount(b, 2);
    record("actual A/B Live reconnect then Board/Map navigation preserves roster with one transport");
    }
    step = "recovered Live responsive keyboard states";
    for (const width of [320, 390, 430, 768, 1440, 1728]) {
      await a.setViewportSize({ width, height: 1000 }); await a.emulateMedia({ reducedMotion: "reduce" });
      const foreground = a.getByRole("group", { name: "Visible workspace pane" });
      if (await foreground.count()) await foreground.getByRole("button", { name: "Live", exact: true }).click();
      const action = a.locator('.live-panel:visible .live-action'); await a.keyboard.press("Tab"); await action.focus();
      const geometry = await action.evaluate(button => {
        const panel = button.closest(".live-panel"), rect = button.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1 || panel.scrollWidth > panel.clientWidth + 1,
          height: rect.height, focused: document.activeElement === button, outline: getComputedStyle(button).outlineStyle,
          reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches };
      });
      evidence.observations ??= []; evidence.observations.push({ width, ...geometry }); save();
      assert(!geometry.overflow && geometry.height >= 44 && geometry.focused && geometry.outline !== "none" && geometry.reducedMotion);
      await a.screenshot({ path: `${directory}/review-live-reconnected-${width}.png`, fullPage: true });
      record("reconnected Live keyboard/reduced-motion geometry", { width, ...geometry });
    }
  } else if (mode === "late") {
    step = "late in-flight snapshot cannot resurrect after Stop";
    await share(a); await marker(b).waitFor({ timeout: 30000 });
    let release, entered, held = false;
    const captured = new Promise(resolve => { entered = resolve; });
    await b.route("**/api/location-sharing", async route => {
      if (held || route.request().postDataJSON()?.action !== "current") return route.continue();
      held = true;
      const start = performance.now(), response = await route.fetch();
      assert.equal(response.status(), 200); assert((await response.json()).peers.length > 0);
      await new Promise(resolve => { release = resolve; entered(start); });
      await route.fulfill({ response }).catch(() => {}); // Expected aborted request after its deadline.
    });
    const requestStarted = await captured;
    // The previous view may already have expired while route.fetch performed
    // the real authorization read. That safe absence is not a test failure.
    const clearedBeforeStop = await marker(b).count() === 0;
    await stop(a); await marker(b).waitFor({ state: "detached", timeout: 10000 });
    // Derived from the specified request-start deadline, not a readiness sleep.
    await new Promise(resolve => setTimeout(resolve, Math.max(0, requestStarted + 5100 - performance.now())));
    release();
    const fresh = await actionResponse(b, "current"); assert.equal(fresh.status(), 200);
    assert.equal((await fresh.json()).peers.length, 0); assert.equal(await marker(b).count(), 0);
    record("held stale response past five-second deadline cannot restore revoked marker", { clearedBeforeStop });
  } else {
    step = "Locate OFF while begin acknowledgment pending";
    let releaseBegin, acceptedBegin;
    const began = new Promise(resolve => { acceptedBegin = resolve; });
    await a.route("**/api/location-sharing", async route => {
      if (route.request().postDataJSON()?.action !== "begin") return route.continue();
      const response = await route.fetch(); assert.equal(response.status(), 200);
      await new Promise(resolve => { releaseBegin = resolve; acceptedBegin(); });
      await route.fulfill({ response });
    });
    await locate(a).click(); await a.getByRole("button", { name: "Share broad area", exact: true }).click();
    await Promise.race([began, new Promise((_, reject) => setTimeout(() => reject(new Error("Begin did not reach controlled boundary")), 20000))]); await locate(a).click();
    const retired = actionResponse(a, "stop"); releaseBegin(); assert.equal((await retired).status(), 200);
    assert.equal(evidence.api.filter(x => x.action === "send").length, 0);
    assert.equal(await b.getByRole("list", { name: "Shared location snapshots" }).count(), 0);
    record("late begin acknowledgment retired; no send or peer state after Locate OFF");
  }
  for (const page of pages) {
    const metrics = await page.evaluate(() => window.__liveQa.snapshot());
    assert(metrics.maxConnections <= 1 && metrics.payloadSafe);
  }
  assert.equal(evidence.errors.length, 0); evidence.pass = true;
} catch (error) {
  evidence.failedStep = step; evidence.failure = error.name;
  evidence.failureLine = error.stack?.match(/browser-ms74-fp3-review\.mjs:(\d+):\d+/)?.[1];
  process.exitCode = 1;
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${directory}/review-${mode}-failure-${i}.png`, fullPage: true }).catch(() => {});
} finally {
  for (const context of contexts) await context.setOffline(false).catch(() => {});
  for (const page of pages) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    if (await locate(page).getAttribute("aria-pressed").catch(() => null) === "true") await stop(page).catch(() => {});
    await leaveLiveBeforeClose(page).catch(() => {});
    // Only sessions created by this fresh browser context; no founder session.
    await page.evaluate(async () => { if (window.Clerk?.session?.status === "active") { const r = await fetch("/api/realtime/logout", { method: "POST" }); if (![200,401,403].includes(r.status)) throw new Error("QA logout failed"); await window.Clerk.signOut(); } }).catch(() => { evidence.cleanupErrors++; });
  }
  await browser.close(); evidence.finalCounts = await counts();
  if (evidence.cleanupErrors || evidence.finalCounts.payloads || evidence.finalCounts.active_consents) { evidence.pass = false; process.exitCode = 1; }
  save();
  console.log(JSON.stringify({ pass: evidence.pass, mode, failedStep: evidence.failedStep, failure: evidence.failure, finalCounts: evidence.finalCounts, receipt }));
}
