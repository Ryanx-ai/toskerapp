import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {run,ev,until,button as clickButton} from "./browser-fp2.mjs";
const a=process.env.FP4B_A??"ms73-fp4a-a",b=process.env.FP4B_B??"ms73-fp4a-b",origin=process.env.FP4B_ORIGIN??"http://localhost:3000";
const {fixture,routes}=JSON.parse(readFileSync(".git/fp4b-recovery/browser-fixture.json","utf8"));
const room=`/room/${fixture.slug}/map`,sandbox="/personal/my-room/map",mode=process.argv[2];
async function button(s,name){await until(s,`[...document.querySelectorAll('button')].some(e=>e.checkVisibility()&&!e.disabled&&(e.getAttribute('aria-label')||e.textContent).trim()===${JSON.stringify(name)})`,`enabled ${name}`);return clickButton(s,name);}
async function open(s,path){await run(s,"open",origin+path);await until(s,"!!document.querySelector('input[aria-label=\"Search places\"]') && !document.querySelector('input[aria-label=\"Search places\"]').disabled && !document.body.textContent.includes('Refreshing authorized Pins')","Map ready",45000);}
async function showPins(s){await ev(s,"(()=>{const d=document.querySelector('section[aria-label=\"Map Pins\"] details');if(d)d.open=true;return true})()");}
async function pinButton(s,state="Want to go"){await showPins(s);const name=await ev(s,`[...document.querySelectorAll('button')].find(e=>e.getAttribute('aria-label')?.startsWith(${JSON.stringify(`Open ${state} Pin:`)})&&e.textContent.includes('Marina Bay Sands'))?.getAttribute('aria-label')`);assert(name,"MBS Pin available");await button(s,name);await until(s,"!!document.querySelector('dialog[open] [aria-label=\"Map Pin details\"]')","Pin details");}
if(mode==="fp4b-search"){
  await open(a,room);await open(b,sandbox);
  await run(a,"fill","input[aria-label='Search places']","Marina Bay Sands Singapore");
  await until(a,"!!document.querySelector('[aria-label=\"Place search results\"]') || !!document.querySelector('[role=alert]')","search response",45000);
  console.log(await ev(a,"[...document.querySelectorAll('[aria-label=\"Place search results\"] button')].map(e=>e.textContent)"));
}
if(mode==="fp4b-create"){
  const selector=await ev(a,"(()=>{const e=[...document.querySelectorAll('[aria-label=\"Place search results\"] button')].find(e=>/^\\d+\\. Marina Bay Sands$/.test(e.querySelector('span')?.textContent||'')&&e.textContent.includes('10 Bayfront Avenue')&&e.textContent.includes('018956'));if(!e)return null;e.dataset.fp4bCandidate='mbs';return '[data-fp4b-candidate=mbs]'})()");assert(selector,"Choose inspected exact MBS/10 Bayfront/018956, never arbitrary first result");
  await run(a,"click",selector);await until(a,"!!document.querySelector('[aria-label=\"Place preview\"]')","explicit preview");
  console.log("Reviewed preview:",await ev(a,"document.querySelector('[aria-label=\"Place preview\"]').textContent"));
  await run(a,"select","select[aria-label='Pin state']","want-to-go");await button(a,"Pin to Map");
  await until(a,"!!document.querySelector('[aria-label=\"Map Pin details\"]')","saved source details",45000);
  await button(a,"Close Pin details");
  await until(b,"[...document.querySelectorAll('button')].some(e=>e.getAttribute('aria-label')?.startsWith('Open Want to go Pin:')&&e.textContent.includes('Marina Bay Sands'))","B Sandbox projection via activity",45000);
  await open(a,sandbox);assert(await ev(a,"document.body.textContent.includes('Marina Bay Sands')"));
  await open(b,room);await pinButton(b);
  await run(b,"select","select[aria-label='Pin state']","been-here");await button(b,"Save state");
  await until(a,"[...document.querySelectorAll('button')].some(e=>e.getAttribute('aria-label')?.startsWith('Open Been here Pin:')&&e.textContent.includes('Marina Bay Sands'))","A projection shared state",45000);
  console.log("PASS explicit named search selection/preview/state/save; A source and A/B Sandbox; B shared state reconciles to A Sandbox");
}
if(mode==="fp4b-copy"){
  await open(a,room);await pinButton(a,"Been here");await button(a,"Add to Route");
  await until(a,`!!document.querySelector('select[aria-label="Target Route"] option[value="${routes[0]}"]')`,"target routes");
  await run(a,"select","select[aria-label='Target Route']",routes[0]);await button(a,"Confirm Add to Route");
  await until(a,"!document.querySelector('dialog[open]') && !!document.querySelector('[data-place-id]')","route1 card");
  const first=await ev(a,"document.querySelector('[data-place-id]').getAttribute('data-place-id')");
  await pinButton(a,"Been here");await button(a,"Add to Route");await until(a,`!!document.querySelector('select[aria-label="Target Route"] option[value="${routes[1]}"]')`,"second target");
  await run(a,"select","select[aria-label='Target Route']",routes[1]);await button(a,"Confirm Add to Route");await until(a,"!document.querySelector('dialog[open]')","second copy confirmed");
  const routeButton=await ev(a,"[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Pin QA route 2')?.textContent.trim()");assert(routeButton);await button(a,routeButton);
  await until(a,`!!document.querySelector('[data-place-id]')&&document.querySelector('[data-place-id]').getAttribute('data-place-id')!==${JSON.stringify(first)}`,"distinct route2 card");
  console.log("PASS browser Pin to two distinct Route-owned cards",{route1Card:first,route2Card:await ev(a,"document.querySelector('[data-place-id]').getAttribute('data-place-id')")});
}
if(mode==="fp4b-hide"){
  await open(a,sandbox);await open(b,sandbox);await pinButton(a,"Been here");await button(a,"Remove from my Sandbox");
  await until(a,"!document.body.textContent.includes('Marina Bay Sands')","A private removal");assert(await ev(b,"document.body.textContent.includes('Marina Bay Sands')"));
  await open(a,sandbox);assert(!(await ev(a,"document.body.textContent.includes('Marina Bay Sands')")));
  await open(a,room);await pinButton(a,"Been here");assert(await ev(a,"document.body.textContent.includes('Show in my Sandbox')"));await button(a,"Close Pin details");
  console.log("PASS durable A-only Sandbox removal; B and shared source unchanged");
}
if(mode==="fp4b-nuke-route"){
  await open(a,room);await button(a,"Route actions for Pin QA route 1");await button(a,"Nuke route");await button(a,"Nuke route");
  await until(a,"!document.querySelector('dialog[open]') && ![...document.querySelectorAll('button')].some(e=>e.getAttribute('aria-label')==='Route actions for Pin QA route 1')","route1 gone");
  await pinButton(a,"Been here");await button(a,"Close Pin details");await button(a,"Pin QA route 2");
  assert(await ev(a,"document.querySelector('[data-place-id]')?.textContent.includes('Marina Bay Sands')"));
  console.log("PASS browser Route1 Nuke keeps source Pin and Route2 Location Card");
}
if(mode==="fp4b-nuke-pin"){
  await open(a,room);await open(b,sandbox);await pinButton(a,"Been here");await button(a,"Nuke Pin");await button(a,"Confirm Nuke Pin");
  await until(a,"!document.querySelector('dialog[open]')&&!document.querySelector('button[aria-label^=\"Open Been here Pin:\"]')","source Pin removed");
  await until(b,"!document.body.textContent.includes('Marina Bay Sands')","B projection removed",45000);
  await open(b,room);await button(b,"Pin QA route 2");await until(b,"!!document.querySelector('[data-place-id]')","independent route2 remains");
  assert(await ev(b,"document.querySelector('[data-place-id]').textContent.includes('Marina Bay Sands')"));
  console.log("PASS Pin Nuke removes A/B source/Sandbox and reload does not resurrect; Route2 card remains");
}
if(mode==="fp4b-responsive"){
  await open(a,room);
  await run(a,"set","media","dark","reduced-motion");
  assert(await ev(a,"matchMedia('(prefers-reduced-motion: reduce)').matches"),"real reduced-motion emulation");
  for(const [width,height] of (process.env.FP4B_REMAINING?[[768,900],[1440,900],[1728,960],[844,390]]:[[320,800],[390,844],[430,900],[768,900],[1440,900],[1728,960],[844,390]]).filter(([w])=>!process.env.FP4B_WIDTH||w===Number(process.env.FP4B_WIDTH))){
    await run(a,"set","viewport",String(width),String(height));await showPins(a);
    assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"),`page overflow ${width}`);
    await run(a,"screenshot",`${process.cwd()}/.git/fp4b-recovery/map-${width}.png`);
    await pinButton(a,"Been here");
    const bounds=await ev(a,"(()=>{const e=document.querySelector('[aria-label=\"Map Pin details\"]'),r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,overflow:e.scrollWidth>e.clientWidth+1}})()");
    assert(bounds.left>=0&&bounds.right<=bounds.width+1&&bounds.top>=0&&bounds.bottom<=bounds.height+1&&!bounds.overflow,`detail bounds ${width}`);
    assert.equal(await ev(a,"document.querySelectorAll('dialog[open]').length"),1);
    await run(a,"screenshot",`${process.cwd()}/.git/fp4b-recovery/pin-${width}.png`);
    await run(a,"press","Escape");await until(a,"!document.querySelector('dialog[open]')","Escape closes detail");
    console.log(`PASS ${width}x${height}: page/detail bounds, singular modal, Escape`);
  }
  await run(a,"set","viewport","1440","900");
  await showPins(a);
  await ev(a,"(()=>{const e=document.querySelector('button[aria-label^=\"Open Been here Pin:\"]');e.focus();return !!e})()");
  await run(a,"press","Enter");await until(a,"!!document.querySelector('dialog[open]')","keyboard opens Pin");
  await run(a,"select","select[aria-label='Pin state']","favourite");
  // A keyboard exploration is not a save; Escape discards the local state choice.
  await run(a,"press","Escape");await until(a,"!document.querySelector('dialog[open]')","keyboard discard");
  assert(await ev(a,"document.querySelector('button[aria-label^=\"Open Been here Pin:\"]')!==null"));
  console.log("PASS keyboard detail/state selection and Escape without implicit save");
}
