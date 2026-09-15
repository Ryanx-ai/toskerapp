import assert from "node:assert/strict";
import {run,ev,until,button} from "./browser-fp2.mjs";
const a="ms72-a",b="ms72-b",origin="http://localhost:3000",personal="/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa";
const bio="MS7.2 transient profile privacy QA",qaName="MS7.2 Identity QA A";
async function recover(s) {
  await until(s,"!!document.querySelector('.composer textarea')||[...document.querySelectorAll('button')].some(e=>['Edit Profile','Reload workspace'].includes(e.textContent))","settled local auth UI");
  if(await ev(s,"[...document.querySelectorAll('button')].some(e=>e.textContent==='Reload workspace')")) { await button(s,"Reload workspace"); console.log("Normal local workspace recovery",s); }
}
async function edit(s=a) { await run(s,"open",origin+"/profile"); await recover(s); await until(s,"[...document.querySelectorAll('button')].some(e=>e.textContent==='Edit Profile')","Profile"); await button(s,"Edit Profile"); await until(s,"!!document.querySelector('input[name=displayName]')","editor"); }
async function save(s=a) {
  const enabled=await ev(s,"!!document.querySelector('.scoped-settings-footer .primary-action:not(:disabled)')");
  if(enabled) { await button(s,"Save Profile"); await until(s,"!document.querySelector('.scoped-settings-shell')","saved profile",45000); }
  else await button(s,"Cancel");
}
async function identity(name,value) { await edit(); await run(a,"fill","input[name=displayName]",name); await run(a,"fill","input[name=namecardBio]",value || "x"); if(!value) await run(a,"press","Backspace"); await save(); }
async function status(value) { await edit(); await button(a,"Status"); await run(a,"select",".owner-profile-field select",value); await save(); }
async function privacy(details,statusValue) { await edit(); await button(a,"Privacy"); await run(a,"select",".scoped-settings-section > label:nth-of-type(1) select",details); await run(a,"select",".scoped-settings-section > label:nth-of-type(2) select",statusValue); await save(); }
for(const s of [a,b]) await run(s,"set","viewport","1440","900");
await run(a,"tab","t1"); await edit();
const base=await ev(a,"({name:document.querySelector('input[name=displayName]').value,bio:document.querySelector('input[name=namecardBio]').value})");
await button(a,"Status"); base.status=await ev(a,"document.querySelector('.owner-profile-field select').value");
await button(a,"Privacy"); [base.detailsAudience,base.statusAudience]=await ev(a,"[...document.querySelectorAll('.owner-profile-field select')].map(e=>e.value)");
await button(a,"Cancel");
await run(b,"open",origin+personal); await recover(b); await until(b,"!!document.querySelector('.composer textarea')","B Personal Chat");
await button(b,`Organize ${base.name}`); await button(b,"Open Namecard"); await until(b,"!!document.querySelector('.namecard-handle')","B Namecard");
let extraTab=false;
try {
  await privacy("self","self");
  console.log("Saved self audiences; awaiting B projection");
  await until(b,"!!document.querySelector('.namecard-handle')&&!document.querySelector('.namecard-status')&&!document.querySelector('.namecard-bio')","B fields withheld");
  await identity(qaName,bio);
  console.log("Saved QA identity; awaiting B projection");
  await until(b,`document.querySelector('.contextual-namecard')?.textContent.includes(${JSON.stringify(qaName)})`,"B new global name");
  assert(await ev(b,"!document.querySelector('.namecard-bio')&&!document.querySelector('.namecard-status')"));
  await privacy("friends","friends");
  console.log("Saved friend audiences; awaiting B projection");
  await until(b,`document.querySelector('.namecard-bio')?.textContent===${JSON.stringify(bio)}&&!!document.querySelector('.namecard-status')`,"B friend-visible details/status");
  await status("meeting"); await until(b,"document.querySelector('.namecard-status')?.textContent==='In a meeting'","B manual status metadata");
  await privacy("self","self");
  await until(b,"!document.querySelector('.namecard-bio')&&!document.querySelector('.namecard-status')","B revocation without reload");
  await run(b,"press","Escape");
  await until(b,"!document.querySelector('.header-presence')","Personal header withholding");
  await run(b,"open",origin+personal); await until(b,"!!document.querySelector('.composer textarea')","B reload");
  assert(await ev(b,"!document.querySelector('.header-presence')"));
  console.log("PASS real A/B global rename, optional bio/status sharing and revocation without reload; header/reload withholding");
  await edit(); await run(a,"fill","input[name=displayName]","Unsaved stale profile QA");
  await run(a,"tab","new","--label","ms72-profile-stale",origin+"/profile"); extraTab=true;
  await status("idle");
  await run(a,"tab","close","ms72-profile-stale"); extraTab=false; await run(a,"tab","t1");
  await button(a,"Save Profile"); await until(a,"document.querySelector('.owner-profile-save [role=alert]')?.textContent.includes('changed elsewhere')","optimistic conflict");
  assert.equal(await ev(a,"document.querySelector('input[name=displayName]').value"),"Unsaved stale profile QA");
  await button(a,"Discard draft and reload saved profile");
  await until(a,`document.querySelector('input[name=displayName]')?.value===${JSON.stringify(qaName)}`,"explicit conflict recovery");
  await button(a,"Cancel");
  console.log("PASS two-tab stale save refused, draft retained, explicit reload recovers");
} catch(error) { console.error("Acceptance stopped:",error.message); throw error; } finally {
  if(extraTab) { await run(a,"tab","close","ms72-profile-stale"); }
  await run(a,"tab","t1");
  if(await ev(a,"!!document.querySelector('.scoped-settings-shell')")) {
    if(await ev(a,"!!document.querySelector('.settings-discard')")) await button(a,"Discard");
    else { await button(a,"Cancel"); if(await ev(a,"!!document.querySelector('.settings-discard')")) await button(a,"Discard"); }
  }
  await identity(base.name,base.bio); await status(base.status); await privacy(base.detailsAudience,base.statusAudience);
  await edit();
  assert.equal(await ev(a,"document.querySelector('input[name=displayName]').value"),base.name);
  assert.equal(await ev(a,"document.querySelector('input[name=namecardBio]').value"),base.bio);
  await button(a,"Status"); assert.equal(await ev(a,"document.querySelector('.owner-profile-field select').value"),base.status);
  await button(a,"Privacy"); assert.deepEqual(await ev(a,"[...document.querySelectorAll('.owner-profile-field select')].map(e=>e.value)"),[base.detailsAudience,base.statusAudience]);
  await button(a,"Cancel");
  console.log("RESTORED A's original name, bio, status and audiences through owner UI; identifiers/private aliases/other users untouched");
}
