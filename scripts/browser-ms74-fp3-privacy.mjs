/** Owned QA actors only. Real API/Ably; synthetic public-landmark position,
 * offline basemap, no payload traces or credentials in evidence. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, installLiveMetrics } from "./lib/ms74-browser.mjs";
const fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
const dir=".git/ms74-fp3/browser",browser=await chromium.launch({headless:true}),pages=[];
const evidence={pass:false,at:new Date().toISOString(),cases:[],leases:[],errors:[],requests:[],providerCalls:0};let step="setup",releaseValidation;
const checkpoint=name=>{step=name;writeFileSync(`${dir}/privacy-progress.json`,JSON.stringify({...evidence,step},null,2),{mode:0o600});console.log(JSON.stringify({step}));};
try{
  for(const actor of ["a","b"]){
    const context=await browser.newContext({viewport:{width:1440,height:1000},geolocation:{latitude:1.2834,longitude:103.8607,accuracy:50},permissions:["geolocation"]});
    await installLiveMetrics(context);
    await context.route("**/*geoapify.com/**",r=>new URL(r.request().url()).pathname.endsWith("style.json")?r.fulfill({json:{version:8,sources:{},layers:[{id:"qa",type:"background",paint:{"background-color":"#0d171b"}}]}}):r.abort());
    const p=await context.newPage();pages.push(p);p.on("pageerror",e=>evidence.errors.push(e.name));
    p.on("response",async r=>{if(new URL(r.url()).pathname!=="/api/location-sharing")return;const action=r.request().postDataJSON()?.action;evidence.requests.push({actor,action,status:r.status()});if(action==="begin"&&r.ok()){const lease=await r.json();evidence.leases.push({id:lease.id,expiresAt:lease.expiresAt});}});
    await loginLive(p,actor,fixture);await p.goto(`http://localhost:3000/room/${fixture.slug}/map`,{waitUntil:"domcontentloaded"});await p.locator('[data-map-state="ready"]').waitFor({timeout:60000});
  }
  const [a,b]=pages,peer=b.getByRole("list",{name:"Shared location snapshots"});
  const start=async()=>{await a.getByRole("button",{name:"Share location",exact:true}).click();await a.getByRole("radio",{name:"Precise position on peers’ Maps",exact:true}).check();await a.getByRole("button",{name:"Share precise position",exact:true}).click();};
  const refresh=()=>a.getByRole("button",{name:"Share displayed position again",exact:true}).click();
  const stop=()=>a.getByRole("button",{name:"Stop sharing",exact:true}).click();
  const shown=()=>peer.waitFor({timeout:45000}),gone=()=>peer.waitFor({state:"detached",timeout:15000});
  await a.getByRole("button",{name:"Locate me",exact:true}).click();
  checkpoint("refresh and no reload history");await start();await shown();
  const deadline=evidence.leases.at(-1).expiresAt;
  await refresh();await b.reload({waitUntil:"domcontentloaded"});await b.locator('[data-map-state="ready"]').waitFor({timeout:30000});
  assert.equal(await peer.count(),0);await refresh();await shown();assert.equal(evidence.leases.at(-1).expiresAt,deadline);
  evidence.cases.push("reload has no snapshot history; explicit refresh restores without extending lease");
  checkpoint("hidden Map cache");await b.locator('[data-surface-trigger="hall"]').click();
  await b.locator('[data-surface-trigger="map"]').click();await b.locator('[data-map-state="ready"]').waitFor();
  assert.equal(await peer.count(),0);await refresh();await shown();
  evidence.cases.push("hidden Map drops snapshot and cannot restore it without another send");
  await a.screenshot({path:`${dir}/sharing-card-resweep.png`,fullPage:true});
  checkpoint("disconnect");await a.evaluate(()=>window.__liveQa.cut());await gone();
  await a.evaluate(()=>window.__liveQa.restore());await a.waitForFunction(()=>window.__liveQa.snapshot().connections===1,{},{timeout:60000});
  assert.equal(await a.getByRole("button",{name:"Stop sharing",exact:true}).count(),0);assert.equal(await peer.count(),0);
  evidence.cases.push("disconnect retires sharing; reconnect never automatically resumes");
  checkpoint("delayed validation after Stop");
  let captured,delivered,holding=false;const held=new Promise(resolve=>{captured=resolve;}),delivery=new Promise(resolve=>{delivered=resolve;});
  const blocker=async route=>{if(route.request().postDataJSON()?.action!=="validate"||holding)return route.continue();holding=true;try{const response=await route.fetch();await new Promise(resolve=>{releaseValidation=resolve;captured();});await route.fulfill({response});}catch{evidence.errors.push("DelayedValidationHarnessFailure");}finally{delivered();}};
  await b.route("**/api/location-sharing",blocker);await start();await Promise.race([held,new Promise((_,reject)=>setTimeout(()=>reject(new Error("Validation was not observed")),45000))]);await stop();
  await a.getByRole("button",{name:"Stop sharing",exact:true}).waitFor({state:"detached"});releaseValidation();releaseValidation=null;await delivery;
  await b.unroute("**/api/location-sharing",blocker);await b.waitForTimeout(1000);assert.equal(await peer.count(),0);
  evidence.cases.push("late already-authorized validation cannot resurrect a stopped lease");
  checkpoint("absolute expiry without clear delivery");await start();await shown();
  // Simulate loss of the sender's clear request. Receiver must still enforce
  // the signed-off absolute deadline independently of the sender's lifetime.
  const dropStop=route=>route.request().postDataJSON()?.action==="stop"?route.abort():route.continue();
  await a.route("**/api/location-sharing",dropStop);
  const expiry=evidence.leases.at(-1).expiresAt;
  while(Date.now()<expiry+1200){await a.waitForTimeout(Math.min(20000,expiry+1200-Date.now()));console.log(JSON.stringify({phase:"expiry",remainingSeconds:Math.max(0,Math.ceil((expiry-Date.now())/1000))}));}
  await gone();assert.equal(await b.locator('[aria-label*="shared a temporary position"]').count(),0);
  await a.unroute("**/api/location-sharing",dropStop);
  evidence.cases.push("absolute five-minute expiry clears peer even when Stop transport fails");
  for(const p of pages){const m=await p.evaluate(()=>window.__liveQa.snapshot());assert(m.maxConnections<=1&&m.payloadSafe);}
  assert.equal(evidence.errors.length,0);evidence.pass=true;
}catch(e){evidence.failedStep=step;evidence.failure=e.name;process.exitCode=1;for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:`${dir}/privacy-failure-${i}.png`,fullPage:true}).catch(()=>{});}
finally{releaseValidation?.();for(const p of pages){await p.unroute("**/api/location-sharing").catch(()=>{});const button=p.getByRole("button",{name:"Stop sharing",exact:true});if(await button.count().catch(()=>0))await button.click({timeout:3000}).catch(()=>{});}await browser.close();writeFileSync(`${dir}/privacy.json`,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify(evidence));}
