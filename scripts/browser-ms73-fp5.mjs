import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {run,ev,until,button} from "./browser-fp2.mjs";
const a="ms73-fp5-a",b="ms73-fp5-b",origin=process.env.FP5_ORIGIN??"http://localhost:3000";
const {fixture}=JSON.parse(readFileSync(".git/fp5-recovery/browser-fixture.json","utf8"));
async function ready(s,path){await run(s,"open",origin+path);await until(s,"!!document.querySelector('input[aria-label=\"Search places\"]')&&!document.querySelector('input[aria-label=\"Search places\"]').disabled","authorized Map",45000);}
async function login(s,letter){
  await run(s,"open",origin+"/app");await until(s,"!!document.querySelector('.messaging-app')||[...document.querySelectorAll('button')].some(e=>e.textContent==='Sign in')","session hydration",45000);if(await ev(s,"!!document.querySelector('.messaging-app')"))return;
  await button(s,"Sign in");await until(s,"!!document.querySelector('input[name=identifier]')","normal sign-in");
  await run(s,"fill","input[name=identifier]",`tosker.user.${letter}+clerk_test@example.com`);await button(s,"Continue");
  await until(s,"!!document.querySelector('input[type=password],input[autocomplete=one-time-code]')","normal method");
  if(await ev(s,"!!document.querySelector('input[type=password]')")){await run(s,"find","text","Use another method","click");await button(s,`Email code to tosker.user.${letter}+clerk_test@example.com`);}
  await until(s,"!!document.querySelector('input[autocomplete=one-time-code]')","QA OTP");await run(s,"fill","input[autocomplete=one-time-code]","424242");await until(s,"!!document.querySelector('.messaging-app')","authenticated QA",45000);
}
const mode=process.argv[2];
if(mode==="sandbox"){
  await ready(a,"/personal/my-room");await ready(b,"/personal/my-room");
  assert(await ev(a,"!!document.querySelector('.composer')"),"desktop Sandbox defaults Map with Chat");
  assert.equal(await ev(a,"document.querySelectorAll('section[aria-label=\"Your Map Pins\"]').length"),0,"memory shelf absent from normal planning");
  assert(!(await ev(a,"document.body.textContent.includes('FP5 private QA')")),"fresh run; don't duplicate fixture route");
  await button(a,"Route");await run(a,"fill","form[aria-label='Route editor'] input","FP5 private QA");await button(a,"Save route");
  await until(a,"!document.querySelector('dialog[open]')&&!!document.querySelector('button[aria-label=\"Route actions for FP5 private QA\"]')","private route");
  await until(a,"!document.querySelector('input[aria-label=\"Search places\"]').disabled&&document.querySelector('[data-map-state]')?.dataset.mapState==='ready'","map ready for manual preview");
  await button(a,"Pin");await run(a,"click",".maplibregl-canvas");
  await until(a,"!!document.querySelector('section[aria-label=\"Place preview\"]')","manual anchored preview");
  assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),0,"no save before confirmation");
  assert(await ev(a,"document.querySelector('section[aria-label=\"Place preview\"] h2').textContent==='Checkpoint 1'"));
  assert.equal(await ev(a,"[...document.querySelectorAll('button')].filter(e=>e.textContent==='Pin to Map').length"),0,"no Pin intermediary");
  await until(a,"[...document.querySelectorAll('[data-map-inspector] button')].some(e=>e.textContent==='Add to Route'&&!e.disabled)","signed confirmation ready",30000);await button(a,"Add to Route");
  await until(a,"!!document.querySelector('[data-place-id]')&&!document.querySelector('section[aria-label=\"Place preview\"]')","private card saved",45000);
  await ready(a,"/personal/my-room");assert(await ev(a,"!!document.querySelector('[data-place-id]')&&document.body.textContent.includes('FP5 private QA')"));
  await ready(b,"/personal/my-room");assert(!(await ev(b,"document.body.textContent.includes('FP5 private QA')")),"B cannot see A private Route");
  await run(a,"set","viewport","390","844");assert.equal(await ev(a,"[...document.querySelectorAll('.composer')].filter(e=>e.checkVisibility()).length"),0,"mobile primary Map is singular");
  await run(a,"set","viewport","1440","900");
  console.log("PASS Sandbox default Map+Chat / singular mobile, create Route, manual preview/Checkpoint1/no auto-save, direct Add to Route, reload and A/B private isolation");
}
if(mode==="b"){
  await login(b,"b");await run(a,"set","viewport","1440","900");await run(b,"set","viewport","1440","900");
  await ready(a,`/room/${fixture.slug}/map`);await ready(b,`/room/${fixture.slug}/map`);
  const third=await ev(a,"[...document.querySelectorAll('button')].find(e=>/^Select (checkpoint|meetup) 3:/.test(e.getAttribute('aria-label')||''))?.getAttribute('aria-label')");assert(third);await button(a,third);await until(a,"!!document.querySelector('[data-map-inspector]')","anchored inspector");
  assert.equal(await ev(a,"document.querySelectorAll('dialog[open]').length"),0,"routine inspection is non-modal");
  await button(a,"Edit place appearance");
  if(third.endsWith(": Checkpoint 3")){await button(a,"Rename checkpoint");await run(a,"fill","[data-map-inspector] input","QA Meetup");await button(a,"Save name");}
  await until(a,"!!document.querySelector('button[aria-label$=\"3: QA Meetup\"]')","renamed A");
  await until(b,"!!document.querySelector('button[aria-label$=\"3: QA Meetup\"]')","shared rename B",45000);
  await until(a,"!!document.querySelector('[data-map-inspector] select')&&!document.querySelector('[data-map-inspector] select').disabled","icon enabled after acknowledgement");
  await run(a,"select","[data-map-inspector] select","meetup");
  await until(a,"!!document.querySelector('button[aria-label=\"Select meetup 3: QA Meetup\"]')","shared icon A");
  await until(b,"!!document.querySelector('button[aria-label=\"Select meetup 3: QA Meetup\"]')","shared icon B",45000);
  assert.equal(await ev(b,"document.querySelectorAll('[data-map-inspector]').length"),0,"peer selection remains private");
  await button(a,"Close place preview");await run(a,"focus","button[aria-label='Select meetup 3: QA Meetup']");await run(a,"press","Enter");await until(a,"!!document.querySelector('[data-map-inspector]')","keyboard opens inspector");await run(a,"press","Escape");await until(a,"!document.querySelector('[data-map-inspector]')","Escape closes inspector");
  assert.equal(await ev(a,"document.activeElement?.getAttribute('aria-label')"),"Select meetup 3: QA Meetup","focus restores stable marker");
  await run(a,"reload");await until(a,"!!document.querySelector('button[aria-label=\"Select meetup 3: QA Meetup\"]')","rename/icon persist reload");
  console.log("PASS B shared Rename/icon + reload; non-modal inspector; private selection; keyboard/Escape/focus");
}
if(mode==="responsive"){
  await ready(a,`/room/${fixture.slug}/map`);await run(a,"set","media","dark","reduced-motion");
  for(const [width,height] of [[320,800],[390,844],[430,900],[768,900],[1440,900],[1728,960],[844,390]]){
    await run(a,"set","viewport",String(width),String(height));await button(a,"Select meetup 3: QA Meetup");
    const geometry=await ev(a,"(()=>{const e=document.querySelector('[data-map-inspector]'),r=e.getBoundingClientRect(),c=e.parentElement.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,inside:r.left>=c.left&&r.right<=c.right+1&&r.top>=c.top&&r.bottom<=c.bottom-20,content:e.scrollWidth<=e.clientWidth+1,motion:matchMedia('(prefers-reduced-motion:reduce)').matches,modal:document.querySelectorAll('dialog[open]').length}})()");
    assert(!geometry.overflow&&geometry.inside&&geometry.content&&geometry.motion&&geometry.modal===0,JSON.stringify({width,geometry}));
    await run(a,"screenshot",`${process.cwd()}/.git/fp5-recovery/inspector-${width}.png`);await button(a,"Close place preview");console.log(`PASS inspector ${width}x${height}: bounded, non-modal, reduced motion`);
  }
  await run(a,"set","viewport","1440","900");
}
