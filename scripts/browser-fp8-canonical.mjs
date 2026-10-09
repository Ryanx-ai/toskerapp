/** Bounded canonical A/B verification; no roads/geocoding, no retained founder mutations. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {getDatabase} from "../src/server/db/client.ts";
import {readTrip} from "../src/server/trips/service.ts";
import {resolveQaActors,cleanupQaFixture} from "./lib/ms73-fixtures.ts";
import {routingPlaces} from "../src/lib/trip-contract.ts";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
const fixture=JSON.parse(readFileSync(".git/fp8-recovery/fixture.json","utf8")).fixture;
const db=getDatabase(),actors=await resolveQaActors(db);await cleanupQaFixture(db,fixture,false);
const origin="https://toskerapp.vercel.app",browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const ca=await browser.newContext({viewport:{width:1440,height:900},geolocation:{latitude:1.301234,longitude:103.801234,accuracy:12},permissions:["geolocation"]}),cb=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
const a=await ca.newPage(),b=await cb.newPage(),errors=[],tiles=[],outbound=[],checks=[];let step="login";
const button=(p,name)=>p.getByRole("button",{name,exact:true}),read=()=>readTrip(db,actors.a,fixture.slug);
const ready=async p=>{await p.locator('[data-map-state="ready"]').waitFor({timeout:60000});await p.locator('[data-trip-revision]:not([data-trip-revision=""])').waitFor();};
const changed=async(p,action)=>{const rev=await p.locator("[data-trip-revision]").getAttribute("data-trip-revision");await action();await p.waitForFunction(r=>document.querySelector("[data-trip-revision]")?.dataset.tripRevision!==r,rev,{timeout:60000});};
for(const p of [a,b]){
  p.on("pageerror",()=>errors.push("pageerror"));
  p.on("response",r=>{if(new URL(r.url()).hostname==="maps.geoapify.com")tiles.push(r.status());});
  p.on("request",r=>{if(r.url().startsWith(origin))outbound.push({path:new URL(r.url()).pathname,body:r.postData()??""});});
  await p.route("**/api/trips/*/roads",r=>r.fulfill({status:429,json:{error:"Canonical QA guard: provider roads deliberately not armed"}}));
}
try{
  for(const [p,actor] of [[a,"a"],[b,"b"]]){await p.goto(`${origin}/room/${fixture.slug}/map`);await ensureFp6QaLogin(p,actor);await p.goto(`${origin}/room/${fixture.slug}/map`);await ready(p);await button(p,"Route 1").click();}
  const route=(await read()).routes.find(r=>r.name==="Route 1"),place=routingPlaces(await read(),route.id)[1];assert.equal(place.defaultTitle,"Checkpoint 2");
  step="rename and live peer";await a.locator(`[data-place-id="${place.id}"]`).getByRole("button",{name:/^Select place/}).click();await button(a,"Rename checkpoint").click();await a.getByLabel("Checkpoint name",{exact:true}).fill("FP8 canonical checkpoint");
  await changed(b,()=>button(a,"Save name").click());await b.locator(`[data-place-id="${place.id}"]`).getByRole("button",{name:/^Select place 2: FP8 canonical checkpoint$/}).waitFor();
  await button(a,"Rename checkpoint").click();await changed(b,()=>button(a,"Revert to default").click());await b.reload();await ready(b);await b.locator(`[data-place-id="${place.id}"]`).getByRole("button",{name:/^Select place 2: Checkpoint 2$/}).waitFor();
  await changed(b,()=>button(a,"Work").click());await a.getByText("Tag saved.",{exact:true}).waitFor();await changed(b,()=>button(a,"Home").click());await a.keyboard.press("Escape");
  checks.push("Canonical normal A/B auth, rename/revert and direct tags reconcile live and after reload");
  step="private Ping";const before=await read(),requestStart=outbound.length;await button(a,"Locate me").click();await a.locator("[data-private-origin]").waitFor();await button(a,"Ping your location").focus();await a.keyboard.press("Enter");await button(a,"Heart ping · only you").click();
  await a.getByRole("img",{name:/Heart above your location/}).waitFor();assert.equal(await b.getByRole("img",{name:/above your location/}).count(),0);assert.equal(await b.locator("[data-private-origin]").count(),0);
  await a.screenshot({path:".git/fp8-recovery/canonical-map.png"});await a.getByRole("img",{name:/Heart above your location/}).waitFor({state:"detached",timeout:5500});assert.equal(await a.getByRole("img",{name:/^You, accuracy/}).count(),1);
  assert.deepEqual(await read(),before);assert(!outbound.slice(requestStart).some(r=>/1\.301234|103\.801234/.test(r.body)));assert(!outbound.some(r=>r.path.endsWith("/pings")));
  assert(!await a.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes("103.801234")));await a.reload();await ready(a);assert.equal(await a.locator("[data-private-origin]").count(),0);assert(await button(a,"Ping your location").isDisabled());
  checks.push("Locate and Heart private, no coordinate POST/storage/DB state, finite expiry retains marker, reload clears");
  step="fresh real route persistence";for(const p of [a,b]){await button(p,"FP8 Long — Singapore").click();assert.equal(await p.locator("[data-place-id]").count(),3);}
  checks.push("Fresh long Route and three real-provider choices available to A/B on canonical");
  step="canonical bundle scan";const secrets=["DATABASE_URL","CLERK_SECRET_KEY","ABLY_API_KEY","ROOM_INVITE_ENCRYPTION_KEY","GEOAPIFY_SEARCH_KEY"].map(k=>{assert(process.env[k]?.length>=12);return process.env[k];});
  const urls=await a.evaluate(()=>[...new Set(performance.getEntriesByType("resource").map(r=>r.name).filter(u=>u.startsWith(location.origin+"/_next/static/")&&/\.js(?:\?|$)/.test(u)))]);assert(urls.length>=10&&urls.length<100);
  for(const url of urls){const response=await fetch(url,{signal:AbortSignal.timeout(15000)});assert(response.ok);const text=await response.text();assert(!secrets.some(s=>[s,JSON.stringify(s).slice(1,-1),encodeURIComponent(s)].some(v=>text.includes(v))),"Server secret match; values suppressed");}
  assert(tiles.some(s=>s===200)&&!tiles.some(s=>s>=400));assert((await a.locator(".maplibregl-ctrl-attrib").textContent()).includes("OpenStreetMap"));assert.deepEqual(errors,[]);
  checks.push(`${urls.length} live client assets secret scan PASS; real basemap/attribution; zero page exceptions`);
  writeFileSync(".git/fp8-recovery/canonical.json",JSON.stringify({passed:true,checks,tileResponses:tiles.length,roadCalls:0},null,2),{mode:0o600});console.log({canonical:"PASS",checks,tileResponses:tiles.length,roadCalls:0});
}catch(e){await a.screenshot({path:".git/fp8-recovery/canonical-failure.png"}).catch(()=>{});console.error({failure:"FP8 canonical",step,kind:e.name,operation:e.message.split("\n")[0].replace(/https?:\/\/\S+/g,"[URL suppressed]")});process.exitCode=1;}
finally{await browser.close();await db.$client.end();}
