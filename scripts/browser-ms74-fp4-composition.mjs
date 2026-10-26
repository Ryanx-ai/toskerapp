/** Fresh normal QA sign-in, isolated database, no GPS acquisition/provider calls.
 * Offline style is ONLY composition evidence, never real Map-rendering evidence. */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { REVIEW_PROJECT, reviewEnvironment } from "./ms74-fp3-review-runtime.mjs";
import { installLiveMetrics } from "./lib/ms74-browser.mjs";

reviewEnvironment();
const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));
assert.equal(fixture.project,REVIEW_PROJECT); assert.equal(fixture.status,"committed");
const origin="http://localhost:3001", directory=".git/ms74-fp4/browser";
mkdirSync(directory,{recursive:true,mode:0o700});
const receipt=`${directory}/composition-${Date.now()}.json`;
const evidence={pass:false,sha:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),
  applicationDirty:true,at:new Date().toISOString(),isolated:true,mockedBasemap:true,providerCalls:0,cases:[],errors:[]};
const save=()=>writeFileSync(receipt,JSON.stringify(evidence,null,2),{mode:0o600});
const record=name=>{evidence.cases.push(name);save();console.log(JSON.stringify({pass:name}));};
const browser=await chromium.launch({headless:true});
const contexts=[],pages=[];let step="login";
try {
  for(const actor of ["a","b"]){
    const context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);
    await installLiveMetrics(context);
    await context.route("**/*geoapify.com/**",route=>new URL(route.request().url()).pathname.endsWith("style.json")
      ?route.fulfill({json:{version:8,sources:{qa:{type:"geojson",data:{type:"FeatureCollection",features:[]},attribution:"Offline QA attribution — not real Map evidence"}},layers:[{id:"qa-offline",type:"background",paint:{"background-color":"#dce8e4"}},{id:"qa-source",type:"circle",source:"qa"}]}}):route.abort());
    const page=await context.newPage();pages.push(page);
    page.on("pageerror",error=>evidence.errors.push(error.name));
    await page.goto(`${origin}/app`,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>window.Clerk?.loaded,{}, {timeout:60000});
    await page.getByRole("button",{name:"Sign in",exact:true}).click();
    const email=`tosker.user.${actor}+clerk_test@example.com`;
    await page.getByRole("textbox",{name:"Email address",exact:true}).fill(email);
    await page.getByRole("button",{name:"Continue",exact:true}).click();
    await page.getByRole("link",{name:"Use another method",exact:true}).click();
    await Promise.all([page.waitForResponse(r=>r.url().includes("/prepare_first_factor")&&r.status()===200),page.getByRole("button",{name:`Email code to ${email}`,exact:true}).click()]);
    await page.getByRole("textbox",{name:"Enter verification code",exact:true}).fill("424242");
    await page.getByRole("button",{name:"Open your Namecard",exact:true}).waitFor({timeout:60000});
    await page.goto(`${origin}/room/${fixture.slug}`,{waitUntil:"domcontentloaded"});
    await page.locator('[data-map-state="ready"]').waitFor({timeout:60000});
    await page.getByText("Loading routes…",{exact:true}).waitFor({state:"hidden",timeout:60000});
    await page.getByRole("button",{name:"Pin",exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Pin",exact:true}).isEnabled(),true);
    assert.equal(await page.locator('[data-surface-trigger="map"], [data-surface-trigger="live"]').count(),0);
    assert.equal(await page.getByRole("button",{name:"Join Live",exact:true}).count(),0);
    assert.equal(await page.locator('[data-workspace-pane="chat"]:visible').count(),0);
    await page.screenshot({path:`${directory}/composition-${actor}-initial.png`});
  }
  record("A/B: normal sign-in; default Map; Chat and Board toggles only; no Live CTA");
  const [a]=pages;
  step="Chat and Board continuity";
  const map=await a.locator('.maplibregl-canvas').elementHandle();assert(map);
  await a.locator('[data-surface-trigger="chat"]').click();
  const chat=a.locator('[data-workspace-pane="chat"]');await chat.waitFor();
  await chat.getByText("Loading messages…",{exact:true}).waitFor({state:"hidden",timeout:60000});
  const draft=chat.getByPlaceholder("Message…",{exact:true});
  await draft.fill("Synthetic FP4 draft — do not send");
  await a.locator('[data-surface-trigger="hall"]').click();
  await a.locator('[data-workspace-pane="hall"]').waitFor();
  assert.equal(await chat.isVisible(),false);
  await a.locator('[data-surface-trigger="chat"]').click();
  assert.equal(await draft.inputValue(),"Synthetic FP4 draft — do not send");
  assert(await map.evaluate(el=>el.isConnected));
  record("Chat draft and original Map canvas survive Chat ↔ Board toggles");
  step="expand minimize close";
  await a.getByRole("button",{name:"Open Chat alone",exact:true}).click();
  assert.equal(await a.locator('[data-workspace-pane="map"]').getAttribute("inert"),"");
  await a.getByRole("button",{name:"Minimize Chat",exact:true}).click();
  await a.getByRole("button",{name:"Close Chat companion",exact:true}).click();
  await a.waitForFunction(()=>document.activeElement?.getAttribute('data-surface-trigger')==='chat');
  assert(await map.evaluate(el=>el.isConnected));
  record("Expand/minimize/close preserves Map; covered canvas inert; close restores trigger focus");
  step="legacy Live URL";
  await a.goto(`${origin}/room/${fixture.slug}/live`,{waitUntil:"domcontentloaded"});
  await a.locator('[data-map-state="ready"]').waitFor({timeout:60000});
  await a.getByText("Loading routes…",{exact:true}).waitFor({state:"hidden",timeout:60000});
  assert.equal(await a.locator('.live-panel').count(),0);
  for(const page of pages){
    const metrics=await page.evaluate(()=>window.__liveQa.snapshot());
    assert.equal(metrics.liveChannels,0);
    assert(!metrics.recent.some(row=>row.live));
    assert(metrics.maxConnections<=1);
  }
  record("Legacy Live URL falls back safely; no Live channel traffic; at most one realtime connection");
  step="responsive composition";
  for(const [width,height] of [[320,800],[390,844],[430,932],[768,1024],[1440,1000],[1728,1100],[844,390]]){
    await a.setViewportSize({width,height});
    await a.waitForFunction(()=>{
      const root=document.querySelector('.workspace-composition'), header=document.querySelector('.conversation-header');
      if(!root||!header)return false;
      return parseFloat(getComputedStyle(root).getPropertyValue('--map-overlay-top'))>=header.getBoundingClientRect().bottom-root.getBoundingClientRect().top+11;
    });
    await a.screenshot({path:`${directory}/canvas-${width}x${height}.png`});
    const geometry=await a.evaluate(()=>{
      const selectors=['.maplibregl-ctrl-zoom-in','.maplibregl-ctrl-zoom-out','[data-map-overlay="search"]','[data-map-overlay="tray"]','.maplibregl-ctrl-attrib'];
      return selectors.map(selector=>{const el=document.querySelector(selector),r=el?.getBoundingClientRect();const hit=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {selector,visible:!!el?.checkVisibility(),inside:!!r&&r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,uncovered:!!el&&!!hit&&el.contains(hit)};});
    });
    assert(geometry.every(item=>item.visible&&item.inside),`Map overlays inside ${width}x${height}`);
    assert(geometry.every(item=>item.uncovered),`Map controls are not covered ${width}x${height}`);
    await a.locator('[data-surface-trigger="chat"]').click();
    await a.locator('[data-workspace-pane="chat"]').waitFor();
    assert(await a.getByRole("button",{name:"Close Chat companion",exact:true}).isVisible());
    assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await a.screenshot({path:`${directory}/composition-${width}x${height}.png`});
    await a.getByRole("button",{name:"Close Chat companion",exact:true}).click();
  }
  record("Seven viewport sizes: Map controls/tray/search/attribution inside viewport; panel switching/close; no document overflow");
  assert.deepEqual(evidence.errors,[]);
  evidence.pass=true;
}catch(error){evidence.failedStep=step;evidence.failureType=error.name;console.error(JSON.stringify({pass:false,step,errorType:error.name}));process.exitCode=1;
  if(pages[0])await pages[0].screenshot({path:`${directory}/composition-failure.png`}).catch(()=>{});
}finally{
  for(const context of contexts)await context.close();await browser.close();save();
  console.log(JSON.stringify({receipt,pass:evidence.pass,providerCalls:0}));
}
