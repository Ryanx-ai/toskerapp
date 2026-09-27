import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.FP5_A??'fp5-a',b=process.env.FP5_B??'fp5-b',o=process.env.FP5_ORIGIN??'http://localhost:3000',out=process.env.FP5_CAPTURES??'/tmp/tosker-fp5-qa.MtJRn3';
const personal='/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa';
const quote=JSON.stringify;
async function open(s,path,ready){let start=Date.now();await run(s,'open',o+path);await until(s,`location.pathname===${quote(path.split('?')[0])}&&(${ready})`,path,45000);console.log('SETTLED_MS',path,Date.now()-start);}
async function settings(s){await open(s,'/settings',"!!document.querySelector('input[name=username]')");}
async function save(s){await button(s,'Save changes');await until(s,"document.querySelector('.owner-profile-save')?.textContent.includes('Changes saved.')",'saved',45000);}
async function dismissTooltip(s){
 // Observe the real keyup before the next locator; the native driver can return before focus settles.
 await ev(s,"(()=>{window.__fp5Escape=null;document.addEventListener('keyup',e=>{if(e.key==='Escape')window.__fp5Escape={closed:!document.querySelector('.workspace-tooltip:popover-open')}},{once:true});return true})()");
 await run(s,'press','Escape');await until(s,"window.__fp5Escape?.closed===true",'tooltip Escape keyup');
}
async function bounds(s,selector){assert(await ev(s,`(()=>{let e=document.querySelector(${quote(selector)});if(!e)return false;let r=e.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})()`),selector+' bounds');}
const mode=process.argv[2];
if(mode==='live-shell'){
 const room=process.env.FP5_ROOM,child=process.env.FP5_CHILD;assert(/^\/room\/fp5-review-[a-f0-9]{6}$/.test(room)&&child);
 await run(a,'set','viewport','1440','900');await open(a,'/app',"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')");assert(await ev(a,"document.querySelector('.conversation-header')?.textContent.includes('Sandbox')"));
 for(const path of [personal,room]){const start=Date.now();await run(a,'click',`.conversation-row[href="${path}"]`);await until(a,`location.pathname===${quote(path)}&&!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')`,'client navigation',45000);console.log('CLIENT_SWITCH_MS',path,Date.now()-start);}
 await button(a,'Conversation options');await button(a,'Mute');await until(a,"!!document.querySelector('.header-title-line .header-muted')",'identity-adjacent mute');assert(!await ev(a,"!!document.querySelector('.core-header-controls [aria-label=Muted]')"));
 await button(a,'Conversation options');await button(a,'Unmute');await until(a,"!document.querySelector('.header-muted')",'original unmuted state');await button(a,'Conversation options');await button(a,'Mark Chat unread');await until(a,"location.search==='?view=list'",'manual unread leaves reading destination');await until(a,`!!document.querySelector('.sidebar-pin-row:has(a[href="${room}"]) .attention-mark')`,'unread feedback');
 await open(a,room,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')");
 for(const [path,ready] of [[room+'/subroom/'+child,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')"],[room+'/hall',"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')"],['/friends',"!!document.querySelector('.friend-list')"],['/notifications',"!!document.querySelector('.notification-list')&&!document.querySelector('.notification-load-state')"],['/profile',"!!document.querySelector('.profile-surface .namecard')"]]){await open(a,path,ready);await bounds(a,'.messaging-app');}
 await button(a,'Open your Namecard');await until(a,"!!document.querySelector('.namecard-content')",'Namecard');await bounds(a,'.contextual-namecard');await run(a,'screenshot',out+'/live-namecard.png');await run(a,'press','Escape');
 await settings(a);assert.equal(await ev(a,"document.querySelector('input[name=username]').value"),'tosker-user-a-clerk-test');assert(await ev(a,"document.querySelector('.media-deferred')?.textContent.includes('not available yet')"));await run(a,'click','.scoped-settings-nav button:nth-child(7)');assert(await ev(a,"document.querySelector('.scoped-settings-body')?.textContent.includes('Light and Follow System are not available yet.')"));await bounds(a,'.scoped-settings-shell');await run(a,'screenshot',out+'/live-appearance.png');await button(a,'Close Settings');
 await run(a,'set','viewport','320','844');await open(a,personal,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')");await bounds(a,'.messaging-app');await button(a,'Conversation options');await bounds(a,'.interaction-popover');await run(a,'screenshot',out+'/live-menu-320.png');await run(a,'press','Escape');await run(a,'set','viewport','1440','900');console.log('PASS live shell/default/client switching/mute/unread/Room/Subroom/Hall/Friends/Notifications/Profile/Namecard/username/Appearance/desktop+narrow',await run(a,'errors'));
}
if(mode==='tooltips'){
 for(const w of [1440,1728]){
  await run(a,'set','viewport',String(w),'900');await open(a,'/app?view=list',"!!document.querySelector('.collapse-button')");
  if(!await ev(a,"!!document.querySelector('.sidebar-collapsed')"))await button(a,'Collapse sidebar');
  await run(a,'hover','[data-tip=Settings]');await until(a,"!!document.querySelector('.workspace-tooltip:popover-open')",'tooltip');await bounds(a,'.workspace-tooltip');await run(a,'screenshot',`${out}/isolated-tooltip-${w}.png`);
  await dismissTooltip(a);await button(a,'Expand sidebar');assert(!await ev(a,"!!document.querySelector('.sidebar-collapsed')"));console.log('PASS isolated real-pointer tooltip / Escape / expand',w);
 }
}
if(mode==='login'){
 for(const [s,letter] of [[a,'a'],[b,'b']].filter(([,letter])=>!process.env.FP5_LOGIN_USER||process.env.FP5_LOGIN_USER===letter)){
  await run(s,'open',o+'/app');await button(s,'Sign in');await run(s,'find','label','Email address','fill',`tosker.user.${letter}+clerk_test@example.com`);await button(s,'Continue');
  await until(s,"!!document.querySelector('input[type=password],input[autocomplete=one-time-code]')",'Clerk factor');
  if(await ev(s,"!!document.querySelector('input[type=password]')")){
   await until(s,"[...document.querySelectorAll('a')].some(e=>e.textContent.trim()==='Use another method')",'alternative method');
   await ev(s,"(()=>{[...document.querySelectorAll('a')].find(e=>e.textContent.trim()==='Use another method').click();return true})()");await button(s,`Email code to tosker.user.${letter}+clerk_test@example.com`);
  }
  await until(s,"!!document.querySelector('input[autocomplete=one-time-code]')",'Clerk test OTP');await run(s,'fill','input[autocomplete=one-time-code]','424242');await until(s,"!!document.querySelector('.messaging-app')",'normal test sign-in',45000);console.log('PASS normal retained test-user sign-in',letter);
 }
}
if(mode==='extras'){
 await run(a,'set','viewport','1440','900');
 for(const path of ['/help','/explore','/explore/create','/marketplace','/studio','/create']){await run(a,'open',o+path);await until(a,"!!document.querySelector('.messaging-app')&&!document.querySelector('.workspace-loading-frame')",'utility destination');assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'));console.log('UTILITY',path,await ev(a,'location.pathname'));}
 await open(a,personal,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')");await button(a,'Conversation options');await button(a,'Chat Settings');await until(a,"!!document.querySelector('.scoped-settings-shell')",'Chat Settings');
 for(let i=1;i<=5;i++){await run(a,'click',`.scoped-settings-nav button:nth-child(${i})`);await bounds(a,'.scoped-settings-shell');await run(a,'screenshot',`${out}/chat-settings-${i}.png`);}await button(a,'Close Chat Settings');
 if(await ev(a,"!document.querySelector('.sidebar-collapsed')"))await button(a,'Collapse sidebar');
 await run(a,'hover',`.conversation-row[href="${personal}"]`);await until(a,"!!document.querySelector('.workspace-tooltip:popover-open')",'conversation top-layer tooltip');await bounds(a,'.workspace-tooltip');await run(a,'screenshot',out+'/conversation-tooltip.png');await dismissTooltip(a);await button(a,'Expand sidebar');
 console.log('PASS utility routes / five Chat Settings categories / collapsed conversation tooltip');
}
if(mode==='create'){
 await open(a,'/app',"!!document.querySelector('.composer textarea')");
 await button(a,'Start a chat or create a Room');await run(a,'click','.creation-choices button:last-child');
 await run(a,'fill','input[aria-label="Room name"]','FP5 Review');await button(a,'Next');await run(a,'fill','input[aria-describedby=trip-label-help]','Weekend together');await button(a,'Create Room');
 await until(a,"!!document.querySelector('.room-ready')",'created',45000);await button(a,'Open Room');
 await until(a,"/^\\/room\\/fp5-review-[a-f0-9]{6}$/.test(location.pathname)&&!!document.querySelector('.composer textarea')",'new Room',45000);
 console.log('FP5_OWNED_ROOM',await ev(a,'location.pathname'));
}
if(mode==='username'){
 await settings(a);await settings(b);
 const original=await ev(a,"document.querySelector('input[name=username]').value"),peer=await ev(b,"document.querySelector('input[name=username]').value"),tid=await ev(a,"document.querySelector('.owner-profile-identifiers dd').textContent");
 const next='fp5-check-'+Date.now().toString(36);let changed=false;
 try{
  for(const value of ['bad handle',peer.toUpperCase()]){await run(a,'fill','input[name=username]',value);await button(a,'Save changes');await until(a,"!!document.querySelector('.owner-profile-save [role=alert]')",'expected username error');assert.equal(await ev(a,"document.querySelector('input[name=username]').value"),value);}
  await run(a,'fill','input[name=username]',next.toUpperCase());await save(a);changed=true;
  assert.equal(await ev(a,"document.querySelector('input[name=username]').value"),next);assert.equal(await ev(a,"document.querySelector('.owner-profile-identifiers dd').textContent"),tid);
  await settings(a);assert.equal(await ev(a,"document.querySelector('input[name=username]').value"),next);
  await open(b,personal,"!!document.querySelector('.header-identity-zone>.namecard-trigger')");await run(b,'click','.header-identity-zone>.namecard-trigger');await until(b,`document.querySelector('.contextual-namecard')?.textContent.includes(${quote('@'+next)})`,'peer canonical username',45000);await run(b,'press','Escape');
  await open(b,'/friends',"!!document.querySelector('.friends-search input')");await run(b,'fill','.friends-search input','@'+next);
  await until(b,`document.querySelector('.discovery-results')?.textContent.includes(${quote(next)})`,'new username discovery',45000);
  await run(b,'fill','.friends-search input','@'+original);await until(b,"document.querySelector('.friend-discovery')?.textContent.includes('No people found.')",'old username does not resolve');
  await run(a,'screenshot',out+'/username-saved.png');
 }finally{
  if(changed){await settings(a);assert.equal(await ev(a,"document.querySelector('input[name=username]').value"),next,'restore only our temporary value');await run(a,'fill','input[name=username]',original);await save(a);await settings(a);assert.equal(await ev(a,"document.querySelector('input[name=username]').value"),original);console.log('RESTORED exact original username');}
 }
 console.log('PASS browser username invalid/case collision/save/normalization/reload/A-B Namecard/new and old discovery/stable TID/restoration');
}
if(mode==='ui'){
 const room=process.env.FP5_ROOM,child=process.env.FP5_CHILD;assert(/^\/room\/fp5-review-[a-f0-9]{6}$/.test(room));
 for(const [w,h] of [[320,844],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]].filter(([w])=>!process.env.FP5_WIDTHS||process.env.FP5_WIDTHS.split(',').includes(String(w)))){
  await run(a,'set','viewport',String(w),String(h));
  for(const [path,ready] of [['/app',"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')"],[personal,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')"],[room,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')"],[room+'/hall',"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')"],...(child?[[room+'/subroom/'+child,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')"]]:[]),['/friends',"!!document.querySelector('.friend-list')"],['/notifications',"!!document.querySelector('.notification-list')&&!document.querySelector('.notification-load-state')"],['/profile',"!!document.querySelector('.profile-surface .namecard')"],['/settings',"!!document.querySelector('input[name=username]')"]]){
   await open(a,path,ready);await bounds(a,'.messaging-app');assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'),'page horizontal overflow');
   if(['/friends','/notifications'].includes(path))assert(await ev(a,"!document.querySelector('.workspace-topbar button')"),'no redundant Create');
   if(path==='/settings'){
    for(const [index,category] of ['Profile','Status','Privacy','Profile Card','Account','Notifications','Appearance','Support'].entries()){if(await ev(a,"!!document.querySelector('.settings-category-trigger')?.checkVisibility()&&!document.querySelector('.categories-open')"))await run(a,'click','.settings-category-trigger');await run(a,'click',`.scoped-settings-nav button:nth-child(${index+1})`);await bounds(a,'.scoped-settings-shell');await run(a,'screenshot',`${out}/settings-${category.replaceAll(' ','-')}-${w}.png`);}
   }else await run(a,'screenshot',`${out}/${path==='/app'?'sandbox':path===personal?'personal':path===room?'room':path.endsWith('/hall')?'hall':path.includes('/subroom/')?'subroom':path.slice(1)}-${w}.png`);
   if(path===personal||path===room){await button(a,'Conversation options');await bounds(a,'.interaction-popover');assert(await ev(a,"!document.querySelector('.communication-options p:not([role])')"),'no menu prose');await run(a,'screenshot',`${out}/menu-${path===personal?'personal':'room'}-${w}.png`);await run(a,'press','Escape');}
   if(path==='/friends'){const more=await ev(a,"document.querySelector('.friend-actions button[aria-haspopup]')?.getAttribute('aria-label')");if(more){await button(a,more);await bounds(a,'.interaction-popover');await run(a,'screenshot',`${out}/friend-menu-${w}.png`);await run(a,'press','Escape');}}
  }
  await open(a,'/app?view=list',"!!document.querySelector('.create-trigger')");
  await button(a,'Open your Namecard');await until(a,"!!document.querySelector('.namecard-content')",'Namecard');await bounds(a,'.contextual-namecard');await run(a,'screenshot',`${out}/namecard-${w}.png`);await run(a,'press','Escape');
  assert.equal(await ev(a,"document.activeElement?.getAttribute('aria-label')"),'Open your Namecard');
  for(const type of ['first','last']){await button(a,'Start a chat or create a Room');await run(a,'click',`.creation-choices button:${type}-child`);if(type==='last'){await run(a,'fill','input[aria-label="Room name"]','FP5 preview only');await button(a,'Next');}await bounds(a,'dialog[open]>section');await run(a,'screenshot',`${out}/create-${type}-${w}.png`);await button(a,'Close');}
  if(w>640){if(await ev(a,"!document.querySelector('.sidebar-collapsed')"))await button(a,'Collapse sidebar');await run(a,'hover','[data-tip=Settings]');await until(a,"!!document.querySelector('.workspace-tooltip:popover-open')",'top-layer tooltip');await bounds(a,'.workspace-tooltip');assert(await ev(a,"(()=>{let e=document.querySelector('.workspace-tooltip'),r=e.getBoundingClientRect();return document.elementsFromPoint(r.right-5,r.top+5)[0]===e})()"),'tooltip is not covered');await run(a,'screenshot',`${out}/tooltip-${w}.png`);await dismissTooltip(a);await button(a,'Expand sidebar');}
  console.log('PASS FP5 visual/control matrix',w,h);
 }
 await run(a,'set','viewport','1440','900');console.log('BROWSER_ERRORS',await run(a,'errors'));
}
if(mode==='chat'){
 const room=process.env.FP5_ROOM,child=process.env.FP5_CHILD;assert(/^\/room\/fp5-review-[a-f0-9]{6}$/.test(room));assert(child);
 const start=Number(process.env.FP5_START??0),label=process.env.FP5_LABEL;assert(label,'unique explicit smoke label required');
 for(const [i,path] of [personal,room,`${room}/subroom/${child}`].entries()){
  if(i<start)continue;
  if(i>=Number(process.env.FP5_END??3))break;
  const raw=`${label} ${i} **bold** *italic* _trip_ <img src=x onerror=alert(1)> https://example.com/a_b`,shown=`${label} ${i} bold italic trip <img src=x onerror=alert(1)> https://example.com/a_b`;
  for(const s of[a,b])await open(s,path,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')&&!document.body.innerText.includes('Connecting to live updates')");
  assert(!await ev(a,`document.querySelector('.conversation-surface')?.textContent.includes(${quote(label+' '+i)})`),'inspect preexisting smoke before retry');
  await run(a,'fill','.composer textarea',raw);await button(a,'Send message');
  await until(b,`[...document.querySelectorAll('.message-bubble>p')].some(e=>e.textContent===${quote(shown)})`,'formatted A→B realtime',45000);
  const id=await ev(a,`[...document.querySelectorAll('.message-row')].find(e=>e.textContent.includes(${quote(label+' '+i)})).id`);console.log('FP5_RECEIPT',id,path);
  assert.equal(await ev(b,`document.querySelectorAll('#${id} .message-bubble>p strong').length`),1);assert.equal(await ev(b,`document.querySelectorAll('#${id} .message-bubble>p em').length`),2);assert.equal(await ev(b,`document.querySelectorAll('#${id} .message-bubble img').length`),0);
  await run(b,'open',o+path);await until(b,`!!document.querySelector('#${id} strong')`,'durable formatted history');
  await run(b,'click',`#${id} [aria-label=Reply]`);assert(await ev(b,"document.querySelector('.composer-wrap')?.textContent.includes('bold italic trip')"));await button(b,'Cancel reply');
  await button(b,'Search conversation');await run(b,'fill','input[placeholder="Search this conversation"]',label);await button(b,'Search');await until(b,"!!document.querySelector('.conversation-search-result')",'authorized formatted search');assert(!await ev(b,"document.querySelector('.conversation-search-result p').textContent.includes('**')"));await run(b,'press','Escape');
  await run(a,'click',`#${id} [aria-label="More message actions"]`);await button(a,'Edit');await run(a,'fill','textarea[aria-label="Edit message text"]',raw+' **edited**');await button(a,'Save');await until(b,`[...document.querySelectorAll('#${id} strong')].some(e=>e.textContent==='edited')`,'formatted edit reaches peer');
  await run(b,'click',`#${id} [aria-label=React]`);await button(b,'thumbs up');await run(b,'press','Escape');await until(a,`document.querySelector('#${id} .reaction-chips')?.textContent.includes('👍')`,'peer reaction');await run(b,'click',`#${id} .reaction-chips button[aria-pressed=true]`);
  if(i===1){await run(a,'click',`#${id} [aria-label="More message actions"]`);await button(a,'Pin to Hall');await open(b,path+'/hall',`document.querySelector('.hall-local-pinned-message')?.textContent.includes(${quote(label)})`);assert(await ev(b,"!!document.querySelector('.hall-local-pinned-message p strong')"));}
  await run(a,'click',`#${id} [aria-label="More message actions"]`);await button(a,'Nuke message');await button(a,'Nuke message');await until(a,`!document.getElementById(${quote(id)})`,'Nuke');
  if(i===1)await until(b,`!document.querySelector('.hall-surface')?.textContent.includes(${quote(label)})`,'Hall source retraction');
  await open(b,path,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')");assert(!await ev(b,`!!document.getElementById(${quote(id)})`));console.log('PASS FP5 formatted message/reload/reply/reaction/Nuke',path);
 }
}
if(mode==='comments'){
 const room=process.env.FP5_ROOM;assert(/^\/room\/fp5-review-[a-f0-9]{6}$/.test(room));const label=process.env.FP5_LABEL;assert(label);
 await open(a,room+'/hall',"!!document.querySelector('.new-hall-card')&&!document.querySelector('.hall-load-status')");
 if(!process.env.FP5_NOTE){assert(!await ev(a,`document.querySelector('.hall-surface').textContent.includes(${quote(label)})`),'inspect existing QA note before retry');
 await button(a,'New Note');await run(a,'fill','input[aria-label=Title]',label);await run(a,'fill','textarea[aria-label=Note]','FP5 keyboard comment acceptance');await button(a,'Add note');await until(a,`[...document.querySelectorAll('.hall-object h3')].some(e=>e.textContent===${quote(label)})`,'QA note');
 await open(a,room+'/hall',`[...document.querySelectorAll('.hall-object h3')].some(e=>e.textContent===${quote(label)})`);}
 const id=await ev(a,`[...document.querySelectorAll('.hall-object')].find(e=>e.querySelector('h3')?.textContent===${quote(label)}).dataset.hallId`),card=`[data-hall-id="${id}"]`,ta=card+' textarea';console.log('FP5_QA_NOTE',id);
 if(process.env.FP5_NOTE)assert.equal(id,process.env.FP5_NOTE);
 await run(a,'click',card+' .hall-comments-toggle');await until(a,`!!document.querySelector(${quote(ta)})`,'comment editor');
 if(!process.env.FP5_COMMENT_START){await run(a,'fill',ta,'   ');await run(a,'press','Enter');assert.equal(await ev(a,`document.querySelectorAll(${quote(card+' .hall-comment')}).length`),0);
 await run(a,'fill',ta,label+' first');await run(a,'press','Shift+Enter');await run(a,'type',ta,'second');assert((await ev(a,`document.querySelector(${quote(ta)}).value`)).includes('\n'));
 await run(a,'press','Enter');await until(a,`document.querySelectorAll(${quote(card+' .hall-comment')}).length===1`,'Enter posts once');}
 await until(a,`document.querySelectorAll(${quote(card+' .hall-comment')}).length===1&&!document.querySelector(${quote(ta)}).disabled`,'first comment settled');
 await run(a,'fill',ta,label+' IME');await ev(a,`(()=>{let t=document.querySelector(${quote(ta)});t.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));t.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,isComposing:true}));t.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));})()`);assert.equal(await ev(a,`document.querySelectorAll(${quote(card+' .hall-comment')}).length`),1);
 await run(a,'press','Enter');await until(a,`document.querySelectorAll(${quote(card+' .hall-comment')}).length===2&&!document.querySelector(${quote(ta)}).disabled`,'composition end then Enter');
 await run(a,'fill',ta,label+' failure');await ev(a,`(()=>{window.__fp5Fetch=window.fetch;window.fetch=function(input,init){if(typeof init?.body==='string'&&init.body.includes(${quote(label+' failure')}))return Promise.reject(new TypeError('FP5 injected comment failure'));return window.__fp5Fetch.apply(this,arguments)}})()`);
 try{await run(a,'press','Enter');await until(a,`document.querySelector(${quote(card)})?.textContent.includes("Your draft is still here")`,'failed comment retains draft');assert.equal(await ev(a,`document.querySelector(${quote(ta)}).value`),label+' failure');}finally{await ev(a,'window.fetch=window.__fp5Fetch;delete window.__fp5Fetch');}
 await ev(a,`(()=>{let f=document.querySelector(${quote(ta)}).form;f.requestSubmit();f.requestSubmit();f.requestSubmit()})()`);await until(a,`document.querySelectorAll(${quote(card+' .hall-comment')}).length===3`,'single retry despite repeated pending submits');
 await open(b,room+'/hall',`!!document.querySelector(${quote(card)})`);await run(b,'click',card+' .hall-comments-toggle');await until(b,`document.querySelectorAll(${quote(card+' .hall-comment')}).length===3`,'peer persisted comments');
 await until(a,"!document.querySelector('.hall-view-switch button').disabled",'mutations settled');await run(a,'click',card+' .hall-card-more');await bounds(a,'.interaction-popover');await button(a,'Archive');await until(a,`!document.querySelector(${quote(card)})&&!document.querySelector('.hall-view-switch button').disabled`,'archive');await button(a,'Archived');await until(a,`!!document.querySelector(${quote(card)})`,'archived note');await run(a,'click',card+' .hall-card-more');await button(a,'Restore');await until(a,`!document.querySelector(${quote(card)})&&!document.querySelector('.hall-view-switch button').disabled`,'restore settled');await button(a,'Board');await until(a,`!!document.querySelector(${quote(card)})`,'restored');
 await run(a,'screenshot',out+'/hall-comments.png');await run(a,'click',card+' .hall-card-more');await button(a,'Nuke');await button(a,'Nuke');await until(a,`!document.querySelector(${quote(card)})`,'QA note and comments removed');
 console.log('PASS Hall whitespace/Enter/Shift+Enter/synthetic IME/failure draft/repeated pending submit/peer reload/Archive/Restore/Nuke; exact QA note removed',id);
}
