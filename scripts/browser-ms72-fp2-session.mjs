import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.MS72_A??'fp1-a',fresh='fp2-fresh',origin=process.env.MS72_ORIGIN??'http://localhost:3000';
const profile=process.env.FP2_FRESH_PROFILE;
assert(profile,'Provide a new isolated FP2_FRESH_PROFILE directory');
async function open(s,section){await run(s,'open',origin+'/settings?section='+section);await until(s,`!!document.querySelector('input[name=${section==='brand'?'identityAccent':'interfaceAccent'}]')`,'saved preferences');}
async function save(s){if(await ev(s,"!document.querySelector('.scoped-settings-footer .primary-action').disabled")){await button(s,'Save changes');await until(s,"document.querySelector('.owner-profile-save [role=status]')?.textContent==='Changes saved.'&&document.querySelector('.scoped-settings-footer .primary-action').disabled",'save',45000);}}
async function login(){
  await run(fresh,'open',origin+'/app');await button(fresh,'Sign in');
  await run(fresh,'find','label','Email address','fill','tosker.user.a+clerk_test@example.com');await button(fresh,'Continue');
  await until(fresh,"!!document.querySelector('input[autocomplete=one-time-code]')||[...document.querySelectorAll('button,a')].some(e=>e.textContent.includes('Use another method'))",'Clerk method');
  if(!await ev(fresh,"!!document.querySelector('input[autocomplete=one-time-code]')")){
    await run(fresh,'find','text','Use another method','click');await button(fresh,'Email code to tosker.user.a+clerk_test@example.com');
  }
  await until(fresh,"!!document.querySelector('input[autocomplete=one-time-code]')",'test email verification');
  await run(fresh,'fill','input[autocomplete=one-time-code]','424242');
  await until(fresh,"!!document.querySelector('.messaging-app')",'ordinary Clerk login',45000);
}
async function verify(){
  await open(fresh,'brand');
  assert.equal(await ev(fresh,"document.querySelector('input[name=identityBanner]:checked').value"),'weave');
  assert.equal(await ev(fresh,"document.querySelector('input[name=identityFrame]:checked').value"),'ring');
  await open(fresh,'appearance');
  assert.equal(await ev(fresh,"document.querySelector('input[name=interfaceAccent]:checked').value"),'iris');
  assert.equal(await ev(fresh,"document.querySelector('.viewer-appearance').dataset.interfaceAccent"),'iris');
}
await open(a,'brand');const original=await ev(a,"Object.fromEntries(['identityBanner','identityFrame'].map(k=>[k,document.querySelector('input[name='+k+']:checked').value]))");
await open(a,'appearance');original.interfaceAccent=await ev(a,"document.querySelector('input:checked').value");
try{
  await open(a,'brand');await run(a,'check','input[name=identityBanner][value=weave]');await run(a,'check','input[name=identityFrame][value=ring]');await save(a);
  await open(a,'appearance');await run(a,'check','input[name=interfaceAccent][value=iris]');await save(a);
  await run(fresh,'--profile',profile,'open','about:blank');await login();await verify();
  console.log('PASS new isolated browser with normal existing-user sign-in retains Brand and viewer appearance');
  await run(fresh,'open',origin+'/settings?section=account');await until(fresh,"!!document.querySelector('.account-signout button')",'Log out');await button(fresh,'Log out');
  await until(fresh,"!document.querySelector('.messaging-app')",'signed out',45000);await login();await verify();
  console.log('PASS actual Log out/sign-in retains account-backed Brand and viewer appearance; not fresh-signup acceptance');
}finally{
  await open(a,'brand');for(const key of ['identityBanner','identityFrame'])await run(a,'check',`input[name=${key}][value=${original[key]}]`);await save(a);
  await open(a,'appearance');await run(a,'check',`input[name=interfaceAccent][value=${original.interfaceAccent}]`);await save(a);
  console.log('RESTORED original owner preferences');
}
