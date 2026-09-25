import assert from "node:assert/strict";
import {run,ev,until,button} from "./browser-fp2.mjs";
const s=process.env.FP1_SESSION??"fp1-a",origin=process.env.FP1_ORIGIN??"http://localhost:3000",captures=process.env.FP1_CAPTURES;
assert(captures,"capture directory required");
async function bounds(selector,pageContent=false) {
  const r=await ev(s,`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,overflow:e.scrollWidth-e.clientWidth}})()`);
  assert(r.x>=-1&&r.y>=-1&&r.right<=r.w+1&&(pageContent||r.bottom<=r.h+1)&&r.overflow<=2,JSON.stringify({selector,...r}));
}
await run(s,"open",origin+"/profile"); await until(s,"!!document.querySelector('.profile-shortcuts')","Profile");
await run(s,"set","viewport","1440","900");
assert.equal(await ev(s,"document.querySelectorAll('.messenger-sidebar .product-nav a').length"),0);
assert(await ev(s,"!!document.querySelector('.profile-actions a[href=\"/friends\"]')&&!document.querySelector('.profile-actions a[href=\"/help\"]')"));
await button(s,"Open your Namecard"); await until(s,"!!document.querySelector('.namecard-edit-profile')","self Namecard");
await button(s,"Edit Profile"); await until(s,"!!document.querySelector('input[name=displayName]')","direct edit");
const saved=await ev(s,"document.querySelector('input[name=displayName]').value");
await run(s,"fill","input[name=displayName]","Unsaved FP1 draft"); await button(s,"Cancel"); await button(s,"Keep editing");
assert.equal(await ev(s,"document.querySelector('input[name=displayName]').value"),"Unsaved FP1 draft");
await button(s,"Cancel"); await button(s,"Discard"); await until(s,"!!document.querySelector('.namecard-edit-profile')","self return");
await until(s,"document.activeElement?.classList.contains('namecard-edit-profile')","editor focus return");
assert(await ev(s,`document.querySelector('.contextual-namecard h2').textContent===${JSON.stringify(saved)}`));
await run(s,"press","Escape"); await until(s,"!document.querySelector('dialog[open]')","close self");
assert(await ev(s,"document.activeElement?.classList.contains('profile-avatar-button')"));
console.log("PASS self Namecard direct edit, dirty keep/discard, nested and trigger focus return; Friends relocation");
for(const [w,h] of (process.env.FP1_SHORT_ONLY ? [[844,390]] : [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117],[844,390]])) {
  await run(s,"set","viewport",String(w),String(h)); await bounds('.profile-surface .namecard',true);
  // A page may scroll vertically; unlike a modal, it need not fit in one short viewport.
  await run(s,"scrollintoview",'.profile-shortcuts');await bounds('.profile-shortcuts');
  await run(s,"screenshot",`${captures}/profile-${w}x${h}.png`);
  // Namecard from a real conversation also works when the desktop sidebar is hidden.
  await run(s,"open",origin+"/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa");
  await until(s,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","Personal");
  await run(s,"click",".header-identity-zone > .namecard-trigger"); await until(s,"!!document.querySelector('.namecard-common')","peer card");
  assert(await ev(s,"!document.querySelector('.namecard-edit-profile')")); await bounds('.contextual-namecard');
  await run(s,"screenshot",`${captures}/namecard-${w}x${h}.png`); await run(s,"press","Escape");
  await run(s,"open",origin+"/settings"); await until(s,"!!document.querySelector('.owner-profile-field input')","Settings"); await bounds('.scoped-settings-shell');
  assert.equal(await ev(s,"[...document.querySelectorAll('.scoped-settings-nav button')].map(e=>e.textContent).join('|')"),"Profile|Status|Privacy|Personal Brand|Account|Notifications|Appearance|Support");
  await run(s,"screenshot",`${captures}/settings-${w}x${h}.png`);
  await run(s,"open",origin+"/profile"); await until(s,"!!document.querySelector('.profile-shortcuts')","Profile");
  console.log("PASS compact Profile/Namecard/Settings",w,h);
}
await run(s,"set","viewport","1440","900"); await run(s,"open",origin+"/settings"); await until(s,"!!document.querySelector('.owner-profile-field input')","Settings");
await button(s,"Notifications"); await until(s,"location.search==='?section=notifications'","category URL");
await run(s,"back"); await until(s,"document.querySelector('.scoped-settings-body')?.getAttribute('aria-label')==='Profile'","history back");
console.log("PASS native Settings history retains Back behavior; no saved data changed");
