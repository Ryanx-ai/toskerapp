/** Exact owned fixture; real browser interactions, controlled roads consume no provider credits. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip} from "../src/server/trips/service.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));
assert(/^ms73-qa-[a-f0-9]{8}$/.test(fixture.slug)&&!fixture.retained);
const browser=await chromium.connectOverCDP(process.env.FP6_CDP),page=browser.contexts()[0].pages().find(p=>p.url().startsWith("http://localhost:3000"));assert(page);
const db=getDatabase(),{a}=await resolveQaActors(db),requests=[];
const button=name=>page.getByRole("button",{name,exact:true});
const revision=()=>page.locator("[data-trip-revision]").getAttribute("data-trip-revision");
const tags=()=>page.locator("[data-shared-leg-tag]");
await page.route(`**/api/trips/${fixture.slug}/roads`,async request=>{
  try{
  const body=request.request().postDataJSON(),plan=await readTrip(db,a,fixture.slug);
  const points=plan.memberships.filter(m=>m.routeId===body.routeId).sort((x,y)=>x.position-y.position).map(m=>plan.places.find(p=>p.id===m.placeId)).filter(p=>p&&!p.archived&&!p.skipped);
  assert(!body.origin,"Private origin is outside this test");
  const key=JSON.stringify([body.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]);
  const legs=points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000+i*100,seconds:600+i*60}));
  requests.push({key,points,legs});
  await request.fulfill({json:{geometry:{key,mode:body.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"Synthetic QA road response",estimate:{metres:3300,seconds:1980,guidance:[],legs}}}});
  }catch{await request.fulfill({status:503,json:{error:"Controlled QA routing unavailable; retry acceptance after database recovery"}}).catch(()=>{});}
});
try{
  await page.setViewportSize({width:1728,height:1117});await page.goto(`http://localhost:3000/room/${fixture.slug}`);
  await page.locator('[data-map-state="ready"]').waitFor();await page.locator('[data-place-id]').first().waitFor();
  await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("drive");
  await page.getByLabel("Route summary",{exact:true}).getByText(/3\.3 km/).waitFor({timeout:25000});await button("Fit trip").click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-shared-leg-tag]').length===3);
  assert.deepEqual(await tags().allTextContents(),["1.0 km · ~10 min","1.1 km · ~11 min","1.2 km · ~12 min"]);
  await page.getByLabel("Route summary",{exact:true}).locator("summary").click();
  const details=await page.getByRole("list",{name:"Route segments",exact:true}).locator("li").allTextContents();
  for(let i=0;i<3;i++)assert(details[i].includes(`${requests.at(-1).points[i].title} → ${requests.at(-1).points[i+1].title}`));
  await page.getByLabel("Route summary",{exact:true}).locator("summary").click();
  await page.waitForTimeout(800);await page.screenshot({path:".git/fp6-recovery/leg-tags-fit.png"});
  console.log("PASS three validated tags and accessible details correspond to the exact canonical waypoint pairs");
  await button("Reset map to Singapore").click();await page.waitForTimeout(500);
  const boxes=await tags().evaluateAll(es=>es.filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const x=boxes[i],y=boxes[j];assert(!(x.x<y.x+y.w&&x.x+x.w>y.x&&x.y<y.y+y.h&&x.y+x.h>y.y));}
  assert(boxes.length<3,"Dense low-zoom tags should be culled rather than overlap");
  await page.screenshot({path:".git/fp6-recovery/leg-tags-low-zoom.png"});console.log("PASS low-zoom collision culling; accessible detail remains");
  await button("Fit trip").click();await page.waitForTimeout(800);
  const selected=page.getByRole("button",{name:/^Select destination \d+: QA Marina Bay Sands$/});await selected.focus();await page.keyboard.press("Enter");
  const poiId=requests.at(-1).points.find(p=>p.title==="QA Marina Bay Sands").id;
  await page.locator('[data-map-inspector]').waitFor();
  await page.waitForFunction(expected=>JSON.stringify([...document.querySelectorAll('[data-shared-leg-tag]')].map(e=>e.style.opacity))===JSON.stringify(expected),requests.at(-1).legs.map(l=>l.fromId===poiId||l.toId===poiId?"1":"0.45"));
  const opacity=await tags().evaluateAll(es=>es.map(e=>e.style.opacity));
  assert.deepEqual(opacity,requests.at(-1).legs.map(l=>l.fromId===poiId||l.toId===poiId?"1":"0.45"));await page.keyboard.press("Escape");
  console.log("PASS selected destination emphasizes only adjacent leg tags");
  const manual=page.getByRole("button",{name:/^Select checkpoint \d+: Checkpoint 2$/}),before=await revision();
  const box=await manual.boundingBox();assert(box);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+55,box.y+box.height/2-30,{steps:12});await page.mouse.up();
  await page.getByRole("heading",{name:"Move checkpoint?",exact:true}).waitFor();assert.equal(await revision(),before,"Dragging alone must not persist");
  const oldKey=requests.at(-1).key;await button("Save position").click();
  await page.waitForFunction(r=>document.querySelector('[data-trip-revision]')?.dataset.tripRevision!==r,before);
  await page.waitForFunction(()=>document.querySelectorAll('[data-shared-leg-tag]').length===0);
  await page.getByLabel("Route summary",{exact:true}).getByText(/3\.3 km/).waitFor({timeout:65000});assert.notEqual(requests.at(-1).key,oldKey);
  console.log("PASS geographic marker drag previews without saving; explicit confirmation invalidates tags and recalculates matching Drive");
  await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning");await page.waitForFunction(()=>document.querySelectorAll('[data-shared-leg-tag]').length===0);
  console.log("PASS Order hides all road tags and metrics");
}catch(e){console.error({failure:"FP6 leg tags",message:String(e.message).slice(0,1000)});process.exitCode=1;}
finally{
  // Leave the fixture in Order so reconnect never consumes a real road credit.
  await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning").catch(()=>{});
  await page.unroute(`**/api/trips/${fixture.slug}/roads`);await browser.close();await db.$client.end();
}
