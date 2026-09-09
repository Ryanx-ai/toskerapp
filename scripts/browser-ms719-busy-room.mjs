import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
assert(bin, "Set AGENT_BROWSER_BIN");
const a = "ms71-a", b = "ms71-b", root = "/room/ms7-1-qa-japan-trip-2027-6f6ae6";
const marker = `MS719 busy ${Date.now()}`;
async function run(s, ...args) {
  const { stdout } = await exec(bin, ["--session", s, "--json", ...args], { timeout: 45000 });
  const out = JSON.parse(stdout); assert(out.success);
  return args[0] === "eval" ? out.data?.result : out.data;
}
const ev = (s, js) => run(s, "eval", js);
async function until(s, js, label) {
  const end = Date.now() + 60000;
  while (Date.now() < end) { if (await ev(s, js)) return; await new Promise(r => setTimeout(r, 400)); }
  throw new Error(`Timeout: ${label}`);
}
async function open(s, path, hall = false) {
  await run(s, "open", `http://localhost:3000${path}`);
  await until(s, hall ? "!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')" : "!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')", "context loaded");
}
async function send(path, suffix) {
  await open(a, path);
  assert.equal(await ev(a, "document.querySelector('.composer textarea').value"), "", "Preserve draft");
  await run(a, "fill", ".composer textarea", `${marker} ${suffix}`);
  await run(a, "click", ".send-button");
  await until(a, "document.querySelector('.composer textarea').value===''", "send accepted");
}
const mark = path => `!!document.querySelector('a[href="${path}"] .attention-mark')`;
const tabMark = path => `!!document.querySelector('.surface-tabs a[href="${path}"] .attention-mark')`;
for (const s of [a, b]) await run(s, "set", "viewport", "1440", "900");
await open(a, root);
assert(await ev(a, "document.querySelectorAll('.message-row').length>=40"), "Use populated Room, not empty fixture");
await run(a, "click", ".room-context-trigger");
const children = await ev(a, "Array.from(document.querySelectorAll('.room-context-menu a')).filter(e=>['Gaming','Trip Planning'].includes(e.textContent)).map(e=>e.getAttribute('href'))");
assert.equal(children.length, 2);
await run(a, "press", "Escape");
await run(b, "open", "http://localhost:3000/notifications");
await until(b, "!!document.querySelector('.notifications-workspace')", "B elsewhere");
await send(root, "parent");
for (const [i, path] of children.entries()) await send(path, `child ${i}`);
await open(a, `${root}/hall`, true);
assert(await ev(a, "document.querySelectorAll('[data-hall-id]').length>=4"), "Several retained Hall notes");
await run(a, "find", "role", "button", "click", "--name", "New Note", "--exact");
await run(a, "fill", "[aria-label=Title]", `${marker} note`);
await run(a, "fill", "[aria-label=Note]", "Busy Room: shared decisions remain separate from two active Subrooms.");
await run(a, "find", "role", "button", "click", "--name", "Add note", "--exact");
await until(a, "!document.querySelector('dialog[open]')", "Hall accepted");
await until(b, `document.body.innerText.includes(${JSON.stringify(marker)})`, "notification activity");
await open(b, `${root}/hall`, true);
await until(b, `${tabMark(root)}&&!${tabMark(root + "/hall")}`, "Hall consumption preserves Chat");
assert(!await ev(b, `Array.from(document.querySelectorAll('.conversation-row')).some(e=>${JSON.stringify(children)}.includes(e.getAttribute('href')))`), "Hall collapses child rail");
await run(b, "click", ".room-context-trigger");
for (const path of children) assert(await ev(b, mark(path)), "Child attention remains reachable in switcher");
await run(b, "press", "Escape");
await open(b, root);
// Message content and canonical workspace attention load independently after a
// full navigation. An initially absent marker is not evidence of consumption.
await until(b, `!${tabMark(root)}&&${children.map(mark).join("&&")}&&document.querySelectorAll('.message-row').length>=40&&document.body.innerText.includes(${JSON.stringify(marker + " parent")})`, "Parent Chat consumes only parent; canonical child attention retained");
await run(b, "screenshot", "/tmp/tosker-ms719-busy-parent.png");
for (const [i, path] of children.entries()) {
  await open(b, path);
  // The child rail aggregates Chat + Hall. Visiting Chat must not consume
  // older Hall attention, so inspect the affected surface tab specifically.
  await until(b, `document.body.innerText.includes(${JSON.stringify(`${marker} child ${i}`)})&&!${tabMark(path)}${i === 0 ? `&&${mark(children[1])}` : ""}`, "child Chat consumed independently; other child attention retained");
  assert(!await ev(b, `Array.from(document.querySelectorAll('.message-bubble > p')).some(e=>e.textContent===${JSON.stringify(marker + " parent")})`), "No parent message leak");
}
await open(b, `${root}/hall`, true); await run(b, "reload");
await until(b, `document.body.innerText.includes(${JSON.stringify(marker + " note")})`, "retained note reload");
await run(b, "screenshot", "/tmp/tosker-ms719-busy-hall.png");
console.log(`PASS ${marker}: populated parent (40+ visible messages), 5+ notes, two active children, real A/B delivery; Notifications/Hall/Chat/child consumption scoped, disclosure and source separation, Hall reload. Exact QA records retained for cleanup.`);
