/** Built-app acceptance against the exact existing FP7 disposable Rooms. No provider traffic. */
import assert from "node:assert/strict";
import {readFileSync,existsSync,writeFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip} from "../src/server/trips/service.ts";
import {resolveQaActors,cleanupQaFixture} from "./lib/ms73-fixtures.ts";
import {routingPlaces} from "../src/lib/trip-contract.ts";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
const fixtures=JSON.parse(readFileSync(".git/fp7-recovery/fixtures.json","utf8"));
const evidencePath=".git/fp7-recovery/integrated.json",evidence=existsSync(evidencePath)?JSON.parse(readFileSync(evidencePath,"utf8")):{checks:[]};
assert(!evidence.complete,"Completed acceptance receipt: do not replay writes or recreate deleted copies");
const save=()=>writeFileSync(evidencePath,JSON.stringify(evidence,null,2),{mode:0o600});
const db=getDatabase(),actors=await resolveQaActors(db),origin=process.env.FP7_ORIGIN??"http://localhost:3000";
for(const f of [fixtures.source,fixtures.destination])await cleanupQaFixture(db,f,false);
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const ca=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"}),cb=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
const a=await ca.newPage(),b=await cb.newPage();
const button=(p,n)=>p.getByRole("button",{name:n,exact:true}),read=(f=fixtures.source)=>readTrip(db,actors.a,f.slug);
const open=async(p,f=fixtures.source)=>{await p.goto(`${origin}/room/${f.slug}/map`);await p.locator('[data-map-state="ready"]').waitFor({timeout:60000});};
const revision=p=>p.locator("[data-trip-revision]").getAttribute("data-trip-revision");
const changed=(p,v)=>p.waitForFunction(v=>document.querySelector("[data-trip-revision]")?.dataset.tripRevision!==v,v);
const menu=async(p,n)=>{await p.keyboard.press("Escape");await button(p,`Place actions for ${n}`).click();};
for(const [context,page,actor] of [[ca,a,actors.a],[cb,b,actors.b]]){
  await context.route("https://maps.geoapify.com/**",r=>r.fulfill({json:{version:8,sources:{},layers:[{id:"qa",type:"background",paint:{"background-color":"#142025"}}]}}));
  await context.route("**/api/trips/*/roads",async r=>{
    const scope=decodeURIComponent(new URL(r.request().url()).pathname.split("/")[3]);assert([fixtures.source.slug,fixtures.destination.slug].includes(scope));
    const body=r.request().postDataJSON();assert(!body.origin);const points=routingPlaces(await readTrip(db,actor,scope),body.routeId),legs=points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000,seconds:600}));
    await r.fulfill({json:{geometry:{key:JSON.stringify([body.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]),mode:body.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"Deterministic QA",estimate:{metres:legs.length*1000,seconds:legs.length*600,guidance:[],legs}}}});
  });
  await page.goto(`${origin}/room/${fixtures.source.slug}/map`);await ensureFp6QaLogin(page,actor===actors.a?"a":"b");await open(page);await button(page,"Route 1").click();
}
try{
  const marker=a.locator(".maplibregl-map").getByRole("button",{name:/^Select .*1: Marina Bay Sands$/});
  await a.setViewportSize({width:320,height:740});const large=await a.addStyleTag({content:"button,input,select,p,span,strong,small,label,h2,summary {font-size:20px!important}"});await marker.focus();await a.keyboard.press("Enter");
  for(const tag of ["Home","Work","Favourite","Star"]){const control=button(a,tag);await control.scrollIntoViewIfNeeded();assert(await control.locator("span").evaluate(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right;}),`enlarged label ${tag}`);}
  await a.screenshot({path:".git/fp7-recovery/enlarged-fixed-320.png"});await a.keyboard.press("Escape");await large.evaluate(e=>e.remove());await a.setViewportSize({width:1440,height:900});evidence.checks.push("enlarged tags wrap; text stays inside buttons");save();
  if(!evidence.comment){
    await menu(a,"Marina Bay Sands");await button(a,"Info").click();await a.getByRole("dialog").getByText("1.28370, 103.86070",{exact:true}).waitFor();await button(a,"Close place details").click();
    await button(a,"Comments on Marina Bay Sands, 0").click();await a.getByLabel("Add a comment",{exact:true}).fill("FP7 owned regression comment");await button(a,"Post location comment").click();await a.getByText("FP7 owned regression comment",{exact:true}).waitFor();await button(a,"Close comments").click();evidence.comment=true;save();
  }
  await b.reload();await button(b,"Comments on Marina Bay Sands, 1").click();await b.getByText("FP7 owned regression comment",{exact:true}).waitFor();await button(b,"Close comments").click();
  if(!evidence.shared){
    const prior=await read(fixtures.destination);assert(!prior.routes.some(r=>r.name==="Route 1"),"Unreceipted copy exists; reconcile instead of duplicating");
    await button(a,"Share route").click();await a.getByLabel("Destination",{exact:true}).selectOption(fixtures.destination.slug);await button(a,"Create route copy").click();await a.getByRole("link",{name:"Open copied route",exact:true}).waitFor({timeout:60000});
    const after=await read(fixtures.destination),added=after.routes.filter(r=>!prior.routes.some(old=>old.id===r.id));assert.equal(added.length,1);evidence.shared=added[0].id;save();await a.getByRole("link",{name:"Open copied route",exact:true}).click();
  }else await open(a,fixtures.destination);
  await button(a,"Route 1").click();let destination=await read(fixtures.destination);let copied=routingPlaces(destination,evidence.shared);assert.equal(copied.length,3);assert(copied.every(p=>p.commentCount===0));
  await a.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("drive");await a.getByLabel("Route summary",{exact:true}).getByText(/2\.0 km/).waitFor({timeout:60000});await a.getByRole("combobox",{name:"Travel mode",exact:true}).selectOption("planning");
  const sourceBefore=await read();await menu(a,"Marina Bay Sands");await button(a,"Nuke").click();await button(a,"Cancel").click();assert.equal((await read(fixtures.destination)).places.length,destination.places.length);
  await menu(a,"Marina Bay Sands");await button(a,"Nuke").click();let v=await revision(a);await button(a,"Nuke place").click();await changed(a,v);assert.deepEqual(await read(),sourceBefore);assert.equal(routingPlaces(await read(fixtures.destination),evidence.shared).length,2);
  await button(a,"Route actions for Route 1").click();await button(a,"Nuke route").click();await a.getByRole("dialog").getByRole("button",{name:"Nuke route",exact:true}).click();await a.getByRole("dialog").waitFor({state:"hidden"});assert.deepEqual(await read(),sourceBefore);assert(!(await read(fixtures.destination)).routes.some(r=>r.id===evidence.shared));evidence.nuked=true;evidence.checks.push("comments peer/reload, independent three-card Share and fresh Drive key, card/Route Nuke source unaffected");save();
  await open(a);await open(b);await button(a,"Route 1").click();await button(b,"Route 1").click();
  await ca.grantPermissions(["geolocation"],{origin});await ca.setGeolocation({latitude:1.29,longitude:103.85,accuracy:10});const snapshot=await read();await button(a,"Locate me").click();await a.getByRole("combobox",{name:"Ping Map",exact:true}).selectOption("attention");await button(a,"Ping map centre").click();const ping=b.getByRole("img",{name:/Attention ping\. Selected point, not live location/});await ping.waitFor({timeout:20000});await ping.waitFor({state:"detached",timeout:12000});assert.deepEqual(await read(),snapshot);await button(a,"Clear my location").click();evidence.checks.push("real A/B ephemeral Ping and expiry without trip mutation");save();
  if(!evidence.chat){await a.locator(".composer textarea").fill("FP7 owned Chat regression");await button(a,"Send message").click();await b.getByText("FP7 owned Chat regression",{exact:true}).waitFor({timeout:45000});evidence.chat=true;save();}
  await b.reload();await b.getByText("FP7 owned Chat regression",{exact:true}).waitFor({timeout:45000});
  for(const p of [a,b])await p.goto(`${origin}/room/${fixtures.source.slug}/hall`);
  if(!evidence.board){await button(a,"New Note").click();await a.getByLabel("Title",{exact:true}).fill("FP7 owned Board regression");await a.getByLabel("Note",{exact:true}).fill("Disposable regression content; no founder data.");await button(a,"Add note").click();await b.getByText("FP7 owned Board regression",{exact:true}).waitFor({timeout:45000});evidence.board=true;save();}
  await b.reload();await b.getByText("FP7 owned Board regression",{exact:true}).waitFor();evidence.checks.push("Map Chat companion real A/B send/reload; Board note A/B/reload");
  evidence.complete=true;save();console.log({integrated:"PASS",checks:evidence.checks,providerCalls:0});
}catch(e){save();await a.screenshot({path:".git/fp7-recovery/integrated-failure.png"});console.error({failure:"FP7 integrated",message:String(e.message).slice(0,750)});process.exitCode=1;}
finally{await browser.close();await db.$client.end();}
