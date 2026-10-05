import assert from "node:assert/strict";
import {run,ev,until,button as clickButton} from "./browser-fp2.mjs";
const a=process.env.FP4A_A??"ms73-fp4a-a",b=process.env.FP4A_B??"ms73-fp4a-b",origin=process.env.FP4A_ORIGIN??"http://localhost:3000",slug=process.env.FP4A_SLUG??"ms73-qa-7020333f";
const q=JSON.stringify;
async function button(s,name){await until(s,`[...document.querySelectorAll('button')].some(e=>e.checkVisibility()&&!e.disabled&&(e.getAttribute('aria-label')||e.textContent).trim()===${q(name)})`,`enabled ${name}`);return clickButton(s,name);}
const cards="[...document.querySelectorAll('[data-place-id]')].map(e=>({id:e.dataset.placeId,name:e.querySelector('strong')?.textContent,hidden:e.dataset.hidden,star:e.dataset.starred,locked:!!e.querySelector('[aria-label*=locked]'),skipped:!!e.querySelector('[aria-label^=Skipped]')}))";
async function menu(s,name){await button(s,`Place actions for ${name}`);}
async function close(s){if(await ev(s,"!!document.querySelector('dialog[open]')||!!document.querySelector('.interaction-popover:popover-open')"))await run(s,"press","Escape");}
async function observeRoads(s){await ev(s,`(()=>{if(window.__fp4Roads)return;window.__fp4Roads=[];const original=window.fetch;window.fetch=async(...args)=>{const road=String(args[0]).endsWith('/roads');const response=await original(...args);if(road){const data=await response.clone().json();window.__fp4Roads.push({status:response.status,key:data.geometry?.key,mode:data.geometry?.mode,error:data.error});}return response;};})()`);}
if(process.argv[2]==="collaboration"){
 await close(a);await close(b);
 const before=await ev(a,cards);assert.equal(before.length,5);assert(before[0].locked);assert(!before[4].locked);
 await menu(a,"Checkpoint 3");if(!(await ev(a,cards))[2].locked)await button(a,"Lock position 3");await close(a);
 await until(b,`${cards}[2].locked`,"B shared middle lock");
 if(await ev(a,"!!document.querySelector('[aria-label=\"Comments on Checkpoint 3, 0\"]')")){await button(a,"Comments on Checkpoint 3, 0");await run(a,"fill","dialog textarea","FP4A movement keeps this comment");await button(a,"Post location comment");await until(a,"document.querySelector('dialog textarea').value===''","comment committed");await button(a,"Close comments");}
 await menu(a,"Checkpoint 3");if((await ev(a,cards))[2].star!=="true")await button(a,"Star");await until(b,`${cards}[2].star==='true'`,"B shared star");await button(a,"Reposition checkpoint");
 await run(a,"find","label","Latitude","fill","1.2898");await button(a,"Save position");await until(a,"!document.querySelector('dialog[open]')","confirmed same-card move");
 await until(b,"document.querySelector('[aria-label=\"Comments on Checkpoint 3, 1\"]')!==null","B retained comment");
 assert.deepEqual((await ev(a,cards)).map(c=>c.id),before.map(c=>c.id));assert((await ev(b,cards))[2].locked);
 await menu(b,"Checkpoint 3");await button(b,"Get info");assert((await ev(b,"document.querySelector('dialog').textContent")).includes("1.28980"));await button(b,"Close place details");
 await button(a,"Hide Checkpoint 5 from my map");assert.equal((await ev(a,cards))[4].hidden,"true");assert.equal((await ev(b,cards))[4].hidden,"false");
 await menu(a,"Checkpoint 5");await button(a,"Skip in route");await until(b,`${cards}[4].skipped`,"shared Skip distinct from Eye");await close(a);
 await menu(b,"Checkpoint 5");await button(b,"Include in route");await until(a,`!${cards}[4].skipped`,"restore shared eligibility");await close(b);
 await button(a,"Quick order");if(await ev(a,"!!document.querySelector('[aria-label=\"Quick order preview\"]')"))await button(a,"Apply suggested order");
 await until(b,`${cards}.map(c=>c.id).join('|')===${q((await ev(a,cards)).map(c=>c.id).join('|'))}`,"B suggested order");const after=await ev(a,cards);assert.equal(after[0].id,before[0].id);assert.equal(after[2].id,before[2].id);assert(!(await ev(a,"document.body.textContent")).includes("Undo order"));
 await button(a,"Quick order");await until(a,"document.body.textContent.includes('Already in the quickest order.')","idempotent Quick order notice");
 await run(b,"open",`${origin}/room/${slug}?surface=map`);await until(b,`${cards}.length===5&&${cards}[2].locked`,"reload locks");assert.equal((await ev(b,cards))[2].star,"true");
 console.log("PASS A/B default/middle locks, same-card movement/comments/star, private Eye/shared Skip+restore, Quick order/no Undo/reload");
}
if(process.argv[2]==="roads"){
 await close(a);await close(b);await observeRoads(a);await observeRoads(b);
 await run(a,"select","select[aria-label='Travel mode']","walk");await until(a,"window.__fp4Roads.some(r=>r.status===200&&r.mode==='walk')","automatic Walk",45000);
 const first=await ev(a,"window.__fp4Roads.at(-1)");assert(first.key);await until(a,"!!document.querySelector('[aria-label=\"Walking route estimate\"]')","on-map estimate");
 await menu(a,"Checkpoint 5");await button(a,"Skip in route");await close(a);await until(a,`window.__fp4Roads.some(r=>r.status===200&&r.key!==${q(first.key)})`,"Skip recalculation",45000);
 const skipped=await ev(a,"window.__fp4Roads.at(-1)");assert.equal(JSON.parse(skipped.key).length,5);assert(!JSON.parse(skipped.key).slice(1).some(p=>p[1]===1.2873&&p[2]===103.8513));
 await menu(b,"Checkpoint 5");await button(b,"Include in route");await close(b);await until(a,`window.__fp4Roads.length>=3&&window.__fp4Roads.at(-1).key===${q(first.key)}`,"peer restore recalculation",70000);
 const calls=await ev(a,"window.__fp4Roads.length");await button(a,"Show Checkpoint 5 on my map");await button(a,"Hide Checkpoint 5 from my map");await run(a,"select","select[aria-label='Travel mode']","planning");
 assert.equal(await ev(a,"window.__fp4Roads.length"),calls);assert.equal(await ev(b,"window.__fp4Roads.length"),0);
 console.log("PASS real automatic Walk / shared Skip / peer restore; private Eye has no road request, Order no provider call");
}
if(process.argv[2]==="interaction"){
 await run(a,"select","select[aria-label='Travel mode']","planning");await button(a,"FP4A Singapore QA");
 await ev(a,"(()=>{window.__fp4Canvas=document.querySelector('.maplibregl-canvas');window.__fp4PlaceCalls=0;const original=window.fetch;window.fetch=(u,o)=>{if(String(u).endsWith('/places'))window.__fp4PlaceCalls++;return original(u,o);};})()");
 await button(a,"Select place 3: Checkpoint 3");const revision=await ev(a,"document.querySelector('[data-trip-revision]').dataset.tripRevision");
 const pos=await ev(a,"(()=>{const r=document.querySelector('.maplibregl-marker[aria-label*=\"checkpoint 3\"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
 async function drag(){await run(a,"mouse","move",String(pos.x),String(pos.y));await run(a,"mouse","down");await run(a,"mouse","move",String(pos.x+60),String(pos.y+35));await run(a,"mouse","up");await until(a,"!!document.querySelector('[aria-label=\"Move checkpoint preview\"]')","deliberate drag preview");}
 await drag();assert.equal(await ev(a,"document.querySelector('[data-trip-revision]').dataset.tripRevision"),revision);await button(a,"Cancel");assert.equal(await ev(a,"document.querySelector('[data-trip-revision]').dataset.tripRevision"),revision);
 await drag();await button(a,"Save position");await until(b,`Number(document.querySelector('[data-trip-revision]').dataset.tripRevision)>${revision}`,"B receives confirmed drag");assert.equal(await ev(a,"window.__fp4PlaceCalls"),0);
 await button(a,"Select place 3: Checkpoint 3");await run(a,"fill",".composer textarea","FP4A unsent tray draft");
 await button(a,"Collapse Location Cards");assert(await ev(a,"window.__fp4Canvas===document.querySelector('.maplibregl-canvas')"));assert(await ev(a,"!document.querySelector('[aria-label=\"Route locations\"]').checkVisibility()"));
 await button(a,"Expand Location Cards");assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),"FP4A unsent tray draft");assert(await ev(a,"document.querySelector('[aria-label=\"Select place 3: Checkpoint 3\"]').getAttribute('aria-pressed')==='true'"));await run(a,"fill",".composer textarea","");
 await ev(a,"(()=>{window.__fp4GeoCalls=0;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(ok){window.__fp4GeoCalls++;ok({coords:{latitude:1.29,longitude:103.85,accuracy:25}})},watchPosition(){throw Error('Continuous tracking prohibited')}}});})()");
 assert.equal(await ev(a,"window.__fp4GeoCalls"),0);await button(a,"Locate me");await until(a,"!!document.querySelector('[aria-label^=\"Your location, accuracy\"]')","explicit private location");assert.equal(await ev(b,"document.querySelectorAll('[aria-label^=\"Your location, accuracy\"]').length"),0);await button(a,"Clear my location");assert.equal(await ev(a,"document.querySelectorAll('[aria-label^=\"Your location, accuracy\"]').length"),0);
 console.log("PASS actual marker drag/cancel/confirm, B reconcile, zero drag provider calls, tray preserves canvas/selection/draft, one-shot Locate private and cleared");
}
if(process.argv[2]==="fp4a-layout"){
 await run(a,"select","select[aria-label='Travel mode']","planning");await run(a,"set","media","dark","reduced-motion");
 for(const [width,height] of [[320,844],[390,844],[430,844],[768,1000],[1440,960],[1728,1000],[844,390],[1280,633]]){
  await run(a,"set","viewport",String(width),String(height));assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"),`page overflow ${width}`);
  if(width<=768){await run(a,"click","[aria-label='Map view'] button:first-child");assert(!await ev(a,"document.querySelector('[aria-label=\"Trip places\"]').checkVisibility()"));}
  await run(a,"screenshot",`/tmp/fp4a-map-${width}-${height}.png`);
  if(width<=768){await run(a,"click","[aria-label='Map view'] button:last-child");assert(await ev(a,"document.querySelector('[aria-label=\"Trip places\"]').checkVisibility()"));assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"));await run(a,"screenshot",`/tmp/fp4a-places-${width}.png`);await run(a,"click","[aria-label='Map view'] button:first-child");}
  else assert(await ev(a,"(()=>{const map=document.querySelector('[data-map-state]').parentElement.getBoundingClientRect(),tray=document.querySelector('[aria-label=\"Trip places\"]').getBoundingClientRect();return map.bottom<=tray.top+1})()"),`no overlap ${width}`);
  console.log("PASS responsive bounds/singular primary/no overlap",width,height);
 }
 await run(a,"set","viewport","1440","960");
}
if(process.argv[2]==="fp4a-road-resilience"){
 await run(a,"select","[aria-label='Travel mode']","planning");await button(a,"FP4A bounded roads");await until(a,`${cards}.length===2`,"bounded route");
 await ev(a,`(()=>{window.__fp4MockCalls=[];window.__fp4MockFail=true;window.__fp4OriginalFetch=window.fetch;window.fetch=async(u,o)=>{if(!String(u).endsWith('/roads'))return window.__fp4OriginalFetch(u,o);const mode=JSON.parse(o.body).mode;window.__fp4MockCalls.push(mode);if(window.__fp4MockFail)return Response.json({error:'QA controlled road outage'},{status:503});const coords=[[1.2837,103.8607],[1.2868,103.8545]],points=[...document.querySelectorAll('[data-place-id]')].map((e,i)=>[e.dataset.placeId,...coords[i]]);return Response.json({geometry:{mode,key:JSON.stringify([mode,...points]),segments:[[[103.8607,1.2837],[103.856,1.285],[103.8545,1.2868]]],attribution:'Synthetic QA response, no provider call',estimate:{metres:1200,seconds:900,guidance:[{name:'Synthetic QA path',metres:1200}]}}});};})()`);
 await run(a,"select","[aria-label='Travel mode']","walk");await until(a,"document.body.textContent.includes('QA controlled road outage')","honest outage",70000);assert(!await ev(a,"!!document.querySelector('[aria-label=\"Walking route estimate\"]')"));
 const count=await ev(a,"window.__fp4MockCalls.length");await ev(a,"window.__fp4MockFail=false");await button(a,"Retry roads");await until(a,"!!document.querySelector('[aria-label=\"Walking route estimate\"]')","explicit recovery",70000);
 assert.equal(await ev(a,"window.__fp4MockCalls.length"),count+1);
 await run(a,"click","[aria-label='Walking route estimate'] summary");await button(a,"Fit trip");
 assert(await ev(a,"(()=>{const p=document.querySelector('[aria-label=\"Walking route estimate\"]').getBoundingClientRect(),m=document.querySelector('.maplibregl-canvas').getBoundingClientRect();return p.left>=m.left&&p.right<=m.right&&p.bottom<=m.bottom})()"),"expanded estimate fits map");
 await run(a,"select","[aria-label='Travel mode']","drive");assert(!await ev(a,"!!document.querySelector('[aria-label=\"Walking route estimate\"]')"));await until(a,"!!document.querySelector('[aria-label=\"Driving route estimate\"]')","mode change",70000);
 await run(a,"select","[aria-label='Travel mode']","planning");const last=await ev(a,"window.__fp4MockCalls.length");await run(a,"select","[aria-label='Travel mode']","walk");await run(a,"select","[aria-label='Travel mode']","drive");await run(a,"select","[aria-label='Travel mode']","planning");assert.equal(await ev(a,"window.__fp4MockCalls.length"),last);
 await ev(a,"window.fetch=window.__fp4OriginalFetch");console.log("PASS controlled outage clears geometry, explicit retry, mode invalidation, debounce cancellation and on-map expanded estimate bounds; no provider calls");
}
if(process.argv[2]==="fp4a-live"){
 for(const s of[a,b]){await run(s,"set","viewport","1440","960");await until(s,"document.querySelector('[data-map-state]')?.dataset.mapState==='ready'&&document.querySelectorAll('[data-place-id]').length===2","canonical two-card Map",45000);}
 await menu(a,"Checkpoint 2");await button(a,"Lock position 2");await until(b,`${cards}[1].locked`,"live peer lock");await button(a,"Reposition checkpoint");await run(a,"find","label","Latitude","fill","1.2869");await button(a,"Save position");await until(a,"!document.querySelector('dialog[open]')","live movement confirmation");
 await menu(b,"Checkpoint 2");await button(b,"Get info");assert((await ev(b,"document.querySelector('dialog').textContent")).includes("1.28690"));await button(b,"Close place details");
 await button(a,"Hide Checkpoint 2 from my map");assert.equal((await ev(b,cards))[1].hidden,"false");
 await menu(a,"Checkpoint 2");await button(a,"Skip in route");await until(b,`${cards}[1].skipped`,"live shared Skip");await close(a);await menu(b,"Checkpoint 2");await button(b,"Include in route");await until(a,`!${cards}[1].skipped`,"live restore");await close(b);await button(a,"Show Checkpoint 2 on my map");
 for(const[s,mode]of[[a,"walk"],[b,"drive"]]){await observeRoads(s);await run(s,"select","[aria-label='Travel mode']",mode);await until(s,`window.__fp4Roads.some(r=>r.status===200&&r.mode===${q(mode)})`,"live bounded road",45000);assert.equal(JSON.parse((await ev(s,"window.__fp4Roads.at(-1)")).key).length,3);await button(s,"Fit trip");await run(s,"screenshot",`/tmp/fp4a-canonical-${mode}.png`);await run(s,"select","[aria-label='Travel mode']","planning");}
 await button(a,"Collapse Location Cards");assert(!await ev(a,"document.querySelector('[aria-label=\"Route locations\"]').checkVisibility()"));await button(a,"Expand Location Cards");
 await run(b,"reload");await until(b,`${cards}.length===2&&${cards}[1].locked`,"canonical reload");assert.equal((await ev(b,cards))[1].skipped,false);
 for(const s of[a,b])assert.deepEqual(await run(s,"errors"),{errors:[]});console.log("PASS canonical A/B Map, shared lock/move/Skip+restore, private Eye, Walk/Drive, tray/reload and clean browser errors");
}
