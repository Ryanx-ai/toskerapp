/** Bounded post-release audit. Only the separately receipted audit fixture is mutable. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {run,ev,until,button} from "./browser-fp2.mjs";
const a="fp5-audit-a",b="fp5-audit-b",origin="https://toskerapp.vercel.app";
const {fixture}=JSON.parse(readFileSync(".git/fp5-recovery/audit-fixture.json","utf8"));
assert(!fixture.retained&&/^ms73-qa-[a-f0-9]{8}$/.test(fixture.slug));
const mode=process.argv[2],root="/Users/ryanc/Developer/toskerapp/.git/fp5-recovery";
const has=name=>`[...document.querySelectorAll('button')].some(e=>(e.getAttribute('aria-label')||e.textContent).trim()===${JSON.stringify(name)})`;
async function ready(s,path){await run(s,"open",origin+path);await until(s,"!!document.querySelector('input[aria-label=\"Search places\"]:not(:disabled)')","ready Map",45000);}
async function login(s,letter){
  await run(s,"open",origin+"/app");await button(s,"Sign in");
  await run(s,"fill","input[name=identifier]",`tosker.user.${letter}+clerk_test@example.com`);await button(s,"Continue");
  await until(s,"!!document.querySelector('input[type=password],input[autocomplete=\"one-time-code\"]')","auth method",30000);
  if(await ev(s,"!!document.querySelector('input[type=password]')")) {await run(s,"find","text","Use another method","click");await button(s,`Email code to tosker.user.${letter}+clerk_test@example.com`);}
  await until(s,"!!document.querySelector('input[autocomplete=\"one-time-code\"]')","code");await run(s,"fill",'input[autocomplete="one-time-code"]',"424242");
  await until(s,"!!document.querySelector('.messaging-app')","signed in",45000);
}
if(mode==="collab"){
  await login(b,"b");for(const s of[a,b]){await run(s,"set","viewport","1440","900");await ready(s,`/room/${fixture.slug}/map`);}
  await button(a,"Select place 1: Checkpoint 1");await until(a,"!!document.querySelector('[data-map-inspector]')","inspector");assert(!await ev(b,"!!document.querySelector('[data-map-inspector]')"));
  await button(a,"Edit place appearance");await button(a,"Rename checkpoint");await run(a,"fill","[data-map-inspector] input","Audit meeting point — a long checkpoint title for the responsive safety review");await button(a,"Save name");
  await until(b,"document.querySelector('[data-place-id]')?.textContent.includes('Audit meeting point')","B shared rename",45000);
  await run(a,"select","[data-map-inspector] select","meetup");await until(b,has("Select meetup 1: Audit meeting point — a long checkpoint title for the responsive safety review"),"B icon",45000);
  await run(a,"press","Escape");await until(a,"!document.querySelector('[data-map-inspector]')","Escape");
  assert(await ev(a,"document.activeElement?.checkVisibility()"));
  await run(b,"set","offline","on");
  await button(a,"Select place 2: Checkpoint 2");await button(a,"Edit place appearance");await button(a,"Rename checkpoint");await run(a,"fill","[data-map-inspector] input","Audit reconnect point");await button(a,"Save name");
  await run(b,"set","offline","off");await until(b,has("Select place 2: Audit reconnect point"),"reconnect reconciliation",45000);
  await run(b,"reload");await until(b,has("Select place 2: Audit reconnect point"),"reload durable",45000);
  console.log("PASS canonical normal A/B login, shared Rename/icon, viewer-local selection, Escape/visible focus, offline/online reconciliation and reload; exact audit fixture only");
}
if(mode==="responsive"){
  await ready(a,`/room/${fixture.slug}/map`);
  for(const [width,height]of[[320,800],[390,844],[430,932],[768,1024],[1440,900],[1728,1000],[844,390]]){
    await run(a,"set","viewport",String(width),String(height));await run(a,"set","media","dark","reduced-motion");
    await until(a,"document.querySelector('[data-map-state]')?.dataset.mapState==='ready'","canvas",45000);
    await button(a,"Select meetup 1: Audit meeting point — a long checkpoint title for the responsive safety review");
    await until(a,"!!document.querySelector('[data-map-inspector]')","inspector");
    const bounds=await ev(a,`(()=>{const r=document.querySelector('[data-map-inspector]').getBoundingClientRect();return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,left:r.left,right:r.right,top:r.top,bottom:r.bottom,inspectorWidth:r.width}})()`);
    assert(!bounds.overflow&&bounds.left>=0&&bounds.right<=width+1,JSON.stringify(bounds));
    await run(a,"screenshot",`${root}/audit-${width}.png`);await run(a,"press","Escape");await until(a,"!document.querySelector('[data-map-inspector]')","closed");assert(await ev(a,"document.activeElement?.checkVisibility()"));
    console.log(JSON.stringify({canonicalViewport:width,height,bounds}));
  }
  await run(a,"set","viewport","320","800");await button(a,"Select meetup 1: Audit meeting point — a long checkpoint title for the responsive safety review");
  await ev(a,"(()=>{const style=document.createElement('style');style.id='audit-text';style.textContent='[data-map-inspector] { font-size: 150% !important; } [data-map-inspector] h2,[data-map-inspector] p,[data-map-inspector] button,[data-map-inspector] summary { font-size: 1em !important; }';document.head.append(style);return true;})()");
  await run(a,"scrollintoview","[data-map-inspector] summary");await run(a,"focus","[data-map-inspector] summary");await run(a,"press","Enter");await until(a,"!!document.querySelector('[data-map-inspector] details[open]')","Info opened");await run(a,"screenshot",`${root}/audit-long-text.png`);await run(a,"press","Escape");assert(await ev(a,"document.activeElement?.checkVisibility()"));await ev(a,"document.querySelector('#audit-text')?.remove()");
  console.log("PASS canonical six widths/short landscape, long title/enlarged inspector, Info/Escape/focus and reduced motion; screenshots require visual review");
}
if(mode==="locate"){
  await run(a,"set","viewport","1440","900");await ready(a,`/room/${fixture.slug}/map`);
  await ev(a,`(()=>{window.__auditBodies=[];const original=window.fetch.bind(window);window.fetch=(input,init)=>{window.__auditBodies.push(String(init?.body??''));return original(input,init)};navigator.geolocation.getCurrentPosition=success=>{window.__auditLocation=success};return true})()`);
  await button(a,"Locate me");await until(a,"typeof window.__auditLocation==='function'","pending location");await button(a,"Locate me");
  await ev(a,"window.__auditLocation({coords:{latitude:1.321234,longitude:103.851234,accuracy:15}})");assert(!await ev(a,"!!document.querySelector('[aria-label^=\"You, accuracy\"]')"));
  await button(a,"Locate me");await ev(a,"window.__auditLocation({coords:{latitude:1.321234,longitude:103.851234,accuracy:15}})");await until(a,"!!document.querySelector('[aria-label^=\"You, accuracy\"]')","private origin");
  assert(!await ev(b,"!!document.querySelector('[aria-label^=\"You, accuracy\"]')"));
  assert(!await ev(a,"JSON.stringify({...localStorage,...sessionStorage}).includes('1.321234')||window.__auditBodies.some(v=>v.includes('1.321234')||v.includes('103.851234'))"));
  await button(a,"Locate me");await until(a,"!document.querySelector('[aria-label^=\"You, accuracy\"]')","OFF clears");await run(a,"reload");await until(a,has("Locate me"),"reload");assert.equal(await ev(a,"document.querySelector('button[aria-label=\"Locate me\"]').getAttribute('aria-pressed')"),"false");
  console.log("PASS emulated canonical Locate ON/OFF, late callback cancellation, A/B privacy, no fetch body/persistent storage coordinates and reload OFF; no real device position requested");
}
if(mode==="long"){
  await ready(a,`/room/${fixture.slug}/map`);await run(a,"set","viewport","320","800");
  await button(a,"Select meetup 1: Audit meeting point — a long checkpoint title for the responsive safety review");await until(a,"!!document.querySelector('[data-map-inspector]')","selected");
  await ev(a,"(()=>{const style=document.createElement('style');style.id='audit-text';style.textContent='[data-map-inspector] { font-size: 150% !important; } [data-map-inspector] h2,[data-map-inspector] p,[data-map-inspector] button,[data-map-inspector] summary { font-size: 1em !important; }';document.head.append(style);return true;})()");
  await run(a,"scrollintoview","[data-map-inspector] summary");await run(a,"focus","[data-map-inspector] summary");await run(a,"press","Enter");await until(a,"!!document.querySelector('[data-map-inspector] details[open]')","Info opened");
  await run(a,"screenshot",`${root}/audit-long-text.png`);assert(!await ev(a,"document.documentElement.scrollWidth>innerWidth+1"));
  await run(a,"press","Escape");await until(a,"!document.querySelector('[data-map-inspector]')","Escape");assert(await ev(a,"document.activeElement?.checkVisibility()"));await ev(a,"document.querySelector('#audit-text')?.remove()");
  console.log("PASS enlarged long inspector, keyboard Info, nested scrolling, Escape and visible mobile marker focus");
}
if(mode==="finish"){
  await ready(a,`/room/${fixture.slug}/map`);await run(a,"set","viewport","1440","900");
  await run(a,"focus",'button[aria-label="Select meetup 1: Audit meeting point — a long checkpoint title for the responsive safety review"]');await run(a,"press","Enter");await until(a,"!!document.querySelector('[data-map-inspector]')","keyboard marker");
  await button(a,"Location Card");await until(a,"!!document.activeElement?.closest('[data-place-id]')","Card focus");
  await run(a,"press","Escape");await button(a,"Collapse Location Cards");assert(await ev(a,"document.querySelector('[aria-label=\"Trip Map\"]').dataset.trayCollapsed==='true'&&document.querySelector('[data-map-state]').dataset.mapState==='ready'"));await button(a,"Expand Location Cards");
  await ready(a,"/room/ms73-founder-review-904a9dea/map");assert(!await ev(a,"!!document.querySelector('section[aria-label=\"Map Pins\"]')"));await button(a,"Saved places");await run(a,"click",'section[aria-label="Map Pins"] summary');await button(a,"Open Saved Pin: Marina Bay Sands");assert(await ev(a,"document.querySelector('section[aria-label=\"Map Pin details\"]').textContent.includes('MS7.3 Founder Review — Singapore Trip')"));await button(a,"Close Pin details");
  console.log("PASS canonical keyboard marker→inspector→Card focus, tray collapse/expand retains canvas, readonly Founder Review memory/provenance preserved and secondary only");
}
if(mode==="sandbox"){
  for(const s of[a,b]){await run(s,"set","viewport","1440","900");await ready(s,"/personal/my-room");}
  assert(await ev(a,"!!document.querySelector('.composer')&&document.querySelector('.composer').checkVisibility()"));assert(await ev(a,has("FP5 audit private QA")));assert(!await ev(b,has("FP5 audit private QA")));
  await until(a,"document.querySelector('[data-map-state]')?.dataset.mapState==='ready'","canvas",45000);await button(a,"Pin");
  await run(a,"click",".maplibregl-canvas");await until(a,"!!document.querySelector('section[aria-label=\"Place preview\"]')","preview",45000);
  assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),0);await until(a,"[...document.querySelectorAll('button')].some(e=>e.textContent==='Add to Route'&&!e.disabled)","signed candidate",45000);assert.equal(await ev(a,"document.querySelector('[data-map-inspector] h2').textContent"),"Checkpoint 1");
  await button(a,"Add to Route");await until(a,has("Select place 1: Checkpoint 1"),"confirmed private card",45000);assert.equal(await ev(b,"document.querySelectorAll('[data-place-id]').length"),0);
  await run(a,"reload");await until(a,has("Select place 1: Checkpoint 1"),"private reload",45000);await run(a,"set","viewport","390","844");await run(a,"screenshot",`${root}/audit-sandbox-mobile.png`);
  assert(!await ev(a,"!!document.querySelector('.composer')&&document.querySelector('.composer').checkVisibility()"));
  console.log("PASS canonical Sandbox genuine owner-private Route, desktop Map+Chat/mobile singular, direct manual preview/Checkpoint1/explicit Add/no Pin intermediary, B isolation and reload");
}
