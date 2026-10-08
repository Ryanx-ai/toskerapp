/** Bounded fresh provider discovery. No result is selected or saved by this step. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!fixture.retained);
const browser=await chromium.launch({args:["--use-angle=swiftshader"]});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),evidence=[];
try{
  await page.goto(`http://localhost:3000/room/${fixture.slug}`);await ensureFp6QaLogin(page);await page.goto(`http://localhost:3000/room/${fixture.slug}`);
  const search=page.getByRole("textbox",{name:"Search places",exact:true});await search.waitFor();await page.getByLabel("Travel mode",{exact:true}).selectOption("planning");
  const initial=await page.locator('[data-trip-revision]').getAttribute('data-trip-revision');
  for(const query of ["MBS","Bukit Timah Nature Reserve","Jewel Changi Airport","Jurong East MRT","Woodlands MRT","JB"]){
    const pending=page.waitForResponse(r=>r.url().endsWith('/places')&&r.request().postDataJSON()?.kind==='search',{timeout:30000});
    await search.fill(query);const response=await pending,body=await response.json();assert.equal(response.status(),200,JSON.stringify(body));assert(body.candidates?.length);
    await page.locator('[aria-label="Place search results"]').waitFor();
    evidence.push({query,status:response.status(),...body});
    writeFileSync('.git/fp6-recovery/release-search.json',JSON.stringify(evidence,null,2),{mode:0o600});
    console.log(JSON.stringify({query,choices:body.candidates.map(({candidate:c})=>({title:c.title,address:c.address,latitude:c.latitude,longitude:c.longitude,providerId:c.providerId,attribution:c.attribution,license:c.license}))}));
    assert.equal(await page.getByRole('button',{name:'Add to Route',exact:true}).count(),0);assert.equal(await page.locator('[data-trip-revision]').getAttribute('data-trip-revision'),initial);
    await page.waitForTimeout(1400);
  }
  console.log('PASS six fresh debounced searches; no Enter, no selection or save, revision unchanged');
}catch(e){await page.screenshot({path:'.git/fp6-recovery/release-search-failure.png'});console.error({failure:'release search',message:String(e.message).slice(0,1500)});process.exitCode=1;}
finally{await browser.close();}
