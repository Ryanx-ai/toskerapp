import assert from "node:assert/strict";
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
for(const s of [a,b]) { const errors=await run(s,"errors");assert.equal(errors.errors?.length??0,0,"Browser error count; inspect only with credential redaction"); }
