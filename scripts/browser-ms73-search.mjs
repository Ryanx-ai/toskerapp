import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { run, ev, until, button } from "./browser-fp2.mjs";
const a="ms73-local-a",b="ms73-local-b",out=process.env.MS73_CAPTURES;
assert(out);
const fixture=JSON.parse(readFileSync("docs/MS7-3-SEARCH-FIXTURE.json","utf8"));
const input='.context-search input',results='.context-search-dropdown [role=option]';
const mode=process.argv[2];
async function query(s,text){
  await run(s,"scrollintoview",input);await run(s,"click",input);
  if(await ev(s,"!!document.querySelector('[aria-label=\"Clear message search\"]')"))await button(s,"Clear message search");
  await run(s,"type",input,text);
  await until(s,`document.querySelector('${input}').value===${JSON.stringify(text)}`,"exact typed query");
}
async function ready(s){await until(s,"document.querySelectorAll('.message-row').length>0","canonical Chat history",45000);}
if(mode==="search-core") {
  for(const s of [a,b]){await run(s,"set","viewport","1440","1000");await ready(s);assert.equal(await ev(s,"document.querySelectorAll('.message-row').length"),50);}
  assert.equal(await ev(a,`!!document.getElementById('message-${fixture.oldest}')`),false);
  await query(a,"orch");await until(a,`document.querySelectorAll('${results}').length===3`,"automatic partial matches");
  assert.equal(await ev(a,"!!document.querySelector('dialog[open]')"),false);
  await query(a,"orchid earliest");await until(a,`document.querySelectorAll('${results}').length===1`,"refined results");
  await run(a,"screenshot",`${out}/search-anchored-desktop.png`);
  await run(a,"press","ArrowDown");await run(a,"press","Enter");
  await until(a,`!!document.getElementById('message-${fixture.oldest}')?.classList.contains('message-source-highlight')`,"old history jump highlight");
  assert(await ev(a,"document.querySelectorAll('.message-row').length>1"));assert.equal(await ev(a,`document.querySelector('${input}').value`),"orchid earliest");
  assert.equal(await ev(a,"document.querySelectorAll('.context-search-dropdown').length"),0);
  assert(await ev(a,`(()=>{const r=document.getElementById('message-${fixture.oldest}').getBoundingClientRect(),s=document.querySelector('.message-scroll').getBoundingClientRect();return r.top>=s.top&&r.top<s.bottom})()`));
  await run(a,"screenshot",`${out}/search-historical-context.png`);
  await query(b,"orchid middle");await until(b,`document.querySelectorAll('${results}').length===1`,"B middle match");await run(b,"press","ArrowDown");await run(b,"press","Enter");
  await until(b,`!!document.getElementById('message-${fixture.middle}')?.classList.contains('message-source-highlight')`,"B target");
  assert(await ev(b,"document.querySelectorAll('.message-row').length>=50"),"Already-loaded surrounding messages stay");
  for(const s of [a,b])assert(await ev(s,"(()=>{const ids=[...document.querySelectorAll('.message-row')].map(e=>e.id);return new Set(ids).size===ids.length})()"));
  await run(a,"open",`http://localhost:3000/room/${fixture.slug}`);await ready(a);await query(a,"orchid earliest");await until(a,`document.querySelectorAll('${results}').length===1`,"search after reload");await run(a,"press","Enter");await until(a,`!!document.getElementById('message-${fixture.oldest}')`,"historical target after reload");
  console.log("PASS editable top bar, debounced partial/refined results, keyboard selection, no modal, old-history surrounding context/highlight, query retained, A/B canonical IDs without duplicates, reload/search again.");
}
if(mode==="search-layout") {
  for(const width of [320,390,430,768,1440,1728]) {
    await run(a,"set","viewport",String(width),width<=640?"844":"1000");
    if(width<=640)await button(a,"Find in this Room");
    await query(a,"orchid");await until(a,`document.querySelectorAll('${results}').length>=2`,"responsive results");
    assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1&&scrollX===0"));
    assert(await ev(a,"(()=>{const r=document.querySelector('.context-search-dropdown').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight})()"));
    await run(a,"screenshot",`${out}/search-layout-${width}.png`);await run(a,"press","Escape");
    assert.equal(await ev(a,"!!document.querySelector('.context-search-dropdown')"),false);
    console.log("PASS anchored/mobile search",width);
  }
}
if(mode==="search-edit-nuke") {
  await run(a,"set","viewport","1440","1000");await run(a,"press","Escape");
  await query(b,"orchid earliest");await until(b,`document.querySelectorAll('${results}').length===1`,"B pre-edit result");
  await run(a,"scrollintoview",`#message-${fixture.oldest}`);await run(a,"focus",`#message-${fixture.oldest}`);await run(a,"press","Shift+F10");await button(a,"Edit");
  await run(a,"fill",'.message-edit-panel textarea',"MS7.3 search QA 001 — jasmine edited historical match");
  await button(a,"Save");
  await until(b,`document.querySelectorAll('${results}').length===0&&document.querySelector('.context-search-dropdown')?.textContent.includes('No messages found')`,"A edit removes stale B match",20000);
  await query(b,"jasmine");await until(b,`document.querySelectorAll('${results}').length===1`,"B edited text searchable");
  await run(a,"focus",`#message-${fixture.oldest}`);await run(a,"press","Shift+F10");await button(a,"Nuke message");await button(a,"Nuke message");
  await until(a,`!document.getElementById('message-${fixture.oldest}')`,"A owned Nuke");
  await until(b,`document.querySelectorAll('${results}').length===0`,"B result removed",20000);
  const denied=await ev(b,`(async()=>{const r=await fetch('/api/conversations/${fixture.conversationId}/messages?target=${fixture.oldest}',{cache:'no-store'});const p=await r.json();return {status:r.status,count:p.messages?.length,removed:p.removedIds?.includes('${fixture.oldest}')}})()`);
  assert.equal(denied.count,0);assert(denied.removed);console.log("PASS real A edit/Nuke through UI, B search reconciles, target re-fetch cannot resurrect removed message.");
}
if(mode==="search-resilience") {
  await run(a,"set","viewport","1440","1000");
  await ev(a,"(()=>{window.__qaFetch=window.fetch;window.__qaSearchCount=0;window.fetch=(url,init)=>{if(String(url).includes('/search?')){window.__qaSearchCount++;return Promise.resolve(Response.json({error:'Unavailable'},{status:503}))}return window.__qaFetch(url,init)};return true})()");
  try {
    await query(a,"orchid");await until(a,"document.body.textContent.includes(\"Search couldn't be loaded\")","bounded search error");
    const n=await ev(a,"window.__qaSearchCount");await button(a,"Retry message search");await until(a,`window.__qaSearchCount===${n+1}`,"explicit retry");
    await button(a,"Clear message search");
    await ev(a,"document.querySelector('.context-search input').dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}))");
    await run(a,"type",input,"orchid");
    await new Promise(resolve=>setTimeout(resolve,700));assert.equal(await ev(a,"window.__qaSearchCount"),n+1,"No requests mid-composition");
    await ev(a,"document.querySelector('.context-search input').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'orchid'}))");
    await until(a,`window.__qaSearchCount===${n+2}`,"composition end lookup");
    await button(a,"Clear message search");
  } finally {await ev(a,"(()=>{window.fetch=window.__qaFetch;delete window.__qaFetch;return true})()");}
  // Deliberately ignore AbortSignal in the first mocked response; epoch guard must still win.
  await ev(a,"(()=>{window.__qaFetch=window.fetch;window.__qaResolve=null;window.fetch=(url,init)=>{if(String(url).includes('/search?')){const q=new URL(String(url),location.origin).searchParams.get('q');if(q==='orchid')return new Promise(resolve=>{window.__qaResolve=()=>resolve(Response.json({results:[{id:'qa-stale',author:'Stale QA',createdAt:new Date().toISOString(),excerpt:'Stale result'}],nextCursor:null}))});return Promise.resolve(Response.json({results:[],nextCursor:null}))}return window.__qaFetch(url,init)};return true})()");
  try {await query(a,"orchid");await until(a,"!!window.__qaResolve","delayed response captured");await query(a,"no-match-now");await until(a,"document.querySelector('.context-search-dropdown')?.textContent.includes('No messages found')","newer query wins");await ev(a,"window.__qaResolve()");await new Promise(resolve=>setTimeout(resolve,300));assert.equal(await ev(a,`document.querySelectorAll('${results}').length`),0);await button(a,"Clear message search");}
  finally {await ev(a,"(()=>{window.fetch=window.__qaFetch;delete window.__qaFetch;delete window.__qaResolve;return true})()");}
  console.log("PASS search failure/retry, IME gate, aborted stale response cannot replace newer query; no provider calls.");
}
if(mode==="search-companion") {
  const review="/room/ms73-founder-review-904a9dea";
  await run(a,"set","viewport","1440","1000");
  for(const surface of ["map","hall"]) {
    await run(a,"open",`http://localhost:3000${review}/${surface}`);
    await until(a,"!!document.querySelector('.context-search input')","planning header",45000);
    await button(a,"Open Chat alongside");await ready(a);
    assert.equal(await ev(a,"document.querySelectorAll('.composer').length"),1);
    if(surface==="map")await until(a,"document.querySelector('[data-map-state]')?.dataset.mapState==='ready'","Map ready",30000);
    await ev(a,"window.__qaCanvas=document.querySelector('.maplibregl-canvas')");
    await query(a,"Founder Review");await until(a,`document.querySelectorAll('${results}').length===1`,"same Room Chat search");
    await run(a,"press","ArrowDown");await run(a,"press","Enter");await until(a,"!!document.querySelector('.planning-chat .message-source-highlight')","companion jump");
    assert.equal(await ev(a,"location.pathname"),`${review}/${surface}`);
    assert.equal(await ev(a,"document.querySelectorAll('.context-search').length"),1);
    assert(await ev(a,"window.__qaCanvas===document.querySelector('.maplibregl-canvas')"));
    if(surface==="map"){assert.equal(await ev(a,"document.querySelectorAll('[data-place-id]').length"),2);assert.equal(await ev(a,"document.querySelector('[aria-label=\"Search places\"]').value"),"");}
    await run(a,"screenshot",`${out}/${surface}-search-companion-final.png`);
  }
  console.log("PASS one context search targets existing Map/Board Chat companion; selection stays on planning surface; same renderer, separate geographic query and saved cards preserved.");
}
if(mode==="search-sidebar") {
  const nav='.unified-search input';
  for(const width of [320,390,430,768,1440,1728]) {
    await run(a,"set","viewport",String(width),width<=640?"844":"1000");
    await run(a,"open","http://localhost:3000/app?view=list");await until(a,`!!document.querySelector('${nav}')`,"navigation search",45000);
    await run(a,"click",nav);await run(a,"type",nav,"Founder Review");
    await until(a,"document.querySelectorAll('.conversation-list .conversation-row').length===1","partial Room navigation match");
    assert(await ev(a,"(()=>{const i=document.querySelector('.unified-search input'),l=i.closest('label');return getComputedStyle(i).outlineStyle==='none'&&getComputedStyle(l).outlineWidth==='2px'&&parseFloat(getComputedStyle(l).borderRadius)>=10})()"));
    assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1&&scrollX===0"));
    await run(a,"screenshot",`${out}/sidebar-search-${width}.png`);
    await button(a,"Clear chat and Room search");await run(a,"type",nav,"no-matching-qa-name");await until(a,"!!document.querySelector('.search-empty')","empty navigation state");
    await button(a,"Clear chat and Room search");
    if(width>640){await button(a,"Collapse sidebar");await button(a,"Find a chat or Room");await until(a,"document.activeElement===document.querySelector('.unified-search input')","collapsed search expands and focuses");}
    await run(a,"type",nav,"tosker-user-b");await until(a,"document.querySelectorAll('.conversation-list .conversation-row').length===1","partial canonical username match");
    await button(a,"Clear chat and Room search");await run(a,"type",nav,"Founder Review");await run(a,"press","ArrowDown");assert(await ev(a,"document.activeElement.classList.contains('conversation-row')"));await run(a,"press","Enter");await until(a,"location.pathname==='/room/ms73-founder-review-904a9dea'","keyboard navigation outcome",45000);
    console.log("PASS sidebar focus, name/username-only filtering, empty/clear, collapsed expansion, keyboard go",width);
  }
}
