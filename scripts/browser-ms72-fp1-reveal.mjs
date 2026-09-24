import assert from "node:assert/strict";
import {run,ev,until,button} from "./browser-fp2.mjs";
const s=process.env.FP1_SESSION??"fp1-a",origin=process.env.FP1_ORIGIN??"http://localhost:3000";
await run(s,"set","viewport","1440","900"); await run(s,"open",origin+"/profile");
await until(s,"!!document.querySelector('.profile-shortcuts')","Profile"); await button(s,"Edit Profile");
const before=await ev(s,"document.querySelector('input[name=displayName]').value");
async function save(value) {await run(s,"fill","input[name=displayName]",value);await button(s,"Save Profile");await until(s,"!document.querySelector('.scoped-settings-shell')","saved");}
try {
  await save("Long identity العربية "+"W".repeat(45));
  const selector=".profile-surface h2 .reveal-name";
  await until(s,`document.querySelector('${selector}')?.dataset.overflow==='true'`,"overflow measured");
  const width=await ev(s,`document.querySelector('${selector}').getBoundingClientRect().width`);
  await run(s,"hover",selector);
  await until(s,`getComputedStyle(document.querySelector('${selector} > span')).transform!=='none'`,"deliberate hover reveal");
  assert.equal(await ev(s,`document.querySelector('${selector}').getBoundingClientRect().width`),width);
  await run(s,"hover",".profile-shortcuts");
  await until(s,`getComputedStyle(document.querySelector('${selector} > span')).transform==='none'`,"pointer leave resets");
  await run(s,"focus",selector);
  await run(s,"press","Shift+Tab"); await run(s,"press","Tab");
  await until(s,`getComputedStyle(document.querySelector('${selector} > span')).transform!=='none'`,"keyboard reveal");
  await run(s,"set","media","dark","reduced-motion");
  assert(await ev(s,"matchMedia('(prefers-reduced-motion:reduce)').matches"));
  assert.equal(await ev(s,`getComputedStyle(document.querySelector('${selector} > span')).transform`),"none");
  assert.equal(await ev(s,`getComputedStyle(document.querySelector('${selector}')).overflowX`),"auto");
  console.log("PASS real long name, hover/focus reveal, fixed geometry, leave reset, reduced-motion scroll fallback");
} finally {
  await run(s,"set","media","dark"); await run(s,"open",origin+"/profile"); await until(s,"!!document.querySelector('.profile-shortcuts')","Profile");
  await button(s,"Edit Profile"); await save(before); console.log("RESTORED exact original display name through owner UI");
}
