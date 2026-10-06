import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const exec=promisify(execFile),origin=process.env.FP4B_ORIGIN??"http://localhost:3000";
const {fixture}=JSON.parse(readFileSync(".git/fp4b-recovery/browser-fixture.json","utf8"));
const browser=await chromium.launch({headless:!process.env.FP4B_NATIVE_KEYBOARD,args:["--use-angle=swiftshader"]});
const ca=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
const cb=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
const a=await ca.newPage(),b=await cb.newPage();
const errors=[];for(const p of[a,b])p.on("pageerror",()=>errors.push("pageerror"));
const room=`/room/${fixture.slug}/map`,sandbox="/personal/my-room/map";
async function ready(p,path){await p.goto(origin+path);await p.getByRole("textbox",{name:"Search places",exact:true}).waitFor();await p.waitForFunction(()=>!document.querySelector('input[aria-label="Search places"]').disabled&&!document.body.innerText.includes("Refreshing authorized Pins"));}
async function login(p,letter){
  await p.goto(origin+"/app");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.getByLabel("Email address",{exact:true}).fill(`tosker.user.${letter}+clerk_test@example.com`);await p.getByRole("button",{name:"Continue",exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('input[type=password],input[autocomplete="one-time-code"]'));
  if(await p.locator('input[type=password]').count()){await p.getByText("Use another method",{exact:true}).click();await p.getByRole("button",{name:`Email code to tosker.user.${letter}+clerk_test@example.com`,exact:true}).click();}
  await p.locator('input[autocomplete="one-time-code"]').pressSequentially("424242",{delay:80});await p.locator(".messaging-app").waitFor({timeout:45000});
}
async function chips(p){const section=p.locator('section[aria-label="Map Pins"],section[aria-label="Your Map Pins"]');await section.locator("details").first().evaluate(e=>e.open=true);return section;}
async function openPin(p,state="Been here"){
  const section=await chips(p);let target=section.getByRole("button",{name:`Open ${state} Pin: Marina Bay Sands`,exact:true});
  if(p.url().includes("my-room"))target=target.filter({hasText:fixture.name});
  await target.click();await p.locator('dialog[open] [aria-label="Map Pin details"]').waitFor();
}
const dialog=p=>p.locator('dialog[open]');
async function state(p,value,icon){await dialog(p).getByLabel("Pin state",{exact:true}).selectOption(value);await dialog(p).getByRole("button",{name:"Save state",exact:true}).click();await p.waitForFunction(icon=>document.querySelector('dialog[open] h2')?.textContent.startsWith(icon)&&!document.querySelector('button[aria-label="Close Pin details"]').disabled,icon);}
async function sourceExists(p,state){await chips(p);await p.getByRole("button",{name:`Open ${state} Pin: Marina Bay Sands`,exact:true}).waitFor();}
async function projected(p,state){const s=await chips(p);await s.getByRole("button",{name:`Open ${state} Pin: Marina Bay Sands`,exact:true}).filter({hasText:fixture.name}).waitFor();}
async function access(mode){const {stdout}=await exec(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/ms73-fp4b-access-check.ts",mode],{env:{...process.env,NODE_OPTIONS:"--conditions=react-server"},timeout:90000});console.log(stdout.trim());}
try{
  await login(a,"a");await login(b,"b");console.log("PASS normal isolated A/B sign-in (bundled Chromium)");
  await ready(a,room);await ready(b,sandbox);await sourceExists(a,"Been here");await projected(b,"Been here");
  if(!process.env.FP4B_FINISH_ONLY){
  for(const[width,height]of(process.env.FP4B_SKIP_LAYOUT?[]:[[320,800],[390,844],[430,900],[768,900],[1440,900],[1728,960],[844,390]])){
    await a.setViewportSize({width,height});await chips(a);assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await openPin(a);const bounds=await dialog(a).locator('[aria-label="Map Pin details"]').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1;});assert(bounds,`${width} detail bounds`);
    assert.equal(await dialog(a).count(),1);assert(await a.evaluate(()=>matchMedia('(prefers-reduced-motion:reduce)').matches));
    await a.screenshot({path:`.git/fp4b-recovery/accepted-pin-${width}.png`});await a.keyboard.press("Escape");await dialog(a).waitFor({state:"hidden"});
    assert(await a.evaluate(()=>document.activeElement?.getAttribute("aria-label")?.startsWith("Open Been here Pin:")),"focus restored to invoking Pin");
    console.log(`PASS ${width}x${height} bounds, reduced motion, singular dialog, Escape/focus return`);
  }
  await a.setViewportSize({width:320,height:800});await openPin(a);
  await dialog(a).evaluate(e=>{e.querySelector('h2').textContent='LongCheckpointName'.repeat(7);const p=[...e.querySelectorAll('p')].find(p=>p.textContent.startsWith('From '));p.textContent='From '+('LongContextName'.repeat(6));});
  assert(await dialog(a).locator('[aria-label="Map Pin details"]').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await a.screenshot({path:'.git/fp4b-recovery/accepted-long-320.png'});await a.keyboard.press("Escape");
  await a.setViewportSize({width:1440,height:900});await ready(a,room);await openPin(a);
  await a.bringToFront();await dialog(a).getByLabel("Pin state",{exact:true}).focus();assert.equal(await a.evaluate(()=>document.activeElement?.tagName),"SELECT");
  if(process.env.FP4B_NATIVE_KEYBOARD){console.log("NATIVE KEYBOARD GATE: change Been here to another state using the focused selector");await a.waitForFunction(()=>{const value=document.querySelector('dialog[open] select[aria-label="Pin state"]')?.value;return value&&value!=='been-here';},{},{timeout:600000});}
  else{await a.keyboard.press("Space");await a.keyboard.press("ArrowUp");await a.keyboard.press("ArrowUp");await a.keyboard.press("Enter");await a.keyboard.press("Tab");}
  const keyboardState=await dialog(a).getByLabel("Pin state",{exact:true}).inputValue();assert.notEqual(keyboardState,"been-here");await dialog(a).getByRole("button",{name:"Save state",exact:true}).focus();await a.keyboard.press("Enter");
  await projected(b,({favourite:"Favourite","want-to-go":"Want to go",saved:"Saved"})[keyboardState]);
  await state(a,"been-here","✓");await projected(b,"Been here");await a.keyboard.press("Escape");
  console.log("PASS long place/context wrapping and keyboard state selection/explicit save with A/B reconciliation");
  await openPin(b);await cb.setOffline(true);
  try{await openPin(a);await state(a,"favourite","♥");}finally{await cb.setOffline(false);}
  await projected(b,"Favourite");await b.waitForFunction(()=>!document.querySelector('section[aria-label="Your Map Pins"] [role="alert"]'));
  const other=await cb.newPage();await other.goto("about:blank");await other.bringToFront();await b.bringToFront();await projected(b,"Favourite");
  assert.equal(await dialog(b).count(),0);await other.close();await state(a,"been-here","✓");await projected(b,"Been here");await a.keyboard.press("Escape");
  console.log("PASS offline/reconnect recovery clears stale warning; background clears detail/draft; foreground reauthorizes");
  await openPin(b);await dialog(b).getByLabel("Pin state",{exact:true}).selectOption("favourite");await dialog(b).getByRole("button",{name:"Add to Route",exact:true}).click();
  try{
    await access("--remove-b");await b.waitForFunction(name=>!document.querySelector('dialog[open]')&&!document.body.innerText.includes(name)&&!document.body.innerText.includes('Marina Bay Sands'),fixture.name,{timeout:60000});
    const status=await b.evaluate(async conversationId=>(await fetch('/api/realtime/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId})})).status,fixture.conversationId);assert.equal(status,403);
    await sourceExists(a,"Been here");await ready(b,sandbox);assert.equal(await b.getByRole("button",{name:/Open Been here Pin: Marina Bay Sands/}).filter({hasText:fixture.name}).count(),0);
  }finally{await access("--restore-b");}
  await ready(b,sandbox);await projected(b,"Been here");console.log("PASS actual revocation clears B Pin/detail/draft/provenance, denies realtime and reload; A/founder preserved; B restored");
  }
  await ready(a,sandbox);await a.getByRole("button",{name:"Pin",exact:true}).click();await a.locator('.maplibregl-canvas').click({position:{x:180,y:180}});
  const preview=a.locator('section[aria-label="Place preview"]');await preview.waitFor();assert(await preview.innerText().then(t=>t.includes("Not saved yet")));
  await preview.getByRole("button",{name:"Pin to Map",exact:true}).waitFor();await preview.getByLabel("Pin state",{exact:true}).selectOption("saved");
  await a.waitForFunction(()=>[...document.querySelectorAll('section[aria-label="Place preview"] button')].some(e=>e.textContent==='Pin to Map'&&!e.disabled));
  await preview.getByRole("button",{name:"Pin to Map",exact:true}).focus();assert.equal(await a.evaluate(()=>document.activeElement?.textContent),"Pin to Map");await a.keyboard.press("Enter");await dialog(a).locator('[aria-label="Map Pin details"]').waitFor();
  const privateTitle=(await dialog(a).locator('h2').innerText()).replace(/^📍\s*/,"");assert(privateTitle.startsWith('Checkpoint'));
  assert((await dialog(a).innerText()).includes('From Your Sandbox'));assert.equal(await b.getByRole("button",{name:`Open Saved Pin: ${privateTitle}`,exact:true}).count(),0);
  await dialog(a).getByRole("button",{name:"Nuke Pin",exact:true}).click();await dialog(a).getByRole("button",{name:"Confirm Nuke Pin",exact:true}).click();await dialog(a).waitFor({state:"hidden"});
  console.log("PASS manual point→unsaved preview→explicit keyboard Pin; private A Sandbox only; exact temporary Pin removed");
  await ready(a,room);await ready(b,sandbox);await openPin(a);await dialog(a).getByRole("button",{name:"Nuke Pin",exact:true}).click();await dialog(a).getByRole("button",{name:"Confirm Nuke Pin",exact:true}).click();await dialog(a).waitFor({state:"hidden"});
  await b.getByRole("button",{name:"Open Been here Pin: Marina Bay Sands",exact:true}).filter({hasText:fixture.name}).waitFor({state:"hidden"});
  for(const p of[a,b]){await ready(p,room);await p.getByRole("button",{name:"Pin QA route 2",exact:true}).click();assert((await p.locator('[data-place-id]').first().innerText()).includes('Marina Bay Sands'));assert.equal(await p.locator('button[aria-label$="Map Pin: Marina Bay Sands"]').count(),0);}
  await ready(b,sandbox);assert.equal(await b.getByRole("button",{name:/Open .* Pin: Marina Bay Sands/}).filter({hasText:fixture.name}).count(),0);
  console.log("PASS browser Pin Nuke A/B source/projection removal, reload no resurrection and independent Route2 survives");
  assert.equal(errors.length,0);console.log("PASS FP4B integrated remaining browser gates; zero page exceptions");
}catch(error){for(const [page,name]of[[a,'a'],[b,'b']])await page.screenshot({path:`.git/fp4b-recovery/acceptance-failure-${name}.png`,timeout:5000}).catch(()=>{});throw error;}finally{await browser.close();}
