/** FP7 lifecycle and routing regression. Owned fixtures, real auth/writes, zero provider traffic. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip} from "../src/server/trips/service.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
import {routingPlaces} from "../src/lib/trip-contract.ts";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
const receipt=JSON.parse(readFileSync(".git/fp7-recovery/fixtures.json","utf8"));
assert(/^ms73-qa-[a-f0-9]{8}$/.test(receipt.source.slug)&&!receipt.source.retained);
const db=getDatabase(),actors=await resolveQaActors(db),origin=process.env.FP7_ORIGIN??"http://localhost:3000";
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const ca=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"}),cb=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
const a=await ca.newPage(),b=await cb.newPage(),calls=[];
a.setDefaultTimeout(90000);
let failPrivate=false;
const button=(p,n)=>p.getByRole("button",{name:n,exact:true}),originCard=()=>a.locator("[data-private-origin]");
const revision=p=>p.locator("[data-trip-revision]").getAttribute("data-trip-revision");
const changed=(p,v)=>p.waitForFunction(v=>document.querySelector("[data-trip-revision]")?.dataset.tripRevision!==v,v);
const menu=async(p,n)=>{await p.keyboard.press("Escape");await button(p,`Place actions for ${n}`).click();};
const mode=m=>a.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption(m);
const deliver=()=>a.evaluate(()=>window.__qaGeo.ok({coords:{latitude:1.29,longitude:103.85,accuracy:10}}));
for(const [context,page,actor] of [[ca,a,actors.a],[cb,b,actors.b]]){
  await context.addInitScript(()=>{window.__qaGeo={};Object.defineProperty(navigator,"geolocation",{configurable:true,value:{getCurrentPosition(ok,fail){window.__qaGeo={ok,fail};}}});});
  await context.route("https://maps.geoapify.com/**",r=>r.fulfill({json:{version:8,sources:{},layers:[{id:"qa",type:"background",paint:{"background-color":"#142025"}}]}}));
  await context.route("**/api/trips/*/roads",async r=>{
    const scope=decodeURIComponent(new URL(r.request().url()).pathname.split("/")[3]);assert([receipt.source.slug,receipt.destination.slug].includes(scope));
    const body=r.request().postDataJSON(),plan=await readTrip(db,actor,scope);let points=routingPlaces(plan,body.routeId);
    if(body.origin)points=[{id:"private-origin",...body.origin},points[0]];
    calls.push({scope,body});
    if(body.origin&&failPrivate)return r.fulfill({status:503,json:{error:"Controlled provider unavailable"}});
    const legs=points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000,seconds:600}));
    await r.fulfill({json:{geometry:{key:JSON.stringify([body.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]),mode:body.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"Deterministic QA",estimate:{metres:legs.length*1000,seconds:legs.length*600,guidance:[],legs}}}});
  });
  await page.goto(`${origin}/room/${receipt.source.slug}/map`);await ensureFp6QaLogin(page,actor===actors.a?"a":"b");await page.locator('[data-map-state="ready"]').waitFor({timeout:60000});await button(page,"Route 1").click();
}
try{
  // Resume only this owned fixture after a stopped assertion; never reset retained data.
  if((await readTrip(db,actors.a,receipt.source.slug)).places.find(p=>p.title==="Marina Bay Sands")?.skipped){await menu(a,"Marina Bay Sands");const v=await revision(a);await button(a,"Include in route").click();await changed(a,v);await a.keyboard.press("Escape");}
  await button(a,"Locate me").click();await button(a,"Locate me").click();await deliver();assert.equal(await originCard().count(),0);
  await button(a,"Locate me").click();await a.evaluate(()=>window.__qaGeo.fail({code:1}));await a.getByText(/Location permission denied/).waitFor();assert.equal(calls.length,0);
  await button(a,"Locate me").click();await deliver();await originCard().waitFor();await mode("drive");await a.getByLabel("Route summary",{exact:true}).getByText(/2\.0 km/).waitFor({timeout:90000});
  const rev=await revision(a),count=calls.length;
  await button(a,"Hide Marina Bay Sands from my map").click();assert.equal(await revision(a),rev);assert.equal(calls.length,count);assert.equal(await button(b,"Hide Marina Bay Sands from my map").count(),1);await button(a,"Show Marina Bay Sands on my map").click();
  await button(a,"Route from here").click();await button(a,"Allow private route").click();await originCard().getByText(/YOUR LEG/).waitFor({timeout:35000});
  await mode("planning");assert.equal(await originCard().getByText(/YOUR LEG/).count(),0);await mode("drive");await a.getByLabel("Route summary",{exact:true}).getByText(/2\.0 km/).waitFor({timeout:90000});
  await menu(a,"Marina Bay Sands");let before=await revision(a),peerBefore=await revision(b);await button(a,"Skip in route").click();await changed(a,before);await changed(b,peerBefore);await a.keyboard.press("Escape");
  await a.getByLabel("Route summary",{exact:true}).locator("summary").getByText(/1\.0 km/).waitFor({timeout:90000});assert.equal(await originCard().getByText(/YOUR LEG/).count(),0);assert(await button(a,"Route from here").isEnabled());
  await menu(a,"Marina Bay Sands");before=await revision(a);await button(a,"Include in route").click();await changed(a,before);await a.keyboard.press("Escape");await a.getByLabel("Route summary",{exact:true}).getByText(/2\.0 km/).waitFor({timeout:90000});
  console.log("PASS denied/late geolocation, private Hide leaves routing/revision/peer unchanged; shared Skip realtime and geometry; mode/#1 invalidates private leg");
  failPrivate=true;await button(a,"Route from here").click();await button(a,"Allow private route").click();await originCard().getByText("Controlled provider unavailable").waitFor({timeout:35000});assert.equal(await originCard().getByText(/YOUR LEG/).count(),0);await button(a,"Clear my location").click();failPrivate=false;await mode("planning");
  await menu(a,"Meeting checkpoint");await button(a,"Move pin").click();await a.getByLabel("Latitude",{exact:true}).fill("1.2861");before=await revision(a);peerBefore=await revision(b);await button(a,"Save position").click();await changed(a,before);await changed(b,peerBefore);assert.equal((await readTrip(db,actors.b,receipt.source.slug)).places.find(p=>p.title==="Meeting checkpoint").latitude,1.2861);
  await menu(a,"Meeting checkpoint");before=await revision(a);await button(a,"Later").click();await changed(a,before);await a.keyboard.press("Escape");await menu(a,"Meeting checkpoint");before=await revision(a);await button(a,"Earlier").click();await changed(a,before);await a.keyboard.press("Escape");
  await mode("walk");await a.getByLabel("Route summary",{exact:true}).getByText(/2\.0 km/).waitFor({timeout:90000});await mode("planning");
  console.log("PASS provider failure clears private metrics; manual move/reorder persist with peer reconciliation; Walk recalculates");
  const marker=a.locator(".maplibregl-map").getByRole("button",{name:/^Select .*1: Marina Bay Sands$/});await marker.focus();await a.keyboard.press("Enter");await a.keyboard.press("Escape");assert(await marker.evaluate(e=>e===document.activeElement));
  const height=await a.locator(".maplibregl-map").evaluate(e=>e.clientHeight);await button(a,"Collapse locations").click();assert(await a.locator(".maplibregl-map").evaluate(e=>e.clientHeight)>height);await button(a,"Expand locations").click();
  await a.setViewportSize({width:320,height:740});await marker.focus();await a.keyboard.press("Enter");await a.locator("[data-map-inspector] summary").click();await a.getByText("1.28370, 103.86070",{exact:true}).waitFor();await a.screenshot({path:".git/fp7-recovery/info-320.png"});await a.keyboard.press("Escape");
  const large=await a.addStyleTag({content:"button,input,select,p,span,strong,small,label,h2,summary {font-size:20px!important}"});await marker.focus();await a.keyboard.press("Enter");await a.locator("[data-map-inspector] summary").click();assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await a.screenshot({path:".git/fp7-recovery/enlarged-320.png"});await a.keyboard.press("Escape");await large.evaluate(e=>e.remove());await a.setViewportSize({width:1440,height:900});
  console.log("PASS keyboard focus restoration, collapse preserves cards, narrow Info scroll reachability, enlarged text without document overflow");
  await a.clock.install();await button(a,"Locate me").click();await deliver();await originCard().waitFor();await a.clock.fastForward(300001);await a.getByText("Your location expired. Use Locate for a fresh reading.",{exact:true}).waitFor();assert.equal(await originCard().count(),0);await a.clock.resume();
  await button(a,"Locate me").click();await deliver();await originCard().waitFor();
  await a.route("**/api/trips/*/places",r=>r.fulfill({status:403,json:{error:"Controlled access loss"}}));await a.getByRole("textbox",{name:"Search places",exact:true}).fill("denied");await originCard().waitFor({state:"detached"});assert.equal(await a.locator("[data-place-id]").count(),0);
  console.log("PASS five-minute stale reading expires; access loss clears origin and shared plan; no provider traffic");
}catch(e){await a.screenshot({path:".git/fp7-recovery/lifecycle-failure.png"});console.error({failure:"FP7 lifecycle",message:String(e.message).slice(0,700)});process.exitCode=1;}
finally{await browser.close();await db.$client.end();}
