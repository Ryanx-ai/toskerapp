import assert from "node:assert/strict";
import { run, ev, until, button } from "./browser-fp2.mjs";

const session = process.env.MS722_SESSION ?? "ms72-a";
const origin = process.env.MS722_ORIGIN ?? "http://localhost:3000";
const captures = process.env.MS722_CAPTURES;
assert(captures, "Set MS722_CAPTURES to an existing QA output directory");
const measure = () => ev(session, `(()=>{const e=document.querySelector('.scoped-settings-shell'),r=e.getBoundingClientRect(),b=document.querySelector('.scoped-settings-body');return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight,overflow:e.scrollWidth-e.clientWidth,bodyScroll:getComputedStyle(b).overflowY}})()`);
async function section(name) {
  const compact = await ev(session, "!!document.querySelector('.settings-category-trigger')?.checkVisibility()");
  if (compact) await run(session, "click", ".settings-category-trigger");
  await button(session, name);
}
function bounded(g) {
  assert(g.x >= 0 && g.right <= g.viewportWidth + 1 && g.y >= 0 && g.bottom <= g.viewportHeight + 1, JSON.stringify(g));
  assert(g.overflow <= 1 && g.bodyScroll === "auto", JSON.stringify(g));
}
await run(session, "open", origin + "/profile");
await until(session, "[...document.querySelectorAll('button')].some(e=>e.textContent==='Edit Profile')", "authenticated own Profile");
for (const [width, height] of [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117],[844,390]]) {
  await run(session,"set","viewport",String(width),String(height));
  await button(session,"Edit Profile");
  await until(session,"!!document.querySelector('.owner-profile-field input')","editor");
  const identity = await measure(); bounded(identity);
  await section("Status"); const status = await measure(); bounded(status);
  assert(Math.abs(identity.h-status.h)<1 && Math.abs(identity.y-status.y)<1, "Category must preserve frame");
  await run(session,"screenshot",`${captures}/profile-status-${width}.png`);
  await section("Identity");
  await run(session,"screenshot",`${captures}/profile-identity-${width}.png`);
  await button(session,"Cancel");
  assert.equal(await ev(session,"document.activeElement?.textContent"),"Edit Profile");
  console.log("PASS Profile frame/category/focus",width,height,identity.h);
}
await run(session,"set","viewport","390","844");
await button(session,"Edit Profile");
const original = await ev(session,"document.querySelector('.owner-profile-field input').value");
await run(session,"fill",".owner-profile-field input","Unsaved MS7.2 frame QA");
const ready = await measure();
await button(session,"Cancel");
assert(await ev(session,"!!document.querySelector('.settings-discard')"));
assert.equal((await measure()).h,ready.h);
await button(session,"Keep editing");
assert.equal(await ev(session,"document.querySelector('.owner-profile-field input').value"),"Unsaved MS7.2 frame QA");
await section("Status");
await button(session,"Discard");
await section("Identity");
assert.equal(await ev(session,"document.querySelector('.owner-profile-field input').value"),original);
// Fail the real browser save request; do not call a server action through evaluation.
await run(session,"fill",".owner-profile-field input","Unsent MS7.2 failure QA");
await run(session,"network","route",`${origin}/profile*`,"--abort");
try {
  await button(session,"Save Profile");
  await until(session,"!!document.querySelector('.owner-profile-save [role=alert]')","save failure");
  assert.equal((await measure()).h,ready.h);
  assert.equal(await ev(session,"document.querySelector('.owner-profile-field input').value"),"Unsent MS7.2 failure QA");
  await run(session,"screenshot",`${captures}/profile-error-390.png`);
} finally { await run(session,"network","unroute",`${origin}/profile*`); }
await button(session,"Cancel"); await button(session,"Discard");
await button(session,"Edit Profile");
assert.equal(await ev(session,"document.querySelector('.owner-profile-field input').value"),original);
await button(session,"Cancel");
console.log("PASS dirty keep/discard/category recovery + aborted save retains input and frame; no saved identity change");
