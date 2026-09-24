import { run, until, button } from "./browser-fp2.mjs";
const s=process.env.FP1_SESSION??"fp1-a", origin=process.env.FP1_ORIGIN??"http://localhost:3000";
const results={};
async function sample(name,action,ready) {
  const start=performance.now(); await action(); await until(s,ready,name,45000);
  (results[name]??=[]).push(Math.round(performance.now()-start));
}
await run(s,"set","viewport","1440","900");
for(let i=0;i<3;i++) {
  await sample("authenticated Profile reload",()=>run(s,"open",origin+"/profile"),"!!document.querySelector('.profile-surface .namecard')");
  await sample("Settings open",()=>run(s,"click",".profile-actions a[href='/settings']"),"!!document.querySelector('.owner-profile-field input')");
  await sample("Settings category",()=>button(s,"Notifications"),"document.querySelector('.scoped-settings-body')?.getAttribute('aria-label')==='Notifications'");
  await run(s,"open",origin+"/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa");
  await until(s,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","Personal");
  await sample("Namecard open",()=>run(s,"click",".header-identity-zone > .namecard-trigger"),"!!document.querySelector('.namecard-common')");
  await run(s,"press","Escape");
  await run(s,"open",origin+"/room/ms722-frame-qa"); await until(s,"!!document.querySelector('.composer textarea')","Room");
  await button(s,"Conversation options");
  await sample("Room Settings open",()=>button(s,"Room Settings"),"!!document.querySelector('.scoped-settings-form input')");
  await button(s,"Close Room Settings");
}
console.log(JSON.stringify({label:process.env.FP1_LABEL??"unspecified",origin,method:"wall-clock UI trigger to ready assertion; includes CLI/poll overhead; dev compilation may affect first sample",milliseconds:results},null,2));
