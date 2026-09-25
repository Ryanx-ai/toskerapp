import {run,until,button} from './browser-fp2.mjs';
const s=process.env.FP2_SESSION??'fp1-a', origin=process.env.FP2_ORIGIN??'http://localhost:3000', out=process.env.FP2_CAPTURES;
if(!out)throw new Error('FP2_CAPTURES required');
for(const [w,h] of [[390,844],[768,1024],[1440,900]]) {
  await run(s,'set','viewport',String(w),String(h));
  for(const [name,path,ready,settings] of [
    ['profile','/profile','.profile-shortcuts'],
    ['account','/settings?section=account','.scoped-settings-body'],
    ['notifications','/notifications','.notifications-workspace'],
    ['personal','/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa','.composer textarea','Chat Settings'],
    ['room','/room/ms722-frame-qa','.composer textarea','Room Settings'],
  ]) {
    await run(s,'open',origin+path); await until(s,`!!document.querySelector(${JSON.stringify(ready)})`,name);
    if(settings) await until(s,"!document.body.textContent.includes('Loading messages…')",'messages settled');
    if(name==='notifications') await until(s,"document.querySelector('.notification-list')?.children.length > 0",'notifications settled');
    await run(s,'screenshot',`${out}/before-${name}-${w}.png`);
    if(settings) {
      await button(s,'Conversation options'); await button(s,settings);
      await until(s,"!!document.querySelector('.scoped-settings-body')",settings);
      await until(s,"!document.querySelector('.scoped-settings-body').textContent.includes('Loading')",'settings settled');
      await run(s,'screenshot',`${out}/before-${name}-settings-${w}.png`);
      await run(s,'press','Escape');
    }
    if(name==='personal') {
      await run(s,'click','.header-identity-zone > .namecard-trigger');
      await until(s,"!!document.querySelector('.namecard-common')",'Namecard');
      await run(s,'screenshot',`${out}/before-namecard-${w}.png`); await run(s,'press','Escape');
    }
  }
  console.log('Captured rendered FP1 audit',w,h);
}
