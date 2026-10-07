import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!fixture.retained);
const ba=await chromium.connectOverCDP(process.env.FP6_CDP),bb=await chromium.connectOverCDP(process.env.FP6_B_CDP),a=ba.contexts()[0].pages()[0],b=bb.contexts()[0].pages()[0];
const button=(page,name)=>page.getByRole("button",{name,exact:true});
const read=page=>page.locator('[data-trip-revision]').evaluate(e=>({revision:Number(e.dataset.tripRevision),cards:[...e.querySelectorAll('[data-place-id]')].map(e=>({id:e.dataset.placeId,title:e.querySelector('strong')?.textContent}))}));
try{
  for(const page of[a,b]){await page.setViewportSize({width:1440,height:900});await page.goto(`http://localhost:3000/room/${fixture.slug}`);await page.locator('[data-place-id]').first().waitFor();}
  const base=await read(a);await b.waitForFunction(revision=>Number(document.querySelector('[data-trip-revision]')?.dataset.tripRevision)===revision,base.revision);
  await button(a,`Place actions for ${base.cards[2].title}`).click();await button(b,`Place actions for ${base.cards[3].title}`).click();
  await Promise.all([button(a,"Move earlier").click(),button(b,"Move earlier").click()]);
  for(const page of[a,b])await page.waitForFunction(revision=>Number(document.querySelector('[data-trip-revision]')?.dataset.tripRevision)>revision,base.revision);
  assert.equal((await read(a)).revision,base.revision+1);assert.deepEqual(await read(a),await read(b));
  console.log("PASS simultaneous A/B reorder: one revision winner, loser reconciles, identical canonical card order");
  await a.reload();await a.locator('[data-place-id]').first().waitFor();
  const state=await read(a);await button(a,`Place actions for ${state.cards[0].title}`).click();
  if(await button(a,"Lock position 1").count()){await button(a,"Lock position 1").click();await a.waitForFunction(r=>Number(document.querySelector('[data-trip-revision]')?.dataset.tripRevision)>r,state.revision);}
  await a.keyboard.press("Escape");await button(a,"Quick order").click();
  if(await a.getByRole("button",{name:"Apply suggested order",exact:true}).count()){
    const old=(await read(a)).revision;assert.equal((await read(a)).cards[0].id,state.cards[0].id);await button(a,"Apply suggested order").click();await a.waitForFunction(r=>Number(document.querySelector('[data-trip-revision]')?.dataset.tripRevision)>r,old);
  }else await a.getByText("Already in the quickest order.",{exact:true}).waitFor();
  assert.equal((await read(a)).cards[0].id,state.cards[0].id);console.log("PASS Quick Order retains locked first position and requires explicit application");
}catch(e){console.error({failure:"FP6 A/B reorder",message:String(e.message).slice(0,700)});process.exitCode=1;}
finally{await ba.close();await bb.close();}
