import assert from "node:assert/strict";
import {run,ev,until,button} from "./browser-fp2.mjs";
const a="ms72-a",b="ms72-b",origin="http://localhost:3000";
async function settings(){await run(a,"open",origin+"/settings?section=notifications");await until(a,"!!document.querySelector('.owner-profile-field select')","notification settings");}
async function change(value){await run(a,"select",".owner-profile-field select",value);if(await ev(a,"!document.querySelector('.primary-action[form]').disabled")){await button(a,"Save changes");await until(a,"document.querySelector('.primary-action[form]').disabled&&document.querySelector('.owner-profile-save [role=status]')?.textContent==='Changes saved.'","saved");}}
async function home(){await button(a,"Close");await until(a,"location.pathname==='/app'&&!document.querySelector('.scoped-settings-shell')","home");}
const countExpr="(()=>{const a=[...document.querySelectorAll('a')].find(e=>e.getAttribute('aria-label')?.startsWith('Notifications'));return Number(a?.getAttribute('aria-label')?.match(/(\\d+) unread/)?.[1]??0)})()";
await run(a,"set","viewport","1440","900");await run(b,"set","viewport","1440","900");
await settings();const original=await ev(a,"document.querySelector('.owner-profile-field select').value");let extra=false;
try{
  await run(a,"tab","new","--label","ms72-settings-peer",origin+"/settings?section=notifications");extra=true;
  await until(a,"!!document.querySelector('.owner-profile-field select')","second same-user tab");
  await run(a,"tab","t1");await change("quiet");
  await run(a,"tab","ms72-settings-peer");await until(a,"document.querySelector('.owner-profile-field select')?.value==='quiet'","same-user preference refresh");
  await run(a,"tab","close","ms72-settings-peer");extra=false;await run(a,"tab","t1");await home();
  await run(b,"open",origin+"/room/ms722-frame-qa");await until(b,"!!document.querySelector('.composer textarea')","B QA Room");
  assert(!await ev(b,"document.querySelector('.chat-surface')?.textContent.includes('MS7.2 banner QA')"),"Remove previous exact QA messages before repeating");
  for(const mode of ["quiet","all","direct_mentions"]){
    if(mode!=="quiet"){await settings();await change(mode);await home();}
    const before=await ev(a,countExpr);
    const body=`MS7.2 banner QA ${mode==='direct_mentions'?'direct':mode}`;
    await run(b,"fill",".composer textarea",body);await button(b,"Send message");
    await until(a,`${countExpr}>${before}`,"durable bell increment",45000);
    if(mode==="all")assert(await ev(a,"!!document.querySelector('.activity-toast')"),"All shows Room banner");
    else assert(await ev(a,"!document.querySelector('.activity-toast')"),`${mode} suppresses Room banner but preserves unread`);
    console.log("PASS",mode,"real B→A Room notification: bell preserved, banner rule correct");
  }
  console.log("PASS same-user clean Settings revalidation; no full page reload required");
}finally{
  if(extra)await run(a,"tab","close","ms72-settings-peer");await run(a,"tab","t1");await settings();await change(original);await home();
  console.log("RESTORED original A banner preference. Run guarded ms725-banner-fixtures.ts cleanup for exact transient QA messages.");
}
