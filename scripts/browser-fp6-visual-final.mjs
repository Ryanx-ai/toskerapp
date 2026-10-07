/** Full FP6 UI stress with controlled road/search responses; no saved candidates or provider routing. */
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
const button=n=>page.getByRole("button",{name:n,exact:true}),title="QA Long Place Name — Riverside Cultural Centre and Observation Terrace with Accessible Entrance";
let roads=0,images=0;page.on("request",r=>{if(r.resourceType()==="image")images++;});
await page.route("**/api/trips/*/roads",async r=>{roads++;const body=r.request().postDataJSON(),points=routingPlaces(plan,body.routeId),legs=points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000,seconds:600}));await r.fulfill({json:{geometry:{key:JSON.stringify([body.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]),mode:body.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"Controlled QA",estimate:{metres:legs.length*1000,seconds:legs.length*600,guidance:[],legs}}}});});
await page.route("**/api/trips/*/places",r=>r.fulfill({json:{candidates:[{token:"QA-preview-only-never-confirm",candidate:{title,source:"search",provider:"qa",providerId:"qa-long",latitude:1.2837,longitude:103.8607,address:"QA long address — Bayfront Avenue, Singapore · No external imagery licensed or requested",attribution:"QA",license:"QA"}}]}}));
const widths=[[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117],[844,390]];
try{
  await page.goto(`http://localhost:3000/room/${fixture.slug}`,{waitUntil:"domcontentloaded",timeout:60000});await ensureFp6QaLogin(page);await page.locator('[data-place-id]').first().waitFor();
  await context.grantPermissions(["geolocation"],{origin:"http://localhost:3000"});await context.setGeolocation({latitude:1.34,longitude:103.79,accuracy:10});
  await button("Locate me").click();await page.getByLabel("Your private origin",{exact:true}).waitFor();await page.emulateMedia({reducedMotion:"reduce"});
  await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("drive");await page.getByLabel("Route summary",{exact:true}).getByText(/3\.0 km/).waitFor({timeout:20000});
  for(const[width,height]of widths){
    await page.setViewportSize({width,height});await button("Fit trip").click();await page.getByRole("combobox",{name:"Ping Map",exact:true}).selectOption("question");
    await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`page overflow ${width}`);
    const controls=await page.locator('[aria-label="Trip Map"] :is(button,select,input)').evaluateAll(es=>es.filter(e=>e.checkVisibility()).map(e=>({name:e.getAttribute('aria-label')||e.textContent,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));assert(controls.every(e=>e.w>=24&&e.h>=24),`visible target <24px at ${width}`);
    await page.screenshot({path:`.git/fp6-recovery/final-map-${width}.png`});
    await page.getByRole("combobox",{name:"Ping Map",exact:true}).selectOption("");
    await page.getByRole("textbox",{name:"Search places",exact:true}).fill("long");await page.getByRole("button",{name:new RegExp(title)}).click();await page.locator('[data-map-inspector]').waitFor();
    const panel=page.locator('[data-map-inspector]'),box=await panel.boundingBox();assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1);
    assert.equal(await panel.locator('img').count(),0);assert.equal(await panel.getByRole("heading").textContent(),title);
    const add=panel.getByRole("button",{name:"Add to Route",exact:true});await add.focus();
    await page.waitForFunction(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;});
    await page.screenshot({path:`.git/fp6-recovery/final-preview-${width}.png`});await page.keyboard.press("Escape");await page.getByRole("textbox",{name:"Search places",exact:true}).fill("");
    if(width<=768){const places=page.getByRole("button",{name:/^Places \(4\)$/});if(await places.isVisible()){await places.click();assert.equal(await page.locator('[data-place-id]').first().isVisible(),true);await page.screenshot({path:`.git/fp6-recovery/final-cards-${width}.png`});await page.getByRole("button",{name:"Map",exact:true}).click();}}
    console.log(`PASS ${width}×${height} origin/ping/Drive/summary/long-preview/cards bounds; no external preview imagery`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{const values=[...document.querySelectorAll('[aria-label="Trip Map"] :is(p,span,small,strong,button,input,select,h2,summary)')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);values.forEach(([e,size])=>e.style.fontSize=`${size*2}px`);});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,"200% text stress page overflow");await page.screenshot({path:".git/fp6-recovery/final-text-200.png"});
  assert.equal(roads,1,"Resize/selection/Locate/ping arming must not recalculate unchanged shared route");console.log({performance:"PASS",unchangedRoadRequests:roads,imageRequests:images,previewImages:0,textStress:"200% computed type sizes; not a WCAG certification"});
  await page.goto(`http://localhost:3000/room/${fixture.slug}?surface=chat`,{waitUntil:"domcontentloaded",timeout:60000});await page.locator('textarea[placeholder="Message…"]').waitFor();assert.equal(await page.locator('.maplibregl-map').count(),0);console.log("PASS Map unmounted on Chat-only surface");
}catch(e){await page.screenshot({path:".git/fp6-recovery/visual-final-failure.png"});console.error({failure:"FP6 extended visual",message:String(e.message).slice(0,1000)});process.exitCode=1;}
finally{if(await page.getByRole("combobox",{name:"Travel mode",exact:true}).count())await page.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning").catch(()=>{});await page.unrouteAll({behavior:"wait"});await browser.close();await db.$client.end();}
