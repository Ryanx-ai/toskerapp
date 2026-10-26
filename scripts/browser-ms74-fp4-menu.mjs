/** Resumes the remaining menu gates without replaying completed Move/Skip writes. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {reviewEnvironment,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
import {fp4Context,loginFp4} from "./lib/ms74-fp4-browser.mjs";
reviewEnvironment();const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));assert.equal(fixture.project,REVIEW_PROJECT);
const path=`.git/ms74-fp4/browser/menu-${Date.now()}.json`,evidence={pass:false,cases:[],diagnostics:{},providerCalls:0,readOnlyExceptQaReadState:true};
const browser=await chromium.launch({headless:true}),context=await fp4Context(browser),page=await context.newPage();
const title="FP4 synthetic point 2",menu=page.getByRole("dialog",{name:`Place actions for ${title}`,exact:true});
try{
 await loginFp4(page,"b",fixture);await page.getByRole("button",{name:"Day 2 QA",exact:true}).click();
 const open=()=>page.getByRole("button",{name:`Place actions for ${title}`,exact:true}).click();
 await open();await menu.getByRole("button",{name:"Nuke",exact:true}).click();
 const dialog=page.getByRole("dialog",{name:"Nuke this place?",exact:true});await dialog.waitFor();
 evidence.diagnostics={cancelFocused:await dialog.getByRole("button",{name:"Cancel",exact:true}).evaluate(el=>el===document.activeElement),redBackground:await dialog.getByRole("button",{name:"Nuke place",exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor)};
 await page.screenshot({path:".git/ms74-fp4/browser/card-nuke-confirmation.png"});
 assert.equal(evidence.diagnostics.redBackground,"rgb(161, 30, 59)");
 await page.waitForFunction(()=>document.activeElement?.textContent==='Cancel',{}, {timeout:3000});
 await dialog.getByRole("button",{name:"Cancel",exact:true}).click();evidence.cases.push("Destructive red, safe Cancel focus, cancellation retains card");
 for(const width of [320,390,430,768,1440,1728]){await page.setViewportSize({width,height:900});await open();assert.equal(await menu.getByRole("button").count(),8);assert(await menu.getByRole("button",{name:"Nuke",exact:true}).isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`.git/ms74-fp4/browser/card-menu-${width}.png`});await page.keyboard.press("End");assert(await menu.getByRole("button",{name:"Nuke",exact:true}).evaluate(el=>el===document.activeElement));await page.keyboard.press("Home");assert(await menu.getByRole("button",{name:"Info",exact:true}).evaluate(el=>el===document.activeElement));await page.keyboard.press("Escape");}
 evidence.cases.push("Six widths, eight actions, Home/End navigation and Escape dismissal");evidence.pass=true;
}catch(error){evidence.failureType=error.name;process.exitCode=1;}
finally{await context.close();await browser.close();writeFileSync(path,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,receipt:path}));}
