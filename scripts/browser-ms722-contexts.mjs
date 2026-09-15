import assert from "node:assert/strict";
import { run, ev, until, button } from "./browser-fp2.mjs";
const session = process.env.MS722_SESSION ?? "ms72-a";
const origin = process.env.MS722_ORIGIN ?? "http://localhost:3000";
const captures = process.env.MS722_CAPTURES;
assert(captures);
const room = "/room/ms722-frame-qa";
const personal = "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa";
async function section(name) {
  if (await ev(session,"!!document.querySelector('.settings-category-trigger')?.checkVisibility()")) await run(session,"click",".settings-category-trigger");
  await button(session,name);
}
async function bounds() {
  const r = await ev(session,"(()=>{const e=document.querySelector('.scoped-settings-shell'),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,vw:innerWidth,vh:innerHeight,overflow:e.scrollWidth-e.clientWidth}})()");
  assert(r.x>=0&&r.y>=0&&r.right<=r.vw+1&&r.bottom<=r.vh+1&&r.overflow<=1,JSON.stringify(r)); return r;
}
await run(session,"open",origin+room);
await until(session,"!!document.querySelector('.composer textarea')","Room ready");
for (const [w,h] of [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]]) {
  await run(session,"set","viewport",String(w),String(h));
  await button(session,"Conversation options"); await button(session,"Room Settings");
  await until(session,"!!document.querySelector('.scoped-settings-form input')","Room editor loaded");
  const before=await bounds();
  for(const name of ["People","Structure","My preferences","Overview"]) { await section(name); assert.equal((await bounds()).h,before.h); }
  await run(session,"screenshot",`${captures}/room-settings-${w}.png`);
  await button(session,"Close Room Settings");
  console.log("PASS Room Settings stable frame/categories",w,h);
}
await run(session,"set","viewport","390","844");
await button(session,"Conversation options"); await button(session,"Room Settings");
await until(session,"!!document.querySelector('.scoped-settings-form input')","Room editor");
const name=await ev(session,"document.querySelector('.scoped-settings-form input').value");
await run(session,"fill",".scoped-settings-form input","Unsaved MS7.2 Room draft");
await button(session,"Close Room Settings"); await button(session,"Keep editing");
assert.equal(await ev(session,"document.querySelector('.scoped-settings-form input').value"),"Unsaved MS7.2 Room draft");
await section("Structure"); await button(session,"Discard"); await section("Overview");
assert.equal(await ev(session,"document.querySelector('.scoped-settings-form input').value"),name);
await button(session,"Close Room Settings");
await run(session,"network","route",origin+room+"*","--abort");
try {
  await button(session,"Conversation options"); await button(session,"Room Settings");
  await until(session,"!!document.querySelector('.scoped-settings-footer [role=alert]')","Room load failure");
  await bounds();
} finally { await run(session,"network","unroute",origin+room+"*"); }
await button(session,"Retry"); await until(session,"!!document.querySelector('.scoped-settings-form input')","Room retry");
await button(session,"Close Room Settings");
console.log("PASS Room dirty keep/discard; failed load stays in frame and Retry recovers");
await run(session,"open",origin+personal); await until(session,"!!document.querySelector('.composer textarea')","Personal Chat");
await button(session,"Conversation options"); await button(session,"Chat Settings");
await until(session,"!!document.querySelector('.scoped-settings-form input')","private nickname");
const nickname=await ev(session,"document.querySelector('.scoped-settings-form input').value");
await run(session,"fill",".scoped-settings-form input","Unsaved private alias");
await button(session,"Close Chat Settings"); await button(session,"Keep editing");
assert.equal(await ev(session,"document.querySelector('.scoped-settings-form input').value"),"Unsaved private alias");
await section("Communication"); await button(session,"Discard"); await section("Overview");
assert.equal(await ev(session,"document.querySelector('.scoped-settings-form input').value"),nickname);
const first=await bounds();
for(const name of ["Communication","Media","Files","Links","Privacy","Overview"]) { await section(name); assert.equal((await bounds()).h,first.h); }
await run(session,"click",".scoped-settings-body .namecard-trigger.quiet-action");
await until(session,"!!document.querySelector('.namecard-nickname')","read-only Namecard");
await run(session,"click",".namecard-nickname");
await until(session,"!!document.querySelector('.scoped-settings-form input')","nested full editor");
await bounds();
await run(session,"fill",".scoped-settings-form input","Unsaved nested alias");
await button(session,"Cancel"); await button(session,"Keep editing");
assert.equal(await ev(session,"document.querySelector('.scoped-settings-form input').value"),"Unsaved nested alias");
await run(session,"set","viewport","390","360");
await bounds();
await run(session,"scrollintoview",".scoped-settings-form input");
await run(session,"screenshot",`${captures}/nickname-short-viewport.png`);
await button(session,"Cancel"); await button(session,"Discard");
await until(session,"!!document.querySelector('.namecard-nickname')","return to Namecard");
assert(await ev(session,"document.activeElement?.classList.contains('namecard-nickname')"));
await run(session,"press","Escape"); await run(session,"set","viewport","1440","900");
console.log("PASS Personal categories, dirty nickname recovery, nested full frame, short viewport, return-to-Namecard focus; no saved profile/nickname changes");
