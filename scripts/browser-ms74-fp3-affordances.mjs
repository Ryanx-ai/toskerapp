import assert from "node:assert/strict";
import { readFileSync,writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive } from "./lib/ms74-browser.mjs";
const fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));assert.equal(fixture.run,"ms74-fp1-20261010");
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,geolocation:{latitude:1.2834,longitude:103.8607,accuracy:50},permissions:["geolocation"]}),page=await context.newPage();
const evidence={pass:false,at:new Date().toISOString(),cases:[],providerSearchRequests:0,mutationRequests:0,errors:[]};let step="setup";
await context.route("**/*geoapify.com/**",r=>new URL(r.request().url()).pathname.endsWith("style.json")?r.fulfill({json:{version:8,sources:{},layers:[{id:"qa",type:"background",paint:{"background-color":"#0d171b"}}]}}):r.abort());
page.on("pageerror",e=>evidence.errors.push(e.name));page.on("request",r=>{const url=new URL(r.url());if(url.pathname===`/api/trips/${fixture.slug}/places`&&r.method()==="POST")evidence.providerSearchRequests++;if(url.pathname===`/api/trips/${fixture.slug}`&&r.method()==="POST")evidence.mutationRequests++;});
try{
  await loginLive(page,"a",fixture);await page.goto(`http://localhost:3000/room/${fixture.slug}/map`,{waitUntil:"domcontentloaded"});await page.locator('[data-map-state="ready"]').waitFor({timeout:60000});await page.setViewportSize({width:390,height:900});
  const cdp=await context.newCDPSession(page),locate=page.getByRole("button",{name:"Locate me",exact:true}),ping=page.getByRole("button",{name:"Ping your location",exact:true});
  const hold=async target=>{await target.scrollIntoViewIfNeeded();const r=await target.boundingBox();await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await page.waitForTimeout(650);await page.locator('.workspace-tooltip:popover-open').waitFor();await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});};
  step="touch hold";await hold(locate);assert.equal(await locate.getAttribute("aria-pressed"),"false");
  assert.match(await page.locator('.workspace-tooltip:popover-open').innerText(),/only on your map/);
  await locate.tap();await page.waitForFunction(()=>document.querySelector('[aria-label="Locate me"]').getAttribute("aria-pressed")==="true");
  await hold(ping);assert.equal(await ping.getAttribute("aria-expanded"),"false");await ping.tap();await page.getByRole("group",{name:"Private location ping choices"}).waitFor();
  const group=await page.getByRole("group",{name:"Private location ping choices"}).boundingBox();assert(group.x>=0&&group.x+group.width<=390);
  await page.getByRole("button",{name:"Heart ping · only you",exact:true}).tap();await page.locator('[aria-label="Heart above your location. Only you can see this ping."]').waitFor();
  evidence.cases.push("touch hold labels Locate/Ping without activation; tap works; choices fit390");
  step="worldwide result preview";const revision=await page.locator('[aria-label="Trip Map"]').getAttribute("data-trip-revision");
  await page.getByRole("textbox",{name:"Search places",exact:true}).fill("Tokyo Tower Japan");
  const results=page.getByRole("list",{name:"Place search results"});await results.waitFor({timeout:30000});
  assert.equal(await page.getByRole("region",{name:"Place preview",exact:true}).count(),0);
  await results.getByRole("button").first().tap();const preview=page.getByRole("region",{name:"Place preview",exact:true});await preview.waitFor();assert.match(await preview.innerText(),/Tokyo Tower/);
  assert(await preview.getByRole("button",{name:"Add to Route",exact:true}).isEnabled());
  assert.equal(await page.locator('[aria-label="Trip Map"]').getAttribute("data-trip-revision"),revision);
  await page.screenshot({path:".git/ms74-fp3/browser/global-preview-390.png",fullPage:true});await preview.getByRole("button",{name:"Cancel",exact:true}).tap();
  assert.equal(evidence.mutationRequests,0);assert.equal(evidence.providerSearchRequests,1);
  evidence.cases.push("one real worldwide search; explicit selection/preview/cancel; no automatic save or mutation");
  step="keyboard companion icon";await page.setViewportSize({width:1440,height:1000});const expand=page.getByRole("button",{name:"Open Chat alone",exact:true});await page.keyboard.press("Tab");await expand.focus();await page.locator('.workspace-tooltip:popover-open').waitFor();assert.match(await page.locator('.workspace-tooltip:popover-open').innerText(),/Open Chat alone/);await page.keyboard.press("Escape");
  evidence.cases.push("companion icon keyboard tooltip and Escape dismissal");assert.equal(evidence.errors.length,0);evidence.pass=true;
}catch(e){evidence.failedStep=step;evidence.failure=e.name;process.exitCode=1;await page.screenshot({path:".git/ms74-fp3/browser/affordance-failure.png",fullPage:true}).catch(()=>{});}
finally{await browser.close();writeFileSync(".git/ms74-fp3/browser/affordances.json",JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify(evidence));}
