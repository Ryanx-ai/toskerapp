import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {run,ev,until,button as clickButton} from "./browser-fp2.mjs";
const a="ms73-fp5-a",b="ms73-fp5-b",origin=process.env.FP5_ORIGIN??"http://localhost:3000";
const {fixture}=JSON.parse(readFileSync(".git/fp5-recovery/browser-fixture.json","utf8"));
async function button(s,name){await until(s,`[...document.querySelectorAll('button')].some(e=>e.checkVisibility()&&!e.disabled&&(e.getAttribute('aria-label')||e.textContent).trim()===${JSON.stringify(name)})`,`enabled ${name}`);return clickButton(s,name);}
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
if(mode==="reconnect"){
  for(const s of[a,b]){await run(s,"set","viewport","1440","900");await ready(s,`/room/${fixture.slug}/map`);await button(s,"FP5 Singapore QA");}
  const rename=async(name)=>{await button(a,"Edit place appearance");await button(a,"Rename checkpoint");await run(a,"fill","[data-map-inspector] input",name);await button(a,"Save name");await until(a,`document.querySelector('[data-map-inspector] h2')?.textContent===${JSON.stringify(name)}`,"name acknowledged");};
  await button(a,"Select place 3: QA Meetup");await run(b,"set","offline","on");
  try{await rename("QA reconnect checkpoint");assert(!(await ev(b,"[...document.querySelectorAll('[data-place-id]')].some(e=>e.textContent.includes('QA reconnect checkpoint'))")),"disconnected peer has no new state");}
  finally{await run(b,"set","offline","off");}
  await until(b,"[...document.querySelectorAll('[data-place-id]')].some(e=>e.textContent.includes('QA reconnect checkpoint'))","reconnect canonical refresh",45000);
  await button(a,"Rename checkpoint");await run(a,"fill","[data-map-inspector] input","QA Meetup");await button(a,"Save name");await until(b,"[...document.querySelectorAll('[data-place-id]')].some(e=>e.textContent.includes('QA Meetup'))","restored name reconciles");
  await button(a,"Close place preview");
  console.log("PASS genuine B offline/online recovery after A shared mutation; canonical state reconciled and QA name restored");
}
if(mode==="memory"){
  await run(a,"set","viewport","1440","900");await ready(a,`/room/${fixture.slug}/map`);assert.equal(await ev(a,"document.querySelectorAll('section[aria-label=\"Map Pins\"]').length"),0,"legacy memory is secondary");
  await button(a,"Saved places");await run(a,"click","section[aria-label='Map Pins'] summary");await button(a,"Open Saved Pin: QA legacy memory");
  assert((await ev(a,"document.querySelector('[aria-label=\"Map Pin details\"]').textContent")).includes(fixture.name),"source provenance retained");
  await button(a,"Add to Route");await until(a,"[...document.querySelectorAll('select[aria-label=\"Target Route\"] option')].some(o=>o.textContent==='FP5 private QA · Your Sandbox')","owner-only Sandbox target choice");
  const id=await ev(a,"[...document.querySelectorAll('select[aria-label=\"Target Route\"] option')].find(o=>o.textContent==='FP5 private QA · Your Sandbox').value");await run(a,"select","select[aria-label='Target Route']",id);await button(a,"Confirm Add to Route");await until(a,"!document.querySelector('[aria-label=\"Map Pin details\"]')","explicit private copy acknowledged",45000);
  assert(await ev(a,"!!document.querySelector('button[aria-label=\"Open Saved Pin: QA legacy memory\"]')"),"source Pin survives Route copy");
  await ready(a,"/personal/my-room");await until(a,"[...document.querySelectorAll('[data-place-id]')].some(e=>e.textContent.includes('QA legacy memory'))","private copied Route Card");
  await ready(b,"/personal/my-room");assert(!(await ev(b,"[...document.querySelectorAll('[data-place-id]')].some(e=>e.textContent.includes('QA legacy memory'))")),"B cannot see private copied Card");
  await button(b,"Saved places");await button(b,"Open Saved Pin: QA legacy memory");assert((await ev(b,"document.querySelector('[aria-label=\"Map Pin details\"]').textContent")).includes(fixture.name));await button(b,"Add to Route");await until(b,"!!document.querySelector('select[aria-label=\"Target Route\"]')","B authorized target list");assert(!(await ev(b,"[...document.querySelectorAll('select[aria-label=\"Target Route\"] option')].some(o=>o.textContent.includes('FP5 private QA'))")),"A private Route absent from B choices");await button(b,"Close Pin details");
  console.log("PASS secondary legacy memory, canonical provenance, explicit Pin→own Sandbox Route copy, source survives, B social projection without private card/target leakage");
}
if(mode==="long-focus"){
  const long="QA meeting point with an intentionally very long checkpoint title for narrow-screen focus and wrapping verification";
  await run(a,"set","viewport","1440","900");await ready(a,`/room/${fixture.slug}/map`);await button(a,"FP5 Singapore QA");const current=await ev(a,"document.querySelector('[data-place-id]:nth-child(3) button').getAttribute('aria-label')");await button(a,current);await button(a,"Edit place appearance");await button(a,"Rename checkpoint");
  await run(a,"fill","[data-map-inspector] input",long);await button(a,"Save name");await until(a,`document.querySelector('[data-map-inspector] h2')?.textContent===${JSON.stringify(long)}`,"long name saved");
  await until(a,"!document.querySelector('[data-map-inspector] button[aria-label=\"Close place preview\"]').disabled","long name acknowledged");
  await run(a,"set","viewport","320","800");
  await ev(a,"(()=>{const style=document.createElement('style');style.id='fp5-text-stress';style.textContent='[data-map-inspector] h2,[data-map-inspector] p,[data-map-inspector] button,[data-map-inspector] summary{font-size:20px!important}';document.head.append(style);return true})()");
  await ev(a,"new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))");
  await run(a,"scrollintoview","[data-map-inspector] h2");await run(a,"click","[data-map-inspector] h2");assert(await ev(a,"!!document.querySelector('[data-map-inspector]')"),"reading/clicking content does not dismiss popup");
  await run(a,"scrollintoview","[data-map-inspector] details summary");await run(a,"focus","[data-map-inspector] details summary");await run(a,"press","Enter");
  assert(await ev(a,"(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),p=document.querySelector('[data-map-inspector]'),b=p.getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom&&r.top>=0&&r.bottom<=innerHeight&&p.scrollWidth<=p.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()"),"long title/enlarged text keeps focused Info visible with no horizontal clipping");
  await run(a,"screenshot",`${process.cwd()}/.git/fp5-recovery/long-text-focus-320.png`);await run(a,"press","Escape");await until(a,"!document.querySelector('[data-map-inspector]')","Escape closes after React commit");assert(await ev(a,"document.activeElement?.classList.contains('maplibregl-marker')"),"hidden mobile Card opener restores focus to marker");
  await ev(a,"document.querySelector('#fp5-text-stress').remove();true");await run(a,"set","viewport","1440","900");await button(a,`Select place 3: ${long}`);await button(a,"Edit place appearance");await button(a,"Rename checkpoint");await run(a,"fill","[data-map-inspector] input","QA Meetup");await button(a,"Save name");await until(a,"document.querySelector('[data-map-inspector] h2')?.textContent==='QA Meetup'","QA name restored");await button(a,"Close place preview");
  console.log("PASS actual long manual name save, 320px enlarged inspector text/focus/overflow, text click retained, Info/Escape; original QA name restored");
}
if(mode==="access-before"){
  await ready(b,`/room/${fixture.slug}/map`);await button(b,"FP5 Singapore QA");await button(b,"Select place 3: QA Meetup");
  await ev(b,"Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(ok){ok({coords:{latitude:1.321234,longitude:103.851234,accuracy:10}})}}});true");await button(b,"Locate me");await until(b,"!!document.querySelector('[aria-label^=\"You, accuracy\"]')","private location before revocation");console.log("Ready: isolated B inspector and private location; remove B only from this owned shadow Room");
}
if(mode==="access-after"){
  await until(b,"!document.querySelector('[data-place-id]')&&!document.querySelector('[aria-label^=\"You, accuracy\"]')&&!document.querySelector('[data-map-inspector]')","revocation clears cards/selection/local origin",45000);
  const status=await ev(b,`(async()=>{const response=await fetch('/api/trips/${fixture.slug}/places',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'search',query:'QA unauthorized'})});return {status:response.status,cache:response.headers.get('cache-control')}})()`);assert.equal(status.status,403);assert.equal(status.cache,"private, no-store");console.log("PASS real B membership revocation clears private location/cards/inspector and API denies403 before lookup; founder membership stable");
}
if(mode==="drag"){
  await run(a,"set","viewport","1440","900");await ready(a,`/room/${fixture.slug}/map`);await button(a,"FP5 Singapore QA");await ready(b,`/room/${fixture.slug}/map`);await button(b,"FP5 Singapore QA");
  await button(a,"Select place 3: QA Meetup");await button(a,"Close place preview");
  const revision=await ev(a,"Number(document.querySelector('[data-trip-revision]').dataset.tripRevision)");
  await ev(a,"(()=>{window.__fp5MoveLookups=0;const original=window.fetch;window.fetch=(u,o)=>{if(String(u).endsWith('/places'))window.__fp5MoveLookups++;return original(u,o)};return true})()");
  async function drag(){const p=await ev(a,"(()=>{const r=document.querySelector('.maplibregl-marker[aria-label$=\"3: QA Meetup\"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");await run(a,"mouse","move",String(p.x),String(p.y));await run(a,"mouse","down");await run(a,"mouse","move",String(p.x+50),String(p.y+25));await run(a,"mouse","up");await until(a,"!!document.querySelector('[aria-label=\"Move checkpoint preview\"]')","drag preview");}
  await drag();assert.equal(await ev(a,"Number(document.querySelector('[data-trip-revision]').dataset.tripRevision)"),revision);await button(a,"Cancel");assert.equal(await ev(a,"Number(document.querySelector('[data-trip-revision]').dataset.tripRevision)"),revision);
  await drag();await button(a,"Save position");await until(b,`Number(document.querySelector('[data-trip-revision]').dataset.tripRevision)>${revision}`,"B receives confirmed drag");assert.equal(await ev(a,"window.__fp5MoveLookups"),0);
  assert(await ev(b,"!!document.querySelector('[aria-label=\"Comments on QA Meetup, 1\"]')"));console.log("PASS real pointer marker drag preview/cancel/confirm, shared acknowledgement, same-card comments and zero lookup calls");
}
if(mode==="resilience"){
  await ready(a,`/room/${fixture.slug}/map`);await button(a,"FP5 cross-island QA");
  await ev(a,"(()=>{window.__fp5MockCalls=[];window.__fp5MockFail=true;window.__fp5OriginalFetch=window.fetch;window.fetch=async(u,o)=>{if(!String(u).endsWith('/roads'))return window.__fp5OriginalFetch(u,o);const mode=JSON.parse(o.body).mode;window.__fp5MockCalls.push(mode);if(window.__fp5MockFail)return Response.json({error:'QA controlled route outage'},{status:503});const coords=[[1.3331,103.7423],[1.436,103.7865],[1.3601,103.9898]],points=[...document.querySelectorAll('[data-place-id]')].map((e,i)=>[e.dataset.placeId,...coords[i]]);return Response.json({geometry:{mode,key:JSON.stringify([mode,...points]),segments:[[[103.7423,1.3331],[103.7865,1.436]],[[103.7865,1.436],[103.9898,1.3601]]],attribution:'Synthetic QA; no provider request',estimate:{metres:2000,seconds:1000,guidance:[],legs:points.slice(1).map((p,i)=>({fromId:points[i][0],toId:p[0],metres:1000,seconds:500}))}}})};return true})()");
  await run(a,"select","[aria-label='Travel mode']","walk");await until(a,"document.body.textContent.includes('QA controlled route outage')","explicit outage",45000);
  assert(!(await ev(a,"document.querySelector('details[aria-label=\"Route summary\"] summary').textContent.includes('km')")),"no stale totals on failure");
  const before=await ev(a,"window.__fp5MockCalls.length");await ev(a,"window.__fp5MockFail=false;true");await button(a,"Retry route");await until(a,"document.querySelector('details[aria-label=\"Route summary\"] summary').textContent.includes('2.0 km')","explicit retry recovery",45000);assert.equal(await ev(a,"window.__fp5MockCalls.length"),before+1);
  await run(a,"select","[aria-label='Travel mode']","drive");assert(!(await ev(a,"document.querySelector('details[aria-label=\"Route summary\"] summary').textContent.includes('km')")),"mode change removes old totals immediately");await until(a,"document.querySelector('details[aria-label=\"Route summary\"] summary').textContent.includes('2.0 km')","new mode success",45000);
  await run(a,"select","[aria-label='Travel mode']","planning");const count=await ev(a,"window.__fp5MockCalls.length");await run(a,"select","[aria-label='Travel mode']","walk");await run(a,"select","[aria-label='Travel mode']","drive");await run(a,"select","[aria-label='Travel mode']","planning");assert.equal(await ev(a,"window.__fp5MockCalls.length"),count,"coalesced cancellation has no network attempt");await ev(a,"window.fetch=window.__fp5OriginalFetch;true");
  console.log("PASS controlled route outage/retry, no stale totals on mode change, debounce cancellation; synthetic responses only, zero provider requests");
}
if(mode==="regression"){
  for(const s of[a,b]){await run(s,"set","viewport","1440","900");await ready(s,`/room/${fixture.slug}/map`);await button(s,"FP5 Singapore QA");}
  const cards="[...document.querySelectorAll('[data-place-id]')].map(e=>({id:e.dataset.placeId,hidden:e.dataset.hidden,star:e.dataset.starred,locked:!!e.querySelector('[aria-label*=locked]'),skipped:!!e.querySelector('[aria-label^=Skipped]')}))";
  const before=await ev(a,cards);assert.equal(before.length,5);assert(before[0].locked);
  await button(a,"Place actions for QA Meetup");if(!(await ev(a,cards))[2].locked)await button(a,"Lock position 3");await run(a,"press","Escape");await until(b,`${cards}[2].locked`,"B shared lock");
  if(await ev(a,"!!document.querySelector('[aria-label=\"Comments on QA Meetup, 0\"]')")){await button(a,"Comments on QA Meetup, 0");await run(a,"fill","dialog textarea","FP5 safe QA movement preserves discussion");await button(a,"Post location comment");await until(a,"document.querySelector('dialog textarea').value===''","comment persisted");await button(a,"Close comments");}
  await button(a,"Place actions for QA Meetup");if((await ev(a,cards))[2].star!=="true")await button(a,"Star");await until(b,`${cards}[2].star==='true'`,"B shared star");await button(a,"Reposition checkpoint");await run(a,"find","label","Latitude","fill","1.2898");await button(a,"Save position");await until(a,"!document.querySelector('dialog[open]')","manual move confirmed");
  await until(b,"!!document.querySelector('[aria-label=\"Comments on QA Meetup, 1\"]')","same-card comment preserved");assert.deepEqual((await ev(a,cards)).map(c=>c.id),before.map(c=>c.id));
  await button(b,"Place actions for QA Meetup");await button(b,"Get info");assert((await ev(b,"document.querySelector('dialog').textContent")).includes("1.28980"));await button(b,"Close place details");
  await button(a,"Hide Checkpoint 5 from my map");assert.equal((await ev(b,cards))[4].hidden,"false");await button(a,"Place actions for Checkpoint 5");await button(a,"Skip in route");await run(a,"press","Escape");await until(b,`${cards}[4].skipped`,"shared Skip");
  await button(b,"Place actions for Checkpoint 5");await button(b,"Include in route");await run(b,"press","Escape");await until(a,`!${cards}[4].skipped`,"shared restore");await button(a,"Show Checkpoint 5 on my map");
  await button(a,"Quick order");if(await ev(a,"!!document.querySelector('[aria-label=\"Quick order preview\"]')"))await button(a,"Apply suggested order");
  await until(b,`${cards}.map(c=>c.id).join('|')===${JSON.stringify((await ev(a,cards)).map(c=>c.id).join('|'))}`,"B order reconciliation");assert.equal((await ev(a,cards))[0].id,before[0].id);assert.equal((await ev(a,cards))[2].id,before[2].id);
  await button(a,"Select place 3: QA Meetup");await ev(a,"window.__fp5Canvas=document.querySelector('.maplibregl-canvas');true");await run(a,"fill",".composer textarea","FP5 unsent tray draft");await button(a,"Collapse Location Cards");assert(await ev(a,"window.__fp5Canvas===document.querySelector('.maplibregl-canvas')"));await button(a,"Expand Location Cards");assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),"FP5 unsent tray draft");await run(a,"fill",".composer textarea","");
  await button(a,"Close place preview");await run(b,"reload");await until(b,`${cards}.length===5&&${cards}[2].locked&&${cards}[2].star==='true'`,"durable shared fields reload");
  console.log("PASS browser A/B locks, manual position/comment/star preservation, private Hide/shared Skip, Quick Order locked slots, tray canvas/draft preservation and reload");
}
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
  await run(a,"set","viewport","1440","900");await ready(a,`/room/${fixture.slug}/map`);await button(a,"FP5 Singapore QA");await run(a,"set","media","dark","reduced-motion");
  for(const [width,height] of [[320,800],[390,844],[430,900],[768,900],[1440,900],[1728,960],[844,390]]){
    await run(a,"set","viewport",String(width),String(height));await button(a,"Fit trip");await run(a,"click",".maplibregl-marker[aria-label$='3: QA Meetup']");
    const geometry=await ev(a,"(()=>{const e=document.querySelector('[data-map-inspector]'),r=e.getBoundingClientRect(),c=e.parentElement.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,inside:r.left>=c.left&&r.right<=c.right+1&&r.top>=c.top&&r.bottom<=c.bottom-20,content:e.scrollWidth<=e.clientWidth+1,motion:matchMedia('(prefers-reduced-motion:reduce)').matches,modal:document.querySelectorAll('dialog[open]').length}})()");
    assert(!geometry.overflow&&geometry.inside&&geometry.content&&geometry.motion&&geometry.modal===0,JSON.stringify({width,geometry}));
    await run(a,"screenshot",`${process.cwd()}/.git/fp5-recovery/inspector-${width}.png`);await button(a,"Close place preview");console.log(`PASS inspector ${width}x${height}: bounded, non-modal, reduced motion`);
  }
  await run(a,"set","viewport","1440","900");
}
