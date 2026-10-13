import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { loginLive, liveReady, liveCount, liveJoined, installLiveMetrics } from "./lib/ms74-browser.mjs";
const fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8")),directory=".git/ms74-fp3/browser";
assert.equal(fixture.run,"ms74-fp1-20261010");mkdirSync(directory,{recursive:true,mode:0o700});
const browser=await chromium.launch({headless:true}),pages=[],contexts=[];
const evidence={pass:false,cases:[],widths:[],errors:[],at:new Date().toISOString()};let step="setup";
try{
  for(const actor of ["a","b"]){
    const context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);await installLiveMetrics(context);
    await context.route("**/*geoapify.com/**",r=>new URL(r.request().url()).pathname.endsWith("style.json")?r.fulfill({json:{version:8,sources:{},layers:[{id:"qa",type:"background",paint:{"background-color":"#0d171b"}}]}}):r.abort());
    const page=await context.newPage();pages.push(page);page.on("pageerror",error=>evidence.errors.push(error.name));await loginLive(page,actor,fixture);
    await page.locator(".live-panel .live-action").click();await liveJoined(page);
  }
  const [a,b]=pages;await liveCount(a,2);await liveCount(b,2);
  const choose=async surface=>a.locator(`[data-surface-trigger="${surface}"]`).click();
  const layout=async value=>a.locator(`.workspace-composition[data-layout="${value}"]`).waitFor();
  if(!process.argv.includes("--responsive-only")){
  step="Map Live and canvas Expand";await choose("map");await layout("map:live");
  await a.locator('[data-map-state="ready"]').waitFor({timeout:60000});
  assert.equal(await a.locator('[data-workspace-pane="map"] > .workspace-pane-actions').count(),0);
  assert.equal(await a.locator('.live-panel:visible').getAttribute("data-live-layout"),"companion");
  const expand=a.getByRole("button",{name:"Expand Map",exact:true});await expand.focus();await a.keyboard.press("Enter");await layout("map:none");await liveCount(b,2);
  await a.getByRole("button",{name:"Restore Map companion",exact:true}).click();await layout("map:live");await liveCount(a,2);
  evidence.cases.push("Map canvas Expand/restore preserves Live; redundant title row absent");
  step="Map Chat draft and Board compositions";
  await choose("chat");await layout("map:chat");
  const draft="Unsent FP3 composition QA draft";await a.locator('.composer textarea:visible').fill(draft);
  await choose("live");await layout("map:live");await choose("hall");await layout("hall:live");await liveCount(b,2);
  await choose("chat");await layout("hall:chat");assert.equal(await a.locator('.composer textarea:visible').inputValue(),draft);
  await a.getByRole("button",{name:"Open Chat alone",exact:true}).click();await layout("chat:none");
  await choose("live");await layout("live:chat");await liveCount(a,2);
  assert.equal(await a.locator('.live-panel:visible').getAttribute("data-live-layout"),"expanded");
  assert.equal(await a.locator('.composer textarea:visible').inputValue(),draft);
  await a.locator('.composer textarea:visible').fill("");
  evidence.cases.push("all five compositions, unsent draft retained and cleared, Live continuous");
  await a.screenshot({path:`${directory}/live-expanded-1440.png`,fullPage:true});
  }
  step="six widths and keyboard";
  for(const width of [320,390,430,768,1440,1728]){
    await a.setViewportSize({width,height:1000});await a.emulateMedia({reducedMotion:"reduce"});
    const foreground=a.getByRole("group",{name:"Visible workspace pane"});if(await foreground.count())await foreground.getByRole("button",{name:"Live",exact:true}).click();
    await a.keyboard.press("Tab");await a.locator('.live-panel:visible .live-action').focus();
    const live=await a.evaluate(()=>{const panel=document.querySelector('.live-panel'),button=panel.querySelector('.live-action'),rect=button.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,panelOverflow:panel.scrollWidth>panel.clientWidth+1,focus:getComputedStyle(button).outlineStyle,target:rect.height,visible:rect.top>=0&&rect.bottom<=innerHeight};});
    assert(!live.overflow&&!live.panelOverflow&&live.focus!=="none"&&live.target>=44&&live.visible);
    await a.screenshot({path:`${directory}/live-${width}.png`,fullPage:true});
    await choose("map");const panes=a.getByRole("group",{name:"Visible workspace pane"});if(await panes.count())await panes.getByRole("button",{name:"Map",exact:true}).click();
    await a.locator('[data-map-state="ready"]').waitFor({timeout:30000});
    const fit=a.getByRole("button",{name:"Reset map to Singapore",exact:true});await a.keyboard.press("Tab");await fit.focus();
    await a.locator('.workspace-tooltip:popover-open').waitFor();
    const map=await a.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,focus:getComputedStyle(document.activeElement).outlineStyle,tooltip:document.querySelector('.workspace-tooltip').textContent,focusedLabel:document.activeElement.getAttribute("aria-label")}));
    evidence.widths.push({width,live,map});
    assert(!map.overflow&&map.focus!=="none"&&map.tooltip);
    await a.keyboard.press("Escape");await a.screenshot({path:`${directory}/map-${width}.png`,fullPage:true});
    // Return to expanded Live without retiring participation.
    const g=a.getByRole("group",{name:"Visible workspace pane"});
    if(await g.count())await g.getByRole("button",{name:"Live",exact:true}).click();
    await a.getByRole("button",{name:"Open Live alone",exact:true}).click();
    await layout("live:none");await liveCount(b,2);
  }
  evidence.cases.push("six widths, reduced motion, keyboard focus/tooltips, Live continuity");
  for(const page of pages){const m=await page.evaluate(()=>window.__liveQa.snapshot());assert(m.maxConnections<=1&&m.payloadSafe);}
  assert.equal(evidence.errors.length,0);evidence.pass=true;
}catch(error){evidence.failedStep=step;evidence.failure=error.name;process.exitCode=1;for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:`${directory}/workspace-failure-${i}.png`,fullPage:true}).catch(()=>{});}
finally{for(const page of pages){const leave=page.locator('.workspace-live-indicator button');if(await leave.count().catch(()=>0))await leave.click({timeout:3000}).catch(()=>{});}await browser.close();writeFileSync(`${directory}/workspace${process.argv.includes("--responsive-only")?"-responsive":""}.json`,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify(evidence));}
