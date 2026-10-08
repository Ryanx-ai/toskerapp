/** Real authenticated UI/DB/realtime with deterministic provider responses. Exact-owned receipt only. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip} from "../src/server/trips/service.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
import {routingPlaces} from "../src/lib/trip-contract.ts";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
const receipt=JSON.parse(readFileSync(".git/fp7-recovery/fixtures.json","utf8"));
for(const f of [receipt.source,receipt.destination])assert(/^ms73-qa-[a-f0-9]{8}$/.test(f.slug)&&!f.retained);
const db=getDatabase(),actors=await resolveQaActors(db),origin=process.env.FP7_ORIGIN??"http://localhost:3000";
assert.equal((await readTrip(db,actors.a,receipt.destination.slug)).routes.length,0,"Destination already used: reconcile completed copy evidence; do not blindly replay this one-shot suite");
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const ca=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"}),cb=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
const a=await ca.newPage(),b=await cb.newPage(),calls=[],errors=[];
const button=(page,name)=>page.getByRole("button",{name,exact:true});
const mbs=page=>page.locator(".maplibregl-map").getByRole("button",{name:/^Select .*1: Marina Bay Sands$/});
const revision=page=>page.locator("[data-trip-revision]").getAttribute("data-trip-revision");
const changed=async(page,before)=>{await page.waitForFunction(v=>document.querySelector("[data-trip-revision]")?.dataset.tripRevision!==v,before);await page.getByLabel("Search places",{exact:true}).isEnabled();};
const open=async(page,slug)=>{await page.goto(`${origin}/room/${slug}/map`);await page.locator('[data-map-state="ready"]').waitFor({timeout:60000});await page.locator('[data-trip-revision]:not([data-trip-revision=""])').waitFor();};
const menu=async(page,name)=>{await page.keyboard.press("Escape");await button(page,`Place actions for ${name}`).click();};
for(const [context,page,actor] of [[ca,a,actors.a],[cb,b,actors.b]]){
  page.on("pageerror",()=>errors.push("pageerror"));
  // No real tile traffic in repeated responsive checks. Real basemap remains a release smoke gate.
  await context.route("https://maps.geoapify.com/**",route=>route.fulfill({json:{version:8,sources:{},layers:[{id:"qa-background",type:"background",paint:{"background-color":"#142025"}}]}}));
  await context.route("**/api/trips/*/roads",async route=>{
    const slug=decodeURIComponent(new URL(route.request().url()).pathname.split("/")[3]);assert([receipt.source.slug,receipt.destination.slug].includes(slug));
    const body=route.request().postDataJSON(),plan=await readTrip(db,actor,slug);
    let points=routingPlaces(plan,body.routeId);if(body.origin)points=[{id:"private-origin",...body.origin},points[0]];
    const key=JSON.stringify([body.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]);calls.push({actor:actor.userId,key,private:!!body.origin});
    const legs=points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000,seconds:600}));
    await route.fulfill({json:{geometry:{key,mode:body.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"Deterministic QA",estimate:{metres:1000*legs.length,seconds:600*legs.length,guidance:[],legs}}}});
  });
}
try{
  await a.goto(`${origin}/room/${receipt.source.slug}/map`);await ensureFp6QaLogin(a,"a");await open(a,receipt.source.slug);
  await b.goto(`${origin}/room/${receipt.source.slug}/map`);await ensureFp6QaLogin(b,"b");await open(b,receipt.source.slug);
  await ca.grantPermissions(["geolocation"],{origin});await ca.setGeolocation({latitude:1.29,longitude:103.85,accuracy:10});
  await button(a,"Locate me").click();await a.locator("[data-private-origin]").waitFor();
  assert.equal(await b.locator("[data-private-origin]").count(),0);assert.equal(calls.length,0);
  assert.equal(await a.getByRole("list",{name:"Route locations",exact:true}).locator('[role="listitem"]').first().getAttribute("data-private-origin"),"true");
  assert.equal(await a.locator("[data-private-origin]").getAttribute("draggable"),null);
  await a.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("drive");await a.getByLabel("Route summary",{exact:true}).getByText(/2\.0 km/).waitFor({timeout:30000});
  assert.equal(calls.filter(c=>c.private).length,0);
  await button(a,"Route from here").click();await button(a,"Keep location local").click();assert.equal(calls.filter(c=>c.private).length,0);
  await button(a,"Route from here").click();await button(a,"Allow private route").click();await a.locator("[data-private-origin]").getByText(/YOUR LEG · 1.0 km/).waitFor({timeout:35000});
  assert.equal(calls.filter(c=>c.private).length,1);assert.equal(await b.locator("[data-private-origin]").count(),0);
  assert.equal(await a.evaluate(()=>Object.keys(sessionStorage).some(k=>/tosker:trip-view/.test(k)&&/103\.85|1\.29/.test(sessionStorage.getItem(k)))),false);
  await button(a,"Clear my location").click();assert.equal(await a.locator("[data-private-origin]").count(),0);
  await a.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning");
  console.log("PASS temporary origin before #1, consent/decline/private road, no peer origin or persisted coordinates, OFF");
  await mbs(a).focus();await a.keyboard.press("Enter");
  assert.equal(await button(a,"Location Card").count(),0);
  for(const label of ["Home","Work","Favourite","Star"]){if(await button(a,label).getAttribute("aria-pressed")!=="true"){const before=await revision(a);await button(a,label).click();await changed(a,before);}assert.equal(await button(a,label).getAttribute("aria-pressed"),"true");}
  await b.reload();await b.locator('[data-map-state="ready"]').waitFor();await mbs(b).click();
  assert.equal(await button(b,"Favourite").getAttribute("aria-pressed"),"true");assert.equal(await button(b,"Star").getAttribute("aria-pressed"),"true");
  await a.keyboard.press("Escape");await menu(a,"Marina Bay Sands");assert.equal(await a.getByLabel("Place icon",{exact:true}).count(),0);assert.equal(await button(a,"Move pin").count(),0);await a.keyboard.press("Escape");
  await a.getByRole("button",{name:/^Select checkpoint 2: (Checkpoint 1|Meeting checkpoint)$/}).click();await button(a,"Rename checkpoint").click();await a.getByLabel("Checkpoint name",{exact:true}).fill("Meeting checkpoint");let before=await revision(a);await button(a,"Save name").click();await changed(a,before);await a.keyboard.press("Escape");
  console.log("PASS direct tags, peer persisted tags, canonical name, manual rename, no inspector dead CTA/category duplicate");
  let dropCopy=true;
  await a.route("**/*",async route=>{
    if(dropCopy&&route.request().method()==="POST"&&route.request().postData()?.includes('"copy-place"')){dropCopy=false;await route.fetch();await route.abort("failed");}else await route.fallback();
  });
  await menu(a,"Marina Bay Sands");await button(a,"Copy to route").click();await a.getByLabel("Destination route",{exact:true}).selectOption(receipt.secondRouteId);await a.getByRole("dialog").getByRole("button",{name:"Copy to route",exact:true}).click();
  await button(a,"Retry same copy").waitFor({timeout:30000});await button(a,"Retry same copy").click();await a.getByRole("dialog").waitFor({state:"hidden"});
  let plan=await readTrip(db,actors.a,receipt.source.slug),copied=routingPlaces(plan,receipt.secondRouteId);assert.equal(copied.length,1);assert.equal(copied[0].title,"Marina Bay Sands");
  assert.equal(await a.locator(`[data-place-id="${copied[0].id}"] button`).first().getAttribute("aria-pressed"),"true");
  await button(a,"Route 1").click();await menu(a,"Marina Bay Sands");await button(a,"Copy to route").click();await a.getByLabel("Destination route",{exact:true}).selectOption(receipt.secondRouteId);await a.getByRole("dialog").getByRole("button",{name:"Copy to route",exact:true}).click();await a.getByRole("dialog").waitFor({state:"hidden"});
  assert.equal(routingPlaces(await readTrip(db,actors.a,receipt.source.slug),receipt.secondRouteId).length,1);
  console.log("PASS real copy write/lost ACK/exact retry/duplicate selection; one independent destination card");
  let dropShare=true;
  await a.route("**/*",async route=>{if(dropShare&&route.request().method()==="POST"&&route.request().postData()?.includes('"copy-route"')){dropShare=false;await route.fetch();await route.abort("failed");}else await route.fallback();});
  await button(a,"Share route").click();await a.getByLabel("Destination",{exact:true}).selectOption(receipt.destination.slug);await button(a,"Create route copy").click();await button(a,"Retry same copy").waitFor({timeout:30000});await button(a,"Retry same copy").click();await a.getByRole("link",{name:"Open copied route",exact:true}).waitFor({timeout:30000});
  const dest=await readTrip(db,actors.b,receipt.destination.slug);assert.equal(dest.routes.length,1);assert.equal(dest.places.length,1);assert.notEqual(dest.places[0].id,copied[0].id);
  await a.getByRole("link",{name:"Open copied route",exact:true}).click();await a.locator(`[data-place-id="${dest.places[0].id}"]`).waitFor();await open(b,receipt.destination.slug);await b.locator(`[data-place-id="${dest.places[0].id}"]`).waitFor();
  console.log("PASS Share real write/lost ACK/exact retry/Open copied route/peer destination, independent IDs");
  await open(a,receipt.source.slug);await button(a,"Route 1").click();await button(a,"Locate me").click();
  for(const [width,height] of [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117],[844,390]]){
    await a.setViewportSize({width,height});await button(a,"Fit trip").click();await a.waitForTimeout(300);
    assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`overflow ${width}`);
    await a.screenshot({path:`.git/fp7-recovery/map-${width}.png`});
    const marker=mbs(a);await marker.focus();await a.keyboard.press("Enter");
    const panel=a.locator("[data-map-inspector]");await panel.waitFor();const box=await panel.boundingBox();assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,`inspector bounds ${width}`);
    for(const tag of ["Home","Work","Favourite","Star"]){const r=await button(a,tag).boundingBox();assert(r&&r.width>=44&&r.height>=44,`tag target ${tag} ${width}`);}
    await a.screenshot({path:`.git/fp7-recovery/inspector-${width}.png`});await a.keyboard.press("Escape");
    if(width<=768){await button(a,"Places (3)").click();await a.locator("[data-private-origin]").waitFor();await a.screenshot({path:`.git/fp7-recovery/tray-${width}.png`});await button(a,"Map").click();}
    console.log(`PASS responsive ${width}×${height} bounds, 44px direct tags, reduced motion; screenshots awaiting visual review`);
  }
  await a.setViewportSize({width:1440,height:900});await a.reload();await a.locator('[data-map-state="ready"]').waitFor();assert.equal(await a.locator("[data-private-origin]").count(),0);
  assert.equal(await button(a,"Saved places").count(),0);assert.equal(errors.length,0);
  console.log("PASS reload clears origin, no primary Saved Places, no browser page errors");
}catch(e){await a.screenshot({path:".git/fp7-recovery/failure.png"}).catch(()=>{});console.error({failure:"FP7 browser",message:String(e.message).slice(0,650)});process.exitCode=1;}
finally{await browser.close();await db.$client.end();}
