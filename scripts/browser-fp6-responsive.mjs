import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!fixture.retained);
const browser=await chromium.connectOverCDP(process.env.FP6_CDP),page=browser.contexts()[0].pages()[0];
const button=(name)=>page.getByRole("button",{name,exact:true});
try{
  await page.goto(`http://localhost:3000/room/${fixture.slug}`);
  for(const [width,height] of [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117],[844,390]]){
    await page.setViewportSize({width,height});
    await page.locator('[data-trip-revision]:not([data-trip-revision=""])').waitFor();await page.locator('[data-map-state="ready"]').waitFor();
    await page.locator('[data-place-id]').first().waitFor({state:"attached"});await button("Fit trip").click();await page.waitForTimeout(1000);
    const mapBox=await page.locator(".maplibregl-map").boundingBox();assert(mapBox&&mapBox.height>=190,"Map container must retain visible height after provider CSS loads");
    await page.getByRole("link",{name:"Geoapify",exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`horizontal overflow ${width}`);
    await page.screenshot({path:`.git/fp6-recovery/map-${width}.png`});
    const marker=page.getByRole("button",{name:/^Select destination \d+: QA Marina Bay Sands$/});
    const hit=await marker.evaluate(e=>{const r=e.getBoundingClientRect();const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {clear:top===e||e.contains(top),blocker:top?.tagName,blockerClass:top?.className};});
    console.log({width,markerHit:hit});
    // Marker keyboard activation must work even when geometry overlaps a summary.
    await marker.focus();await page.keyboard.press("Enter");const panel=page.locator("[data-map-inspector]");await panel.waitFor();
    const box=await panel.boundingBox();assert(box&&box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height+1,`inspector bounds ${width}`);
    await page.screenshot({path:`.git/fp6-recovery/inspector-${width}.png`});await page.keyboard.press("Escape");
    console.log(`PASS ${width}×${height} page/inspector bounds and keyboard marker opening; visual review pending`);
  }
  await page.setViewportSize({width:1440,height:900});await page.getByRole("link",{name:"Settings",exact:true}).click();
  await button("Version info / About").click();await page.getByRole("heading",{name:"Version info / About",exact:true}).waitFor();await page.screenshot({path:".git/fp6-recovery/about.png"});console.log("PASS Settings About visible");
}catch(e){console.error({failure:"FP6 responsive",message:String(e.message).slice(0,1000)});process.exitCode=1;}
finally{await browser.close();}
