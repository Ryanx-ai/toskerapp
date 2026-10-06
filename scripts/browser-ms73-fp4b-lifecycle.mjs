import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {run,ev,until,button as clickButton} from "./browser-fp2.mjs";
const a=process.env.FP4B_A??"ms73-fp4a-a",b=process.env.FP4B_B??"ms73-fp4a-b",origin=process.env.FP4B_ORIGIN??"http://localhost:3000";
const {fixture}=JSON.parse(readFileSync(".git/fp4b-recovery/browser-fixture.json","utf8"));
const room=`/room/${fixture.slug}/map`,sandbox="/personal/my-room/map",mode=process.argv[2];
async function button(s,name){await until(s,`[...document.querySelectorAll('button')].some(e=>e.checkVisibility()&&!e.disabled&&(e.getAttribute('aria-label')||e.textContent).trim()===${JSON.stringify(name)})`,`enabled ${name}`);return clickButton(s,name);}
async function open(s,path){await run(s,"open",origin+path);await until(s,"!!document.querySelector('input[aria-label=\"Search places\"]')&&!document.body.textContent.includes('Refreshing authorized Pins')","Map loaded",45000);}
async function detail(s,state="Been here"){
  await ev(s,"(()=>{const e=document.querySelector('section[aria-label=\"Map Pins\"] details');if(e)e.open=true;return true})()");
  const label=await ev(s,`[...document.querySelectorAll('button')].find(e=>e.getAttribute('aria-label')?.startsWith('Open ${state} Pin:')&&e.textContent.includes('Marina Bay Sands'))?.getAttribute('aria-label')`);
  assert(label);await button(s,label);await until(s,"!!document.querySelector('[aria-label=\"Map Pin details\"]')","Pin detail");
}
if(mode==="fp4b-offline"){
  await open(a,room);await open(b,sandbox);await detail(b);
  await run(b,"set","offline","on");
  try{
    await detail(a);await run(a,"select","select[aria-label='Pin state']","favourite");await button(a,"Save state");
    await until(a,"document.querySelector('[aria-label=\"Map Pin details\"] h2')?.textContent.startsWith('♥')&&!document.querySelector('[aria-label=\"Close Pin details\"]').disabled","A acknowledged new state");
  }finally{await run(b,"set","offline","off");}
  await until(b,"!!document.querySelector('button[aria-label^=\"Open Favourite Pin:\"]')","B reconnect reauthorizes newest state",45000);
  await run(b,"tab","new","about:blank");await run(b,"tab","t1");
  await until(b,"!!document.querySelector('button[aria-label^=\"Open Favourite Pin:\"]')","foreground canonical Pins",45000);
  assert.equal(await ev(b,"document.querySelectorAll('dialog[open]').length"),0,"background clears private detail and draft");
  await run(a,"select","select[aria-label='Pin state']","been-here");await button(a,"Save state");
  await until(b,"!!document.querySelector('button[aria-label^=\"Open Been here Pin:\"]')","state restored A/B",45000);
  console.log("PASS offline/reconnect and real tab background/foreground; cleared detail/draft and reauthorized state");
}
if(mode==="fp4b-access-prepare"){
  await open(a,room);await open(b,sandbox);await detail(b);await run(b,"select","select[aria-label='Pin state']","favourite");await button(b,"Add to Route");
  console.log("Prepared B source-backed detail, unsaved state and Route choices for actual membership revocation");
}
if(mode==="fp4b-access-verify"){
  // Test rendered content, not Next's inert initial hydration scripts from before withdrawal.
  await until(b,`!document.querySelector('[aria-label="Map Pin details"]')&&!document.body.innerText.includes('Marina Bay Sands')&&!document.body.innerText.includes(${JSON.stringify(fixture.name)})`,"revoked projection, detail, provenance and drafts clear",45000);
  const status=await ev(b,`(async()=>{const r=await fetch('/api/realtime/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:${JSON.stringify(fixture.conversationId)}})});return r.status})()`);assert.equal(status,403);
  await detail(a);await button(a,"Close Pin details");
  await open(b,sandbox);assert(!(await ev(b,"document.body.textContent.includes('Marina Bay Sands')")));
  console.log("PASS removed B loses projection/detail/draft/provenance/realtime capability and reload access; A source remains");
}
if(mode==="fp4b-manual-private"){
  await open(a,sandbox);await open(b,sandbox);
  const before=await ev(a,"document.querySelectorAll('button[aria-label^=\"Open Saved Pin: Checkpoint\"]').length");
  await button(a,"Pin");await until(a,"!!document.querySelector('.maplibregl-canvas')","map canvas");
  await run(a,"click",".maplibregl-canvas");await until(a,"!!document.querySelector('[aria-label=\"Place preview\"]')","manual preview");
  assert.equal(await ev(a,"document.querySelectorAll('button[aria-label^=\"Open Saved Pin: Checkpoint\"]').length"),before,"preview never auto-saves");
  await until(a,"[...document.querySelectorAll('button')].some(e=>e.textContent==='Pin to Map'&&!e.disabled)","licensed manual preview",45000);
  await run(a,"focus","select[aria-label='Pin state']");await run(a,"press","End");await run(a,"press","Tab");
  // Actual keyboard confirmation, not script invocation of the mutation.
  await run(a,"focus","[aria-label='Place preview'] button");await run(a,"press","Enter");
  await until(a,"!!document.querySelector('[aria-label=\"Map Pin details\"]')","private manual Pin explicitly confirmed",45000);
  const title=await ev(a,"document.querySelector('[aria-label=\"Map Pin details\"] h2').textContent.trim()");assert(title.includes("Checkpoint"));
  assert(await ev(a,"document.querySelector('[aria-label=\"Map Pin details\"]').textContent.includes('From Your Sandbox')"));
  assert(!(await ev(b,"!!document.querySelector('button[aria-label^=\"Open Saved Pin: Checkpoint\"]')")));
  await button(a,"Nuke Pin");await button(a,"Confirm Nuke Pin");await until(a,"!document.querySelector('dialog[open]')","private disposable Pin removed");
  console.log("PASS manual point→unsaved preview→keyboard state/explicit Pin confirmation; private Sandbox only; exact test Pin removed");
}
if(mode==="fp4b-long-layout"){
  await open(a,room);await run(a,"set","viewport","320","800");await detail(a);
  // Layout-only stress of the real detail DOM; no database content/profile mutation.
  await ev(a,"(()=>{const e=document.querySelector('[aria-label=\"Map Pin details\"]');e.querySelector('h2').textContent='LongCheckpointName'.repeat(10);const p=[...e.querySelectorAll('p')].find(p=>p.textContent.startsWith('From '));p.textContent='From '+('LongSharedContextName'.repeat(4));return true})()");
  assert(await ev(a,"(()=>{const e=document.querySelector('[aria-label=\"Map Pin details\"]');return e.scrollWidth<=e.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()"),"long title/provenance must wrap");
  await run(a,"screenshot",`${process.cwd()}/.git/fp4b-recovery/pin-long-320.png`);
  await run(a,"press","Escape");await open(a,room);
  console.log("PASS long unbroken place/context content wraps at320; DOM-only stress restored by reload");
}
