import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec=promisify(execFile),bin=process.env.AGENT_BROWSER_BIN,a="ms71-a",b="ms71-b";
if(!bin)throw new Error("Set AGENT_BROWSER_BIN.");
const origin = process.env.MS719_ORIGIN ?? "http://localhost:3000";
assert(["http://localhost:3000", "https://toskerapp.vercel.app"].includes(origin), "Use only the local or canonical authorized review target");
async function run(s,...args){try{const {stdout}=await exec(bin,["--session",s,"--json",...args],{timeout:45000});const out=JSON.parse(stdout);assert(out.success);return args[0]==="eval"?out.data?.result:out.data;}catch{throw new Error(`Browser ${s} ${args[0]} failed`);}} // Never log invite URLs.
const ev=(s,js)=>run(s,"eval",js),click=(s,name)=>run(s,"find","role","button","click","--name",name,"--exact");
async function until(s,js,label){const end=Date.now()+60000;while(Date.now()<end){if(await ev(s,js))return;await new Promise(r=>setTimeout(r,400));}throw new Error(`Timed out: ${label}`);}
async function open(s,path){await run(s,"open",`${origin}${path}`);await until(s,"!!document.querySelector('.conversation-surface')&&!document.querySelector('.chat-load-state')","Chat loaded");}
async function send(s,text){assert.equal(await ev(s,"document.querySelector('.composer textarea').value"),"");await run(s,"fill",".composer textarea",text);await click(s,"Send message");await until(s,"document.querySelector('.composer textarea').value===''","send accepted");}
let name=`MS719 Integrated ${Date.now()}`,root;
for(const s of [a,b])await run(s,"set","viewport","1440","900");
if (origin === "https://toskerapp.vercel.app") {
  for (const [s, letter] of [[a, "a"], [b, "b"]]) {
    await run(s, "open", `${origin}/app`);
    await until(s, `Array.from(document.querySelectorAll('a')).some(e=>e.getAttribute('aria-label')===${JSON.stringify(`tosker.user.${letter}+clerk_test's Sandbox`)})`, `normal isolated canonical ${letter.toUpperCase()} identity`);
  }
}
if(process.env.MS719_RESUME_CREATED){
  root=process.env.MS719_RESUME_CREATED;assert.match(root,/^\/room\/ms719-integrated-\d+-[0-9a-f]+$/);
  await open(a,root);name=await ev(a,"document.querySelector('.room-context-trigger').textContent");assert.match(name,/^MS719 Integrated \d+$/);
}else{
await run(a,"open",`${origin}/app`);await until(a,"!!document.querySelector('[aria-label=\"Start a chat or create a Room\"]')","app ready");
await click(a,"Start a chat or create a Room");await run(a,"click",".creation-choices button:nth-child(2)");
await run(a,"fill","[aria-label=\"Room name\"]",name);await click(a,"Next");
assert(await ev(a,"Array.from(document.querySelectorAll('.option-grid.tags button[aria-pressed=true]')).some(e=>e.textContent==='Just Chilling')"));
await click(a,"Create Room");await until(a,"!!document.querySelector('.room-ready')","Room created");
await ev(a,"window.__ms719BadFrames=[];window.__ms719Observer=new MutationObserver(()=>{if(location.pathname.startsWith('/room/')&&document.querySelector('.desktop-welcome'))window.__ms719BadFrames.push(document.querySelector('.desktop-welcome').textContent)});window.__ms719Observer.observe(document.querySelector('.working-surface'),{subtree:true,childList:true,characterData:true})");
await click(a,"Open Room");await until(a,"location.pathname.startsWith('/room/')&&!!document.querySelector('.conversation-empty')","fresh empty Room opens");
assert.deepEqual(await ev(a,"window.__ms719Observer.disconnect();window.__ms719BadFrames"),[],"Fresh authorized Room must not flash Home/unavailable");
root=await ev(a,"location.pathname");console.log(`FIXTURE: ${name}; ${root}`);
}
assert.equal(await ev(a,"document.querySelector('.room-context-trigger').textContent"),name);
assert.equal(await ev(a,"document.querySelectorAll('.message-row').length"),0);
await click(a,"Invite");await until(a,`document.querySelector('.invite-link input')?.value.startsWith(${JSON.stringify(origin + "/join/")})`,"invite generated");
const invite=await ev(a,"document.querySelector('.invite-link input').value");await run(a,"click",".invite-panel .overlay-close");
await run(b,"open",invite);await until(b,"!!document.querySelector('.join-card button.primary-action')","B invite");
await run(b,"scrollintoview",".join-card button.primary-action");await run(b,"click",".join-card button.primary-action");
await until(b,`location.pathname===${JSON.stringify(root)}&&!!document.querySelector('.conversation-empty')`,"B joins empty Room");
await send(a,`${name} parent`);await until(b,`document.body.innerText.includes(${JSON.stringify(name+" parent")})`,"A to B parent");
await run(a,"click",".room-context-trigger");await run(a,"click",".room-context-menu button");await until(a,"!!document.querySelector('#subroom-title')","child form");
await run(a,"fill",".creation-panel .wizard-field input","Selected integrated");await run(a,"select",".creation-panel select","selected");await run(a,"fill","[placeholder=\"Search Room members\"]","tosker.user.b");
await until(a,"document.querySelectorAll('[aria-label=\"Subroom people results\"] article').length===1","authorized member result");
await run(a,"click","[aria-label=\"Subroom people results\"] button");await click(a,"Create Subroom");
await until(a,"location.pathname.includes('/subroom/')&&!document.querySelector('#subroom-title')&&!!document.querySelector('.conversation-empty')","selected child created");
const child=await ev(a,"location.pathname");console.log(`CHILD: ${child}`);await open(b,child);
assert.equal(await ev(b,`document.body.innerText.includes(${JSON.stringify(name+" parent")})`),false,"No parent-message leakage");
await run(b,"fill",".composer textarea","@");await until(b,"document.querySelectorAll('.mention-suggestions [role=option]').length===2","selected A/B mention scope");await run(b,"press","Escape");await run(b,"fill",".composer textarea"," ");await run(b,"press","Backspace");
await run(a,"click",`.surface-tabs a[href="${child}/hall"]`);await until(a,"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')","A child Hall");
await send(b,`${name} child`);await until(a,"!!document.querySelector('.surface-tabs a:first-child .attention-mark')","child Chat-only attention");
assert(!await ev(a,"!!document.querySelector('.surface-tabs a:nth-child(2) .attention-mark')"));
await run(a,"click",`.surface-tabs a[href="${child}"]`);await until(a,`document.body.innerText.includes(${JSON.stringify(name+" child")})&&!document.querySelector('.surface-tabs a:first-child .attention-mark')`,"child consumed");
await open(a,root);assert(!await ev(a,`document.body.innerText.includes(${JSON.stringify(name+" child")})`),"Child does not leak into parent");
await run(a,"click",`.surface-tabs a[href="${root}/hall"]`);await until(a,"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')","parent Hall");
assert(!await ev(a,"Array.from(document.querySelectorAll('.conversation-row')).some(e=>e.getAttribute('aria-label')?.includes('Selected integrated'))"),"Non-Chat parent collapses child rail");
await click(a,"New Note");await run(a,"fill","[aria-label=Title]",`${name} note`);await run(a,"fill","[aria-label=Note]","Canonical shared context");await click(a,"Add note");await until(a,"!document.querySelector('dialog[open]')","note accepted");
await open(b,root);await until(b,"!!document.querySelector('.surface-tabs a:nth-child(2) .attention-mark')","parent Hall attention");
await run(b,"click",`.surface-tabs a[href="${root}/hall"]`);await until(b,`document.body.innerText.includes(${JSON.stringify(name+" note")})&&!document.querySelector('.surface-tabs a:nth-child(2) .attention-mark')`,"shared note consumed");
for(const s of [a,b]){await run(s,"reload");await until(s,`document.body.innerText.includes(${JSON.stringify(name+" note")})`,"Hall survives reload");}
console.log("PASS: fresh Room/default category/empty state; invite + isolated B join; parent/selected-child traffic and mention scope; Chat/Hall switching/independent attention; non-Chat ladder collapse; shared Hall/reload. Exact fixture retained for QA cleanup.");
if (origin === "https://toskerapp.vercel.app") {
  const personal = "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa", body = `${name} Personal live`, reply = `${name} Personal reply`;
  for (const s of [a,b]) { await open(s, personal); await until(s, "document.querySelector('.conversation-surface')?.dataset.realtime==='connected'&&!document.hidden", "live connected foreground Personal"); }
  assert.equal(await ev(a, "document.querySelector('.composer textarea').value"), "", "Preserve unrelated draft");
  await run(a, "fill", ".composer textarea", body);
  await until(b, "document.querySelector('.chat-transport-status')?.textContent.includes('typing')", "live A typing visible to B");
  await click(a, "Send message"); await until(a, "document.querySelector('.composer textarea').value===''","live Personal acknowledged");
  await until(b, `Array.from(document.querySelectorAll('.message-bubble > p')).some(e=>e.textContent===${JSON.stringify(body)})`, "live A to B Personal");
  const source = await ev(b, `Array.from(document.querySelectorAll('.message-row')).find(e=>e.querySelector('.message-bubble > p')?.textContent===${JSON.stringify(body)}).id`);
  await run(b, "scrollintoview", `#${source}`); await run(b, "click", `#${source} [aria-label=Reply]`); await send(b, reply);
  for (const s of [a,b]) { await run(s, "reload"); await until(s, `Array.from(document.querySelectorAll('.message-row')).some(e=>e.querySelector('.message-bubble > p')?.textContent===${JSON.stringify(reply)}&&e.querySelector('.reply-source > span')?.textContent===${JSON.stringify(body)})`, "live canonical reply/reload"); }
  const replyId = await ev(b, `Array.from(document.querySelectorAll('.message-row')).find(e=>e.querySelector('.message-bubble > p')?.textContent===${JSON.stringify(reply)}).id`);
  console.log(JSON.stringify({ livePersonal: "PASS", typing: true, canonicalReplyReload: true, sourceId: source.replace("message-", ""), replyId: replyId.replace("message-", ""), fixtureName: name }));
}
