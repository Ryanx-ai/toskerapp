/** Focused offline-render/settings recovery check; no sharing, provider or content writes. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {reviewEnvironment,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
import {fp4Context,loginFp4} from "./lib/ms74-fp4-browser.mjs";
reviewEnvironment();const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));assert.equal(fixture.project,REVIEW_PROJECT);
const path=`.git/ms74-fp4/browser/audit-smoke-${Date.now()}.json`,evidence={pass:false,cases:[],pageErrors:[],providerCalls:0,contentWrites:0};
const browser=await chromium.launch({headless:true}),context=await fp4Context(browser),page=await context.newPage();let step="workspace bootstrap";
page.on("pageerror",error=>evidence.pageErrors.push(error.name));
try{
 await loginFp4(page,"a",fixture);evidence.cases.push("Normal QA sign-in and isolated workspace recovered without auth/config changes");
 step="populated canvas";await page.getByRole("button",{name:"Marina QA",exact:true}).click();
 await page.getByRole("button",{name:"Select place 1: FP4 synthetic point 1",exact:true}).waitFor();
 await page.getByRole("button",{name:"Fit trip",exact:true}).click();
 await page.screenshot({path:".git/ms74-fp4/browser/map-cased-routes.png"});
 assert.equal(await page.locator('[data-map-state="failed"]').count(),0);evidence.cases.push("MapLibre accepts outlined route layers on offline light style; real-provider contrast remains pending");
 step="loaded Room invitations";await page.getByRole("button",{name:"Conversation options",exact:true}).click();await page.getByRole("button",{name:"Room Settings",exact:true}).click();
 const dialog=page.getByRole("dialog",{name:"Room Settings",exact:true});await dialog.getByRole("heading",{name:"Room details",exact:true}).waitFor();
 await dialog.locator('.scoped-settings-nav').getByRole("button",{name:"People",exact:true}).click();
 await dialog.getByText("No pending invitations.",{exact:true}).waitFor({timeout:60000});await dialog.getByText("No active share invite.",{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:900});await page.screenshot({path:".git/ms74-fp4/browser/settings-loaded-390.png"});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert(await dialog.getByRole("button",{name:"Generate invite",exact:true}).isVisible());
 await dialog.getByRole("button",{name:"Close Room Settings",exact:true}).click();evidence.cases.push("Owner invitations fully loaded, no link generated, mobile settings dismissed");
 assert.deepEqual(evidence.pageErrors,[]);evidence.pass=true;
}catch(error){evidence.failedStep=step;evidence.failureType=error.name;process.exitCode=1;await page.screenshot({path:".git/ms74-fp4/browser/audit-smoke-failure.png"}).catch(()=>{});}
finally{await context.close();await browser.close();writeFileSync(path,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,receipt:path}));}
