import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { run, ev, until, button } from "./browser-fp2.mjs";
const a="ms73-local-a", b="ms73-local-b", origin="http://localhost:3000";
const path="/room/ms73-founder-review-904a9dea/map";
const out=process.env.MS73_CAPTURES;
assert(out);
const count="document.querySelectorAll('[data-place-id]').length";
const loaded="document.querySelector('[data-trip-revision]')?.dataset.tripRevision !== undefined";
const mode=process.argv[2];
async function ready(s){await until(s,loaded,"canonical trip snapshot",45000);}
async function click(s, selector) { await run(s,"scrollintoview",selector); await run(s,"click",selector); }
if(mode==="trips-save") {
  await Promise.all([ready(a),ready(b)]);
  assert.equal(await ev(a,count),0,"Run once, only on the empty owned review Room");
  assert.equal(await ev(a,"document.querySelector('[data-trip-revision]').dataset.tripRevision"),"0");
  await run(a,"set","viewport","1440","1000");
  await run(a,"fill",'[aria-label="Search places"]',"Marina Bay Sands");
  await until(a,"document.querySelectorAll('[aria-label=\"Place search results\"] button').length>0","real Singapore results",30000);
  assert.equal(await ev(a,count),0,"Search alone must not save");
  assert.equal(await ev(a,"document.querySelector('[aria-label=\"Place preview\"]')!==null"),false,"No automatic first result selection");
  await run(a,"click",'[aria-label="Place search results"] button:first-child');
  await until(a,"!!document.querySelector('[aria-label=\"Place preview\"]')","explicit preview");
  assert.equal(await ev(a,count),0,"Selection is still unsaved");
  assert.equal(await ev(b,count),0,"Peer must not see private preview");
  await run(a,"screenshot",`${out}/trip-preview.png`);
  await button(a,"Add to trip");
  await until(a,`${count}===1`,"canonical card after confirmation",45000);
  await until(b,`${count}===1`,"peer receives shared card",15000);
  assert.equal(await ev(a,"document.querySelector('[data-place-id] strong').textContent"),"Marina Bay Sands");
  assert.equal(await ev(a,"document.querySelector('[data-place-id]').dataset.placeId"),await ev(b,"document.querySelector('[data-place-id]').dataset.placeId"));
  await run(a,"screenshot",`${out}/trip-one-place.png`);
  console.log("PASS real SG lookup, no auto-choice/save, explicit preview/confirmation, same canonical card on A/B within15sec.");
}
if(mode==="trips-roundtrip") {
  await Promise.all([ready(a),ready(b)]);
  const id=await ev(a,"document.querySelector('[data-place-id]').dataset.placeId");
  for(const s of [a,b]){await run(s,"open",origin+path);await ready(s);await until(s,`${count}===1`,"saved card survives reload",45000);}
  await until(b,"document.querySelector('[data-map-state]')?.dataset.mapState==='ready'","renderer ready before selection",30000);
  await run(b,"scrollintoview",`[data-place-id="${id}"] button:first-child`);
  await run(b,"focus",`[data-place-id="${id}"] button:first-child`); await run(b,"press","Enter");
  await until(b,"!!document.querySelector('.maplibregl-marker[aria-pressed=true]')","card selects matching pin");
  assert.equal(await ev(b,"document.querySelector('[data-place-id] button').getAttribute('aria-pressed')"),"true");
  assert.equal(await ev(a,"document.querySelector('[data-place-id] button').getAttribute('aria-pressed')"),"false","Selection is viewer-private");
  // The Singapore default camera deliberately does not follow peer edits.
  // Pan south using the renderer's keyboard control before clicking MBS.
  await run(a,"focus",'.maplibregl-canvas'); await run(a,"press","ArrowDown");
  await until(a,"(()=>{const p=document.querySelector('.maplibregl-marker'),r=p?.getBoundingClientRect();return r&&document.elementFromPoint(r.x+22,r.y+22)===p})()","pin is actually hit-testable");
  await run(a,"click",'.maplibregl-marker');
  await until(a,"document.querySelector('[data-place-id] button').getAttribute('aria-pressed')==='true'","pin selects matching card");
  await click(a,'[data-place-id] button[aria-haspopup="dialog"]'); await button(a,"Archive"); await until(a,`${count}===0`,"archive on actor"); await until(b,`${count}===0`,"archive on peer",15000);
  await button(b,"Archived places"); await until(b,`${count}===1`,"archive remains recoverable"); await click(b,'[data-place-id] button[aria-haspopup="dialog"]'); await button(b,"Restore");
  await until(a,`${count}===1`,"peer restore returns actor pin/card",15000); await button(b,"Show trip");
  await until(b,`${count}===1`,"restored canonical card");
  assert.equal(await ev(a,"document.querySelector('[data-place-id]').dataset.placeId"),id);
  console.log("PASS A/B reload, pin/card selection, viewer isolation and peer archive/restore with same canonical ID.");
}
if(mode==="trips-pin") {
  await Promise.all([ready(a),ready(b)]); assert.equal(await ev(a,count),1);
  async function point() {
    await button(a,"Drop a pin"); await run(a,"scrollintoview",'.maplibregl-canvas');
    const p=await ev(a,"(()=>{const r=document.querySelector('.maplibregl-canvas').getBoundingClientRect();return {x:Math.round(r.x+r.width*.56),y:Math.round(r.y+r.height*.43)}})()");
    await run(a,"mouse","move",String(p.x),String(p.y)); await run(a,"mouse","down"); await run(a,"mouse","up");
    await until(a,"!!document.querySelector('[aria-label=\"Place preview\"]')","direct pin preview");
    assert.equal(await ev(a,count),1); assert.equal(await ev(b,count),1);
    await until(a,"[...document.querySelectorAll('[aria-label=\"Place preview\"] button')].some(e=>e.textContent==='Confirm pin'&&!e.disabled)","signed pin confirmation",20000);
  }
  await point(); await button(a,"Cancel"); assert.equal(await ev(a,count),1);
  await point(); await button(a,"Confirm pin");
  await until(a,`${count}===2`,"explicit pin save"); await until(b,`${count}===2`,"peer direct pin",15000);
  const pinId=await ev(a,"[...document.querySelectorAll('[data-place-id]')].find(e=>e.querySelector('strong').textContent.startsWith('Pin ')).dataset.placeId");
  await click(a,`[data-place-id="${pinId}"] button[aria-haspopup="dialog"]`); await button(a,"Edit place");
  await run(a,"fill",'[data-place-id] form input',"QA waterfront meeting point");
  await run(a,"fill",'[data-place-id] form textarea',"Safe synthetic Founder Walk pin. Planning only; not a verified venue.");
  await button(a,"Save place"); await until(b,"document.body.textContent.includes('QA waterfront meeting point')","peer edited pin");
  await run(a,"screenshot",`${out}/trip-two-places.png`);
  console.log("PASS direct pin remains private through preview/cancel, explicit confirm creates one peer pin/card; shared name/note edit.");
}
if(mode==="trips-routes") {
  await Promise.all([ready(a),ready(b)]);
  const ids=await ev(a,"[...document.querySelectorAll('[data-place-id]')].map(e=>e.dataset.placeId)");assert.equal(ids.length,2);
  await button(a,"New route"); await run(a,"fill",'[aria-label="Route editor"] input',"Day 2"); await run(a,"select",'[aria-label="Route editor"] select',"sky"); await button(a,"Save route");
  await until(a,"document.querySelector('[aria-label=\"Choose active route\"] button[aria-pressed=true]')?.textContent==='Day 2 · Active'","new route active");
  await until(b,"document.querySelector('[aria-label=\"Choose active route\"]')?.textContent.includes('Day 2')","peer new route",15000);
  assert.equal(await ev(b,"document.querySelector('[aria-label=\"Choose active route\"] button[aria-pressed=true]').textContent"),"Day 1 · Active");
  await button(a,"All saved places");
  for(const id of ids) {
    const detail=`[data-place-id="${id}"] button[aria-haspopup="dialog"]`; await click(a,detail);
    const checkbox=`[data-place-id="${id}"] fieldset label:nth-of-type(2) input`;
    await run(a,"check",checkbox);
    await until(a,`document.querySelector('${checkbox}')?.checked` ,"canonical route inclusion");
    await until(a,"!document.querySelector('[aria-label=\"Search places\"]').disabled","membership write settled");
    await run(a,"press","Escape");
  }
  await button(a,"Show active route"); await until(a,`${count}===2`,"same places reused in Day2");
  const names="[...document.querySelectorAll('[data-place-id] strong')].map(e=>e.textContent)";
  const before=await ev(a,names);
  await click(b,`[data-place-id="${ids[1]}"] button[aria-haspopup="dialog"]`); await button(b,"Move earlier");
  await until(b,`${names}[0]===${JSON.stringify(before[1])}`,"B shared reorder");
  assert.deepEqual(await ev(a,names),before,"Day2 order isolated from Day1");
  await run(b,"press","Escape");
  await button(a,"Day 1"); await until(a,`${names}[0]===${JSON.stringify(before[1])}`,"A sees canonical Day1 order");
  await click(a,'[aria-label="Trip routes"] details > summary'); await run(a,"check",'[aria-label="Trip routes"] details input[type="checkbox"]');
  assert.equal(await ev(a,"document.querySelector('[aria-label=\"Planning line legend\"]').textContent.includes('Day 2 · Ghost / dashed')"),true);
  assert.equal(await ev(b,"document.querySelector('[aria-label=\"Planning line legend\"]').textContent.includes('Ghost / dashed')"),false);
  // The only non-editor select in route tools chooses the suggestion start.
  await run(a,"select",'[aria-label="Trip routes"] select',ids[0]); await button(a,"Quick order");
  assert.deepEqual(await ev(a,names),[before[1],before[0]],"Preview is unsaved");
  await button(a,"Apply suggested order"); await until(b,`${names}[0]===${JSON.stringify(before[0])}`,"peer suggested order",15000);
  await button(a,"Undo Quick order"); await until(b,`${names}[0]===${JSON.stringify(before[1])}`,"peer undo",15000);
  await run(a,"screenshot",`${out}/trip-routes-ghost.png`);
  console.log("PASS shared route creation/reuse, private active/ghost preferences, isolated per-route order, peer reorder and Quick order preview/apply/undo.");
}
if(mode==="trips-failures") {
  await Promise.all([ready(a),ready(b)]); assert.equal(await ev(a,count),2);
  const revision="Number(document.querySelector('[data-trip-revision]').dataset.tripRevision)";
  const stop='[data-place-id]:first-child input[type="checkbox"]';
  for(const failure of process.env.MS73_FAILURE_ONLY_PROVIDER ? [] : ["before","after"]) {
    const before=await ev(a,revision);
    await ev(a,`(()=>{window.__qaFetch=window.fetch;window.__qaIntercepted=0;window.fetch=async(input,init)=>{if(init?.method==='POST'&&String(init.body).includes('"command"')&&window.__qaIntercepted===0){window.__qaIntercepted++;${failure==="after"?"const response=await window.__qaFetch(input,init);await response.arrayBuffer();":""}throw new TypeError('QA simulated save transport failure')}return window.__qaFetch(input,init)};return true})()`);
    try {
      await click(a,stop);
      await until(a,"!!document.querySelector('[role=alert]')&&document.body.textContent.includes('Retry same change')","bounded save recovery");
      assert.equal(await ev(a,"window.__qaIntercepted"),1);
      if(failure==="before") assert.equal(await ev(b,revision),before);
      else await until(b,`${revision}===${before+1}`,"peer sees commit despite lost ack",15000);
    } finally {await ev(a,"(()=>{window.fetch=window.__qaFetch;delete window.__qaFetch;return true})()");}
    await button(a,"Retry same change"); await until(a,`${revision}===${before+1}&&!document.body.textContent.includes('Retry same change')`,"same UUID retry settled");
    await until(b,`${revision}===${before+1}`,"one peer revision only",15000);
  }
  await ev(a,"(()=>{window.__qaFetch=window.fetch;window.__qaProviderCalls=0;window.fetch=(input,init)=>{if(String(input).includes('/api/trips/')){window.__qaProviderCalls++;return Promise.resolve(Response.json({error:'QA provider temporarily unavailable'},{status:503}))}return window.__qaFetch(input,init)};return true})()");
  try {await run(a,"scrollintoview",'[aria-label="Search places"]');await run(a,"focus",'[aria-label="Search places"]');await run(a,"press","ControlOrMeta+A");await run(a,"press","Backspace");await run(a,"type",'[aria-label="Search places"]',"QA simulated outage");await until(a,"document.body.textContent.includes('QA provider temporarily unavailable')","provider failure feedback");assert.equal(await ev(a,count),2);assert.equal(await ev(b,count),2);await button(a,"Retry search");await until(a,"window.__qaProviderCalls===2","explicit search retry");}
  finally {await run(a,"fill",'[aria-label="Search places"]',"");await ev(a,"(()=>{window.fetch=window.__qaFetch;delete window.__qaFetch;return true})()");}
  await button(a,"Quick order"); const before=await ev(b,revision);await click(b,stop);
  await until(a,`${revision}===${before+1}`,"peer revision invalidates preview",15000);
  assert(await ev(a,"[...document.querySelectorAll('[aria-label=\"Quick order preview\"] button')].find(e=>e.textContent==='Apply suggested order').disabled"));
  await button(a,"Dismiss preview"); await click(b,stop); await until(a,`${revision}===${before+2}`,"restored Stop state",15000);
  await ev(a,"window.dispatchEvent(new Event('online'))"); await until(a,`${revision}===${before+2}`,"online reconciliation");
  console.log("PASS failed save retry, actual committed/lost acknowledgement idempotency, provider outage/retry without card loss, stale Quick order preview denied, foreground/online reconciliation.");
}
if(mode==="trips-drag") {
  await Promise.all([ready(a),ready(b)]);
  const ids=await ev(a,"[...document.querySelectorAll('[data-place-id]')].map(e=>e.dataset.placeId)");assert.equal(ids.length,2);
  await run(a,"scrollintoview",`[data-place-id="${ids[0]}"] button[draggable=true]`);
  await run(a,"drag",`[data-place-id="${ids[0]}"] button[draggable=true]`,`[data-place-id="${ids[1]}"]`);
  await until(a,`document.querySelector('[data-place-id]').dataset.placeId===${JSON.stringify(ids[1])}`,"native drag canonical order");
  await until(b,`document.querySelector('[data-place-id]').dataset.placeId===${JSON.stringify(ids[1])}`,"peer drag order",15000);
  console.log("PASS native drag reorders canonical route and reaches B.");
}
if(mode==="trips-sidebar") {
  const fixture=JSON.parse(readFileSync("docs/MS7-3-STRESS-FIXTURE.json","utf8"));
  const last=`.conversation-list a[href="/room/${fixture.slug}"]`;
  await run(a,"set","viewport","1440","500");
  for(const collapsed of [false,true]) {
    if(collapsed) await button(a,"Collapse sidebar");
    await run(a,"scrollintoview",last); await run(a,"focus",last);
    assert(await ev(a,`(()=>{const row=document.querySelector('${last}').getBoundingClientRect(),plate=document.querySelector('.sidebar-bottom').getBoundingClientRect();return row.bottom<=plate.top+1&&row.top>=0})()`),"last owned Room stays above floating nameplate");
    await run(a,"screenshot",`${out}/nameplate-overflow-${collapsed?'collapsed':'expanded'}.png`);
  }
  await button(a,"Expand sidebar"); await run(a,"set","viewport","390","600");
  await click(a,'.mobile-back'); await until(a,"!!document.querySelector('.list-only')","mobile list");
  await run(a,"scrollintoview",last); await run(a,"focus",last);
  assert(await ev(a,`(()=>{const row=document.querySelector('${last}').getBoundingClientRect(),plate=document.querySelector('.sidebar-bottom').getBoundingClientRect();return row.bottom<=plate.top+1})()`));
  await run(a,"screenshot",`${out}/nameplate-overflow-mobile.png`);
  await run(a,"set","viewport","1440","1000");
  console.log("PASS floating nameplate clearance, last owned Room keyboard focus, expanded/collapsed/mobile overflow.");
}
if(mode==="trips-layout") {
  await ready(a); if(await ev(a,"!!document.querySelector('.planning-chat')")) await button(a,"Close companion");
  for(const width of [320,390,430,768,1440,1728]) {
    await run(a,"set","viewport",String(width),width<641?"844":"1000");
    await ev(a,"(()=>{document.querySelector('[aria-label=\"Room Map\"]').scrollTop=0;window.scrollTo(0,0);return true})()");
    await until(a,"document.querySelector('[data-map-state]')?.dataset.mapState==='ready'","map ready");
    assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"),`no horizontal page overflow at${width}`);
    assert(await ev(a,"['Geoapify','OpenMapTiles','OpenStreetMap'].every(t=>document.querySelector('.maplibregl-ctrl-attrib').textContent.includes(t))"));
    await run(a,"screenshot",`${out}/trip-layout-${width}.png`);
    if(width<=768) {
      await click(a,'[aria-label="Map view"] button:nth-child(2)');
      assert.equal(await ev(a,"document.querySelector('.maplibregl-canvas').checkVisibility()"),false);
      assert.equal(await ev(a,"document.querySelectorAll('.planning-chat').length"),0);
      await click(a,'[data-place-id] button[aria-haspopup="dialog"]');
      assert(await ev(a,"(()=>{const r=document.querySelector('.interaction-popover:popover-open').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1})()"));
      await run(a,"press","Escape"); await run(a,"screenshot",`${out}/trip-places-${width}.png`);
      await click(a,'[aria-label="Map view"] button:first-child');
    }
    console.log("PASS map/places layout and attribution",width);
  }
  await run(a,"set","media","dark","reduced-motion");
  await run(a,"set","viewport","1440","1000");
}
if(mode==="trips-stress") {
  const fixture=JSON.parse(readFileSync("docs/MS7-3-STRESS-FIXTURE.json","utf8"));assert.equal(fixture.retained,false);
  for(const s of [a,b]) { await run(s,"open",`${origin}/room/${fixture.slug}/map`); await ready(s); await until(s,`${count}===200`,"200 canonical cards",45000); }
  await until(a,"document.querySelectorAll('.maplibregl-marker').length===200","200 pins",30000);
  const first=await ev(a,"document.querySelector('[data-place-id]').dataset.placeId");
  await click(a,`[data-place-id="${first}"] button:first-child`);
  await until(a,"!!document.querySelector('.maplibregl-marker[aria-pressed=true]')","200-place selection");
  await run(a,"set","viewport","390","844"); await click(a,'[aria-label="Map view"] button:nth-child(2)');
  await run(a,"scrollintoview",'[data-place-id]:last-child');
  assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"));
  await run(a,"screenshot",`${out}/trip-200-places.png`);
  await run(a,"set","viewport","1440","1000");
  console.log("PASS 200 saved cards and pins, interactive selection, mobile last-card access and no horizontal page overflow. Await explicit B withdrawal proof before cleanup.");
}
if(mode==="trips-companion") {
  await Promise.all([ready(a),ready(b)]);
  await run(a,"set","viewport","1440","1000");
  await button(a,"Open Chat alongside"); await until(a,"document.querySelectorAll('.composer textarea').length===1","one existing composer",45000);
  assert.equal(await ev(a,"document.querySelectorAll('[aria-label=\"Room Map\"]').length"),1);
  const message="MS7.3 Founder Review: two safe planning points and Day 1 / Day 2 are ready to inspect. No live location.";
  await run(a,"fill",'.composer textarea',message); await button(a,"Send message");
  await until(a,`[...document.querySelectorAll('.message-bubble')].some(e=>e.textContent.includes(${JSON.stringify(message)}))`,"canonical companion message");
  assert.equal(await ev(b,"document.querySelectorAll('.composer').length"),0,"Map only does not mount hidden Chat");
  await button(b,"Open Chat alongside"); await until(b,`document.querySelector('.planning-chat')?.textContent.includes(${JSON.stringify(message)})`,"same message in B companion",45000);
  const draft="QA unsent planning draft — preserve across surfaces";
  await run(a,"fill",'.composer textarea',draft); await button(a,"Close companion");
  assert.equal(await ev(a,"document.querySelectorAll('.composer').length"),0);
  await button(a,"Open Chat alongside"); await until(a,`document.querySelector('.composer textarea')?.value===${JSON.stringify(draft)}`,"original draft restored");
  await click(a,'.surface-tabs a[href$="/hall"]'); await until(a,"!!document.querySelector('.hall-surface')","Board primary");
  if(!await ev(a,"!!document.querySelector('.planning-chat')")) await button(a,"Open Chat alongside");
  await until(a,`document.querySelector('.composer textarea')?.value===${JSON.stringify(draft)}`,"Board companion same draft");
  assert.equal(await ev(a,"document.querySelectorAll('.maplibregl-canvas').length"),0);
  await button(a,"New Note"); await run(a,"fill",'[aria-label="Title"]',"MS7.3 Founder Walk checklist");
  await run(a,"fill",'[aria-label="Note"]',"Safe QA content. Inspect shared Location Cards, Day 1 / Day 2, private ghost visibility, planning lines and the same Room Chat. This review Room is retained; no live location or road navigation is enabled.");
  await button(a,"Add note"); await until(a,"document.querySelector('.hall-surface')?.textContent.includes('MS7.3 Founder Walk checklist')","review Board note");
  await run(a,"screenshot",`${out}/board-chat-companion.png`);
  await click(a,'.surface-tabs a[href$="/map"]'); await ready(a);
  assert.equal(await ev(a,count),2);
  if(!await ev(a,"!!document.querySelector('.planning-chat')")) await button(a,"Open Chat alongside");
  await until(a,`document.querySelector('.composer textarea')?.value===${JSON.stringify(draft)}`,"Map companion same draft");
  await run(a,"fill",'.composer textarea',"");
  await run(a,"screenshot",`${out}/map-chat-companion.png`);
  await click(b,'.surface-tabs a[href$="/hall"]'); await until(b,"document.querySelector('.hall-surface')?.textContent.includes('MS7.3 Founder Walk checklist')","B same Board note",45000);
  await click(b,'.surface-tabs a[href$="/map"]'); await ready(b);
  console.log("PASS Map+Chat, Board+Chat, one original composer/conversation, peer message, draft close/reopen and surface navigation, safe retained Board note.");
}
for(const s of [a,b]) { const errors=await run(s,"errors");assert.equal(errors.errors?.length??0,0,"Browser error count; inspect only with credential redaction"); }
