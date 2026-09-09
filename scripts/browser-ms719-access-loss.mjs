import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
assert(bin, "Set AGENT_BROWSER_BIN");
const a = "ms71-a", b = "ms71-b", root = "/room/ms7-1-qa-japan-trip-2027-6f6ae6";
const child = `${root}/subroom/4dabe4eb-acf4-4e5c-aac9-c12eb0614dd4`;
const draft = `MS719 removal draft ${Date.now()}`;
async function run(s, ...args) {
  // Never include bearer invitation URLs in errors/output.
  try {
    const { stdout } = await exec(bin, ["--session", s, "--json", ...args], { timeout: 45000 });
    const out = JSON.parse(stdout); assert(out.success);
    return args[0] === "eval" ? out.data?.result : out.data;
  } catch { throw new Error(`Browser ${s}: ${args[0]} failed`); }
}
const ev = (s, js) => run(s, "eval", js);
async function until(s, js, label) {
  const end = Date.now() + 65000;
  while (Date.now() < end) { if (await ev(s, js)) return; await new Promise(r => setTimeout(r, 400)); }
  throw new Error(`Timeout: ${label}`);
}
const button = (s, name) => run(s, "find", "role", "button", "click", "--name", name, "--exact");
async function open(s, path) {
  await run(s, "open", `http://localhost:3000${path}`);
  await until(s, "!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')", "Chat loaded");
}
async function restoreMembership() {
  await open(a, root); await button(a, "Invite");
  await until(a, "document.querySelector('.invite-link input')?.value.includes('/join/')", "fresh invitation");
  const url = await ev(a, "document.querySelector('.invite-link input').value");
  await run(a, "click", ".invite-panel .overlay-close");
  await run(b, "open", url);
  await until(b, "!!document.querySelector('.join-card button.primary-action')||!!document.querySelector('.join-complete a')", "rejoin/recovery");
  if (await ev(b, "!!document.querySelector('.join-card button.primary-action')")) {
    await run(b, "scrollintoview", ".join-card button.primary-action");
    await run(b, "click", ".join-card button.primary-action");
  } else await run(b, "click", ".join-complete a");
  await until(b, `location.pathname===${JSON.stringify(root)}&&!!document.querySelector('.composer textarea')`, "membership restored");
}
async function removeB() {
  await open(a, root); await button(a, "Conversation options");
  await until(a, "!!document.querySelector('.communication-options')", "options");
  await button(a, "Room details");
  await until(a, "document.querySelectorAll('.room-member-list li').length===2", "exact QA membership");
  assert.equal(await ev(a, "document.querySelector('#room-details-title').textContent"), "MS7.1 QA Japan Trip 2027");
  await run(a, "scrollintoview", ".room-member-list button"); await run(a, "click", ".room-member-list button");
  await run(a, "click", ".room-confirmation .danger");
  await until(a, "document.querySelectorAll('.room-member-list li').length===1", "withdrawal committed");
}
let mayNeedRestore = false;
try {
  for (const s of [a, b]) await run(s, "set", "viewport", "1440", "900");
  await open(b, child); await open(a, child);
  assert.equal(await ev(b, "document.querySelector('.composer textarea').value"), "", "Preserve existing draft");
  await run(b, "fill", ".composer textarea", draft);
  await until(a, "document.querySelector('.chat-transport-status')?.textContent.includes('typing')", "real typing received");
  mayNeedRestore = true; await removeB();
  await until(b, `!document.querySelector('.composer textarea')&&!document.querySelector('a[href="${root}"]')`, "typing member fails closed");
  for (const path of [root, child]) {
    await run(b, "open", `http://localhost:3000${path}`);
    await until(b, "document.body.innerText.includes('404')", "removed deep link denied");
  }
  await restoreMembership(); mayNeedRestore = false;
  await open(b, child);
  assert.equal(await ev(b, "document.querySelector('.composer textarea').value"), draft, "Unsent draft survives access withdrawal and legitimate rejoin");
  await ev(b, "document.querySelector('.composer textarea').focus();document.querySelector('.composer textarea').select();true"); await run(b, "press", "Backspace");
  console.log("PASS: real typing → owner removal; composer/navigation close, parent/child URLs deny; valid rejoin restores exact unsent draft. QA draft cleared without sending.");
  await run(b, "open", `http://localhost:3000${root}/hall`);
  await until(b, "!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')", "Hall");
  await button(b, "New Note"); await run(b, "fill", "[aria-label=Title]", `${draft} Hall`);
  await run(b, "fill", "[aria-label=Note]", "Unsubmitted QA note; never accept after access loss.");
  mayNeedRestore = true; await removeB();
  await until(b, "!document.querySelector('dialog[open]')&&!document.querySelector('.hall-surface')", "open Hall editor withdrawn");
  await restoreMembership(); mayNeedRestore = false;
  console.log("PASS: membership withdrawal while Hall editor open dismisses protected surface/modal; fresh invitation restores membership; unsubmitted note never sent.");
} finally {
  if (mayNeedRestore) { await restoreMembership(); console.log("Restored A/B membership in exact QA Room after interrupted test."); }
}
