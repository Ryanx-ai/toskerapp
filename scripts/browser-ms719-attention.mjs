import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN, a = "ms71-a", b = "ms71-b";
if (!bin) throw new Error("Set AGENT_BROWSER_BIN.");
async function run(s, ...args) {
  const { stdout } = await exec(bin, ["--session", s, "--json", ...args], { timeout: 45000 });
  const out = JSON.parse(stdout); assert(out.success);
  return args[0] === "eval" ? out.data?.result : out.data;
}
const ev = (s, js) => run(s, "eval", js);
async function until(s, js, label) {
  const end = Date.now() + 60000;
  while (Date.now() < end) { if (await ev(s, js)) return; await new Promise(r => setTimeout(r, 350)); }
  throw new Error(`Timed out: ${label}`);
}
const root = "/room/ms719-integrated-1788885047459-80440f", marker = process.env.MS719_ATTENTION_MARKER || `MS719 combined ${Date.now()}`;
assert.match(marker, /^MS719 combined \d+$/);
const chatMark = `.surface-tabs a[href="${root}"] .attention-mark`, hallMark = `.surface-tabs a[href="${root}/hall"] .attention-mark`;
const present = selector => `!!document.querySelector(${JSON.stringify(selector)})`;
async function open(s, path, selector) {
  await run(s, "open", `http://localhost:3000${path}`); await until(s, present(selector), "route loaded");
}
async function send(body) {
  assert.equal(await ev(a, "document.querySelector('.composer textarea').value"), "", "Preserve unrelated drafts");
  await run(a, "fill", ".composer textarea", body); await run(a, "click", ".send-button");
  await until(a, "document.querySelector('.composer textarea').value===''", "send accepted");
}
for (const s of [a, b]) await run(s, "set", "viewport", "1440", "900");
if (!process.env.MS719_BACKGROUND_ONLY) {
if (!process.env.MS719_ATTENTION_MARKER) {
await open(b, "/app", ".desktop-welcome");
await open(a, root, ".composer textarea");
for (let i = 1; i <= 3; i++) await send(`${marker} message ${i}`);
await open(a, `${root}/hall`, ".hall-surface");
await run(a, "find", "role", "button", "click", "--name", "New Note", "--exact");
await run(a, "fill", "[aria-label=Title]", `${marker} note`); await run(a, "fill", "[aria-label=Note]", "Independent Hall attention");
await run(a, "find", "role", "button", "click", "--name", "Add note", "--exact");
await until(a, "!document.querySelector('dialog[open]')", "note accepted");
await until(b, present('a[href="/notifications"] .attention-mark'), "notification attention");
}
await open(b, "/notifications", ".notifications-workspace");
await until(b, `document.body.innerText.includes(${JSON.stringify(marker)})`, "canonical notifications");
// Search focuses a historical message without consuming current Chat attention.
await open(b, `${root}?message=667f8507-7f3e-4c69-9fcc-95f3c8d344c8`, ".conversation-surface");
await until(b, `${present(chatMark)}&&${present(hallMark)}`, "list acknowledgement preserves both destinations");
await until(b, "document.querySelector('.composer-error')?.textContent.includes('That message couldn’t be opened')", "Foreign source cannot resolve");
assert(!await ev(b, "!!document.getElementById('message-667f8507-7f3e-4c69-9fcc-95f3c8d344c8')"));
await open(b, root, ".composer textarea");
await until(b, `!(${present(chatMark)})&&${present(hallMark)}`, "only Chat clears");
const bodies = await ev(b, `Array.from(document.querySelectorAll('.message-bubble > p')).map(e=>e.textContent).filter(t=>t.startsWith(${JSON.stringify(marker)}))`);
assert.deepEqual(bodies, [1, 2, 3].map(i => `${marker} message ${i}`));
await open(b, `${root}/hall`, ".hall-surface");
await until(b, `document.body.innerText.includes(${JSON.stringify(marker + " note")})&&!(${present(hallMark)})`, "Hall clears independently");
console.log(`PASS: ${marker}; three canonical ordered messages + Hall note; bell/list acknowledgement retains Chat/Hall; Chat clears alone, then Hall; foreign source denied.`);
}
await open(b, root, ".composer textarea");
await ev(b, "window.__ms719Visibility=[];document.addEventListener('visibilitychange',()=>window.__ms719Visibility.push(document.visibilityState));true");
const tabs = await run(b, "tab", "list");
console.log(`Background setup: ${JSON.stringify(tabs)}`);
await run(b, "tab", "new", "--label", "ms719-background", "about:blank");
await open(a, root, ".composer textarea");
for (let i = 1; i <= 3; i++) await send(`${marker} background ${i}`);
await open(a, `${root}/hall`, ".hall-surface");
await run(a, "find", "role", "button", "click", "--name", "New Note", "--exact");
await run(a, "fill", "[aria-label=Title]", `${marker} background note`);
await run(a, "fill", "[aria-label=Note]", "Hall activity while the other browser tab is hidden");
await run(a, "find", "role", "button", "click", "--name", "Add note", "--exact");
await until(a, "!document.querySelector('dialog[open]')", "background Hall accepted");
await run(b, "tab", "t1");
await until(b, `Array.from(document.querySelectorAll('.message-bubble > p')).filter(e=>e.textContent.startsWith(${JSON.stringify(marker + " background ")})).length===3`, "return reconciles once");
assert.deepEqual(await ev(b, `Array.from(document.querySelectorAll('.message-bubble > p')).map(e=>e.textContent).filter(t=>t.startsWith(${JSON.stringify(marker + " background ")}))`), [1,2,3].map(i=>`${marker} background ${i}`));
await until(b, `!(${present(chatMark)})&&${present(hallMark)}`, "foreground Chat consumption leaves background Hall attention");
assert(!await ev(b, "!!document.querySelector('.composer-error')"));
const visibility = await ev(b, "window.__ms719Visibility");
console.log(`${visibility?.includes("hidden") ? "PASS" : "PARTIAL"}: background→foreground yields three ordered unique messages, Chat consumed/Hall retained, no stale error; actual visibility events ${JSON.stringify(visibility)}. No synthetic visibility override used.`);
await open(b, `${root}/hall`, ".hall-surface");
await until(b, `document.body.innerText.includes(${JSON.stringify(marker + " background note")})&&!(${present(hallMark)})`, "background Hall persists and clears independently");
await run(b, "tab", "close", "ms719-background");
