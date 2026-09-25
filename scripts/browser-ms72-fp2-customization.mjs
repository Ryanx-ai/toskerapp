import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.MS72_A??'fp1-a',b=process.env.MS72_B??'fp1-b',origin=process.env.MS72_ORIGIN??'http://localhost:3000',out=process.env.FP2_CAPTURES;
assert(out,'FP2_CAPTURES required');
const personal='/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa';
async function open(s,section){await run(s,'open',origin+'/settings?section='+section);await until(s,`document.querySelector('.scoped-settings-body')?.getAttribute('aria-label')===${JSON.stringify({brand:'Profile Card',appearance:'Appearance',privacy:'Privacy',account:'Account'}[section])}`,'Settings '+section);}
async function save(){await until(a,"!!document.querySelector('.scoped-settings-footer .primary-action')",'save control after navigation');if(await ev(a,"!document.querySelector('.scoped-settings-footer .primary-action').disabled")){await button(a,'Save changes');await until(a,"document.querySelector('.owner-profile-save [role=status]')?.textContent==='Changes saved.'&&document.querySelector('.scoped-settings-footer .primary-action').disabled",'save',45000);}}
async function brand(){return ev(a,"Object.fromEntries(['identityAccent','identityBanner','identityFrame'].map(k=>[k,document.querySelector('input[name='+k+']:checked').value]))");}
async function choose(values){for(const [key,value] of Object.entries(values)){const selector=`input[name=${key}][value=${value}]`;await run(a,'scrollintoview',selector);await run(a,'check',selector);}}
async function bounds(s,selector){const r=await ev(s,`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,overflow:e.scrollWidth-e.clientWidth}})()`);assert(r.x>=-1&&r.y>=-1&&r.right<=r.w+1&&r.bottom<=r.h+1&&r.overflow<3,JSON.stringify({selector,...r}));}
for(const s of [a,b])await run(s,'set','viewport','1440','900');
await open(a,'brand');const original=await brand();await open(a,'appearance');original.interfaceAccent=await ev(a,"document.querySelector('input:checked').value");await open(a,'privacy');original.audience=await ev(a,"document.querySelector('.owner-profile-field select').value");
await open(b,'appearance');const bAccent=await ev(b,"document.querySelector('input:checked').value");
let extra=false,blocked=false;
try{
  await run(a,'select','.owner-profile-field select','friends');await save();
  await run(b,'open',origin+personal);await until(b,"!!document.querySelector('.header-identity-zone > .namecard-trigger')",'B personal');await run(b,'click','.header-identity-zone > .namecard-trigger');await until(b,"!!document.querySelector('.namecard-common')",'B sees A');
  await open(a,'brand');
  for(const [i,accent] of ['gold','rose','sage','sky','neutral'].entries()){
    const values={identityAccent:accent,identityBanner:['weave','plain','glow'][i%3],identityFrame:i%2?'none':'ring'};
    await choose(values);await save();
    await until(b,`(()=>{const e=document.querySelector('.contextual-namecard');return e?.classList.contains('identity-accent-${accent}')&&e.dataset.identityBanner==='${values.identityBanner}'&&e.dataset.identityFrame==='${values.identityFrame}'})()`,'peer Brand metadata',45000);
    assert.equal(await ev(b,"document.querySelector('.viewer-appearance').dataset.interfaceAccent"),bAccent);
    await run(b,'screenshot',`${out}/peer-${accent}.png`);
    await open(a,'brand');assert.deepEqual(await brand(),values);
  }
  console.log('PASS all identity accents/banner/frame options saved, reload and B metadata; B interface unchanged');
  await open(a,'appearance');
  for(const accent of ['iris','tide','tosker']){
    await choose({interfaceAccent:accent});await save();
    await until(a,`document.querySelector('.viewer-appearance')?.dataset.interfaceAccent==='${accent}'`,'applied own accent');
    assert.equal(await ev(b,"document.querySelector('.viewer-appearance').dataset.interfaceAccent"),bAccent);
    await run(a,'screenshot',`${out}/appearance-${accent}.png`);await open(a,'appearance');assert.equal(await ev(a,"document.querySelector('input:checked').value"),accent);
  }
  console.log('PASS 3 interface accents save/reload; no peer theme inheritance');
  await choose({interfaceAccent:'iris'});await save();await button(a,'Reset to Tosker default');await save();await open(a,'appearance');assert.equal(await ev(a,"document.querySelector('input:checked').value"),'tosker');
  await open(a,'brand');await button(a,'Reset to Tosker default');await save();await open(a,'brand');assert.deepEqual(await brand(),{identityAccent:'neutral',identityBanner:'glow',identityFrame:'none'});
  console.log('PASS real saved resets for both independent layers');
  // Freeze an older draft, then commit another value in an independent tab.
  await open(a,'appearance');await choose({interfaceAccent:'iris'});
  await run(a,'tab','new','--label','fp2-stale',origin+'/settings?section=appearance');extra=true;await until(a,"!!document.querySelector('input[name=interfaceAccent]')",'second tab');await choose({interfaceAccent:'tide'});await save();
  await run(a,'tab','close','fp2-stale');extra=false;await run(a,'tab','t1');await button(a,'Save changes');await until(a,"document.querySelector('.owner-profile-save [role=alert]')?.textContent.includes('changed elsewhere')",'stale rejected');
  assert.equal(await ev(a,"document.querySelector('input:checked').value"),'iris');await button(a,'Discard draft and reload saved profile');await until(a,"document.querySelector('input:checked')?.value==='tide'",'reconciled');
  console.log('PASS stale customization does not overwrite; draft retained and explicit reload works');
  await choose({interfaceAccent:'iris'});await run(a,'network','route',origin+'/settings*','--abort');blocked=true;await button(a,'Save changes');await until(a,"document.querySelector('.owner-profile-save [role=alert]')?.textContent.includes(\"wasn't saved\")",'failed save');assert.equal(await ev(a,"document.querySelector('input:checked').value"),'iris');await run(a,'network','unroute',origin+'/settings*');blocked=false;await save();
  console.log('PASS network failure retains draft; retry persists');
  for(const [w,h] of [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]]){
    await run(a,'set','viewport',String(w),String(h));
    for(const section of ['brand','appearance','account']){await open(a,section);await bounds(a,'.scoped-settings-shell');await bounds(a,'.scoped-settings-body');await run(a,'screenshot',`${out}/${section}-${w}.png`);}
    const centered=await ev(a,"(()=>{const a=document.querySelector('.account-signout').getBoundingClientRect(),b=document.querySelector('.account-signout button').getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)<1})()");assert(centered,'Log out centered');
    await run(b,'set','viewport',String(w),String(h));await bounds(b,'.contextual-namecard');await run(b,'screenshot',`${out}/namecard-${w}.png`);
  }
  console.log('PASS customization/Account/Namecard six widths; centered Log out');
}finally{
  if(blocked)await run(a,'network','unroute',origin+'/settings*');if(extra)await run(a,'tab','close','fp2-stale');await run(a,'tab','t1');await run(a,'set','viewport','1440','900');
  // Re-open discards only this script's unsaved test draft; restore saved originals through UI.
  await open(a,'brand');await choose({identityAccent:original.identityAccent,identityBanner:original.identityBanner,identityFrame:original.identityFrame});await save();await open(a,'appearance');await choose({interfaceAccent:original.interfaceAccent});await save();await open(a,'privacy');await run(a,'select','.owner-profile-field select',original.audience);await save();
  console.log('RESTORED original A Brand/interface/audience through owner UI');
}
