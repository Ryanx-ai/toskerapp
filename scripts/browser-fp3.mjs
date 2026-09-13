/** Owned fp3-a/fp3-b sessions; existing normal Clerk test sign-in required. */
import assert from "node:assert/strict";
import { run, ev, until, button } from "./browser-fp2.mjs";
const a = "fp3-a", b = "fp3-b", origin = process.env.FP3_ORIGIN ?? "http://localhost:3000";
const room = "/room/fp3-founder-review";
async function open(s, path = room) { await run(s, "open", origin + path); await run(s, "tab", "t1"); await until(s, "!!document.querySelector('.composer textarea')", "authenticated composer"); }
async function fill(s, selector, value) {
  // Native empty fill can change the DOM without React's input event on this host.
  await run(s, "fill", selector, value || " ");
  if (!value) await run(s, "press", "Backspace");
}
async function send(s, body, waitForAcknowledgement = true) {
  await run(s, "fill", ".composer textarea", body);
  await until(s, "!document.querySelector('button[aria-label=\"Send message\"]')?.disabled", "send available");
  await button(s, "Send message");
  const expression = `Array.from(document.querySelectorAll('.message-row')).filter(e=>e.querySelector('.message-bubble > p')?.textContent===${JSON.stringify(body)}).at(-1)?.id`;
  await until(s, expression, "sent row");
  const id = (await ev(s, expression)).slice(8);
  if (waitForAcknowledgement) await until(s, "document.querySelector('.composer textarea').value===''", "send acknowledgement", 45000);
  return id;
}
async function action(s, id, label) {
  const row = `#message-${id}`;
  await run(s, "scrollintoview", row); await run(s, "hover", row);
  await run(s, "click", `${row} button[aria-label="More message actions"]`);
  await until(s, "!!document.querySelector('.message-action-list')", "message menu");
  const target = await ev(s, `(()=>{const e=[...document.querySelectorAll('.message-action-list button')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!e)return null;e.dataset.fp3Action='selected';return '[data-fp3-action="selected"]'})()`);
  assert(target, label); await run(s, "click", target);
}
async function nuke(s, id) {
  await action(s, id, "Nuke message");
  assert(await ev(s, "!!document.querySelector('[aria-label=\"Nuke message\"]')"));
  await button(s, "Nuke message");
  await until(s, `!document.getElementById('message-${id}')`, "author removal");
}
if (process.argv[2] === "nuke") {
  await Promise.all([open(a), open(b)]);
  const marker = `FP3 browser private ${Date.now()}`;
  const source = await send(a, marker); console.log("Owned browser source", source);
  await until(b, `!!document.getElementById('message-${source}')`, "A to B");
  await action(b, source, "Pin to Hall");
  await until(b, "!document.querySelector('.message-action-list')", "pin accepted");
  await action(b, source, "Reply");
  const reply = await send(b, `FP3 standalone browser reply ${source}`); console.log("Owned browser reply", reply);
  await action(b, source, "Reply");
  await run(b, "fill", ".composer textarea", "FP3 preserve independent typing");
  await nuke(a, source);
  await until(b, `!document.getElementById('message-${source}') && !document.querySelector('button[aria-label="Cancel reply"]') && !document.querySelector('#message-${reply} blockquote')`, "remote source/quote removal", 45000);
  assert.equal(await ev(b, "document.querySelector('.composer textarea').value"), "FP3 preserve independent typing");
  await run(b, "reload"); await until(b, "!!document.querySelector('.composer textarea')", "reload");
  await until(b, `!document.querySelector('#message-${reply} blockquote') && !document.querySelector('button[aria-label="Cancel reply"]')`, "recovered draft no quote");
  assert.equal(await ev(b, "document.querySelector('.composer textarea').value"), "FP3 preserve independent typing");
  await fill(b, ".composer textarea", "");
  await run(b, "open", origin + room + "/hall");
  await until(b, "!!document.querySelector('.new-hall-card')", "Hall board");
  assert(!(await ev(b, "document.body.innerText")).includes(marker));
  await run(b, "open", origin + room + `?message=${source}`);
  await until(b, "!!document.querySelector('.composer textarea') && !location.search", "removed source URL clears quietly");
  assert(!(await ev(b, "document.body.innerText")).match(/Message deleted|Source unavailable|Unable to locate/i));
  console.log("PASS A/B author Nuke, Hall pin retraction, standalone sent reply, unsent text/reload, removed source navigation");
}
if (process.argv[2] === "search") {
  await Promise.all([open(a), open(b)]);
  const marker = `FP3search${Date.now()}`, source = await send(a, marker); console.log("Owned search source", source);
  await button(b, "Search conversation");
  await until(b, "!!document.querySelector('.conversation-search input')", "Search dialog");
  await run(b, "fill", ".conversation-search input", marker); await button(b, "Search");
  await until(b, `document.querySelector('.conversation-search')?.textContent.includes(${JSON.stringify(marker)})`, "Search result");
  await nuke(a, source);
  await until(b, `!document.querySelector('.conversation-search')?.textContent.includes(${JSON.stringify(marker)})`, "open Search retraction", 45000);
  await run(b, "press", "Escape");
  console.log("PASS open Search refresh/pruning after other-user Nuke");
}
if (process.argv[2] === "retry") {
  await open(a);
  const marker = `FP3 lost acknowledgement ${Date.now()}`;
  const tabs = await run(a, "tab", "list"); console.log("Retry tabs", tabs);
  await ev(a, `(()=>{window.__fp3Fetch=window.fetch;window.__fp3Drop=true;window.__fp3Block=true;window.fetch=async function(resource,options){if(window.__fp3Block&&String(resource).includes('/api/conversations/'))throw new TypeError('QA offline history');const response=await window.__fp3Fetch.apply(this,arguments);if(window.__fp3Drop&&options?.method==='POST'&&String(options.body).includes(${JSON.stringify(marker)})){window.__fp3Drop=false;await response.clone().text();throw new TypeError('QA lost acknowledgement')}return response};return true})()`);
  await send(a, marker, false);
  await until(a, "document.body.innerText.includes('Delivery couldn’t be confirmed') || document.body.innerText.includes(\"Delivery couldn't be confirmed\")", "lost acknowledgement", 45000);
  const source = await ev(a, "JSON.parse(sessionStorage.getItem('tosker.chat-draft.v1:0ee1e5a5-6d7a-4541-a6ca-ca69788997ef:f7300000-2026-4000-8000-000000000003')).pending.id");
  console.log("Owned lost-ack source", source);
  await run(a, "tab", "new", "--label", "fp3-retract", origin + room);
  await until(a, `!!document.getElementById('message-${source}')`, "accepted send in another tab");
  await nuke(a, source);
  await run(a, "tab", "close", "fp3-retract");
  await until(a, "!!document.querySelector('.composer textarea')", "original draft tab");
  await button(a, "Send message");
  await until(a, `!document.getElementById('message-${source}') && document.querySelector('.composer textarea').value===''`, "terminal removed retry", 45000);
  await ev(a, "(()=>{window.fetch=window.__fp3Fetch;delete window.__fp3Fetch;return true})()");
  await run(a, "reload"); await until(a, "!!document.querySelector('.composer textarea')", "canonical recovery");
  assert(!(await ev(a, "document.body.innerText")).includes(marker));
  console.log("PASS committed send/lost acknowledgement → Nuke in second authenticated tab → original stable-ID UI retry terminal/empty → reload no resurrection");
}
async function settings(s, kind = "Room") {
  await button(s, "Conversation options"); await button(s, `${kind} Settings`);
  await until(s, "!!document.querySelector('.scoped-settings-shell')", "Settings shell");
}
if (process.argv[2] === "settings") {
  await Promise.all([open(a), open(b)]); await settings(a); await settings(b);
  await until(a, "!!document.querySelector('.scoped-settings-form input')", "owner Overview");
  await until(b, "document.querySelector('.scoped-settings-shell')?.textContent.includes('The owner manages')", "member Overview");
  assert(await ev(b, "!document.querySelector('.scoped-settings-form input') && document.querySelector('.scoped-settings-shell').textContent.includes('The owner manages')"));
  await button(a, "People"); await button(b, "People");
  assert(await ev(a, "!!document.querySelector('.scoped-settings-shell button[aria-label^=\"Remove \"]')"));
  assert(await ev(b, "!document.querySelector('.scoped-settings-shell button[aria-label^=\"Remove \"]')"));
  await until(a, "!!document.querySelector('.fp2-invitation-management')", "invitations");
  await button(a, "Structure"); await button(b, "Structure");
  assert(await ev(a, "!!document.querySelector('.scoped-settings-shell button[aria-label^=\"Reorder \"]')"));
  assert(await ev(b, "!document.querySelector('.scoped-settings-shell button[aria-label^=\"Reorder \"]')"));
  await button(a, "My preferences");
  const original = await ev(a, "document.querySelector('.settings-toggle').getAttribute('aria-pressed')==='true'");
  await button(a, original ? "Unmute Room" : "Mute Room");
  await until(a, `document.querySelector('.settings-toggle')?.getAttribute('aria-pressed')===${JSON.stringify(String(!original))}`, "own preference saved", 45000);
  await button(a, original ? "Mute Room" : "Unmute Room");
  await until(a, `document.querySelector('.settings-toggle')?.getAttribute('aria-pressed')===${JSON.stringify(String(original))}`, "own preference restored", 45000);
  await button(b, "Leave Room"); assert(await ev(b, "document.querySelector('.room-confirmation')?.textContent.includes('Existing messages and notes stay')")); await button(b, "Cancel");
  await button(a, "Close Room Settings"); await button(b, "Close Room Settings");
  const personal = "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa";
  await open(a, personal); await settings(a, "Chat");
  await until(a, "!!document.querySelector('.scoped-settings-form input')", "accepted private nickname");
  const nickname = await ev(a, "document.querySelector('.scoped-settings-form input').value");
  await ev(a, `sessionStorage.setItem('fp3.qa.nicknameBaseline',${JSON.stringify(nickname)})`);
  await run(a, "fill", ".scoped-settings-form input", "FP3 private nickname"); await button(a, "Save nickname");
  await until(a, "document.querySelector('.scoped-settings-form button')?.disabled && document.querySelector('.scoped-settings-form button')?.textContent==='Save nickname' && document.querySelector('.scoped-settings-header')?.textContent.includes('FP3 private nickname')", "private nickname saved");
  await fill(a, ".scoped-settings-form input", nickname); await button(a, "Save nickname");
  await until(a, `document.querySelector('.scoped-settings-form button')?.disabled && document.querySelector('.scoped-settings-form button')?.textContent==='Save nickname' && document.querySelector('.scoped-settings-form input')?.value===${JSON.stringify(nickname)}`, "nickname restored");
  await button(a, "Communication");
  const personalMuted = await ev(a, "document.querySelector('.settings-toggle').getAttribute('aria-pressed')==='true'");
  await button(a, personalMuted ? "Unmute Chat" : "Mute Chat");
  await until(a, `document.querySelector('.settings-toggle')?.getAttribute('aria-pressed')===${JSON.stringify(String(!personalMuted))}`, "Chat mute saved");
  await button(a, personalMuted ? "Mute Chat" : "Unmute Chat");
  await until(a, `document.querySelector('.settings-toggle')?.getAttribute('aria-pressed')===${JSON.stringify(String(personalMuted))}`, "Chat mute restored");
  await button(a, "Close Chat Settings");
  console.log("PASS Room owner/member information/People/Structure permissions, own mute toggle/restore, distinct Leave confirmation/Cancel, Personal private nickname save/restore and Chat mute/restore");
}
if (process.argv[2] === "restore-nickname") {
  await open(a, "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa"); await settings(a, "Chat");
  await until(a, "!!document.querySelector('.scoped-settings-form input')", "nickname");
  assert.equal(await ev(a, "document.querySelector('.scoped-settings-form input').value"), "FP3 private nickname");
  await fill(a, ".scoped-settings-form input", ""); await button(a, "Save nickname");
  await until(a, "document.querySelector('.scoped-settings-form input')?.value==='' && document.querySelector('.scoped-settings-form button')?.disabled && document.querySelector('.scoped-settings-form button')?.textContent==='Save nickname' && !document.querySelector('.scoped-settings-header')?.textContent.includes('FP3 private nickname')", "restored canonical display", 45000);
  await button(a, "Close Chat Settings"); console.log("QA-only nickname removed; canonical display restored");
}
if (process.argv[2] === "widths") {
  await open(a); await settings(a);
  await until(a, "!!document.querySelector('.scoped-settings-form input')", "owner Overview");
  for (const [width, height] of [[320,844],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]]) {
    await run(a, "set", "viewport", String(width), String(height));
    for (const section of ["Overview", "People", "Structure", "My preferences"]) {
      await button(a, section);
      const geometry = await ev(a, "(()=>{const e=document.querySelector('.scoped-settings-shell'),r=e.getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,overflow:e.scrollWidth-e.clientWidth}})()");
      assert(geometry.fits && geometry.overflow <= 1, `${width} ${section}: ${JSON.stringify(geometry)}`);
    }
    console.log(`PASS Room Settings ${width}×${height}, four sections, viewport and horizontal overflow`);
  }
  await button(a, "Overview"); await run(a, "set", "viewport", "1440", "900");
  console.log(await run(a, "screenshot"));
}
if (process.argv[2] === "settings-failure") {
  await open(a); await settings(a);
  await until(a, "!!document.querySelector('.scoped-settings-form input')", "Overview");
  const old = await ev(a, "document.querySelector('.scoped-settings-form input').value");
  await ev(a, `sessionStorage.setItem('fp3.qa.roomNameBaseline',${JSON.stringify(old)})`);
  await run(a, "fill", ".scoped-settings-form input", "FP3 save recovery");
  await ev(a, "(()=>{window.__fp3Fetch=window.fetch;window.fetch=async function(resource,options){if(options?.method==='POST'&&String(options.body).includes('FP3 save recovery'))throw new TypeError('QA save unavailable');return window.__fp3Fetch.apply(this,arguments)};return true})()");
  await button(a, "Save Room");
  await until(a, "!!document.querySelector('.scoped-settings-shell [role=alert]')", "save error");
  assert.equal(await ev(a, "document.querySelector('.scoped-settings-form input').value"), "FP3 save recovery");
  await ev(a, "(()=>{window.fetch=window.__fp3Fetch;delete window.__fp3Fetch;return true})()");
  await button(a, "Save Room");
  await until(a, "document.querySelector('.scoped-settings-header')?.textContent.includes('FP3 save recovery')", "save retry success", 45000);
  await run(a, "fill", ".scoped-settings-form input", old); await button(a, "Save Room");
  await until(a, `document.querySelector('.scoped-settings-header')?.textContent.includes(${JSON.stringify(old)})`, "Room name restored", 45000);
  await run(a, "press", "Escape"); await until(a, "!document.querySelector('dialog[open]')", "Escape closes Settings");
  console.log("PASS failed save retains input/error; explicit retry succeeds; original Room name restored; Escape closes native modal");
}
if (process.argv[2] === "prime") {
  await open(a, "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa");
  for (const [width, height] of [[320,844],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]]) {
    await run(a, "set", "viewport", String(width), String(height));
    await open(a, "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa");
    await button(a, "Schedule message — deferred");
    await until(a, "!!document.querySelector('.fp2-deferred-info:popover-open')", "scheduler disclosure");
    assert(await ev(a, "(()=>{const e=document.querySelector('.fp2-deferred-info:popover-open'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&e.textContent.includes('execution-time authorization')&&!e.querySelector('input')})()"));
    await run(a, "press", "Escape");
    await settings(a, "Chat");
    for (const section of ["Overview", "Communication"]) {
      await button(a, section);
      assert(await ev(a, "(()=>{const e=document.querySelector('.scoped-settings-shell'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1})()"));
    }
    await run(a, "press", "Escape");
    assert(await ev(a, "!document.querySelector('dialog[open]')"));
    console.log(`PASS requested width ${width}: Personal Settings + scheduler disclosure fit/Escape/no scheduling inputs`, await ev(a, "({width:innerWidth,height:innerHeight})"));
  }
  await run(a, "open", origin + "/settings");
  await until(a, "!!document.querySelector('.scoped-settings-preview')", "Personal Brand preview");
  assert(await ev(a, "document.querySelectorAll('.scoped-settings-preview').length===1&&!document.querySelector('.scoped-settings-preview button,.scoped-settings-preview input,.scoped-settings-preview select')"));
  await run(a, "set", "viewport", "390", "844"); console.log(await run(a, "screenshot"));
  console.log("PASS exactly one static account Personal Brand preview; no upload/apply/persistence affordance");
}
if (["keyboard-privacy", "keyboard"].includes(process.argv[2])) {
  await open(a); await run(a, "set", "viewport", "1440", "900");
  await run(a, "tab", "t1");
  await until(a, "!!document.querySelector('.message-row.mine')", "canonical message rows");
  const row = await ev(a, "document.querySelector('.message-row.mine:last-of-type')?.id ?? [...document.querySelectorAll('.message-row.mine')].at(-1)?.id");
  assert(row); await action(a, row.slice(8), "Nuke message");
  assert(await ev(a, "document.activeElement?.textContent==='Cancel'"), "Nuke defaults to safe Cancel focus");
  await run(a, "press", "Escape"); await until(a, "!document.querySelector('dialog[open]')", "Nuke Escape");
  await settings(a);
  await until(a, "!!document.querySelector('.scoped-settings-form input')", "loaded Settings controls");
  await ev(a, "(()=>{window.__fp3Keys=[];window.__fp3Observe=e=>{if(['Tab','Enter',' '].includes(e.key))window.__fp3Keys.push({key:e.key,tag:document.activeElement?.tagName,outline:getComputedStyle(document.activeElement).outlineStyle,inside:!!document.activeElement?.closest('dialog[open]')})};document.addEventListener('keyup',window.__fp3Observe,true);return true})()");
  await run(a, "press", "Tab"); await run(a, "press", "Tab"); await run(a, "press", "Space");
  const keys = await ev(a, "window.__fp3Keys"); assert(keys.length >= 2 && keys.every((key) => key.inside));
  assert(keys.some((key) => key.outline !== "none"));
  await ev(a, "document.removeEventListener('keyup',window.__fp3Observe,true)");
  await run(a, "press", "Escape");
  console.log("PASS safe Nuke Cancel focus/Escape; loaded Settings native Tab/Space and visible focus remain inside modal");
}
if (["keyboard-privacy", "privacy"].includes(process.argv[2])) {
  await run(b, "open", origin + room + "/hall"); await until(b, "!!document.querySelector('.new-hall-card')", "B Hall");
  await open(a);
  await until(a, "!!document.querySelector('.message-row')", "canonical rows before privacy send");
  const marker = `FP3notify${Date.now()}`;
  const first = await send(a, marker + " first");
  console.log("Owned first privacy message", first);
  const second = await send(a, marker + " second");
  console.log("Owned privacy messages", first, second);
  await run(b, "open", origin + "/notifications");
  await until(b, "document.body.innerText.includes('FP3 Founder Review')", "notification context");
  assert(!(await ev(b, "document.body.innerText")).includes(marker));
  assert(await ev(b, "(async()=>{const r=await fetch('/api/workspace',{cache:'no-store'});const v=await r.json();return r.ok&&v.activity.every(n=>!Object.hasOwn(n,'messageBody')&&!Object.hasOwn(n,'body'))})()"));
  await nuke(a, first);
  await until(b, `(async()=>{const r=await fetch('/api/workspace',{cache:'no-store'});const v=await r.json();return !v.activity.some(n=>n.messageId==='${first}')&&v.activity.some(n=>n.messageId==='${second}')})()`, "exact source event removed / other preserved");
  console.log("PASS WHO/context notification without bodies; exact Nuke event cleanup preserves unrelated event");
}
