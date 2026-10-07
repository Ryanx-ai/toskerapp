/** Deterministic lifecycle/privacy UI tests. Real road/search requests are firewalled. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip} from "../src/server/trips/service.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
import {routingPlaces} from "../src/lib/trip-contract.ts";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!fixture.retained);
const db=getDatabase(),{a}=await resolveQaActors(db),plan=await readTrip(db,a,fixture.slug);
const browser=await chromium.connectOverCDP(process.env.FP6_CDP),context=browser.contexts()[0],page=context.pages()[0];
const button=n=>page.getByRole("button",{name:n,exact:true}),origin=()=>page.getByLabel("Your private origin",{exact:true});
let hold=false,releases=[],calls=[];
await page.addInitScript(()=>{window.__qaGeo={calls:0};Object.defineProperty(navigator,"geolocation",{configurable:true,value:{getCurrentPosition(ok,fail){window.__qaGeo.calls++;window.__qaGeo.ok=ok;window.__qaGeo.fail=fail;}}});});
await page.route("**/api/trips/*/roads",async r=>{
  const body=r.request().postDataJSON();calls.push(body);if(hold)await new Promise(resolve=>releases.push(resolve));
  let points=routingPlaces(plan,body.routeId);if(body.origin)points=[{id:"private-origin",...body.origin},points[0]];
  const legs=points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000,seconds:600}));
  await r.fulfill({json:{geometry:{key:JSON.stringify([body.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]),mode:body.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"QA controlled",estimate:{metres:legs.length*1000,seconds:legs.length*600,guidance:[],legs}}}}).catch(()=>{});
});
await page.route("**/api/trips/*/places",r=>r.fulfill({status:403,json:{error:"Controlled access loss"}}));
const deliver=()=>page.evaluate(()=>window.__qaGeo.ok({coords:{latitude:1.34,longitude:103.79,accuracy:10}}));
try{
  await page.setViewportSize({width:1440,height:900});await page.goto(`http://localhost:3000/room/${fixture.slug}`,{waitUntil:"domcontentloaded",timeout:60000});await ensureFp6QaLogin(page);await page.locator('[data-place-id]').first().waitFor();await page.locator('[data-map-state="ready"]').waitFor();
  await button("Fit trip").click();await page.waitForTimeout(400);
  const manual=page.getByRole("button",{name:/^Select checkpoint \d+: Checkpoint 2$/}),beforeRevision=await page.locator('[data-trip-revision]').getAttribute('data-trip-revision'),markerBox=await manual.boundingBox();assert(markerBox);
  await page.mouse.move(markerBox.x+markerBox.width/2,markerBox.y+markerBox.height/2);await page.mouse.down();await page.mouse.move(markerBox.x+markerBox.width/2+45,markerBox.y+markerBox.height/2-25,{steps:10});await page.mouse.up();
  const move=page.getByRole("region",{name:"Move checkpoint preview",exact:true});await move.waitFor();await move.getByRole("button",{name:"Cancel",exact:true}).click();
  assert.equal(await page.locator('[data-trip-revision]').getAttribute('data-trip-revision'),beforeRevision);assert.equal((await readTrip(db,a,fixture.slug)).revision,plan.revision);assert.equal(calls.length,0);console.log("PASS checkpoint drag/cancel preserves canonical coordinates/revision and makes no road request");
  await button("Locate me").click();await button("Locate me").click();await deliver();assert.equal(await origin().count(),0);assert.equal(calls.length,0);
  await button("Locate me").click();await page.evaluate(()=>window.__qaGeo.fail({code:1}));await page.getByText(/Location permission denied/).waitFor();assert.equal(await origin().count(),0);
  await button("Locate me").click();await deliver();await origin().waitFor();assert.equal(calls.length,0);
  console.log("PASS permission denied, late geolocation after OFF ignored, Locate alone sends no road request");
  await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("drive");await page.getByLabel("Route summary",{exact:true}).getByText(/3\.0 km/).waitFor({timeout:20000});
  await button("Route from here").click();await button("Keep location local").click();assert.equal(calls.filter(c=>c.origin).length,0);
  hold=true;await button("Route from here").click();await button("Allow private route").click();
  for(let i=0;i<150&&!calls.some(c=>c.origin);i++)await page.waitForTimeout(100);
  assert.equal(calls.filter(c=>c.origin).length,1);assert.deepEqual(Object.keys(calls.find(c=>c.origin).origin).sort(),["consent","latitude","longitude"]);
  await button("Clear my location").click();releases.splice(0).forEach(f=>f());hold=false;await page.waitForTimeout(800);assert.equal(await origin().count(),0);assert(!(await page.locator("body").textContent()).includes("YOUR LEG"));
  const stored=await page.evaluate(()=>[...Object.values(localStorage),...Object.values(sessionStorage)].join(" "));assert(!stored.includes("103.79")&&!stored.includes("1.34"));
  console.log("PASS consent absent/declined sends no origin; accepted ephemeral request shape; OFF discards late origin response; no persistent browser coordinate");
  await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning");
  const marker=page.getByRole("button",{name:/^Select destination \d+: QA Marina Bay Sands$/});await marker.focus();await page.keyboard.press("Enter");await page.locator('[data-map-inspector]').waitFor();await page.keyboard.press("Escape");assert.equal(await marker.evaluate(e=>e===document.activeElement),true);
  const height=await page.locator('.maplibregl-map').evaluate(e=>e.clientHeight);await button("Collapse locations").click();assert((await page.locator('.maplibregl-map').evaluate(e=>e.clientHeight))>height);await button("Expand locations").click();assert.equal(await page.locator('[data-place-id]').count(),4);
  console.log("PASS inspector Escape restores marker focus; icon-only collapse expands Map and preserves cards");
  await button("Locate me").click();await deliver();await origin().waitFor();
  const inject=()=>page.evaluate(({conversationId,senderId})=>window.dispatchEvent(new CustomEvent("tosker:map-ping",{detail:{conversationId,ping:{id:crypto.randomUUID(),kind:"question",latitude:1.29,longitude:103.85,senderId,senderName:"QA peer",expiresAt:Date.now()+8000}}})),{conversationId:fixture.conversationId,senderId:a.userId});
  await inject();await page.getByRole("img",{name:/Question ping/}).waitFor();await page.getByRole("textbox",{name:"Search places",exact:true}).fill("deny");
  await page.waitForFunction(()=>!document.querySelector('[aria-label="Your private origin"]'));assert.equal(await page.getByRole("img",{name:/Question ping/}).count(),0);
  await inject();await page.waitForTimeout(300);assert.equal(await page.getByRole("img",{name:/Question ping/}).count(),0,"Late ping after access loss must stay discarded");
  assert.equal(await page.locator('[data-place-id]').count(),0);console.log("PASS access loss clears plan/origin/pings/search and ignores late pings");
}catch(e){await page.screenshot({path:".git/fp6-recovery/lifecycle-failure.png"});console.error({failure:"FP6 lifecycle",message:String(e.message).slice(0,900)});process.exitCode=1;}
finally{releases.splice(0).forEach(f=>f());await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning").catch(()=>{});await page.unrouteAll({behavior:"wait"});await browser.close();await db.$client.end();}
