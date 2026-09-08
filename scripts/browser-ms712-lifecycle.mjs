import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN.");
const room = "/room/ms7-1-qa-japan-trip-2027-6f6ae6", name = "MS7.1 QA Japan Trip 2027";
async function run(session, ...args) {
  let stdout;
  try { ({ stdout } = await exec(binary, ["--session", session, "--json", ...args], { timeout: 30000 })); }
  catch { throw new Error(`Browser ${session} command failed: ${args[0]}`); } // Never log an invitation bearer URL.
  const result = JSON.parse(stdout);
  if (!result.success) throw new Error(`Browser command failed: ${args[0]}`);
  return args[0] === "eval" ? result.data?.result : result.data;
}
const evaluate = (session, js) => run(session, "eval", js);
async function until(session, js, label) {
  const end = Date.now() + 35000;
  while (Date.now() < end) { if (await evaluate(session, js)) return; await new Promise((r) => setTimeout(r, 350)); }
  throw new Error(`Timed out: ${label}`);
}
async function open(session, path) {
  await run(session, "open", `http://localhost:3000${path}`);
  await until(session, "document.querySelector('.conversation-surface')?.dataset.realtime==='connected'", "connected Chat");
}
async function visibleClick(session, selector) {
  await run(session, "scrollintoview", selector);
  await until(session, `(()=>{const r=document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();return r&&r.top>=0&&r.bottom<=innerHeight})()`, "control visible");
  await run(session, "click", selector);
}
async function details(session) {
  await until(session, "!!document.querySelector('[aria-label=\"Room details\"]')", "Room header ready");
  await visibleClick(session, '[aria-label="Room details"]');
  await until(session, "document.querySelectorAll('.room-member-list li').length>0", "Room details loaded");
}
async function closeDetails(session) { await until(session, "!document.querySelector('[aria-label=\"Close Room details\"]').disabled", "details operation settled"); await visibleClick(session, '[aria-label="Close Room details"]'); await until(session, "!document.querySelector('.room-details-panel')", "details closed"); }
async function makeInvite() {
  await open("ms71-a", room);
  await run("ms71-a", "click", ".invite-button");
  await until("ms71-a", "document.querySelector('.invite-link input')?.value.startsWith('http://localhost:3000/join/')", "new secure invitation");
  const value = await evaluate("ms71-a", "document.querySelector('.invite-link input').value");
  await run("ms71-a", "click", ".invite-panel .overlay-close");
  return value;
}
async function join(url) {
  await run("ms71-b", "open", url);
  await until("ms71-b", "!!document.querySelector('.join-card button.primary-action')", "Join available");
  assert.equal(await evaluate("ms71-b", "document.querySelector('.join-card h1').textContent"), name);
  await visibleClick("ms71-b", ".join-card button.primary-action");
  await until("ms71-b", `location.pathname===${JSON.stringify(room)} && !!document.querySelector('.composer textarea')`, "joined Room opens");
  await run("ms71-b", "open", url);
  await until("ms71-b", "document.querySelector('.join-complete')?.textContent.includes('Already joined')", "repeat invite is idempotent");
  await visibleClick("ms71-b", ".join-complete a");
  await until("ms71-b", `location.pathname===${JSON.stringify(room)} && !!document.querySelector('[aria-label="Room details"]')`, "Room header after repeat join");
}
async function createChild(label, visibility) {
  await open("ms71-a", room);
  await run("ms71-a", "click", ".room-context-trigger");
  await until("ms71-a", "!!document.querySelector('.room-context-menu')", "Room switcher");
  const existing = await evaluate("ms71-a", `Array.from(document.querySelectorAll('.room-context-menu a')).find(a=>a.textContent===${JSON.stringify(label)})?.getAttribute('href')`);
  if (existing) { await run("ms71-a", "press", "Escape"); return existing; }
  await run("ms71-a", "click", ".room-context-menu button");
  await until("ms71-a", "!!document.querySelector('#subroom-title')", "Subroom form");
  await run("ms71-a", "fill", ".creation-panel .wizard-field input", label);
  await run("ms71-a", "select", ".creation-panel select", visibility);
  await run("ms71-a", "click", ".creation-panel .overlay-actions .primary-action");
  await until("ms71-a", `location.pathname.startsWith(${JSON.stringify(`${room}/subroom/`)}) && !document.querySelector('#subroom-title')`, "created Subroom opens");
  return evaluate("ms71-a", "location.pathname");
}
async function main() {
  if (process.env.MS712_LIFECYCLE_ONLY !== "1") {
  for (const session of ["ms71-a", "ms71-b"]) await open(session, room);
  await details("ms71-a");
  assert.equal(await evaluate("ms71-a", "Array.from(document.querySelectorAll('.room-details-panel button')).some(b=>b.textContent==='Leave Room')"), false);
  await run("ms71-a", "fill", ".room-details-panel form input", `${name} Updated`);
  await run("ms71-a", "click", ".room-details-panel form .primary-action");
  await until("ms71-a", "document.querySelector('.room-details-panel [role=status]')?.textContent==='Room saved.'", "Room saved");
  await until("ms71-b", `document.querySelector('.room-context-trigger')?.textContent.includes(${JSON.stringify(`${name} Updated`)})`, "Room rename reaches B");
  await until("ms71-a", "!document.querySelector('.room-details-panel form button').disabled", "save fully settled");
  await run("ms71-a", "fill", ".room-details-panel form input", name);
  await until("ms71-a", `document.querySelector('.room-details-panel form input').value===${JSON.stringify(name)}`, "name restoration typed");
  await run("ms71-a", "click", ".room-details-panel form .primary-action");
  await until("ms71-a", `document.querySelector('#room-details-title')?.textContent===${JSON.stringify(name)} && !document.querySelector('.room-details-panel form button').disabled`, "QA name restored");
  await closeDetails("ms71-a");
  await details("ms71-b");
  assert.equal(await evaluate("ms71-b", "document.querySelectorAll('.room-member-list li').length"), 2);
  assert.equal(await evaluate("ms71-b", "!!document.querySelector('.room-details-panel form') || !!document.querySelector('.room-member-list button')"), false);
  await run("ms71-b", "set", "viewport", "390", "844");
  assert.equal(await evaluate("ms71-b", "(()=>{const r=document.querySelector('.room-details-panel').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"), true);
  await run("ms71-b", "screenshot", "/tmp/tosker-ms712-member-mobile.png");
  await closeDetails("ms71-b"); await run("ms71-b", "set", "viewport", "1440", "900");
  console.log("PASS: owner management/rename sync, member list and restricted controls, no owner Leave, mobile details fit.");
  const gaming = await createChild("Gaming", "everyone"), planning = await createChild("Trip Planning", "everyone"), secret = await createChild("Budget Secret", "owners");
  await until("ms71-b", `!!document.querySelector('a[href="${gaming}"]') && !!document.querySelector('a[href="${planning}"]')`, "public children appear in B navigation");
  assert.equal(await evaluate("ms71-b", `!!document.querySelector('a[href="${secret}"]')`), false);
  await run("ms71-b", "click", ".room-context-trigger");
  await until("ms71-b", "!!document.querySelector('.room-context-menu')", "B switcher");
  assert.equal(await evaluate("ms71-b", "document.querySelector('.room-context-menu').textContent.includes('Budget Secret')"), false);
  await run("ms71-b", "press", "Escape");
  await run("ms71-b", "open", `http://localhost:3000${secret}`);
  await until("ms71-b", "document.body.innerText.includes('404')", "restricted child denied");
  await open("ms71-b", gaming);
  assert.equal(await evaluate("ms71-b", "Array.from(document.querySelectorAll('.message-bubble > p')).some(p=>p.textContent.includes('MS711 stress'))"), false);
  await run("ms71-b", "click", ".room-context-trigger");
  await run("ms71-b", "click", `.room-context-menu a[href="${room}"]`);
  await until("ms71-b", `location.pathname===${JSON.stringify(room)}`, "return to parent");
  console.log("PASS: two public children, one owner-only child, parent switcher, B child denial and separate empty child Chat.");
  }
  const gaming = await createChild("Gaming", "everyone");
  const revokedUrl = await makeInvite();
  await details("ms71-a");
  let pending = await evaluate("ms71-a", "Array.from(document.querySelectorAll('.room-invite-list li')).findIndex(li=>li.querySelector('small')?.textContent==='pending')");
  assert.ok(pending >= 0);
  while (pending >= 0) {
    await visibleClick("ms71-a", `.room-invite-list li:nth-child(${pending + 1}) button`);
    await until("ms71-a", "document.querySelector('.room-details-panel [role=status]')?.textContent==='Invitation revoked.' && !document.querySelector('.overlay-close').disabled", "invite revoked");
    pending = await evaluate("ms71-a", "Array.from(document.querySelectorAll('.room-invite-list li')).findIndex(li=>li.querySelector('small')?.textContent==='pending')");
  }
  await closeDetails("ms71-a");
  await run("ms71-b", "open", revokedUrl);
  await until("ms71-b", "document.body.innerText.includes('Invite unavailable')", "revoked link denied");
  console.log("PASS: revoked invitation URL denied.");
  await open("ms71-b", gaming);
  await open("ms71-a", room); await details("ms71-a");
  await visibleClick("ms71-a", ".room-member-list button");
  await run("ms71-a", "click", ".room-confirmation .danger");
  await until("ms71-a", "document.querySelectorAll('.room-member-list li').length===1", "member removed");
  await until("ms71-b", `!document.querySelector('a[href="${room}"]') && !document.querySelector('.composer textarea')`, "B open child loses access and navigation");
  await closeDetails("ms71-a");
  for (const path of [room, gaming]) {
    await run("ms71-b", "open", `http://localhost:3000${path}`);
    await until("ms71-b", "document.body.innerText.includes('404')", "removed exact link denied");
  }
  const fresh = await makeInvite(); await join(fresh);
  console.log("PASS: removal from open child, denied parent/child URLs, fresh rejoin and duplicate-link state.");
  await details("ms71-b");
  const leaveIndex = await evaluate("ms71-b", "Array.from(document.querySelectorAll('.room-details-panel > button')).findIndex(b=>b.textContent==='Leave Room')");
  assert.ok(leaveIndex >= 0);
  await visibleClick("ms71-b", ".room-details-panel > button.danger");
  await run("ms71-b", "click", ".room-confirmation .danger");
  await until("ms71-b", `location.pathname==='/app' && !document.querySelector('a[href="${room}"]')`, "member leave");
  await run("ms71-b", "open", fresh);
  await until("ms71-b", "document.body.innerText.includes('Invite unavailable')", "old accepted invite cannot rejoin");
  await join(await makeInvite());
  for (const session of ["ms71-a", "ms71-b"]) { await open(session, room); await details(session); assert.equal(await evaluate(session, "document.querySelectorAll('.room-member-list li').length"), 2); await closeDetails(session); }
  console.log("PASS: revoked link denied, owner removal while B in child removes access/navigation, parent/child exact URLs denied, fresh invite rejoin idempotent, member leave, accepted-token reuse denied, new invite restores A/B for continued QA.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
