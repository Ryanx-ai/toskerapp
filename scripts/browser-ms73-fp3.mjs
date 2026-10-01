import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { run, ev, until, button } from "./browser-fp2.mjs";
const fixture=JSON.parse(readFileSync("docs/MS7-3-FP3-FIXTURE.json","utf8"));
const origin=process.env.FP3_ORIGIN??"http://localhost:3000", a=process.env.FP3_A??"ms73-fp3-a";
const b=process.env.FP3_B??"ms73-fp3-b";
const base=`${origin}/room/${fixture.slug}`, input=".chat-search-bar input", results=".chat-search-bar [role=option]";
async function ready(){await until(a,"!!document.querySelector('.chat-search-bar') && document.querySelectorAll('.message-row').length>0","Chat loaded",45000);}
async function query(text){
  if(!await ev(a,`document.querySelector('${input}')?.checkVisibility()`))await button(a,"Find in this Room");
  await run(a,"fill",input,text);
  await until(a,`document.querySelectorAll('${results}').length===${text==='orchid'?3:1}`,"canonical search results");
}
async function mapReady(s){await until(s,"document.querySelector('[data-map-state]')?.dataset.mapState==='ready'&&document.querySelector('[data-trip-revision]')?.dataset.tripRevision!==undefined","Map loaded",45000);}
if(process.argv[2]==="fp3-search-resilience"){
 for(const s of[a,b]){
  await run(s,"set","viewport","1440","960");await run(s,"open",base+"?surface=chat");await until(s,"!!document.querySelector('.chat-search-bar')","Chat");
  await button(s,"Find in this Room");
  await ev(s,"(()=>{window.__fp3SearchFetch=window.fetch;window.__fp3SearchCalls=0;window.__fp3PlaceCalls=0;window.__fp3Fail=false;window.fetch=(u,o)=>{if(String(u).includes('/places'))window.__fp3PlaceCalls++;if(String(u).includes('/search?')){window.__fp3SearchCalls++;if(window.__fp3Fail)return Promise.resolve(new Response('',{status:503}));}return window.__fp3SearchFetch(u,o)};document.querySelector('.chat-search-bar input').dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));return true})()");
  await run(s,"fill",input,"orchid");await new Promise(r=>setTimeout(r,650));assert.equal(await ev(s,"window.__fp3SearchCalls"),0);
  await ev(s,"document.querySelector('.chat-search-bar input').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));true");
  await until(s,`document.querySelectorAll('${results}').length===3`,"composition finished search");
  await ev(s,"window.__fp3Fail=true;true");await run(s,"fill",input,"orchid earliest");await until(s,"document.body.textContent.includes(\"Search couldn't be loaded\")","honest search failure");
  assert.equal(await ev(s,`document.querySelectorAll('${results}').length`),0);
  await ev(s,"window.__fp3Fail=false;true");await button(s,"Retry message search");await until(s,`document.querySelectorAll('${results}').length===1`,"search retry");
  await run(s,"press","Escape");await until(s,"document.activeElement?.classList.contains('context-search-compact')","Escape restores trigger focus");
  assert.equal(await ev(s,"window.__fp3PlaceCalls"),0);await ev(s,"window.fetch=window.__fp3SearchFetch;true");
  console.log("PASS A/B IME deferral, no stale results on failure, retry, Escape focus, no place-provider search",s);
 }
}
if(process.argv[2]==="fp3-confirm"){
 for(const s of[a,b]){await run(s,"set","viewport","1440","960");await run(s,"open",base+"/map");await mapReady(s);}
 const initial=await ev(a,"document.querySelectorAll('[data-place-id]').length");
 await ev(a,"(()=>{window.__fp3PlaceFetch=window.fetch;window.fetch=async(u,o)=>{const r=await window.__fp3PlaceFetch(u,o);if(String(u).endsWith('/places')&&r.ok){window.__fp3PlaceInput=JSON.parse(o.body);window.__fp3PlaceReply=await r.clone().json();}return r};return true})()");
 await run(a,"fill","[aria-label='Search places']","Marina Bay Sands");await until(a,"document.querySelectorAll('[aria-label=\"Place search results\"] button').length>=2","real Singapore candidates",30000);
 assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),initial);
 await run(a,"click","[aria-label='Place search results'] li:nth-child(2) button");
 const chosen=await ev(a,"(()=>{const p=window.__fp3PlaceReply.candidates[1].candidate;return {title:p.title,latitude:p.latitude,longitude:p.longitude}})()");
 assert(await ev(a,`document.querySelector('[aria-label="Place preview"]').textContent.includes(${JSON.stringify(chosen.latitude.toFixed(5)+", "+chosen.longitude.toFixed(5))})`));
 assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),initial);
 await button(a,"Add to trip");await until(b,`document.querySelectorAll('[data-place-id]').length===${initial+1}`,"explicit candidate saved for B",45000);
 await until(a,"!document.querySelector('[aria-label=\"Place preview\"]')","Add acknowledged");
 await button(a,`Place actions for ${chosen.title}`);await button(a,"Get info");
 assert(await ev(a,`document.querySelector('dialog[open]').textContent.includes(${JSON.stringify(chosen.latitude.toFixed(5)+", "+chosen.longitude.toFixed(5))})`));
 await run(a,"press","Escape");console.log("PASS selected candidate matches persisted card details",JSON.stringify(chosen));
 await button(a,"Pin");
 const point=await ev(a,"(()=>{const r=document.querySelector('.maplibregl-canvas').getBoundingClientRect();return {x:Math.round(r.left+r.width*.45),y:Math.round(r.top+r.height*.4)}})()");
 await run(a,"mouse","move",String(point.x),String(point.y));await run(a,"mouse","down");await run(a,"mouse","up");
 await until(a,"window.__fp3PlaceInput?.kind==='pin'&&!!document.querySelector('[aria-label=\"Place preview\"]')&&[...document.querySelectorAll('button')].some(e=>e.textContent==='Confirm pin'&&!e.disabled)","resolved direct pin preview",30000);
 const pin=await ev(a,"(()=>{const p=window.__fp3PlaceReply.candidates[0].candidate,i=window.__fp3PlaceInput;return {latitude:p.latitude,longitude:p.longitude,clickedLat:i.latitude,clickedLon:i.longitude,providerId:p.providerId}})()");
 assert.equal(pin.latitude,pin.clickedLat);assert.equal(pin.longitude,pin.clickedLon);assert.equal(pin.providerId,null);
 assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),initial+1);
 await button(a,"Confirm pin");await until(b,`document.querySelectorAll('[data-place-id]').length===${initial+2}`,"explicit pin saved for B",45000);
 await run(a,"reload");await mapReady(a);assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),initial+2);
 console.log("PASS deliberate second-result selection, coordinate preview, explicit Add, exact clicked pin coordinates independent of reverse context, Confirm, A/B and reload",JSON.stringify({chosen,pin}));
}
const cardIds="[...document.querySelectorAll('[data-place-id]')].map(e=>e.dataset.placeId)";
if(process.argv[2]==="fp3-map"){
  for(const s of[a,b]){await run(s,"set","viewport","1440","960");await run(s,"open",base+"/map");await mapReady(s);await button(s,"FP3 public QA route");}
  const before=await ev(a,cardIds);assert.equal(before.length,3);
  await ev(a,"(()=>{window.__fp3Fetch=window.fetch;window.fetch=async(...args)=>{const r=await window.__fp3Fetch(...args);if(String(args[0]).endsWith('/roads')&&r.ok)window.__fp3Road=await r.clone().json();return r;};return true})()");
  for(const mode of["drive","walk"]){
    await run(a,"select","select[aria-label='Travel mode']",mode);
    assert(await ev(a,"!document.querySelector('.fp3-road-guidance')"));await button(a,"Refresh roads");
    await until(a,"!!document.querySelector('.fp3-road-guidance')","real road estimate",45000);
    const proof=await ev(a,"(()=>{const g=window.__fp3Road.geometry;return {mode:g.mode,key:JSON.parse(g.key),segments:g.segments.length,metres:g.estimate.metres,seconds:g.estimate.seconds,names:g.estimate.guidance.length}})()");
    assert.equal(proof.mode,mode);assert.deepEqual(proof.key.slice(1).map(p=>p[0]),before);assert.equal(proof.segments,2);assert(proof.metres>10000&&proof.seconds>0&&proof.names>0);
    await run(a,"click",".fp3-road-guidance summary");await button(a,"Fit trip");
    assert(await ev(a,"(()=>{const r=document.querySelector('.maplibregl-canvas').getBoundingClientRect(),pins=[...document.querySelectorAll('.maplibregl-map button[aria-label^=\"Select place\"]')];return pins.length===3&&pins.every(e=>{const p=e.getBoundingClientRect();return p.left>=r.left&&p.right<=r.right&&p.top>=r.top&&p.bottom<=r.bottom})})()"));
    await run(a,"screenshot",`/tmp/tosker-fp3-${mode}.png`);console.log("PASS provider geometry/order, estimate, names and fit",JSON.stringify(proof));
  }
  await ev(a,"(()=>{window.fetch=(url,options)=>String(url).endsWith('/roads')?Promise.resolve(Response.json({error:'QA bounded outage'},{status:503})):window.__fp3Fetch(url,options);return true})()");
  await button(a,"Refresh roads");await until(a,"document.body.textContent.includes('QA bounded outage')","controlled road outage");
  assert(await ev(a,"!document.querySelector('.fp3-road-guidance')"));assert.deepEqual(await ev(a,cardIds),before);
  await ev(a,"window.fetch=window.__fp3Fetch;true");
  // Private active-route selection differs across A/B. Nuking R2 must not affect R1 copies.
  await button(b,"FP3 disposable route");const other=await ev(b,cardIds);assert(other.every(id=>!before.includes(id)));
  await button(a,"Route actions for FP3 disposable route");await button(a,"Nuke route");
  assert(await ev(a,"document.querySelector('dialog[open]').textContent.includes('all its locations and comments')"));
  await button(a,"Cancel");assert.equal((await ev(b,cardIds)).length,3);
  await button(a,"Route actions for FP3 disposable route");await button(a,"Nuke route");await button(a,"Nuke route");
  await until(b,"!document.querySelector('[aria-label=\"Route actions for FP3 disposable route\"]')","B sees route Nuke",45000);
  assert.deepEqual(await ev(b,cardIds),before);assert.deepEqual(await ev(a,cardIds),before);
  await run(b,"reload");await mapReady(b);assert.deepEqual(await ev(b,cardIds),before);
  console.log("PASS outage clears estimates without touching cards; Route Nuke cancel/confirm, A/B realtime, private active-route fallback and reload");
}
if(process.argv[2]==="fp3-map-layout"){
 await run(a,"open",base+"/map");await mapReady(a);
 await run(a,"set","media","dark","reduced-motion");assert(await ev(a,"matchMedia('(prefers-reduced-motion: reduce)').matches"));
 for(const width of[320,390,430,768,1440,1728]){
  await run(a,"set","viewport",String(width),width<640?"844":"1000");
  assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"),`Map overflow ${width}`);
  await run(a,"screenshot",`/tmp/tosker-fp3-map-${width}.png`);
  if(width<=768){await run(a,"click","[aria-label='Map view'] button:last-child");assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"));await run(a,"screenshot",`/tmp/tosker-fp3-cards-${width}.png`);await run(a,"click","[aria-label='Map view'] button:first-child");}
  console.log("PASS Map/cards reduced-motion width",width);
 }
 await run(a,"set","viewport","1440","960");
}
if(process.argv[2]==="fp3-empty"){
 for(const s of[a,b]){await run(s,"set","viewport","1440","960");await run(s,"open",base+"/map");await mapReady(s);}
 assert.equal(await ev(a,"document.querySelectorAll('[aria-label^=\"Route actions for\"]').length"),1,"Only final owned QA route");
 await button(a,"Route actions for FP3 public QA route");await button(a,"Nuke route");await button(a,"Nuke route");
 for(const s of[a,b]){
  await until(s,"document.body.textContent.includes('Create a route to begin')","last route empty",45000);
  assert.equal(await ev(s,"document.querySelectorAll('[data-place-id]').length"),0);
  assert(await ev(s,"document.querySelector('[aria-label=\"Search places\"]').disabled"));
  assert.equal(await ev(s,"document.querySelectorAll('.maplibregl-marker').length"),0);
 }
 await run(b,"reload");await mapReady(b);assert(await ev(b,"document.body.textContent.includes('Create a route to begin')"));
 console.log("PASS final Route Nuke yields honest empty state, no cards/pins/implicit route, disabled add, A/B and reload");
}
if(process.argv[2]==="fp3-founder-readonly"){
 await run(a,"set","viewport","1440","960");await run(a,"open",origin+"/room/ms73-founder-review-904a9dea/map");await mapReady(a);
 assert(await ev(a,"document.querySelectorAll('[data-place-id]').length>0&&!!document.querySelector('.planning-chat .chat-search-bar')"));
 await run(a,"screenshot","/tmp/tosker-fp3-founder-live.png");
 console.log("PASS retained Founder Review Map + Chat renders, no shared content changed");
}
if(process.argv[2]==="fp3-search") {
  await run(a,"set","viewport","1440","900");await run(a,"open",base+"?surface=chat");await ready();
  assert(await ev(a,"document.querySelector('.context-search-compact').checkVisibility()&&!document.querySelector('.context-search-field').checkVisibility()"));
  await query("orchid earliest");await run(a,"press","ArrowDown");await run(a,"press","Enter");
  await until(a,`!!document.querySelector('#message-${fixture.oldest}.message-source-highlight')`,"old source highlight");
  assert(await ev(a,"document.querySelectorAll('.message-row').length>1 && document.querySelectorAll('.context-search-dropdown').length===0"));
  await query("orchid");await run(a,"press","Escape");
  assert(await ev(a,"document.querySelector('.context-search-compact').checkVisibility()"));
  await query("orchid");await button(a,"Clear message search");
  assert(await ev(a,`document.querySelector('${input}').value===''&&!document.querySelector('.context-search-dropdown')&&document.querySelector('.context-search-compact').checkVisibility()`));
  console.log("PASS compact expansion, canonical old-message jump with surrounding history, Escape and Clear collapse.");
  for(const suffix of ["/map","/hall","/live"]) {
    await run(a,"open",base+suffix);await until(a,"!!document.querySelector('.surface-tabs')","planning surface");
    if(!await ev(a,"!!document.querySelector('.planning-chat')"))await button(a,"Chat");
    await ready();assert(await ev(a,"document.querySelectorAll('.context-search').length===1&&!!document.querySelector('.planning-chat .chat-search-bar input')&&!document.querySelector('.conversation-header .context-search')"));
    await ev(a,"window.__fp3Canvas=document.querySelector('.maplibregl-canvas')");
    await query("orchid earliest");await run(a,"press","Enter");
    await until(a,`!!document.querySelector('#message-${fixture.oldest}.message-source-highlight')`,"companion source highlight");
    assert.equal(await ev(a,"location.pathname"),`/room/${fixture.slug}${suffix}`);
    assert(await ev(a,"window.__fp3Canvas===document.querySelector('.maplibregl-canvas')"));
    console.log("PASS one Chat-owned search and history jump preserves planning surface",suffix);
  }
}
if(process.argv[2]==="fp3-search-layout") {
  for(const width of [320,390,430,768,1440,1728]) {
    await run(a,"set","viewport",String(width),width<640?"844":"1000");await run(a,"open",base+"?surface=chat");await ready();
    await query("orchid");
    assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"));
    assert(await ev(a,"(()=>{const r=document.querySelector('.context-search-dropdown').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight})()"));
    assert(await ev(a,"document.querySelector('.context-search-dropdown').getBoundingClientRect().top>document.querySelector('.context-search-field').getBoundingClientRect().bottom"),"Results must never cover focused search field");
    await run(a,"screenshot",`/tmp/tosker-fp3-search-${width}.png`);await run(a,"press","Escape");
    console.log("PASS search bounds/no page overflow/compact escape",width);
  }
}
