/** Bounded real basemap verification. No GPS, writes, sharing or key changes. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {reviewEnvironment,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
import {loginFp4} from "./lib/ms74-fp4-browser.mjs";
reviewEnvironment();const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));assert.equal(fixture.project,REVIEW_PROJECT);
const offline=process.argv[2]==="--offline";assert(process.argv[2]===undefined||offline);
const stamp=Date.now(),dir=".git/ms74-fp4/browser",receipt=`${dir}/real-map-${stamp}.json`;
const evidence={pass:false,mockedBasemap:offline,at:new Date().toISOString(),sha:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),requestLimit:240,providerRequests:0,budgetExceeded:false,statuses:{},style:null,tilesOk:0,cases:[],pageErrors:[],contentWrites:0,gpsAcquired:false};
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
await context.route("**/*geoapify.com/**",route=>{
 const request=route.request(),url=new URL(request.url());
 if(offline)return url.pathname.endsWith("style.json")?route.fulfill({json:{version:8,sources:{qa:{type:"geojson",data:{type:"FeatureCollection",features:[]},attribution:"Offline QA only"}},layers:[{id:"qa",type:"background",paint:{"background-color":"#dce8e4"}},{id:"qa-source",type:"circle",source:"qa"}]}}):route.abort();
 if(request.method()!=="GET"||url.hostname!=="maps.geoapify.com"||evidence.providerRequests>=evidence.requestLimit){evidence.budgetExceeded=true;return route.abort();}
 evidence.providerRequests++;return route.continue();
});
const page=await context.newPage();let step="normal isolated sign-in";
page.on("pageerror",error=>evidence.pageErrors.push(error.name));
page.on("response",response=>{const u=new URL(response.url());if(u.hostname!=="maps.geoapify.com")return;const status=response.status();evidence.statuses[status]=(evidence.statuses[status]??0)+1;if(u.pathname.endsWith("style.json"))evidence.style={name:u.pathname.split("/").at(-2),status};if(/\.(pbf|mvt)$/.test(u.pathname)&&status===200)evidence.tilesOk++;});
try{
 await loginFp4(page,"a",fixture,"http://localhost:3000");
 if(!offline){await page.waitForResponse(r=>new URL(r.url()).hostname==="maps.geoapify.com"&&/\.(pbf|mvt)$/.test(new URL(r.url()).pathname)&&r.status()===200,{timeout:30000}).catch(()=>{assert(evidence.tilesOk>0);});
 assert.deepEqual(evidence.style,{name:"osm-bright-smooth",status:200});assert(evidence.tilesOk>0);
 evidence.cases.push("Approved localhost referrer: real osm-bright-smooth style and vector tiles return200");}
 step="populated route / rendered map";await page.getByRole("button",{name:"Marina QA",exact:true}).click();await page.getByRole("button",{name:"Fit trip",exact:true}).click();
 await page.getByRole("button",{name:"Select place 1: FP4 synthetic point 1",exact:true}).waitFor();
 await page.screenshot({path:`${dir}/real-map-${stamp}-1440.png`});
 const map=await page.locator('.maplibregl-canvas').elementHandle();assert(map);
 step="actual map companion / responsive";
 for(const [width,height] of [[1440,1000],[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  await page.waitForFunction(()=>{const root=document.querySelector('.workspace-composition'),header=document.querySelector('.conversation-header');return root&&header&&parseFloat(getComputedStyle(root).getPropertyValue('--map-overlay-top'))>=header.getBoundingClientRect().bottom-root.getBoundingClientRect().top+11;});
  // Dismiss the documented hoverable tooltip before measuring persistent surfaces.
  await page.mouse.move(0,0);await page.keyboard.press("Escape");
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const geometry=await page.evaluate(()=>['.maplibregl-ctrl-zoom-in','[aria-label="Reset map to Singapore"]','[aria-label="Fit trip"]','.maplibregl-ctrl-attrib','[data-map-overlay="search"]','[data-map-overlay="tray"]'].map(selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect(),hit=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {selector,inside:!!r&&r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,uncovered:!!e&&!!hit&&e.contains(hit)};}));
  evidence.lastGeometry={width,height,geometry};assert(geometry.every(g=>g.inside&&g.uncovered));
  if(!offline){assert.match(await page.locator('.maplibregl-ctrl-attrib').innerText(),/Geoapify/);assert.match(await page.locator('.maplibregl-ctrl-attrib').innerText(),/OpenStreetMap/);}
  await page.locator('[data-surface-trigger="chat"]').click();await page.locator('[data-workspace-pane="chat"]').waitFor();
  await page.getByRole("button",{name:"Close Chat companion",exact:true}).click();assert(await map.evaluate(el=>el.isConnected));
  await page.screenshot({path:`${dir}/real-map-${stamp}-${width}x${height}.png`});
 }
 evidence.cases.push(`${offline?"Offline geometry":"Real basemap"}: desktop/mobile/short-landscape controls and attribution clear; original canvas survives Chat`);
 assert(!evidence.budgetExceeded);assert(!Object.keys(evidence.statuses).some(s=>Number(s)>=400));assert.deepEqual(evidence.pageErrors,[]);evidence.pass=true;
}catch(error){evidence.failedStep=step;evidence.failureType=error.name;process.exitCode=1;await page.screenshot({path:`${dir}/real-map-${stamp}-failure.png`}).catch(()=>{});}
finally{await context.close();await browser.close();writeFileSync(receipt,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,receipt}));}
