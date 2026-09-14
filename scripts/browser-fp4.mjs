import assert from "node:assert/strict";
import { run, ev, until, button as clickButton } from "./browser-fp2.mjs";
const origin = process.env.FP4_ORIGIN ?? "http://localhost:3000";
const personal = "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa";
const a = process.env.FP4_A ?? "fp4-a", b = process.env.FP4_B ?? "fp4-b";
async function button(s,name) { await until(s,`[...document.querySelectorAll('button')].some(e=>e.checkVisibility()&&!e.disabled&&(e.getAttribute('aria-label')||e.textContent).trim()===${JSON.stringify(name)})`,`enabled ${name}`); return clickButton(s,name); }
async function fill(s, selector, value) { await run(s,"fill",selector,value||" "); if(!value)await run(s,"press","Backspace"); }
async function login(s, letter) {
  await run(s,"open",origin+"/app");
  await button(s,"Sign in");
  await run(s,"find","label","Email address","fill",`tosker.user.${letter}+clerk_test@example.com`); await button(s,"Continue");
  await until(s,"!!document.querySelector('input[type=password]') || !!document.querySelector('input[autocomplete=one-time-code]')","Clerk next step");
  if(await ev(s,"!!document.querySelector('input[type=password]')")) {
    await run(s,"find","text","Use another method","click");
    await button(s,`Email code to tosker.user.${letter}+clerk_test@example.com`);
  }
  await until(s,"!!document.querySelector('input[autocomplete=one-time-code]')","Clerk verification form");
  await run(s,"fill","input[autocomplete=one-time-code]","424242");
  await until(s,"!!document.querySelector('.messaging-app')","normal Clerk test identity",45000);
  console.log(`PASS normal ${s} sign-in`);
}
async function namecard() {
  for(const s of [a,b]) { await run(s,"open",origin+personal); await until(s,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","Personal identity"); }
  await run(a,"click",".header-identity-zone > .namecard-trigger");
  await until(a,"!!document.querySelector('.namecard-common')","Namecard loaded");
  assert.equal(await ev(a,"document.querySelectorAll('dialog[open]').length"),1);
  await button(a,"Private nickname");
  const previous=await ev(a,"document.querySelector('.scoped-settings-form input').value");
  await fill(a,".scoped-settings-form input","FP4 private alias"); await button(a,"Save nickname");
  await until(a,"document.querySelector('.scoped-settings-form [role=status]')?.textContent==='Nickname saved.'","private alias saved");
  await button(a,"Back");
  assert.equal(await ev(a,"document.querySelector('.contextual-namecard h2').textContent"),"FP4 private alias");
  await run(b,"click",".header-identity-zone > .namecard-trigger"); await until(b,"!!document.querySelector('.namecard-common')","other viewer card");
  assert.equal(await ev(b,"document.querySelector('dialog').textContent.includes('FP4 private alias')"),false);
  await run(b,"press","Escape");
  await button(a,"Chat Settings");
  await until(a,"!!document.querySelector('.scoped-settings-form')","Settings canonical identity");
  for(const section of ["Communication","Media","Files","Links","Privacy","Overview"])await button(a,section);
  await until(a,"!!document.querySelector('.scoped-settings-form input')","nickname field");
  await fill(a,".scoped-settings-form input",previous); await button(a,"Save nickname");
  await until(a,"document.querySelector('.scoped-settings-form [role=status]')?.textContent==='Nickname saved.'","original alias restored");
  await button(a,"Close Chat Settings"); await run(a,"press","Escape");
  assert.equal(await ev(a,"document.querySelectorAll('dialog[open]').length"),0);
  assert.equal(await ev(a,"document.activeElement?.classList.contains('namecard-trigger')"),true);
  console.log("PASS A/B private alias, restored exact original; six Settings sections; single modal and focus return");
}
async function hall() {
  const room="/room/fp4-acceptance", pin=".hall-local-pinned-message";
  for(const s of [a,b]) { await run(s,"open",origin+room+"/hall"); await until(s,`!!document.querySelector('${pin} .hall-comments-toggle')`,"source reference loaded"); }
  assert.equal(await ev(a,`document.querySelector('${pin} h3')===null`),true);
  assert.equal(await ev(a,`document.querySelector('${pin} footer').textContent`),"tosker.user.a+clerk_test");
  await run(b,"click",pin+" .hall-card-more");
  assert.equal(await ev(b,"[...document.querySelectorAll('.hall-context button')].some(e=>e.textContent==='Edit message')"),false);
  await run(b,"press","Escape");
  await run(b,"click",pin+" .hall-comments-toggle"); await fill(b,pin+" textarea","FP4 browser Hall discussion");
  await button(b,"Post comment"); await until(b,`document.querySelector('${pin} .hall-comment-list')?.textContent.includes('FP4 browser Hall discussion')`,"comment persisted");
  await button(b,"React to Hall reference"); await button(b,"Love");
  await until(b,`!!document.querySelector('${pin} .hall-reactions button[aria-pressed=true]')`,"reference reaction saved");
  await run(a,"click",pin+" .hall-comments-toggle");
  await until(a,`document.querySelector('${pin} .hall-comment-list')?.textContent.includes('FP4 browser Hall discussion')`,"other viewer discussion");
  await run(a,"click",pin+" .hall-card-more"); await button(a,"Edit message");
  await fill(a,".message-edit-panel textarea","FP4 canonical browser edit"); await button(a,"Save");
  await until(a,"!document.querySelector('.message-edit-panel')","source edit accepted");
  await until(b,`document.querySelector('${pin}')?.textContent.includes('FP4 canonical browser edit')`,"other viewer source refresh",45000);
  await run(a,"click",pin+" .hall-card-more");
  await run(a,"find","text","Go to message","click");
  const source="f7400000-2026-4000-8000-000000000258";
  await until(a,`!!document.querySelector('#message-${source}.message-source-highlight')`,"old source jump/highlight",45000);
  assert.equal(await ev(a,`document.querySelector('#message-${source} .message-bubble p').textContent`),"FP4 canonical browser edit");
  await run(a,"click",`#message-${source} [aria-label='More message actions']`); await button(a,"Nuke message"); await button(a,"Nuke message");
  await until(a,`!document.querySelector('#message-${source}')`,"source removed");
  await until(b,`!document.querySelector('${pin}')`,"Hall reference/discussion removed",45000);
  await run(b,"open",origin+room+"/hall"); await until(b,"!!document.querySelector('.hall-local-note')","Hall reload");
  assert.equal(await ev(b,`!!document.querySelector('${pin}')`),false);
  console.log("PASS A/B Hall source attribution, reference reactions/comments, author edit, peer invalidation, old-source jump/highlight, Nuke/reload removal; independent note kept");
}
async function hallTail() {
  const room="/room/fp4-acceptance", pin=".hall-local-pinned-message", source="f7400000-2026-4000-8000-000000000258";
  for(const s of [a,b]) { await run(s,"open",origin+room+"/hall"); await until(s,`!!document.querySelector('${pin} .hall-comments-toggle')`,"retained reference loaded"); }
  await run(a,"click",pin+" .hall-card-more"); await run(a,"find","text","Go to message","click");
  await until(a,`!!document.querySelector('#message-${source}.message-source-highlight')`,"old source committed highlight",45000);
  assert.equal(await ev(a,`document.activeElement?.id`),`message-${source}`);
  assert.equal(await ev(a,`document.querySelector('#message-${source} .message-bubble p').textContent`),"FP4 canonical browser edit");
  await run(a,"click",`#message-${source} [aria-label='More message actions']`); await button(a,"Nuke message"); await button(a,"Nuke message");
  await until(a,`!document.querySelector('#message-${source}')`,"source removed");
  await until(b,`!document.querySelector('${pin}')`,"peer reference removed",45000);
  await run(b,"open",origin+room+"/hall"); await until(b,"!!document.querySelector('.hall-local-note')","independent note kept after reload");
  assert.equal(await ev(b,`!!document.querySelector('${pin}')`),false);
  console.log("PASS old-source jump, committed highlight/focus, Nuke peer/reload removal; independent note retained");
}
if(process.argv[2]==="login-a")await login(a,"a");
if(process.argv[2]==="login-b")await login(b,"b");
if(process.argv[2]==="namecard")await namecard();
if(process.argv[2]==="hall")await hall();
if(process.argv[2]==="hall-tail")await hallTail();
if(process.argv[2]==="sidebar") {
  const order="[...document.querySelectorAll('.messenger-sidebar .sidebar-pin-row.is-pinned')].map(e=>e.dataset.pinId)", first="f7400000-2026-4000-8000-000000000003", second="f7400000-2026-4000-8000-000000000006";
  for(const s of [a,b]) { await run(s,"open",origin+"/room/fp4-acceptance"); await until(s,"!!document.querySelector('.sidebar-pin-control')","sidebar controls"); }
  assert.deepEqual(await ev(a,order),[]); assert.deepEqual(await ev(b,order),[]);
  await button(a,"Organize FP4 Acceptance"); await button(a,"Pin to top"); await until(a,`${order}.includes('${first}')`,"first pin");
  await button(a,"Organize FP4 Order Check"); await button(a,"Pin to top"); await until(a,`${order}.join('|')==='${first}|${second}'`,"two pins");
  await button(a,"Organize FP4 Order Check"); await button(a,"Move earlier"); await until(a,`${order}.join('|')==='${second}|${first}'`,"keyboard alternative reorder");
  await run(a,"drag",`[data-pin-id='${first}'] .sidebar-pin-control`,`[data-pin-id='${second}'] .sidebar-pin-control`); await until(a,`${order}.join('|')==='${first}|${second}'`,"native handle drag");
  await run(a,"open",origin+"/room/fp4-acceptance"); await until(a,`${order}.join('|')==='${first}|${second}'`,"durable reload");
  await run(b,"open",origin+"/room/fp4-acceptance"); await until(b,"!!document.querySelector('.sidebar-pin-control')","other account navigation"); assert.deepEqual(await ev(b,order),[]);
  assert.equal(await ev(a,"[...document.querySelectorAll('.conversation-row')][0]?.textContent.includes('Sandbox')"),true);
  console.log("PASS private pinned order, native drag and Move, reload, fixed Sandbox, B isolation; retained two A pins for responsive/second-session checks");
}
if(process.argv[2]==="sidebar-tail") {
  const order="[...document.querySelectorAll('.messenger-sidebar .sidebar-pin-row.is-pinned')].map(e=>e.dataset.pinId)", expected=["f7400000-2026-4000-8000-000000000003","f7400000-2026-4000-8000-000000000006"];
  await until(a,`${order}.join('|')===${JSON.stringify(expected.join('|'))}`,"native handle drop accepted");
  await run(a,"open",origin+"/room/fp4-acceptance"); await until(a,`${order}.join('|')===${JSON.stringify(expected.join('|'))}`,"durable reload");
  await run(b,"open",origin+"/room/fp4-acceptance"); await until(b,"!!document.querySelector('.sidebar-pin-control')","other account navigation"); assert.deepEqual(await ev(b,order),[]);
  assert.equal(await ev(a,"[...document.querySelectorAll('.conversation-row')][0]?.textContent.includes('Sandbox')"),true);
  console.log("PASS native handle drop, reload persistence, fixed Sandbox, B isolation");
}
if(process.argv[2]==="unpin") { for(const name of ["FP4 Acceptance","FP4 Order Check"]) { await button(a,`Organize ${name}`); await button(a,"Unpin"); } await until(a,"document.querySelectorAll('.sidebar-pin-row.is-pinned').length===0","original no-pins restored"); console.log("PASS original empty A pins restored"); }
async function bounds(selector) {
  const geometry=await ev(a,`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:[innerWidth,innerHeight],overflow:e.scrollWidth-e.clientWidth}:null})()`);
  assert(geometry,selector); assert(geometry.left>=-1 && geometry.right<=geometry.viewport[0]+1 && geometry.top>=-1 && geometry.bottom<=geometry.viewport[1]+1,JSON.stringify({selector,geometry})); assert(geometry.overflow<=2,JSON.stringify({selector,geometry}));
}
if(process.argv[2]==="responsive") {
  for(const [width,height] of [[320,844],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]].filter(([width])=>width>=Number(process.env.FP4_MIN_WIDTH??0))) {
    await run(a,"set","viewport",String(width),String(height)); await run(a,"open",origin+personal); await run(a,"tab","t1");
    await until(a,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","Personal header");
    await run(a,"click",".header-identity-zone > .namecard-trigger"); await until(a,"!!document.querySelector('.namecard-common')","Namecard");
    await bounds(".contextual-namecard");
    await run(a,"screenshot",`/tmp/tosker-fp4-font-review.jZ9m3A/namecard-${width}.png`);
    await button(a,"Chat Settings"); await until(a,"!!document.querySelector('.scoped-settings-form input')","Settings loaded"); await bounds(".scoped-settings-shell");
    await button(a,"Privacy"); await bounds(".scoped-settings-shell");
    await run(a,"screenshot",`/tmp/tosker-fp4-font-review.jZ9m3A/settings-${width}.png`);
    await button(a,"Close Chat Settings"); await until(a,"!!document.querySelector('.namecard-common')","Namecard restored"); await button(a,"Close Namecard");
    assert.equal(await ev(a,"document.querySelectorAll('dialog[open]').length"),0);
    console.log(`PASS ${width}×${height}: Namecard and Settings bounds, content overflow and explicit close controls`);
  }
}
if(process.argv[2]==="personal-mute") {
  await run(a,"open",origin+personal); await until(a,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","Personal header");
  await button(a,"Conversation options"); await button(a,"Chat Settings"); await until(a,"!!document.querySelector('.scoped-settings-form input')","Settings loaded"); await button(a,"Communication");
  const original=await ev(a,"document.querySelector('.settings-toggle').getAttribute('aria-pressed')==='true'");
  await button(a,original?"Unmute Chat":"Mute Chat"); await until(a,`document.querySelector('.settings-toggle')?.getAttribute('aria-pressed')==='${!original}'`,"mute saved");
  await button(a,"Close Chat Settings"); await button(a,"Conversation options"); await button(a,"Chat Settings"); await until(a,"!!document.querySelector('.scoped-settings-form input')","reload preference"); await button(a,"Communication");
  assert.equal(await ev(a,"document.querySelector('.settings-toggle').getAttribute('aria-pressed')==='true'"),!original);
  await button(a,original?"Mute Chat":"Unmute Chat"); await until(a,`document.querySelector('.settings-toggle')?.getAttribute('aria-pressed')==='${original}'`,"mute restored"); await button(a,"Close Chat Settings"); console.log("PASS Personal mute persistence and exact restoration");
}
if(process.argv[2]==="fp4-contexts") {
  await run(a,"set","viewport","1440","900");
  await run(a,"open",origin+"/room/fp4-acceptance"); await until(a,"!!document.querySelector('.composer textarea')","Room");
  await button(a,"Conversation options"); await button(a,"Room Settings"); await until(a,"!!document.querySelector('.scoped-settings-form input')","owner Settings");
  await button(a,"People"); await until(a,"!!document.querySelector('.room-member-list .namecard-trigger')","people identity");
  await run(a,"click",".room-member-list li:last-child .namecard-trigger"); await until(a,"!!document.querySelector('.contextual-namecard h2')","member Namecard");
  assert.equal(await ev(a,"document.querySelectorAll('.contextual-namecard').length"),1); await run(a,"press","Escape");
  assert.equal(await ev(a,"!!document.querySelector('.scoped-settings-shell')"),true); await button(a,"Structure");
  assert.equal(await ev(a,"document.querySelector('.room-structure').textContent.includes('FP4 Planning')"),true); await button(a,"Close Room Settings");
  await button(a,"Switch Room context: FP4 Acceptance"); await run(a,"click",".room-context-menu .context-child"); await until(a,"location.pathname.includes('/subroom/') && !!document.querySelector('.composer textarea')","child navigation");
  await button(a,"Add a surface"); assert.equal(await ev(a,"[...document.querySelectorAll('.surface-add-menu button')].every(e=>e.disabled)&&!document.querySelector('.surface-add-menu').textContent.includes('Subroom')"),true); await run(a,"press","Escape");
  for(const path of ["/room/fp4-acceptance/hall","/personal/my-room"]) { await run(a,"open",origin+path); await until(a,"!!document.querySelector('.conversation-header')","Hall/Sandbox header"); }
  await run(a,"open",origin+personal); await until(a,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","Personal identity");
  await run(a,"click",".header-identity-zone > .namecard-trigger"); await until(a,"!!document.querySelector('.namecard-common')","Namecard"); await run(a,"press","Escape"); await run(a,"press","Space"); await until(a,"!!document.querySelector('.namecard-common')","Space opens Namecard");
  await run(a,"press","Tab"); assert.equal(await ev(a,"document.querySelector('dialog[open]').contains(document.activeElement)"),true); await run(a,"press","Escape");
  console.log("PASS Room People→one Namecard→Settings return, shared Structure, child switcher, + boundary, Hall/Sandbox navigation, keyboard Space/Tab/Escape");
}
if(process.argv[2]==="withdrawal") {
  await run(a,"open",origin+personal); await until(a,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","Personal identity"); await run(a,"click",".header-identity-zone > .namecard-trigger"); await until(a,"document.querySelector('.namecard-common')?.textContent.includes('FP4 Order Check')","current overlap");
  await run(b,"open",origin+"/room/fp4-order-check"); await until(b,"!!document.querySelector('.composer textarea')","member Room"); await button(b,"Conversation options"); await button(b,"Room Settings"); await until(b,"!!document.querySelector('.scoped-settings-shell')","member Settings"); await button(b,"People");
  assert.equal(await ev(b,"!!document.querySelector('.room-member-list .danger')"),false); await button(b,"Leave Room"); await button(b,"Leave Room"); await until(b,"location.pathname==='/app'","member withdrawal");
  await until(a,"!!document.querySelector('.namecard-common')&&!document.querySelector('.namecard-common').textContent.includes('FP4 Order Check')","open Namecard revalidates overlap",45000);
  await run(a,"press","Escape"); console.log("PASS real B leaves owned QA Room; open A Namecard removes shared context without reload; no member management authority");
}
if(process.argv[2]==="fp4-realtime") {
  const room=process.env.FP4_ROOM??"/room/fp4-acceptance", child=process.env.FP4_CHILD??"f7400000-2026-4000-8000-000000000002";
  for(const [kind,path] of [["Room",room],["Subroom",`${room}/subroom/${child}`],["Personal",personal]]) {
    for(const s of [a,b]) { await run(s,"open",origin+path); await run(s,"tab","t1"); await until(s,"!!document.querySelector('.composer textarea')","authorized composer"); }
    await ev(b,"performance.clearMarks('tosker:signal')");
    const body=`FP4 ${kind} realtime ${Date.now()}`;
    await fill(a,".composer textarea",body); await button(a,"Send message"); await until(a,"document.querySelector('.composer textarea').value===''","send acknowledged",45000);
    const selector=`[...document.querySelectorAll('.message-row')].find(e=>e.querySelector('.message-bubble > p')?.textContent===${JSON.stringify(body)})`;
    await until(b,`${selector} && performance.getEntriesByName('tosker:signal').length>0`,`${kind} peer delivery with actual realtime signal`,45000);
    const messageId=(await ev(a,`${selector}.id`)).slice(8); console.log("Owned browser receipt",kind,messageId);
    const privacy=await ev(b,`(async()=>{const r=await fetch('/api/workspace',{cache:'no-store'});const data=await r.json();return {ok:r.ok,leak:JSON.stringify(data.activity).includes(${JSON.stringify(body)})}})()`); assert(privacy.ok&&!privacy.leak);
    await run(a,"click",`#message-${messageId} [aria-label='More message actions']`); await button(a,"Nuke message"); await button(a,"Nuke message");
    await until(b,`!document.getElementById('message-${messageId}')`,`${kind} peer removal`,45000);
    console.log(`PASS ${kind} A→B, real signal, WHO/context-only activity projection, Nuke invalidation`);
  }
}
if(process.argv[2]==="fp4-narrow") {
  await run(a,"set","viewport","390","844"); await run(a,"open",origin+"/room/fp4-acceptance/hall"); await until(a,"!!document.querySelector('.hall-local-note')","mobile Hall");
  await run(a,"click",".hall-local-note .hall-comments-toggle"); await until(a,"!!document.querySelector('.hall-comment-form')","mobile discussion");
  await bounds(".hall-local-note"); await run(a,"screenshot","/tmp/tosker-fp4-font-review.jZ9m3A/hall-mobile.png");
  await run(a,"open",origin+"/app"); await until(a,"!!document.querySelector('.sidebar-pin-control')","mobile navigation"); await button(a,"Organize FP4 Acceptance");
  await bounds(".interaction-popover"); await run(a,"screenshot","/tmp/tosker-fp4-font-review.jZ9m3A/sidebar-mobile.png"); await run(a,"press","Escape");
  await run(a,"set","viewport","1440","900"); await run(a,"open",origin+"/room/fp4-acceptance"); await until(a,"!!document.querySelector('.composer textarea')","desktop navigation");
  await button(a,"Collapse sidebar"); await until(a,"!!document.querySelector('.sidebar-collapsed')","collapsed"); await button(a,"Organize FP4 Acceptance"); await bounds(".interaction-popover");
  await run(a,"screenshot","/tmp/tosker-fp4-font-review.jZ9m3A/sidebar-collapsed.png"); await run(a,"press","Escape"); await button(a,"Expand sidebar");
  console.log("PASS mobile Hall discussion and sidebar menu; desktop collapsed rail menu; restored expanded preference");
}
if(process.argv[2]==="restore-alias") { await run(a,"open",origin+personal); await until(a,"!!document.querySelector('.header-identity-zone > .namecard-trigger')","Personal identity"); await run(a,"click",".header-identity-zone > .namecard-trigger"); await button(a,"Private nickname"); await fill(a,".scoped-settings-form input",""); await button(a,"Save nickname"); await until(a,"document.querySelector('.scoped-settings-form [role=status]')?.textContent==='Nickname saved.'","original no-alias restored"); await run(a,"press","Escape"); console.log("PASS original empty A→B nickname restored"); }
