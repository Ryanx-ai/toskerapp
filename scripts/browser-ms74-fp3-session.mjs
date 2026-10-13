/** Normal isolated QA sessions; actual server logout/revocation, no founder use. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {loginLive,installLiveMetrics,liveJoined,liveCount,leaveLiveBeforeClose} from "./lib/ms74-browser.mjs";
const fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));assert.equal(fixture.run,"ms74-fp1-20261010");
const browser=await chromium.launch({headless:true}),pages=[],evidence={pass:false,at:new Date().toISOString(),cases:[],errors:[],providerCalls:0};let step="setup";
try{
  for(const actor of ["a","b"]){const c=await browser.newContext({viewport:{width:1440,height:1000},geolocation:{latitude:1.2834,longitude:103.8607,accuracy:50},permissions:["geolocation"]});await installLiveMetrics(c);await c.route("**/*geoapify.com/**",r=>new URL(r.request().url()).pathname.endsWith("style.json")?r.fulfill({json:{version:8,sources:{},layers:[{id:"qa",type:"background",paint:{"background-color":"#0d171b"}}]}}):r.abort());const p=await c.newPage();pages.push(p);p.on("pageerror",e=>evidence.errors.push(e.name));await loginLive(p,actor,fixture);await p.locator('.live-panel .live-action').click();await liveJoined(p);}
  const[a,b]=pages;await liveCount(a,2);await liveCount(b,2);await a.locator('[data-surface-trigger="map"]').click();await b.locator('[data-surface-trigger="map"]').click();await a.locator('[data-map-state="ready"]').waitFor({timeout:60000});await b.locator('[data-map-state="ready"]').waitFor();
  step="Live reconnect with Map companion";await a.evaluate(()=>window.__liveQa.cut());await a.locator('.live-panel[data-phase="reconnecting"]').waitFor();await a.evaluate(()=>{window.__liveQa.restore();window.dispatchEvent(new Event("online"));});await liveJoined(a);await liveCount(b,2);
  await a.locator('[data-surface-trigger="hall"]').click();await a.locator('.workspace-composition[data-layout="hall:live"]').waitFor();await liveCount(b,2);await a.locator('[data-surface-trigger="map"]').click();await a.locator('.workspace-composition[data-layout="map:live"]').waitFor();
  evidence.cases.push("actual Live reconnect then Board/Map navigation preserves joined presence and composition");
  step="active snapshot logout";await a.getByRole("button",{name:"Locate me",exact:true}).click();await a.getByRole("button",{name:"Share location",exact:true}).click();await a.getByRole("radio",{name:"Precise position on peers’ Maps",exact:true}).check();await a.getByRole("button",{name:"Share precise position",exact:true}).click();await b.locator('[aria-label*="shared a temporary position"]').waitFor({timeout:45000});
  // Exercise the actual logout route while Map is still mounted, so pane-exit
  // cleanup cannot hide a broken server session-retirement boundary.
  const result=await a.evaluate(async conversationId=>{const token=await window.Clerk.session.getToken();const headers={"Content-Type":"application/json",Authorization:`Bearer ${token}`};const logout=await fetch("/api/realtime/logout",{method:"POST",headers});const after=await fetch("/api/realtime/token",{method:"POST",headers,body:JSON.stringify({conversationId})});return {logout:logout.status,after:after.status};},fixture.conversationId);
  assert.equal(result.logout,200);assert([401,403].includes(result.after));await b.locator('[aria-label*="shared a temporary position"]').waitFor({state:"detached",timeout:15000});await liveCount(b,1);
  evidence.cases.push("active Map snapshot removed on real session logout; old bearer denied; peer Live remains");
  for(const p of pages){const m=await p.evaluate(()=>window.__liveQa.snapshot());assert(m.maxConnections<=1&&m.payloadSafe);}assert.equal(evidence.errors.length,0);evidence.pass=true;
}catch(e){evidence.failedStep=step;evidence.failure=e.name;process.exitCode=1;for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:`.git/ms74-fp3/browser/session-failure-${i}.png`,fullPage:true}).catch(()=>{});}
finally{for(const p of pages)await leaveLiveBeforeClose(p).catch(()=>{});await browser.close();writeFileSync(".git/ms74-fp3/browser/session.json",JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify(evidence));}
