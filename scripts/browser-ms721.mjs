import assert from "node:assert/strict";
import {run,ev,until,button} from "./browser-fp2.mjs";
const a="fp4-a2",b="fp4-b",origin="http://localhost:3000";
await run(a,"open",origin+"/profile"); await until(a,"[...document.querySelectorAll('button')].some(e=>e.textContent==='Edit Profile')","editable own Profile");
await button(a,"Edit Profile"); await until(a,"!!document.querySelector('.owner-profile-field input')","Profile editor");
const original=await ev(a,"document.querySelector('.owner-profile-field input').value");
await run(a,"fill",".owner-profile-field input","MS7.2.1 QA global identity"); await button(a,"Save Profile"); await until(a,"!document.querySelector('.scoped-settings-shell') && document.querySelector('.namecard h2')?.textContent==='MS7.2.1 QA global identity'","accepted global name",45000);
await run(b,"open",origin+"/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa"); await until(b,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","other viewer"); await run(b,"click",".header-identity-zone > .namecard-trigger"); await until(b,"document.querySelector('.contextual-namecard')?.textContent.includes('MS7.2.1 QA global identity')","global identity projection"); await button(b,"Close Namecard");
await run(a,"open",origin+"/profile"); await until(a,"document.querySelector('.namecard h2')?.textContent==='MS7.2.1 QA global identity'","name survives reload");
await button(a,"Edit Profile"); await until(a,"!!document.querySelector('.owner-profile-field input')","restore editor"); await run(a,"fill",".owner-profile-field input",original); await button(a,"Save Profile"); await until(a,`!document.querySelector('.scoped-settings-shell') && document.querySelector('.namecard h2')?.textContent===${JSON.stringify(original)}`,"original global name restored",45000);
for(const [width,height] of [[390,844],[1440,900]]) {
  await run(a,"set","viewport",String(width),String(height)); await button(a,"Edit Profile"); await until(a,"!!document.querySelector('.owner-profile-field input')","editor");
  await button(a,"Status");
  const geometry=await ev(a,"(()=>{const e=document.querySelector('.scoped-settings-shell'),r=e.getBoundingClientRect();return {x:r.left,right:r.right,bottom:r.bottom,overflow:e.scrollWidth-e.clientWidth,w:innerWidth,h:innerHeight}})()");
  assert(geometry.x>=0&&geometry.right<=geometry.w&&geometry.bottom<=geometry.h&&geometry.overflow<=2);
  await run(a,"screenshot",`/tmp/tosker-fp4-font-review.jZ9m3A/profile-ms721-${width}.png`); await button(a,"Cancel");
  assert.equal(await ev(a,"document.activeElement?.textContent"),"Edit Profile");
}
await run(a,"open",origin+"/settings"); await until(a,"!!document.querySelector('.owner-settings-links')","Settings entry"); assert.equal(await ev(a,"document.querySelectorAll('.settings-list button[disabled]').length"),0); await run(a,"click",".owner-settings-links a[href='/profile']"); await until(a,"location.pathname==='/profile' && !!document.querySelector('.namecard')","Profile link");
await button(a,"Edit Profile"); await button(a,"Status");
const originalStatus=await ev(a,"document.querySelector('.owner-profile-field select').value");
const nextStatus=originalStatus==="meeting"?"away":"meeting";
await run(a,"select",".owner-profile-field select",nextStatus); await button(a,"Save Profile"); await until(a,"!document.querySelector('.scoped-settings-shell')","status saved");
await run(b,"click",".header-identity-zone > .namecard-trigger"); await until(b,`!!document.querySelector('.namecard-status .presence-mark.${nextStatus}')`,"peer sees selected status"); await button(b,"Close Namecard");
await run(a,"open",origin+"/profile"); await until(a,"[...document.querySelectorAll('button')].some(e=>e.textContent==='Edit Profile')","Profile reload"); await button(a,"Edit Profile"); await button(a,"Status"); assert.equal(await ev(a,"document.querySelector('.owner-profile-field select').value"),nextStatus);
await run(a,"select",".owner-profile-field select",originalStatus); await button(a,"Save Profile"); await until(a,"!document.querySelector('.scoped-settings-shell')","original status restored");
assert.deepEqual(await run(a,"errors"),{errors:[]}); assert.deepEqual(await run(b,"errors"),{errors:[]});
console.log("PASS owner Profile name/status save/reload/peer Namecard projection; exact name and status restored; 390/1440 editor bounds/cancel focus and real Settings Profile link; A/B browser errors empty");
