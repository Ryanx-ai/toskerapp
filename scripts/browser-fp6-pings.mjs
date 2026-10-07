import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
const receipt=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!receipt.fixture.retained);
const ba=await chromium.connectOverCDP(process.env.FP6_CDP),bb=await chromium.connectOverCDP(process.env.FP6_B_CDP);
const ca=ba.contexts()[0],cb=bb.contexts()[0],a=ca.pages()[0],b=cb.pages()[0],origin="http://localhost:3000";
const button=(page,name)=>page.getByRole("button",{name,exact:true});
try{
  for(const [page,actor] of [[a,"a"],[b,"b"]]){
    await page.route("**/api/trips/*/roads",r=>r.fulfill({status:503,json:{error:"QA road firewall"}}));
    await page.goto(`${origin}/room/${receipt.fixture.slug}`,{waitUntil:"domcontentloaded",timeout:60000});await ensureFp6QaLogin(page,actor);await page.locator('[data-map-state="ready"]').waitFor();
  }
  await ca.grantPermissions(["geolocation"],{origin});await ca.setGeolocation({latitude:1.34,longitude:103.79,accuracy:10});
  const sent=[];a.on("request",r=>{if(r.url().includes("/pings"))sent.push(r.postDataJSON());});
  assert.equal(await a.getByRole("combobox",{name:"Ping Map",exact:true}).count(),0);
  await button(a,"Locate me").click();await a.getByRole("combobox",{name:"Ping Map",exact:true}).waitFor();
  assert.equal(sent.length,0,"Locate alone never emits a ping");
  await a.locator("canvas.maplibregl-canvas").focus();await a.keyboard.press("ArrowRight");
  await a.waitForTimeout(600);
  await a.emulateMedia({reducedMotion:"reduce"});
  await a.getByRole("combobox",{name:"Ping Map",exact:true}).selectOption("attention");await button(a,"Ping map centre").click();
  const ping=b.getByRole("img",{name:/Attention ping\. Selected point, not live location/});await ping.waitFor({timeout:20000});
  assert.equal(sent.length,1);assert(sent[0].latitude!==1.34||sent[0].longitude!==103.79);
  assert.equal(await a.getByRole("img",{name:/Attention ping\. Selected point/}).evaluate(e=>getComputedStyle(e).animationName),"none");
  await ping.waitFor({state:"detached",timeout:12000});console.log("PASS A/B authorized Room ping, explicit map coordinate not synthetic device origin, reduced motion and 8s expiry");
  await button(a,"Clear my location").click();assert.equal(await a.getByRole("combobox",{name:"Ping Map",exact:true}).count(),0);
  const refused=await a.evaluate(async slug=>{const r=await fetch(`/api/trips/${slug}/pings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:crypto.randomUUID(),kind:"question",latitude:1.3,longitude:103.8,locateEnabled:false})});return r.status;},receipt.fixture.slug);assert.equal(refused,400);
  await a.getByRole("link",{name:"tosker.user.a+clerk_test's Sandbox",exact:true}).click();await a.getByRole("heading",{name:"tosker.user.a+clerk_test's Sandbox",exact:true}).waitFor();await a.locator('[data-map-state="ready"]').waitFor();
  await button(a,"Locate me").click();await a.getByRole("combobox",{name:"Ping Map",exact:true}).selectOption("pulse");const before=sent.length;await button(a,"Ping map centre").click();
  await a.getByRole("img",{name:/Here \/ activity ping/}).waitFor();assert.equal(sent.length,before);console.log("PASS Locate OFF hides/refuses ping, Sandbox ping local-only with no API request");
  await a.reload();await a.locator('[data-map-state="ready"]').waitFor();assert.equal(await a.getByRole("combobox",{name:"Ping Map",exact:true}).count(),0);assert.equal(await a.getByRole("img",{name:/activity ping/}).count(),0);
  console.log("PASS reload clears location/pings; no ping history");
}catch(e){console.error({failure:"FP6 ping browser",message:String(e.message).slice(0,650)});process.exitCode=1;}
finally{for(const page of[a,b])await page.unrouteAll({behavior:"wait"});await ba.close();await bb.close();}
