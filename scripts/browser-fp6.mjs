/** Fresh receipt only; real UI writes, mocked road provider for repeatable quota-safe regression. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip} from "../src/server/trips/service.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));
assert(/^ms73-qa-[a-f0-9]{8}$/.test(fixture.slug)&&!fixture.retained);
const browser=await chromium.connectOverCDP(process.env.FP6_CDP);
const context=browser.contexts()[0],page=context.pages().find(p=>p.url().startsWith("http://localhost:3000"));
assert(page);
const origin="http://localhost:3000",path=`/room/${fixture.slug}`;
const button=(name)=>page.getByRole("button",{name,exact:true});
const revision=()=>page.locator("[data-trip-revision]").getAttribute("data-trip-revision");
const cards=()=>page.locator("[data-place-id]").evaluateAll(es=>es.map(e=>({id:e.dataset.placeId,title:e.querySelector("strong")?.textContent,draggable:e.draggable})));
async function changed(before){await page.waitForFunction(v=>document.querySelector("[data-trip-revision]")?.dataset.tripRevision!==v,before);await page.waitForFunction(()=>[...document.querySelectorAll('[data-place-id]')].some(e=>e.draggable));}
async function menu(name){await page.keyboard.press("Escape");await button(`Place actions for ${name}`).click();}
const requests=[];
const db=getDatabase(),{a}=await resolveQaActors(db);
await page.route(`**/api/trips/${fixture.slug}/roads`,async route=>{
  const body=route.request().postDataJSON();
  // Server-authorized canonical fixture only; no fabricated client state.
  const plan=await readTrip(db,a,fixture.slug);
  if(!plan.places){await route.fulfill({status:503,json:{error:"QA road mock missing canonical snapshot"}});return;}
  const routeId=body.routeId;
  let points=plan.memberships.filter(m=>m.routeId===routeId).sort((a,b)=>a.position-b.position).map(m=>plan.places.find(p=>p.id===m.placeId)).filter(p=>p&&!p.archived&&!p.skipped);
  if(body.origin)points=[{id:"private-origin",...body.origin},points[0]];
  const key=JSON.stringify([body.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]);
  requests.push({key,private:!!body.origin});
  const legs=points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000+i*100,seconds:600+i*60}));
  await route.fulfill({json:{geometry:{key,mode:body.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"Synthetic QA road response",estimate:{metres:legs.reduce((n,l)=>n+l.metres,0),seconds:legs.reduce((n,l)=>n+l.seconds,0),guidance:[],legs}}}});
});
try{
  if(new URL(page.url()).pathname!==path)await page.goto(origin+path);
  await page.locator('[data-map-state="ready"]').waitFor();
  await page.keyboard.press("Escape");
  // Existing founder report reproduction: POI order is independent of geographic immutability.
  await menu("QA Marina Bay Sands");
  if(await button("Unlock position 1").count()){const r=await revision();await button("Unlock position 1").click();await changed(r);}
  await page.keyboard.press("Escape");
  let before=await cards(),r=await revision();
  await menu("QA Marina Bay Sands");
  assert.equal(await button("Reposition checkpoint").count(),0);
  await button(before.at(-1).title==="QA Marina Bay Sands"?"Move earlier":"Move later").click();await changed(r);
  assert.notDeepEqual((await cards()).map(c=>c.id),before.map(c=>c.id));
  console.log("PASS real UI provider-backed POI reorder, no geographic move control");
  await page.keyboard.press("Escape");before=await cards();r=await revision();
  await page.locator(`[data-place-id="${before.at(-1).id}"]`).dragTo(page.locator(`[data-place-id="${before[0].id}"]`));await changed(r);
  assert.notDeepEqual((await cards()).map(c=>c.id),before.map(c=>c.id));console.log("PASS native card drag reorder");
  await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("drive");
  await page.getByLabel("Route summary",{exact:true}).getByText(/3\.3 km/).waitFor({timeout:20000});
  const old=requests.at(-1).key;
  await menu("Checkpoint 1");r=await revision();
  const current=await cards();await button(current[0].title==="Checkpoint 1"?"Move later":"Move earlier").click();await changed(r);
  await page.keyboard.press("Escape");
  await page.waitForFunction(()=>!document.querySelector('[aria-label="Route summary"]')?.textContent.includes("3.3 km"));
  await page.getByLabel("Route summary",{exact:true}).getByText(/3\.3 km/).waitFor({timeout:25000});assert.notEqual(requests.at(-1).key,old);
  console.log("PASS reorder invalidates current metrics then coalesces matching Drive response (controlled provider)");
  await menu("Checkpoint 1");await button("Reposition checkpoint").click();
  await page.getByLabel("Latitude",{exact:true}).fill("1.2901");r=await revision();const oldMove=requests.at(-1).key;
  await button("Save position").click();await changed(r);
  await page.getByLabel("Route summary",{exact:true}).getByText(/3\.3 km/).waitFor({timeout:65000});assert.notEqual(requests.at(-1).key,oldMove);
  console.log("PASS explicit checkpoint movement changes canonical road key and recalculates (controlled provider)");
  await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning");
  assert(!(await page.getByLabel("Route summary",{exact:true}).textContent()).includes("3.3 km"));
  console.log("PASS Order suppresses road metrics");
}catch(error){console.error({failure:"FP6 browser",message:String(error.message).slice(0,600)});process.exitCode=1;}
finally{await page.unroute(`**/api/trips/${fixture.slug}/roads`);await browser.close();await db.$client.end();}
