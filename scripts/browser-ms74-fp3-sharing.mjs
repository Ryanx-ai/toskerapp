/** Local-only, isolated A/B UI test with synthetic location and offline basemap.
 * No device geolocation, provider lookup or founder session is used. */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, installLiveMetrics } from "./lib/ms74-browser.mjs";
const origin="http://localhost:3000",fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
const directory=".git/ms74-fp3/browser";mkdirSync(directory,{recursive:true,mode:0o700});
const browser=await chromium.launch({headless:true}),contexts=[],pages=[];
const evidence={pass:false,cases:[],errors:[],providerCalls:0,snapshots:[],at:new Date().toISOString()};let step="sign in";
try{
  for(const actor of ["a","b"]){
    const context=await browser.newContext({viewport:{width:1440,height:1000},geolocation:{latitude:1.2834,longitude:103.8607,accuracy:50},permissions:["geolocation"]});contexts.push(context);
    await installLiveMetrics(context);
    await context.route("**/*geoapify.com/**",route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith("style.json"))return route.fulfill({json:{version:8,sources:{},layers:[{id:"qa-background",type:"background",paint:{"background-color":"#0d171b"}}]}});
      return route.abort();
    });
    const page=await context.newPage();pages.push(page);page.on("pageerror",error=>evidence.errors.push(error.name));
    page.on("response",async response=>{
      if(new URL(response.url()).pathname!=="/api/location-sharing")return;
      const action=response.request().postDataJSON()?.action;
      evidence.snapshots.push({action,status:response.status()});
      // Never retain location response bodies, cookies, tokens, network traces.
    });
    await loginLive(page,actor,fixture,origin);
    await page.goto(`${origin}/room/${fixture.slug}/map`,{waitUntil:"domcontentloaded"});
    await page.locator('[data-map-state="ready"]').waitFor({timeout:60000});
    await page.getByRole("button",{name:"Locate me",exact:true}).waitFor();
  }
  const [a,b]=pages;
  step="Locate private boundary";
  assert(await a.getByRole("button",{name:"Share location",exact:true}).isDisabled());
  await a.getByRole("button",{name:"Locate me",exact:true}).click();
  await a.getByRole("button",{name:"Share location",exact:true}).waitFor();
  await a.waitForFunction(()=>document.querySelector('button[aria-label="Locate me"]')?.getAttribute("aria-pressed")==="true");
  assert.equal(await b.locator('[aria-label="Shared location snapshots"]').count(),0);
  assert.equal(evidence.snapshots.filter(r=>r.action==="begin").length,0);
  evidence.cases.push("Locate alone never shares");
  step="broad consent and peer display";
  await a.getByRole("button",{name:"Share location",exact:true}).click();
  assert(await a.getByRole("radio",{name:"Broad area only (default)",exact:true}).isChecked());
  await a.getByRole("button",{name:"Share broad area",exact:true}).click();
  await b.getByRole("list",{name:"Shared location snapshots"}).waitFor({timeout:45000});
  assert.match(await b.getByRole("list",{name:"Shared location snapshots"}).innerText(),/Singapore Central.*broad area only/s);
  assert.equal(await b.locator('[aria-label*="shared a temporary position"]').count(),0);
  evidence.cases.push("explicit broad snapshot delivered without precise marker");
  await a.screenshot({path:`${directory}/sharing-broad-a.png`,fullPage:true});
  step="Stop clears B";
  await a.getByRole("button",{name:"Stop sharing",exact:true}).click();
  await b.getByRole("list",{name:"Shared location snapshots"}).waitFor({state:"detached",timeout:15000});
  await a.getByRole("button",{name:"Stop sharing",exact:true}).waitFor({state:"detached",timeout:15000});
  evidence.cases.push("Stop clears authorized peer");
  step="precise separate consent";
  await a.getByRole("button",{name:"Share location",exact:true}).click();
  await a.getByRole("radio",{name:"Precise position on peers’ Maps",exact:true}).check();
  await a.getByRole("button",{name:"Share precise position",exact:true}).click();
  await b.locator('[aria-label*="shared a temporary position"]').waitFor({timeout:45000});
  await b.screenshot({path:`${directory}/sharing-precise-b.png`,fullPage:true});
  evidence.cases.push("precise peer marker only after separate explicit choice");
  step="Locate off invalidates consent";
  await a.getByRole("button",{name:"Locate me",exact:true}).click();
  await b.locator('[aria-label*="shared a temporary position"]').waitFor({state:"detached",timeout:15000});
  evidence.cases.push("Locate off retires snapshot");
  for(const page of pages){const metrics=await page.evaluate(()=>window.__liveQa.snapshot());assert(metrics.maxConnections<=1&&metrics.payloadSafe);}
  assert.equal(evidence.errors.length,0);evidence.cases.push("single transport; unchanged presence payload");evidence.pass=true;
}catch(error){evidence.failedStep=step;evidence.failure=error.name;process.exitCode=1;for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:`${directory}/sharing-failure-${i}.png`,fullPage:true}).catch(()=>{});}
finally{
  for(const page of pages){const stop=page.getByRole("button",{name:"Stop sharing",exact:true});if(await stop.count().catch(()=>0))await stop.click({timeout:3000}).catch(()=>{});}
  await browser.close();writeFileSync(`${directory}/sharing.json`,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify(evidence));
}
