import assert from "node:assert/strict";
import {run,ev,until,button} from "./browser-fp2.mjs";
const a="ms72-a",b="ms72-b",origin="http://localhost:3000",room="/room/ms722-frame-qa";
const qaName="MS7.2 Room nickname QA",longName="Long Room name العربية "+"W".repeat(35);
async function open(s,path=room) {
  await run(s,"open",origin+path);
  await until(s,"!!document.querySelector('.composer textarea')||[...document.querySelectorAll('button')].some(e=>e.textContent==='Reload workspace')","settled workspace");
  if(await ev(s,"[...document.querySelectorAll('button')].some(e=>e.textContent==='Reload workspace')")) await button(s,"Reload workspace");
  await until(s,"!!document.querySelector('.composer textarea')","Chat");
}
async function settings(s) { await button(s,"Conversation options"); await button(s,"Room Settings"); await until(s,"!!document.querySelector('.room-own-identity')","Room Settings"); }
async function edit(s=b) { await settings(s); await button(s,"Your Room identity"); await until(s,"!!document.querySelector('.owner-profile-field input')","Room identity"); }
async function setName(value) {
  await run(b,"fill",".owner-profile-field input",value||"x"); if(!value) await run(b,"press","Backspace");
  await button(b,"Save Room nickname"); await until(b,"!!document.querySelector('.room-own-identity')","saved Room identity");
}
async function bounds(s) {
  const box=await ev(s,"(()=>{const e=document.querySelector('.scoped-settings-shell'),r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,overflow:e.scrollWidth-e.clientWidth,bodyOverflow:e.querySelector('.scoped-settings-body').scrollWidth-e.querySelector('.scoped-settings-body').clientWidth}})()");
  assert(box.x>=0&&box.y>=0&&box.right<=box.w+1&&box.bottom<=box.h+1&&box.overflow<=1&&box.bodyOverflow<=1,JSON.stringify(box));
}
async function section(s,label) { if(await ev(s,"!!document.querySelector('.settings-category-trigger')?.checkVisibility()")) await run(s,"click",".settings-category-trigger"); await button(s,label); }
for(const s of [a,b]) { await run(s,"set","viewport","1440","900"); await open(s); }
await edit(); const base=await ev(b,"document.querySelector('.owner-profile-field input').value");
assert.equal(base,"","Requires untouched scoped QA Room membership");
try {
  await settings(a); await section(a,"People");
  await setName(qaName);
  await until(a,`document.querySelector('.room-member-list')?.textContent.includes(${JSON.stringify(qaName)})`,"A sees nickname via metadata");
  await button(a,`Open ${qaName}'s Namecard`);
  await until(a,`document.querySelector('.contextual-namecard h2')?.textContent===${JSON.stringify(qaName)}`,"Room-scoped Namecard");
  assert(await ev(a,"document.querySelector('.contextual-namecard .settings-scope')?.textContent.includes('MS7.2 Frame QA')"));
  await run(a,"click",".contextual-namecard .overlay-close");
  await button(b,"Close Room Settings"); await open(b); await edit();
  assert.equal(await ev(b,"document.querySelector('.owner-profile-field input').value"),qaName);
  await run(b,"fill",".owner-profile-field input","Unsaved Room identity QA");
  await button(a,`Reset ${qaName}'s Room nickname`); await button(a,"Reset nickname");
  await until(a,"!document.querySelector('.room-confirmation')","owner reset");
  await button(b,"Save Room nickname"); await until(b,"document.querySelector('.scoped-settings-footer [role=alert]')?.textContent.includes('changed elsewhere')","stale member draft refused");
  assert.equal(await ev(b,"document.querySelector('.owner-profile-field input').value"),"Unsaved Room identity QA");
  await button(b,"Discard draft and reload Room identity"); await until(b,"document.querySelector('.owner-profile-field input')?.value===''","reset loaded");
  await setName(longName);
  await until(a,`document.querySelector('.room-member-list')?.textContent.includes(${JSON.stringify(longName)})`,"new member choice");
  for(const [w,h] of [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]]) {
    await run(a,"set","viewport",String(w),String(h)); await bounds(a);
    assert(await ev(a,"[...document.querySelectorAll('.room-member-list li > span')].every(e=>e.getBoundingClientRect().width>=150)"),"Member names retain readable line width, not one character per line");
    if (process.env.MS722_CAPTURES && [390,1440].includes(w)) await run(a,"screenshot",`${process.env.MS722_CAPTURES}/room-identity-people-${w}.png`);
    await run(b,"set","viewport",String(w),String(h)); await button(b,"Your Room identity"); await until(b,"!!document.querySelector('.owner-profile-field input')","editor"); await bounds(b);
    if (process.env.MS722_CAPTURES && [390,1440].includes(w)) await run(b,"screenshot",`${process.env.MS722_CAPTURES}/room-identity-editor-${w}.png`);
    await button(b,"Cancel");
  }
  console.log("PASS real A/B nickname save/reload/metadata, scoped Namecard, owner reset/stale-draft recovery, all six viewport bounds");
  for(const s of [a,b]) await run(s,"set","viewport","1440","900");
  await button(a,"Close Room Settings");
  await open(a,"/room/ms722-frame-qa/subroom/f7220000-2026-4000-8000-000000000003");
  await run(a,"fill",".composer textarea","@Long");
  await until(a,`[...document.querySelectorAll('[role=option]')].some(e=>e.textContent.includes(${JSON.stringify(longName)}))`,"child inherited mention name");
  await run(a,"fill",".composer textarea","x"); await run(a,"press","Backspace");
  console.log("PASS Subroom mention inherits parent identity; no test message sent");
} catch(error) { console.error("Stopped:",error.message); throw error; } finally {
  await run(b,"set","viewport","1440","900");
  await open(b); await edit();
  if(await ev(b,"document.querySelector('.owner-profile-field input').value!==''")) await setName(base); else await button(b,"Cancel");
  await button(b,"Close Room Settings");
  console.log("RESTORED B's scoped Room nickname to blank; global/private identity untouched");
}
