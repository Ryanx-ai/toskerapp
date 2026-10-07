/** Exact-owned temporary route only; intercepted searches/roads, no provider calls. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip,mutateTrip} from "../src/server/trips/service.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!fixture.retained);
const db=getDatabase(),{a}=await resolveQaActors(db),initial=await readTrip(db,a,fixture.slug);
assert.equal(initial.routes.length,1,"Do not duplicate an existing cancellation fixture");
const name="FP6 disposable cancellation",created=await mutateTrip(db,a,{roomSlug:fixture.slug,expectedRevision:initial.revision,requestId:randomUUID(),command:{type:"create-route",name,color:initial.routes[0].color}});
const routeId=created.resultId;assert(routeId);writeFileSync(".git/fp6-recovery/cancellation-route.json",JSON.stringify({roomSlug:fixture.slug,routeId,disposable:true}),{mode:0o600});
const browser=await chromium.connectOverCDP(process.env.FP6_CDP),page=browser.contexts()[0].pages()[0];
let calls=0;const releases=[];
await page.route("**/api/trips/*/roads",r=>r.fulfill({status:503,json:{error:"Controlled QA firewall"}}));
await page.route("**/api/trips/*/places",async r=>{calls++;await new Promise(resolve=>releases.push(resolve));await r.fulfill({json:{candidates:[{token:"not-for-saving",candidate:{title:"Obsolete QA",address:"Synthetic only",latitude:1.3,longitude:103.8,source:"search"}}]}}).catch(()=>{});});
const search=()=>page.getByRole("textbox",{name:"Search places",exact:true}),choose=n=>page.getByRole("button",{name:n,exact:true});
const waitCalls=async n=>{for(let i=0;i<200&&calls<n;i++)await page.waitForTimeout(50);assert.equal(calls,n);};
try{
  await page.setViewportSize({width:1440,height:900});await page.goto(`http://localhost:3000/room/${fixture.slug}`,{waitUntil:"domcontentloaded",timeout:60000});await ensureFp6QaLogin(page);await choose(name).waitFor();
  await choose(initial.routes[0].name).click();await search().fill("cancel before debounce");await choose(name).click();await page.waitForTimeout(1500);
  assert.equal(calls,0);assert.equal(await search().inputValue(),"");assert.equal(await page.getByText("Looking up this place…",{exact:true}).count(),0);
  await search().fill("cancel inflight");await page.waitForFunction(()=>document.body.textContent.includes("Looking up this place…"));await waitCalls(1);
  await choose(initial.routes[0].name).click();releases.splice(0).forEach(f=>f());await page.waitForTimeout(500);assert.equal(await page.getByRole("button",{name:/Obsolete QA/}).count(),0);assert.equal(await search().inputValue(),"");
  await search().fill("cancel context");await waitCalls(2);await page.getByRole("link",{name:"tosker.user.a+clerk_test's Sandbox",exact:true}).click();await page.getByRole("heading",{name:"tosker.user.a+clerk_test's Sandbox",exact:true}).waitFor();releases.splice(0).forEach(f=>f());await page.waitForTimeout(500);assert.equal(await search().inputValue(),"");assert.equal(await page.getByRole("button",{name:/Obsolete QA/}).count(),0);
  console.log("PASS route switch before debounce and during request, context navigation cancellation, no stuck loading or stale results; zero provider requests");
}catch(e){console.error({failure:"FP6 search cancellation",message:String(e.message).slice(0,700)});process.exitCode=1;}
finally{
  releases.splice(0).forEach(f=>f());await page.unrouteAll({behavior:"wait"});await browser.close();
  const latest=await readTrip(db,a,fixture.slug);assert.equal(latest.memberships.filter(m=>m.routeId===routeId).length,0,"Stop cleanup if another participant added content");
  await mutateTrip(db,a,{roomSlug:fixture.slug,expectedRevision:latest.revision,requestId:randomUUID(),command:{type:"nuke-route",routeId}});console.log("Exact temporary empty QA route removed; owned Room and retained route preserved");await db.$client.end();
}
