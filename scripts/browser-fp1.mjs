import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
assert(bin, "Set AGENT_BROWSER_BIN");
const origin = process.env.FP1_ORIGIN ?? "http://localhost:3000";
async function run(session, ...args) {
  const { stdout } = await exec(bin, ["--session", session, "--json", ...args], { timeout:45000 });
  const result = JSON.parse(stdout); assert(result.success, JSON.stringify(result.error));
  return args[0] === "eval" ? result.data?.result : result.data;
}
const ev = (session, js) => run(session, "eval", js);
async function until(session, js, label) {
  const end = Date.now()+25000;
  while (Date.now()<end) { if (await ev(session,js)) return; await new Promise(r=>setTimeout(r,300)); }
  throw new Error(`Timed out: ${label}`);
}
async function open(session, path) {
  await run(session,"open",origin+path);
  await until(session,"!!document.querySelector('.messenger-sidebar') && !!document.querySelector('.conversation-row')","authenticated workspace");
}
const a="fp1-a", b="fp1-b", room="/room/fp1-navigation-review", child=room+"/subroom/cf017101-4444-4444-8444-444444444444";
const mode=process.argv[2];
if(mode==="request") {
  await open(b,"/friends");
  await until(b,"!!document.querySelector('.product-nav-item[href=\"/friends\"] .attention-mark') && !!Array.from(document.querySelectorAll('.friend-tabs button,nav[aria-label=\"Friend lists\"] button')).find(e=>e.textContent.includes('Requests'))?.querySelector('.attention-mark')","incoming request indicators");
  await run(b,"find","role","button","click","--name","Requests","--exact");
  await until(b,"document.querySelector('.friend-list')?.innerText.includes('FP1 Request QA')","pending request card");
  await until(b,"!document.querySelector('.product-nav-item[href=\"/friends\"] .attention-mark')","view clears request destination");
  const fixtureIndex = await ev(b,"Array.from(document.querySelectorAll('.friend-list article')).findIndex(e=>e.textContent.includes('FP1 Request QA'))");
  assert(fixtureIndex >= 0);
  await run(b,"click",`.friend-list article:nth-child(${fixtureIndex+1}) button`);
  await until(b,"!document.querySelector('.friend-list')?.innerText.includes('FP1 Request QA') && !document.querySelector('nav[aria-label=\"Friend lists\"] .attention-mark')","accept converges without reload");
  console.log("PASS: incoming Friends + Requests indicators; opening acknowledges; Accept removes pending card and both dots without reload.");
} else if(mode==="removed") {
  await open(b,"/friends");
  await until(b,"!!document.querySelector('nav[aria-label=\"Friend lists\"]')","Friends");
  const pending = await ev(b,"fetch('/api/workspace').then(r=>r.json()).then(d=>d.activity.filter(x=>x.actorName==='FP1 Request QA').map(x=>({pending:x.requestPending,unseen:!x.destinationReadAt})))");
  assert(pending.some(x=>x.unseen&&!x.pending),"Actual stale unseen notification is retained but ineligible");
  assert(await ev(b,"!document.querySelector('.product-nav-item[href=\"/friends\"] .attention-mark')"));
  await run(b,"find","role","button","click","--name","Requests","--exact");
  await until(b,"!document.querySelector('.friend-list')?.innerText.includes('FP1 Request QA')","removed request absent");
  assert(await ev(b,"!document.querySelector('nav[aria-label=\"Friend lists\"] .attention-mark')"));
  console.log("PASS: stale unseen notification + removed request yields no Friends/Requests dot; opening Requests does not invent it.");
} else if(mode==="layout") {
  await run(a,"set","viewport","1440","900");
  await open(a,room);
  await until(a,"document.querySelectorAll('.subroom-row').length===2 && !!document.querySelector('.composer textarea')","current parent children");
  const personal = await ev(a,"Array.from(document.querySelectorAll('.conversation-row')).find(e=>e.getAttribute('href')?.startsWith('/personal/')&&!e.getAttribute('href').includes('my-room')).getAttribute('href')");
  for (const path of [child,child+"/hall",room+"/hall"]) {
    await open(a,path); await until(a,"document.querySelectorAll('.subroom-row').length===2","Room family survives Chat/Hall navigation");
    assert(await ev(a,"Array.from(document.querySelectorAll('.subroom-row a')).every(e=>e.getAttribute('href').startsWith('/room/fp1-navigation-review/'))"));
    assert(await ev(a,"!!document.querySelector('.surface-tabs a[aria-current=\"page\"]')"));
  }
  for (const path of [personal,"/personal/my-room","/friends"]) {
    await open(a,path); assert.equal(await ev(a,"document.querySelectorAll('.subroom-row').length"),0);
  }
  await open(a,"/personal/my-room");
  assert(await ev(a,"!!document.querySelector('.conversation-header .sandbox-avatar') && !Array.from(document.querySelectorAll('.conversation-row')).find(e=>e.getAttribute('href')==='/personal/my-room')?.querySelector('.conversation-preview')"));
  await open(a,"/room/ms5-shared-room-750b4c");
  await until(a,"!!document.querySelector('.composer textarea')","existing Room");
  assert(await ev(a,"Array.from(document.querySelectorAll('.subroom-row a')).every(e=>!e.getAttribute('href').includes('fp1-navigation-review'))"));
  await open(a,room);
  await until(a,"document.querySelectorAll('.subroom-row').length===2","return restores current family");
  await run(a,"find","role","button","click","--name","Conversation options","--exact");
  await run(a,"find","role","button","click","--name","Invite","--exact");
  await until(a,"!!document.querySelector('.invite-link input')?.value","existing invite action creates usable link");
  await run(a,"press","Escape");
  for(const width of [320,390,430,768,1440]) {
    await run(a,"set","viewport",String(width),"900");
    await open(a,child);
    await until(a,"!!document.querySelector('.composer textarea')","Subroom Chat");
    const geometry=await ev(a,"(()=>{const q=s=>document.querySelector(s),r=s=>q(s).getBoundingClientRect(), h=r('.header-identity-zone'),t=r('.surface-tabs'),c=r('.core-header-controls');return {overflow:document.documentElement.scrollWidth>innerWidth,below:t.top>=h.bottom-1,controlsInside:c.right<=innerWidth,hasInlineInvite:!!q('.header-identity-zone .invite-button'),font:getComputedStyle(q('.composer textarea')).fontSize}})()");
    assert(!geometry.overflow&&geometry.below&&geometry.controlsInside&&!geometry.hasInlineInvite,JSON.stringify({width,...geometry}));
    if(width<641)assert.equal(geometry.font,"16px");
    await run(a,"find","role","button","click","--name","Add a surface","--exact");
    await until(a,"!!document.querySelector('.surface-add-menu')","surface add menu");
    assert(await ev(a,"document.querySelectorAll('.surface-add-menu button:disabled').length===2 && document.activeElement?.getAttribute('aria-label')==='Add a surface'"));
    await run(a,"press","Escape");
    assert(await ev(a,"document.activeElement?.getAttribute('aria-label')==='Add a surface' && !document.querySelector('.surface-add-menu')"));
    await run(a,"press","Space"); await until(a,"!!document.querySelector('.surface-add-menu')","Space opens plus");
    await run(a,"press","Escape");
    await run(a,"click",".composer textarea");
    assert(await ev(a,"getComputedStyle(document.querySelector('.composer textarea')).outlineStyle==='none' && getComputedStyle(document.querySelector('.composer')).borderRadius!=='0px'"));
    await run(a,"screenshot",`/tmp/tosker-fp1-${width}.png`);
    console.log(`PASS: ${width}px long Subroom header, below-identity strip, disabled + menu, Space/Escape/focus restoration, composer focus.`);
  }
  await open(b,room);
  await until(b,"!!document.querySelector('.subroom-row')","member context");
  assert.equal(await ev(b,"document.querySelectorAll('.subroom-row').length"),1,"Owner-only child stays absent for B");
  console.log("PASS: Room/Subroom Chat/Hall; Personal/Sandbox isolation; return disclosure; owner-only filtering; working Invite in overflow.");
} else if(mode==="keyboard") {
  await run(a,"set","viewport","1440","900"); await open(a,room);
  await run(a,"click",".surface-tabs a:first-child"); await run(a,"press","Tab");
  assert.equal(await ev(a,"document.activeElement.textContent"),"Hall");
  assert(await ev(a,"document.activeElement.matches(':focus-visible')"));
  await run(a,"press","Enter"); await until(a,"location.pathname.endsWith('/hall') && !!document.querySelector('.hall-surface')","native Enter selects Hall");
  // Route navigation can reset focus to the document; use real Tab traversal.
  for(let i=0;i<45&&await ev(a,"document.activeElement.getAttribute('aria-label')!=='Add a surface'");i++) await run(a,"press","Tab");
  assert.equal(await ev(a,"document.activeElement.getAttribute('aria-label')"),"Add a surface");
  await run(a,"press","Space"); await until(a,"!!document.querySelector('.surface-add-menu')","native plus"); await run(a,"press","Escape");
  for(let i=0;i<3;i++) await run(a,"press","Shift+Tab");
  assert.equal(await ev(a,"document.activeElement.getAttribute('aria-label')"),"Conversation options");
  await run(a,"press","Space"); await until(a,"!!document.querySelector('.communication-options')","native options");
  assert.equal(await ev(a,"document.activeElement.textContent"),"Invite");
  await run(a,"press","ArrowDown"); assert.equal(await ev(a,"document.activeElement.textContent"),"Room details");
  await run(a,"press","Escape"); assert.equal(await ev(a,"document.activeElement.getAttribute('aria-label')"),"Conversation options");
  for(const width of [320,390,430,768,1440]) {
    await run(a,"set","viewport",String(width),"900");
    assert(await ev(a,"getComputedStyle(document.querySelector('.surface-tabs a')).fontSize==='14px' && document.documentElement.scrollWidth<=innerWidth"));
  }
  await run(b,"set","viewport","1440","900");
  const icons=await ev(b,"['.profile-notifications','.create-trigger','.collapsed-search-trigger'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),g=e.querySelector('svg').getBoundingClientRect();return {width:r.width,height:r.height,radius:getComputedStyle(e).borderRadius,centered:Math.abs((r.x+r.width/2)-(g.x+g.width/2))<1&&Math.abs((r.y+r.height/2)-(g.y+g.height/2))<1}})");
  assert(icons.every(x=>x.width===36&&x.height===36&&x.radius==='9px'&&x.centered),JSON.stringify(icons));
  await run(b,"screenshot","/tmp/tosker-fp1-collapsed.png");
  console.log("PASS: native Tab/Enter surface navigation; visible focus; Space/ArrowDown/Escape options; plus disabled dialog; logical focus return; final 14px labels at all five widths; collapsed icon geometry/centering.");
} else if(mode==="send") {
  for(const session of [a,b]) { await run(session,"set","viewport","1440","900"); await open(session,room); await until(session,"!!document.querySelector('.composer textarea')","composer"); }
  const marker=`FP1 send ${Date.now()}`;
  await run(a,"fill",".composer textarea",marker+" A"); await run(a,"find","role","button","click","--name","Send message","--exact");
  await until(b,`Array.from(document.querySelectorAll('.message-row')).some(e=>e.textContent.includes(${JSON.stringify(marker+" A")}))`,"A to B realtime delivery");
  await run(b,"fill",".composer textarea",marker+" B"); await run(b,"find","role","button","click","--name","Send message","--exact");
  await until(a,`Array.from(document.querySelectorAll('.message-row')).some(e=>e.textContent.includes(${JSON.stringify(marker+" B")}))`,"B to A realtime delivery");
  for(const session of [a,b]) {
    assert.equal(await ev(session,`Array.from(document.querySelectorAll('.message-row')).filter(e=>e.textContent.includes(${JSON.stringify(marker)})).length`),2);
    assert(await ev(session,"!document.querySelector('[data-nextjs-dialog],.composer-error')"));
  }
  console.log(`PASS: real isolated A/B send in both directions, two unique rendered messages, no reload: ${marker}`);
} else throw new Error("Use request, removed, layout, keyboard or send");
