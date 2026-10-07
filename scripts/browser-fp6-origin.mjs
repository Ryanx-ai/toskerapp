import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip} from "../src/server/trips/service.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
import {routingPlaces} from "../src/lib/trip-contract.ts";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!fixture.retained);
const db=getDatabase(),{a:actor}=await resolveQaActors(db),plan=await readTrip(db,actor,fixture.slug);
const ba=await chromium.connectOverCDP(process.env.FP6_CDP),bb=await chromium.connectOverCDP(process.env.FP6_B_CDP);
const ca=ba.contexts()[0],a=ca.pages()[0],b=bb.contexts()[0].pages()[0],origin="http://localhost:3000",calls=[];
const button=(name)=>a.getByRole("button",{name,exact:true});
await a.route(`**/api/trips/${fixture.slug}/roads`,async route=>{
  const body=route.request().postDataJSON();calls.push(body);
  let points=routingPlaces(plan,body.routeId);if(body.origin)points=[{id:"private-origin",...body.origin},points[0]];
  const key=JSON.stringify([body.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]),legs=points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000,seconds:600}));
  await route.fulfill({json:{geometry:{key,mode:body.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"Controlled QA",estimate:{metres:1000*legs.length,seconds:600*legs.length,guidance:[],legs}}}});
});
try{
  await a.goto(`${origin}/room/${fixture.slug}`);await a.locator('[data-map-state="ready"]').waitFor();
  await ca.grantPermissions(["geolocation"],{origin});await ca.setGeolocation({latitude:1.34,longitude:103.79,accuracy:10});
  await button("Locate me").click();await a.getByLabel("Your private origin",{exact:true}).waitFor();
  assert.equal(calls.length,0,"Locate alone makes no road request");
  await a.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("drive");await a.getByLabel("Route summary",{exact:true}).getByText(/3\.0 km/).waitFor();
  assert.equal(calls.filter(c=>c.origin).length,0);
  await button("Route from here").click();await a.getByRole("dialog").getByText(/precise current coordinates/).waitFor();await button("Keep location local").click();assert.equal(calls.filter(c=>c.origin).length,0);
  await button("Route from here").click();await button("Allow private route").click();
  await a.getByLabel("Your private origin",{exact:true}).getByText("YOUR LEG · 1.0 km · ~10 min",{exact:true}).waitFor({timeout:30000});
  assert.equal(calls.filter(c=>c.origin).length,1);assert.equal(calls.find(c=>c.origin).origin.latitude,1.34);
  assert.equal(await b.getByLabel("Your private origin",{exact:true}).count(),0);assert(!(await b.locator('body').textContent()).includes("YOUR LEG"));
  const persisted=await a.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith("tosker:trip-view:")).some(k=>/1\.34|103\.79/.test(sessionStorage.getItem(k))));assert.equal(persisted,false);
  await a.waitForTimeout(22000);assert.equal(calls.filter(c=>c.origin).length,1,"No background origin request loop");
  console.log("PASS Locate/decline send no origin; explicit consent produces one separate YOUR LEG; no peer UI or session preference coordinate; no polling (controlled provider)");
  await button("Clear my location").click();assert.equal(await a.getByLabel("Your private origin",{exact:true}).count(),0);
  assert(!(await a.locator('body').textContent()).includes("YOUR LEG"));
  await a.reload();await a.locator('[data-map-state="ready"]').waitFor();assert.equal(await a.getByLabel("Your private origin",{exact:true}).count(),0);console.log("PASS OFF/reload clears origin and consent");
  for(const [width,height] of [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117],[844,390]]){
    await a.setViewportSize({width,height});await a.waitForTimeout(300);
    const overflow=await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`document horizontal overflow ${width}`);
    await a.screenshot({path:`.git/fp6-recovery/map-${width}.png`});
    await button("Select destination "+(routingPlaces(plan,plan.routes[0].id).findIndex(p=>p.title==="QA Marina Bay Sands")+1)+": QA Marina Bay Sands").click();
    const panel=a.locator("[data-map-inspector]");await panel.waitFor();
    const box=await panel.boundingBox();assert(box&&box.x>=0&&box.x+box.width<=width+1,`inspector horizontal bounds ${width}`);
    await a.screenshot({path:`.git/fp6-recovery/inspector-${width}.png`});await a.keyboard.press("Escape");
    console.log(`PASS responsive ${width}×${height}: page and inspector horizontal bounds; screenshots saved for visual review`);
  }
  await a.setViewportSize({width:1440,height:900});await a.getByRole("link",{name:"Settings",exact:true}).click();
  await button("Version info / About").click();await a.getByRole("heading",{name:"Version info / About",exact:true}).waitFor();
  assert(await a.getByRole("link",{name:"MapLibre GL JS 6.11.2",exact:true}).count());await a.screenshot({path:".git/fp6-recovery/about.png"});console.log("PASS Settings About provider/license links present");
}catch(e){console.error({failure:"FP6 origin/visual",message:String(e.message).slice(0,650)});process.exitCode=1;}
finally{await a.unroute(`**/api/trips/${fixture.slug}/roads`);await ba.close();await bb.close();await db.$client.end();}
