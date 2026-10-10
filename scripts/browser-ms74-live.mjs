import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
const origin = "http://localhost:3000", output = ".git/ms74-recovery/browser";
mkdirSync(output, { recursive: true, mode: 0o700 });
const browser = await chromium.launch({ headless: true });
const contexts = await Promise.all([browser.newContext({ viewport: { width: 1440, height: 900 } }), browser.newContext({ viewport: { width: 1440, height: 900 } })]);
const pages = await Promise.all(contexts.map(context => context.newPage()));
const requests = [], errors = [], evidence = {};
let step = "login";
for (const page of pages) {
  page.on("pageerror", error => errors.push(error.name));
  page.on("request", request => { const u = new URL(request.url()); if (u.pathname.startsWith("/api/live/") || u.pathname === "/api/realtime/token") requests.push({ path: u.pathname, method: request.method() }); });
  await page.context().route("**/*geoapify.com/**", route => route.abort());
}
async function login(page, actor) {
  await page.goto(`${origin}/app`);
  await page.waitForFunction(() => window.Clerk?.loaded, {}, { timeout: 60000 });
  const signIn = page.getByRole("button", { name: "Sign in", exact: true });
  if (await signIn.count()) {
    const email = `tosker.user.${actor}+clerk_test@example.com`;
    await signIn.click(); await page.getByRole("textbox", { name: "Email address", exact: true }).fill(email);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("link", { name: "Use another method", exact: true }).click();
    await Promise.all([page.waitForResponse(response => response.url().includes("/prepare_first_factor") && response.status() === 200, { timeout: 30000 }), page.getByRole("button", { name: `Email code to ${email}`, exact: true }).click()]);
    await page.getByRole("textbox", { name: "Enter verification code", exact: true }).fill("424242");
    // Wait for the normal verified Clerk session, not a sidebar that can remain
    // behind the closing sign-in modal during a dev-server navigation refresh.
    await page.waitForFunction(() => window.Clerk?.session?.status === "active", {}, { timeout: 30000 });
  }
  await page.goto(`${origin}/room/${fixture.slug}/live`);
  await page.getByRole("button", { name: "Join Live", exact: true }).waitFor({ timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector(".live-action")?.disabled, {}, { timeout: 30000 });
}
const joined = page => page.locator('.live-panel[data-phase="connected"]').waitFor({ timeout: 30000 });
const count = (page, n) => page.waitForFunction(n => document.querySelectorAll("[data-live-user]").length === n, n, { timeout: 30000 });
try {
  for (const [index, actor] of ["a", "b"].entries()) await login(pages[index], actor);
  const [a, b] = pages;
  step = "observer empty"; await count(a, 0); await count(b, 0);
  step = "A joins"; let start = performance.now(); await a.getByRole("button", { name: "Join Live", exact: true }).click(); await joined(a); evidence.aJoinMs = Math.round(performance.now() - start); await count(b, 1); evidence.aPeerMs = Math.round(performance.now() - start);
  step = "B joins"; start = performance.now(); await b.getByRole("button", { name: "Join Live", exact: true }).click(); await joined(b); evidence.bJoinMs = Math.round(performance.now() - start); await count(a, 2); evidence.bPeerMs = Math.round(performance.now() - start); await count(b, 2);
  await a.screenshot({ path: `${output}/joined-1440.png`, fullPage: true });
  step = "A leaves"; await a.getByRole("button", { name: "Leave Live", exact: true }).click(); await count(b, 1); await count(a, 1);
  step = "refresh does not join"; await a.reload(); await a.getByRole("button", { name: "Join Live", exact: true }).waitFor({ timeout: 30000 }); await count(a, 1);
  step = "B leaves"; await b.getByRole("button", { name: "Leave Live", exact: true }).click(); await count(a, 0);
  evidence.requests = requests; evidence.errors = errors; assert.equal(errors.length, 0);
  writeFileSync(`${output}/basic.json`, JSON.stringify({ pass: true, ...evidence }, null, 2));
  console.log(JSON.stringify({ pass: true, ...evidence }));
} catch (error) {
  await pages[0].screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ pass: false, step, kind: error.name, detail: String(error.message).slice(0, 600), states: await Promise.all(pages.map(page => page.locator(".live-panel").innerText().catch(() => "no Live panel"))), requests, errors }));
  process.exitCode = 1;
} finally { await browser.close(); }
