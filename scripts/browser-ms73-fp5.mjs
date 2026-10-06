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
if(mode==="short-walk"){
  await ready(a,`/room/${fixture.slug}/map`);await button(a,"FP5 Singapore QA");
  await ev(a,"(()=>{window.__fp5ShortRoad=null;const original=window.fetch;window.fetch=async(...args)=>{const r=await original(...args);if(new URL(typeof args[0]==='string'?args[0]:args[0].url,location.origin).pathname.endsWith('/roads'))window.__fp5ShortRoad={status:r.status,body:await r.clone().json()};return r};return true})()");
  await run(a,"select","select[aria-label='Travel mode']","walk");await until(a,"!!window.__fp5ShortRoad","short Walk result",45000);
  const result=await ev(a,"window.__fp5ShortRoad");assert.equal(result.status,200,JSON.stringify({status:result.status,error:result.body.error}));
  assert.equal(result.body.geometry.estimate.legs.length,4);assert.equal(result.body.geometry.segments.length,4);
  await run(a,"click","details[aria-label='Route summary'] summary");await run(a,"screenshot",`${process.cwd()}/.git/fp5-recovery/short-walk.png`);
  console.log(JSON.stringify({walk:"real short Singapore route",metres:result.body.geometry.estimate.metres,seconds:result.body.geometry.estimate.seconds,legs:result.body.geometry.estimate.legs.length}));
  await run(a,"select","select[aria-label='Travel mode']","planning");
}
if(mode==="search"){
  await ready(a,`/room/${fixture.slug}/map`);await button(a,"FP5 second route");
  assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),0,"owned empty route before search");
  await run(a,"fill","input[aria-label='Search places']","Jewel Changi Airport");
  await until(a,"!!document.querySelector('ul[aria-label=\"Place search results\"] button')","real Singapore search",30000);
  const labels=await ev(a,"[...document.querySelectorAll('ul[aria-label=\"Place search results\"] button')].map(e=>e.textContent)");console.log(JSON.stringify({query:"Jewel Changi Airport",observedResults:labels}));
  assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),0,"search results are not autosaved");
  await run(a,"click","ul[aria-label='Place search results'] li:first-child button");await until(a,"!!document.querySelector('section[aria-label=\"Place preview\"]')","chosen search preview");
  assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),0,"preview is not a save");
  const title=await ev(a,"document.querySelector('section[aria-label=\"Place preview\"] h2').textContent");
  await button(a,"FP5 Singapore QA");assert.equal(await ev(a,"document.querySelectorAll('section[aria-label=\"Place preview\"]').length"),0,"Route change cancels preview");
  await button(a,"FP5 second route");await run(a,"click","ul[aria-label='Place search results'] li:first-child button");
  await button(a,"Add to Route");await until(a,"document.querySelectorAll('[data-place-id]').length===1&&!document.querySelector('section[aria-label=\"Place preview\"]')","explicit direct Route save",45000);
  await button(a,"Edit place appearance");assert.equal(await ev(a,"[...document.querySelectorAll('[data-map-inspector] button')].filter(e=>e.textContent==='Rename checkpoint').length"),0,"provider name is not editable");
  await ready(b,`/room/${fixture.slug}/map`);await button(b,"FP5 second route");await until(b,`[...document.querySelectorAll('[data-place-id]')].some(e=>e.textContent.includes(${JSON.stringify(title)}))`,"A/B shared chosen POI");
  await run(a,"reload");await until(a,"document.querySelectorAll('[data-place-id]').length===1","POI persists reload");
  console.log("PASS real search→explicit result choice→preview→direct Add to selected Route, no autosave, Route-switch cancel, immutable POI title, A/B+reload");
}
if(mode==="locate"){
  await ready(a,`/room/${fixture.slug}/map`);await button(a,"FP5 Singapore QA");
  await run(a,"select","select[aria-label='Travel mode']","planning");
  await ready(b,`/room/${fixture.slug}/map`);
  await until(a,"document.querySelector('[data-map-state]')?.dataset.mapState==='ready'","Map ready");
  await ev(a,"(()=>{window.__fp5LocalCalls=[];window.__fp5Position=null;window.__fp5Denied=null;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){window.__fp5Position=success;window.__fp5Denied=error;},watchPosition(){throw Error('Live tracking forbidden');}}});const original=window.fetch;window.fetch=(...args)=>{window.__fp5LocalCalls.push(typeof args[1]?.body==='string'?args[1].body:'');return original(...args)};return true})()");
  await button(a,"Locate me");assert(await ev(a,"document.querySelector('button[aria-label=\"Locate me\"]').getAttribute('aria-pressed')==='true'"));
  await button(a,"Locate me");await ev(a,"window.__fp5Position({coords:{latitude:1.321234,longitude:103.851234,accuracy:12}});true");
  assert.equal(await ev(a,"document.querySelectorAll('[role=img][aria-label^=\"You, accuracy\"]').length"),0,"late result after OFF ignored");
  await button(a,"Locate me");await ev(a,"window.__fp5Position({coords:{latitude:1.321234,longitude:103.851234,accuracy:12}});true");
  await until(a,"!!document.querySelector('[role=img][aria-label^=\"You, accuracy\"]')","local You marker");
  assert(await ev(a,"document.body.textContent.includes('Private visual connector from You')"));
  assert.equal(await ev(b,"document.querySelectorAll('[role=img][aria-label^=\"You, accuracy\"]').length"),0,"peer receives no local marker");
  assert(!(await ev(a,"window.__fp5LocalCalls.some(body=>body.includes('1.321234')||body.includes('103.851234'))")),"device location absent from request bodies");
  assert(!(await ev(a,"JSON.stringify({...localStorage,...sessionStorage}).includes('1.321234')")),"device location absent from browser persistence");
  await button(a,"Locate me");await until(a,"!document.querySelector('[role=img][aria-label^=\"You, accuracy\"]')","OFF removes marker");
  assert(!(await ev(a,"document.body.textContent.includes('Private visual connector from You')")),"OFF removes connector");
  await button(a,"Locate me");await ev(a,"window.__fp5Denied({code:1});true");await until(a,"document.body.textContent.includes('Location permission denied')","permission denial recovery");
  await run(a,"reload");await until(a,"!!document.querySelector('button[aria-label=\"Locate me\"]')","reload");
  assert.equal(await ev(a,"document.querySelector('button[aria-label=\"Locate me\"]').getAttribute('aria-pressed')"),"false","reload starts OFF");
  console.log("PASS emulated Locate ON/OFF, pending cancellation, private marker/connector, no coordinate body/storage, peer isolation, permission denial and reload OFF; zero geolocation provider calls");
}
if(mode==="roads"||mode==="roads-drive"){
  await ready(a,`/room/${fixture.slug}/map`);await run(a,"set","viewport","1440","900");await button(a,"FP5 cross-island QA");
  await until(a,"!!document.querySelector('button[aria-label=\"Select checkpoint 3: QA Changi endpoint\"]')","saved cross-island route");
  await ev(a,"(()=>{window.__fp5Roads=[];const original=window.fetch;window.fetch=async(...args)=>{const response=await original(...args);const path=new URL(typeof args[0]==='string'?args[0]:args[0].url,location.origin).pathname;if(path.endsWith('/roads')){const body=await response.clone().json();window.__fp5Roads.push({status:response.status,body});}return response;};return true})()");
  const travelModes=mode==="roads-drive"?["drive"]:["walk","drive"];
  for(const mode of travelModes){
    await run(a,"select","select[aria-label='Travel mode']",mode);
    await until(a,`window.__fp5Roads.some(r=>r.status===200&&r.body.geometry?.mode===${JSON.stringify(mode)})`,`${mode} provider response`,45000);
    const road=await ev(a,`window.__fp5Roads.find(r=>r.status===200&&r.body.geometry?.mode===${JSON.stringify(mode)}).body.geometry`);
    assert.equal(road.segments.length,2);assert.equal(road.estimate?.legs?.length,2,"two real provider leg estimates");assert(road.estimate.metres>20000&&road.estimate.seconds>0);
    assert(Math.abs(road.estimate.legs.reduce((n,l)=>n+l.metres,0)-road.estimate.metres)<=2);assert(Math.abs(road.estimate.legs.reduce((n,l)=>n+l.seconds,0)-road.estimate.seconds)<=2);
    await run(a,"click","details[aria-label='Route summary'] summary");assert.equal(await ev(a,"document.querySelectorAll('ol[aria-label=\"Route segments\"] li').length"),2);
    await run(a,"screenshot",`${process.cwd()}/.git/fp5-recovery/cross-island-${mode}.png`);await run(a,"click","details[aria-label='Route summary'] summary");
    console.log(JSON.stringify({mode,provider:true,metres:road.estimate.metres,seconds:road.estimate.seconds,legs:road.estimate.legs.map(l=>({metres:l.metres,seconds:l.seconds})),points:road.segments.map(s=>s.length)}));
  }
  const before=await ev(a,"window.__fp5Roads.length");await button(a,"Hide QA north stop from my map");
  assert.equal(await ev(a,"window.__fp5Roads.length"),before,"private Hide does not immediately request routing");await button(a,"Show QA north stop on my map");
  await button(a,"Place actions for QA north stop");await button(a,"Skip in route");await run(a,"press","Escape");
  await until(a,`window.__fp5Roads.length>${before}&&window.__fp5Roads.at(-1).body.geometry?.estimate?.legs?.length===1`,"Skip recalculates exact two remaining stops",45000);
  const skipped=await ev(a,"window.__fp5Roads.at(-1).body.geometry");assert(!skipped.key.includes("1.436"),"north skipped from waypoints");
  // Restore in Order mode to avoid another provider call solely for QA cleanup.
  await run(a,"select","select[aria-label='Travel mode']","planning");await button(a,"Place actions for QA north stop");await button(a,"Include in route");await run(a,"press","Escape");
  console.log(`PASS real west→north→Changi ${mode==="roads-drive"?"Drive":"Walk/Drive"} totals+legs, shared Skip recalculation, private Hide independent, Order restored`);
}
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
