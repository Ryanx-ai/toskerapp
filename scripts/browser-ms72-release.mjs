import assert from "node:assert/strict";
import {run,ev,until,button} from "./browser-fp2.mjs";
const a=process.env.MS72_A??"ms72-a",b=process.env.MS72_B??"ms72-b",origin=process.env.MS72_ORIGIN??"http://localhost:3000";
async function settings(s,section) {
  await run(s,"open",`${origin}/settings?section=${section}`);
  await until(s,"!!document.querySelector('.scoped-settings-shell')||[...document.querySelectorAll('button')].some(e=>e.textContent==='Reload workspace')","settled Settings");
  if(await ev(s,"[...document.querySelectorAll('button')].some(e=>e.textContent==='Reload workspace')"))await button(s,"Reload workspace");
  await until(s,"!!document.querySelector('.scoped-settings-shell')","Settings");
}
const tids={};
for(const s of [a,b]) {
  await run(s,"set","viewport","1440","900"); await settings(s,"profile");
  tids[s]=await ev(s,"[...document.querySelectorAll('.owner-profile-identifiers div')].find(e=>e.querySelector('dt')?.textContent==='TID').querySelector('dd').firstChild.textContent.trim()");
  assert.match(tids[s],/^[A-Z0-9]{7}$/);
  await button(s,"Copy TID"); await until(s,"document.querySelector('.tid-copy [role=status]').textContent==='TID copied.'","clipboard success");
}
assert.notEqual(tids[a],tids[b]);
await settings(a,"support");
assert.equal(await ev(a,"[...document.querySelectorAll('.scoped-settings-body a')].find(e=>e.textContent==='Contact support')?.getAttribute('href')"),"mailto:ryanchinqf2@gmail.com");
await settings(a,"account");
assert(await ev(a,"!document.querySelector('input[type=password]')&&![...document.querySelectorAll('.scoped-settings-body button')].some(e=>/delete|manage account/i.test(e.textContent))"));
console.log("PASS A/B canonical TIDs, successful Copy TID, real mailto destination, no full provider/deletion control");
await run(a,"open",origin+"/friends");await until(a,"!!document.querySelector('.friends-search input')","Friends");
for(const term of [tids[b].toLowerCase(),` ${tids[b]} `,tids[b].slice(0,6),`TID-${tids[b]}`]) {
  await run(a,"fill",".friends-search input",term);
  await until(a,"!!document.querySelector('#friend-discovery[aria-busy=false]')","discovery settled");
  const found=await ev(a,`document.querySelector('.discovery-results')?.textContent.includes(${JSON.stringify(tids[b])})??false`);
  assert.equal(found,term.trim().length===7,term);
}
console.log("PASS lowercase/trim exact TID discovery; partial/legacy-style input does not match TID");
await run(a,"open",origin+"/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa");
await until(a,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","Personal header");
await run(a,"click",".header-identity-zone > .namecard-trigger");
await until(a,"!!document.querySelector('.contextual-namecard .namecard-handle')","peer Namecard");
assert(await ev(a,`document.querySelector('.contextual-namecard .identity-tid').textContent==='TID '+${JSON.stringify(tids[b])}`));
await run(a,"click",".contextual-namecard button[aria-label='Copy TID']");
await until(a,"document.querySelector('.contextual-namecard .tid-copy [role=status]').textContent==='TID copied.'","peer clipboard");
await run(a,"click",".contextual-namecard .overlay-close");
await settings(a,"profile");
for(const [w,h] of [[390,844],[430,932],[1440,900],[1728,1117],[844,390]]) {
  await run(a,"set","viewport",String(w),String(h));
  const box=await ev(a,"(()=>{const e=document.querySelector('.scoped-settings-shell'),r=e.getBoundingClientRect(),b=e.querySelector('.scoped-settings-body');return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:b.scrollWidth-b.clientWidth}})()");
  assert(box.x>=0&&box.y>=0&&box.right<=w+1&&box.bottom<=h+1&&box.overflow<=1,JSON.stringify(box));
}
await run(a,"set","viewport","1440","900");
console.log("PASS peer Namecard canonical/copy and responsive Profile with copy control; no profile/history mutation");
