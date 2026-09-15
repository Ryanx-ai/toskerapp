import assert from "node:assert/strict";
import {run,ev,until,button} from "./browser-fp2.mjs";
const a="ms72-a",b="ms72-b",origin="http://localhost:3000";
async function open(s,section="profile") {
  await run(s,"open",`${origin}/settings?section=${section}`);
  await until(s,"!!document.querySelector('.scoped-settings-shell')||[...document.querySelectorAll('button')].some(e=>e.textContent==='Reload workspace')","settled Settings");
  if(await ev(s,"[...document.querySelectorAll('button')].some(e=>e.textContent==='Reload workspace')")) await button(s,"Reload workspace");
  await until(s,"!!document.querySelector('.scoped-settings-shell')","Settings");
}
const ids={Profile:"profile",Status:"status",Privacy:"privacy",Account:"account",Notifications:"notifications",Appearance:"appearance",Language:"language","Personal Brand":"brand",Support:"support"};
async function section(s,label) {
  if(await ev(s,"!!document.querySelector('.settings-category-trigger')?.checkVisibility()")) await run(s,"click",".settings-category-trigger");
  await button(s,label);
  await until(s,`new URLSearchParams(location.search).get('section')===${JSON.stringify(ids[label])}`,label);
}
async function save() {
  if(await ev(a,"!document.querySelector('.scoped-settings-footer .primary-action').disabled")) {
    await button(a,"Save changes"); await until(a,"document.querySelector('.owner-profile-save [role=status]')?.textContent==='Changes saved.'&&document.querySelector('.scoped-settings-footer .primary-action').disabled","saved",45000);
  }
}
async function dimensions(s) {
  return ev(s,"(()=>{const e=document.querySelector('.scoped-settings-shell'),r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,vw:innerWidth,vh:innerHeight,overflow:e.querySelector('.scoped-settings-body').scrollWidth-e.querySelector('.scoped-settings-body').clientWidth}})()");
}
for(const s of [a,b]) await run(s,"set","viewport","1440","900");
await open(a,"brand");
const original={accent:await ev(a,"document.querySelector('input[name=identityAccent]:checked').value")};
await section(a,"Privacy"); original.audience=await ev(a,"document.querySelector('.owner-profile-field select').value");
await section(a,"Notifications"); original.banner=await ev(a,"document.querySelector('.owner-profile-field select').value");
await open(b,"notifications"); const bBanner=await ev(b,"document.querySelector('.owner-profile-field select').value");
try {
  for(const [w,h] of [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]]) {
    await run(a,"set","viewport",String(w),String(h)); const before=await dimensions(a);
    for(const label of Object.keys(ids)) {
      await section(a,label); const r=await dimensions(a);
      assert(r.x>=0&&r.y>=0&&r.right<=r.vw+1&&r.bottom<=r.vh+1&&r.overflow<=1,JSON.stringify({label,...r})); assert.equal(r.h,before.h); assert.equal(r.y,before.y);
    }
  }
  console.log("PASS nine addressable categories, stable frame/scroll bounds at six widths");
  await section(a,"Profile"); const name=await ev(a,"document.querySelector('input[name=displayName]').value");
  await run(a,"fill","input[name=displayName]","Unsaved Settings draft");
  await button(a,"Account"); await button(a,"Keep editing");
  assert.equal(await ev(a,"document.querySelector('input[name=displayName]').value"),"Unsaved Settings draft");
  await button(a,"Account"); await button(a,"Discard"); await until(a,"document.querySelector('.scoped-settings-body')?.textContent.includes('Account management')","Account boundary");
  assert(await ev(a,"!document.querySelector('input[type=password]')&&![...document.querySelectorAll('.scoped-settings-body button')].some(e=>/delete/i.test(e.textContent))"));
  await section(a,"Profile"); assert.equal(await ev(a,"document.querySelector('input[name=displayName]').value"),name);
  await section(a,"Personal Brand"); await run(a,"check","input[value=rose]"); await save();
  await section(a,"Privacy"); await run(a,"select",".owner-profile-field:nth-of-type(1) select","friends"); await save();
  await run(b,"open",origin+"/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa"); await until(b,"!!document.querySelector('.composer textarea')","B Personal");
  await button(b,`Organize ${name}`); await button(b,"Open Namecard"); await until(b,"!!document.querySelector('.contextual-namecard.identity-accent-rose')","B shared accent");
  await run(a,"select",".owner-profile-field:nth-of-type(1) select","self"); await save();
  await until(b,"!!document.querySelector('.contextual-namecard.identity-accent-neutral')","B withheld accent");
  console.log("PASS dirty guard, safe Account boundary, peer accent sharing/revocation without changing workspace theme");
  await section(a,"Notifications"); await run(a,"select",".owner-profile-field select","quiet"); await save();
  await open(a,"notifications"); assert.equal(await ev(a,"document.querySelector('.owner-profile-field select').value"),"quiet");
  await open(b,"notifications"); assert.equal(await ev(b,"document.querySelector('.owner-profile-field select').value"),bBanner);
  console.log("PASS Quiet persists on reload; B account preference unchanged");
} catch(error) {console.error("Settings acceptance stopped:",error.message); throw error;} finally {
  await run(a,"set","viewport","1440","900"); await open(a,"brand"); await run(a,"check",`input[value=${original.accent}]`); await save();
  await section(a,"Privacy"); await run(a,"select",".owner-profile-field:nth-of-type(1) select",original.audience); await save();
  await section(a,"Notifications"); await run(a,"select",".owner-profile-field select",original.banner); await save();
  await button(a,"Close");
  console.log("RESTORED A accent, details audience and banner preference; global names/auth/identifiers unchanged");
}
