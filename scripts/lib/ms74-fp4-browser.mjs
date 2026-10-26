import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import {installLiveMetrics} from "./ms74-browser.mjs";
export const fp4Origin="http://localhost:3001";
export async function fp4Context(browser){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await installLiveMetrics(context);
 await context.route("**/*geoapify.com/**",route=>new URL(route.request().url()).pathname.endsWith("style.json")?route.fulfill({json:{version:8,sources:{qa:{type:"geojson",data:{type:"FeatureCollection",features:[]},attribution:"Offline QA attribution"}},layers:[{id:"qa-background",type:"background",paint:{"background-color":"#dce8e4"}},{id:"qa-source",type:"circle",source:"qa"}]}}):route.abort());
 return context;
}
export async function loginFp4(page,actor,fixture,origin=fp4Origin){
 assert(!existsSync(".git/ms74-fp4/qa-budget-hold.json"),"FP4 browser QA held for budget reconciliation; preserve previous counters and evidence");
 assert(["a","b"].includes(actor));
 assert([fp4Origin,"http://localhost:3000"].includes(origin));
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
}
