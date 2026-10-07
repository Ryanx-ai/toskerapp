/** Browser routing state machine, controlled responses only. Virtual UI timers do NOT alter quotas. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip} from "../src/server/trips/service.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
import {routingPlaces} from "../src/lib/trip-contract.ts";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!fixture.retained);
const db=getDatabase(),{a}=await resolveQaActors(db),browser=await chromium.connectOverCDP(process.env.FP6_CDP),page=browser.contexts()[0].pages()[0];
let status=200,hold=false,releases=[],calls=[];const button=n=>page.getByRole("button",{name:n,exact:true});
await page.route("**/api/trips/*/roads",async r=>{
  const body=r.request().postDataJSON();assert(new URL(r.request().url()).pathname.includes(fixture.slug));const plan=await readTrip(db,a,fixture.slug),points=routingPlaces(plan,body.routeId);calls.push({mode:body.mode,key:JSON.stringify(points.map(p=>[p.id,p.latitude,p.longitude]))});
  const capturedStatus=status;if(hold)await new Promise(resolve=>releases.push(resolve));if(capturedStatus!==200){await r.fulfill({status:capturedStatus,json:{error:"Controlled provider failure. Saved trip unchanged."}}).catch(()=>{});return;}
  const legs=points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000,seconds:600}));await r.fulfill({json:{geometry:{key:JSON.stringify([body.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]),mode:body.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"QA controlled",estimate:{metres:legs.length*1000,seconds:legs.length*600,guidance:[],legs}}}}).catch(()=>{});
});
const waitCalls=async n=>{for(let i=0;i<200&&calls.length<n;i++)await page.waitForTimeout(50);assert.equal(calls.length,n);};
try{
  await page.goto(`http://localhost:3000/room/${fixture.slug}`,{waitUntil:"domcontentloaded",timeout:60000});await ensureFp6QaLogin(page);await page.locator('[data-place-id]').first().waitFor();await page.clock.install();
  hold=true;await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("drive");await page.clock.runFor(800);await waitCalls(1);
  hold=false;await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("walk");await page.clock.fastForward(6500);await waitCalls(2);await page.getByLabel("Route summary",{exact:true}).getByText(/3\.0 km/).waitFor();
  releases.splice(0).forEach(f=>f());await page.clock.runFor(200);assert.equal(await page.getByRole("combobox",{name:"Travel mode",exact:true}).inputValue(),"walk");assert.deepEqual(calls.map(c=>c.mode),["drive","walk"]);console.log("PASS late Drive response ignored after Walk switch; current Walk geometry/tags only");
  const before=calls.length;await button("Hide QA Gardens from my map").click();await page.clock.fastForward(6500);assert.equal(calls.length,before);await button("Show QA Gardens on my map").click();console.log("PASS viewer-private Hide does not recalculate shared routing");
  await button("Place actions for QA Gardens").click();await button("Skip in route").click();await page.keyboard.press("Escape");await page.waitForFunction(()=>!document.querySelector('[aria-label="Route summary"]')?.textContent.includes('3.0 km'));
  await page.clock.fastForward(62000);await waitCalls(3);await page.getByLabel("Route summary",{exact:true}).getByText(/2\.0 km/).waitFor();assert.notEqual(calls[2].key,calls[1].key);
  const revision=await page.locator('[data-trip-revision]').getAttribute('data-trip-revision');await button("Place actions for QA Gardens").click();await button("Include in route").click();await page.keyboard.press("Escape");await page.waitForFunction(r=>document.querySelector('[data-trip-revision]')?.dataset.tripRevision!==r,revision);await page.clock.fastForward(62000);await waitCalls(4);await page.getByLabel("Route summary",{exact:true}).getByText(/3\.0 km/).waitFor();console.log("PASS shared Skip/include invalidates/replaces canonical road projection");
  for(const code of[400,429,503]){
    status=code;await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption(code===429?"walk":"drive");await page.clock.fastForward(62000);await button("Retry route").waitFor();assert.equal(await page.locator('[data-shared-leg-tag]').count(),0);assert(!(await page.getByLabel("Route summary",{exact:true}).textContent()).includes('km'));
    const n=calls.length;await page.clock.fastForward(62000);assert.equal(calls.length,n,"Failure must not auto-retry");console.log(`PASS controlled ${code}: no stale tags/metrics and no retry loop`);
  }
  await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning");console.log("PASS controlled road recovery matrix; zero real routing calls");
}catch(e){console.error({failure:"FP6 controlled road recovery",message:String(e.message).slice(0,800)});process.exitCode=1;}
finally{releases.splice(0).forEach(f=>f());await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning").catch(()=>{});await page.clock.resume().catch(()=>{});await page.unrouteAll({behavior:"wait"});await browser.close();await db.$client.end();}
