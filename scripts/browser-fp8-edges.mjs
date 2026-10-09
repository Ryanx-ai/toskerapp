/** Authenticated FP8 edge gates. Only the exact-owned disposable Room is writable. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { getDatabase } from "../src/server/db/client.ts";
import { readTrip } from "../src/server/trips/service.ts";
import { resolveQaActors, cleanupQaFixture } from "./lib/ms73-fixtures.ts";
import { signCandidate } from "../src/server/maps/candidate-token.ts";
import { routingPlaces } from "../src/lib/trip-contract.ts";
import { ensureFp6QaLogin } from "./lib/fp6-browser.mjs";
const stage = process.argv[2]; assert(["--inspect", "--life"].includes(stage));
const fixture = JSON.parse(readFileSync(".git/fp8-recovery/fixture.json", "utf8")).fixture;
const db = getDatabase(), actors = await resolveQaActors(db); await cleanupQaFixture(db, fixture, false);
const output = ".git/fp8-recovery/edges"; mkdirSync(output, { recursive: true, mode: 0o700 });
const origin = process.env.FP8_ORIGIN ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, geolocation: { latitude: 1.301, longitude: 103.801, accuracy: 10 }, permissions: ["geolocation"] });
const page = await context.newPage(), errors = [], evidence = { stage, calls: [], checks: [] }; let step = "login", pinNumber = 0;
if(stage==="--life"&&process.env.FP8_RESUME_LIFE){Object.assign(evidence,JSON.parse(readFileSync(`${output}/life.json`,"utf8")));pinNumber=evidence.calls.filter(c=>c.kind==="pin").length;}
const save = () => writeFileSync(`${output}/${stage.slice(2)}.json`, JSON.stringify(evidence, null, 2), { mode: 0o600 });
const read = () => readTrip(db, actors.a, fixture.slug), button = name => page.getByRole("button", { name, exact: true });
const ready = async () => page.locator('[data-map-state="ready"]').waitFor({ timeout: 60000 });
const mode = () => page.getByRole("combobox", { name: "Travel mode", exact: true });
const changed = async action => { const rev = await page.locator("[data-trip-revision]").getAttribute("data-trip-revision"); await action(); await page.waitForFunction(r => document.querySelector("[data-trip-revision]")?.dataset.tripRevision !== r, rev); };
page.on("pageerror", e => errors.push(e.name));
await context.route("https://maps.geoapify.com/**", r => r.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "qa", type: "background", paint: { "background-color": "#142025" } }] } }));
await context.route("**/api/trips/*/roads", async r => {
  assert.equal(decodeURIComponent(new URL(r.request().url()).pathname.split("/")[3]), fixture.slug);
  const input = r.request().postDataJSON(), plan = await read(); let points = routingPlaces(plan, input.routeId);
  if (input.origin) points = [{ id: "private-origin", ...input.origin }, points[0]];
  evidence.calls.push({ kind: "mock-road", mode: input.mode });
  const legs = points.slice(1).map((p,i)=>({fromId:points[i].id,toId:p.id,metres:1000,seconds:600}));
  await r.fulfill({json:{geometry:{key:JSON.stringify([input.mode,...points.map(p=>[p.id,p.latitude,p.longitude])]),mode:input.mode,segments:points.slice(1).map((p,i)=>[[points[i].longitude,points[i].latitude],[p.longitude,points[i].latitude],[p.longitude,p.latitude]]),attribution:"Synthetic edge QA, not live road evidence",estimate:{metres:legs.length*1000,seconds:legs.length*600,legs,guidance:[]}}}});
});
// The second/third manual clicks use deliberately synthetic nearby-POI fixtures.
// Signed candidate tokens are fixture data, not an authentication bypass: Clerk and all mutation authorization still run.
await context.route("**/api/trips/*/places", async r => {
  const input = r.request().postDataJSON(); if(input.kind!=="pin")return r.continue();
  pinNumber++; evidence.calls.push({kind:"pin",input}); save();
  if(pinNumber===1) { const response=await r.fetch(); const body=await response.json(); evidence.realReverse={status:response.status(),input,candidate:body.candidates?.[0]?.candidate,nearby:body.nearby?.map(p=>p.candidate)}; save(); return r.fulfill({response}); }
  const manual={title:"Checkpoint",latitude:input.latitude,longitude:input.longitude,source:"pin",provider:null,providerId:null,address:"Synthetic FP8 nearby context",attribution:"QA",license:"QA"};
  const nearby={...manual,title:"FP8 explicit nearby venue",latitude:input.latitude+.00001,longitude:input.longitude+.00001,source:"search",provider:"geoapify",providerId:"fp8-synthetic-nearby"};
  const wrap=candidate=>({candidate,token:signCandidate(candidate,actors.a.userId,fixture.slug)});
  await r.fulfill({json:{candidates:[wrap(manual)],nearby:[wrap(nearby)],notice:"Synthetic nearby selection test"}});
});
async function newRoute(name) { assert(!(await read()).routes.some(r=>r.name===name),"Recover existing lifecycle run before repeating"); await button("Route").click(); await page.getByLabel("Route name",{exact:true}).fill(name); await changed(()=>button("Save route").click()); return (await read()).routes.find(r=>r.name===name).id; }
async function pin(x,y,nearby=false) {
  step=`pin at ${x},${y}`; const before=await read(); await button("Pin").click(); await page.locator("canvas.maplibregl-canvas").click({position:{x,y}}); await page.getByRole("region",{name:"Place preview"}).waitFor();
  assert.equal((await read()).places.length,before.places.length,"Preview must never persist automatically");
  if(nearby) { await button("Preview FP8 explicit nearby venue").click(); assert.equal((await read()).places.length,before.places.length); }
  await changed(()=>button("Add to Route").click()); const after=await read(), card=after.places.find(p=>!before.places.some(old=>old.id===p.id)); assert(card);
  const input=evidence.calls.filter(c=>c.kind==="pin").at(-1).input;
  assert.equal(card.latitude,input.latitude+(nearby?.00001:0)); assert.equal(card.longitude,input.longitude+(nearby?.00001:0)); assert.equal(!!card.providerId,nearby);
  await page.keyboard.press("Escape"); return card;
}
try {
  await page.goto(`${origin}/room/${fixture.slug}/map`); await ensureFp6QaLogin(page,"a"); await page.goto(`${origin}/room/${fixture.slug}/map`); await ready(); await mode().selectOption("planning");
  if(stage==="--inspect") {
    if(!process.env.FP8_SKIP_EDGES) {
    await button("Route 1").click(); const route=(await read()).routes.find(r=>r.name==="Route 1"), target=routingPlaces(await read(),route.id)[1];
    step="long name"; await page.locator(`[data-place-id="${target.id}"]`).getByRole("button",{name:/^Select place/}).click(); await button("Rename checkpoint").click();
    const long="FP8 rendezvous — a deliberately long checkpoint name for small-screen accessibility and balanced compact inspector layout".slice(0,120);
    await page.getByLabel("Checkpoint name",{exact:true}).fill(long); await changed(()=>button("Save name").click()); await button("Rename checkpoint").click();
    for(const [width,height] of [[320,800],[390,844],[430,932],[768,900],[1440,900],[1728,1000],[844,390]]) {
      step=`inspector ${width}`; await page.setViewportSize({width,height}); await page.getByLabel("Checkpoint name",{exact:true}).scrollIntoViewIfNeeded();
      const inspector=page.getByRole("region",{name:`Selected place: ${long}`}), bounds=await inspector.boundingBox(); assert(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await button("Revert to default").scrollIntoViewIfNeeded(); assert(await button("Revert to default").isVisible());
      await page.screenshot({path:`${output}/inspector-${width}.png`,fullPage:true});
    }
    await changed(()=>button("Revert to default").click()); await page.keyboard.press("Escape"); await page.setViewportSize({width:1440,height:900});
    step="replay lifecycle"; await mode().selectOption("drive"); await page.waitForFunction(()=>!document.querySelector('[aria-label="Replay route direction"]')?.disabled);
    await button("Replay route direction").click(); await page.locator("[data-route-replay]").waitFor(); await mode().selectOption("planning"); await button("Stop route replay").waitFor({state:"detached"}); assert.equal(await page.locator("[data-route-replay]").count(),0); assert(await button("Replay route direction").isDisabled());
    await mode().selectOption("drive"); await page.waitForFunction(()=>!document.querySelector('[aria-label="Replay route direction"]')?.disabled);
    await button("Replay route direction").click(); await button("FP8 Short — Singapore").click(); await button("Stop route replay").waitFor({state:"detached"}); assert.equal(await page.locator("[data-route-replay]").count(),0);
    await mode().selectOption("planning"); await button("Route 1").click();
    }
    step="keyboard privacy lifecycle"; await button("Locate me").click(); await page.locator("[data-private-origin]").waitFor(); await button("Ping your location").focus(); await page.keyboard.press("Enter");
    await page.waitForFunction(()=>document.activeElement?.getAttribute("aria-label")==="Heart ping · only you"); await page.keyboard.press("Enter"); await page.getByRole("img",{name:/Heart above your location/}).waitFor();
    await button("Refresh my location").click(); await page.getByRole("img",{name:/Heart above your location/}).waitFor({state:"detached"}); await page.locator("[data-private-origin]").waitFor();
    assert.equal(await button("Allow private route").count(),0); await page.emulateMedia({reducedMotion:"reduce"}); await button("Ping your location").click(); await button("Question ping · only you").click();
    const ping=page.getByRole("img",{name:/Question above your location/}); await ping.waitFor(); assert.equal(await ping.locator("span").evaluate(e=>getComputedStyle(e).animationName),"none"); await ping.waitFor({state:"detached",timeout:5500});
    assert.equal(await page.getByRole("img",{name:/^You, accuracy/}).count(),1); await page.reload(); await ready(); assert.equal(await page.locator("[data-private-origin]").count(),0); assert(await button("Ping your location").isDisabled());
    await page.getByRole("complementary",{name:"Room Chat companion"}).waitFor(); await page.screenshot({path:`${output}/chat-companion.png`,fullPage:true});
    await button("Collapse locations").click(); await button("Expand locations").click();
    evidence.checks.push("7 long-name inspector widths, rename/revert, keyboard Ping, refresh clears Ping, reduced-motion expiry/avatar retention, reload clears origin, replay mode/route cancellation, Chat companion and collapse");
  } else {
    step="fresh lifecycle"; const name="FP8 Disposable Lifecycle",routeId=evidence.routeId??await newRoute(name); evidence.routeId=routeId; save(); await button(name).click();
    const previous=routingPlaces(await read(),routeId); assert(previous.length<=2,"Inspect lifecycle receipt before continuing completed actions");
    const first=previous[0]??await pin(260,240), second=previous[1]??await pin(340,250); step="explicit nearby preview"; const third=await pin(500,170,true); evidence.placeIds=[first.id,second.id,third.id]; save();
    await page.locator(`[data-place-id="${second.id}"]`).getByRole("button",{name:/^Place actions/}).click(); await changed(()=>button("Later").click()); await page.keyboard.press("Escape");
    assert.equal(routingPlaces(await read(),routeId).at(-1).id,second.id);
    await page.locator(`[data-place-id="${first.id}"]`).getByRole("button",{name:/^Comments on/}).click(); await page.getByLabel("Add a comment",{exact:true}).fill("FP8 disposable lifecycle comment"); await changed(()=>button("Post location comment").click()); await button("Close comments").click();
    await button(`Route actions for ${name}`).click(); await button("Rename").click(); await page.getByLabel("Route name",{exact:true}).fill(`${name} renamed`); await changed(()=>button("Save route").click());
    await button(`Route actions for ${name} renamed`).click(); await button("Nuke route").click();
    const confirmation=page.getByRole("region",{name:"Nuke route confirmation"}); await confirmation.waitFor(); assert((await read()).routes.some(r=>r.id===routeId));
    // Recheck exact fixture ownership immediately before the irreversible QA-only operation.
    await cleanupQaFixture(db,fixture,false); await changed(()=>confirmation.getByRole("button",{name:"Nuke route",exact:true}).click());
    const after=await read(); assert(!after.routes.some(r=>r.id===routeId)); for(const id of evidence.placeIds)assert(!after.places.some(p=>p.id===id));
    assert.equal(await page.getByRole("region",{name:/^Selected place/}).count(),0);
    const freshId=await newRoute("FP8 Fresh after Nuke"), fresh=await pin(290,240); assert.equal(routingPlaces(await read(),freshId).length,1); assert(!evidence.placeIds.includes(fresh.id));
    await page.reload(); await ready(); assert.equal(routingPlaces(await read(),freshId).length,1);
    evidence.checks.push("real reverse exact click + preview gate; synthetic nearby alternative explicit selection only; reorder/comment/rename/Nuke confirmation; removed owned cards; fresh route first add/reload");
  }
  assert.deepEqual(errors,[]); evidence.passed=true; save(); console.log({passed:stage,checks:evidence.checks,providerCalls:stage==="--life"?"one real reverse; all roads/nearby alternatives synthetic":0});
} catch(error) { await page.screenshot({path:`${output}/failure-${stage.slice(2)}.png`,fullPage:true}).catch(()=>{}); save(); console.error({failure:"FP8 edges",step,kind:error.name,operation:error.message.split("\n")[0]}); process.exitCode=1; }
finally { await browser.close(); await db.$client.end(); }
