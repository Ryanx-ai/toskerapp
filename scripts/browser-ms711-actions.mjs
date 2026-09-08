import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile);
const binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN.");
const path = "/room/ms7-1-qa-japan-trip-2027-6f6ae6";
const sessions = ["ms71-a", "ms71-b"];
async function run(session, ...args) {
  const { stdout } = await exec(binary, ["--session", session, "--json", ...args], { timeout: 25000 });
  const result = JSON.parse(stdout);
  if (!result.success) throw new Error(`Browser command failed: ${args[0]}`);
  return result.data?.result ?? result.data;
}
const evaluate = (session, js) => run(session, "eval", js);
async function until(session, js, label) {
  const end = Date.now() + 24000;
  while (Date.now() < end) { if (await evaluate(session, js)) return; await new Promise((resolve) => setTimeout(resolve, 350)); }
  throw new Error(`Timed out: ${label}`);
}
async function send(session, body) {
  await run(session, "fill", ".composer textarea", body);
  await run(session, "click", ".send-button");
  await until(session, "document.querySelector('.composer textarea')?.value==='' && !document.querySelector('.reply-context')", "acknowledged send");
}
async function action(session, id, label) {
  await until(session, "!document.querySelector('.message-edit-panel')", "previous dialog closed");
  await run(session, "scrollintoview", `#${id}`);
  await run(session, "click", `#${id} [aria-label="More message actions"]`);
  await until(session, "!!document.querySelector('.message-action-list')", "message menu open");
  const index = await evaluate(session, `Array.from(document.querySelectorAll('.message-action-list button')).findIndex(b=>b.textContent===${JSON.stringify(label)})`);
  assert.ok(index >= 0, `Visible action: ${label}`);
  await run(session, "click", `.message-action-list button:nth-of-type(${index + 1})`);
}
for (const session of sessions) {
  assert.equal(await evaluate(session, "location.pathname"), path, "Use the isolated QA Room only");
  assert.equal(await evaluate(session, "document.querySelector('.composer textarea')?.value"), "", "Do not overwrite unsent work");
}
const source = `MS711 ${Date.now().toString(36)} source X`;
const replyText = `${source} reply`;
const edited = `${source} edited`;
await send("ms71-a", source);
await until("ms71-b", `document.body.innerText.includes(${JSON.stringify(source)})`, "A → B delivery");
const id = await evaluate("ms71-a", `Array.from(document.querySelectorAll('.message-row')).find(r=>r.querySelector('.message-bubble > p')?.textContent===${JSON.stringify(source)}).id`);
assert.match(id, /^message-[a-f0-9-]{36}$/);
await action("ms71-b", id, "Reply");
await send("ms71-b", replyText);
await until("ms71-a", `document.body.innerText.includes(${JSON.stringify(replyText)})`, "B → A reply");
console.log("PASS: bidirectional Room send/reply.");
for (const emoji of ["👍", "❤️"]) for (const session of sessions) {
  await run(session, "scrollintoview", `#${id}`);
  await run(session, "click", `#${id} [aria-label="React"]`);
  const index = await evaluate(session, `Array.from(document.querySelectorAll('.emoji-quick button')).findIndex(b=>b.textContent===${JSON.stringify(emoji)})`);
  assert.ok(index >= 0);
  await run(session, "click", `.emoji-quick button:nth-child(${index + 1})`);
  await until(session, "!document.querySelector('.interaction-popover')", "reaction save");
}
for (const session of sessions) await until(session, `Array.from(document.querySelectorAll('#${id} .reaction-chips button')).filter(b=>b.textContent==='👍2'||b.textContent==='❤️2').length===2`, "two aggregated reactions per emoji");
const thumbIndex = await evaluate("ms71-a", `Array.from(document.querySelectorAll('#${id} .reaction-chips button')).findIndex(b=>b.textContent==='👍2')`);
assert.ok(thumbIndex >= 0);
await run("ms71-a", "click", `#${id} .reaction-chips button:nth-child(${thumbIndex + 1})`);
await until("ms71-b", `Array.from(document.querySelectorAll('#${id} .reaction-chips button')).some(b=>b.textContent==='👍1' && b.getAttribute('aria-pressed')==='true')`, "B retains own thumbs-up");
for (const session of sessions) {
  await run(session, "reload");
  await until(session, `document.querySelectorAll('#${id} .reaction-chips button').length===2`, "reactions after reload");
  assert.deepEqual(await evaluate(session, `Array.from(document.querySelectorAll('#${id} .reaction-chips button')).map(b=>b.textContent).sort()`), ["❤️2", "👍1"].sort());
  assert.equal(await evaluate(session, `Array.from(document.querySelectorAll('#${id} .reaction-chips button')).find(b=>b.textContent==='👍1').getAttribute('aria-pressed')`), session === "ms71-a" ? "false" : "true");
}
console.log("PASS: thumbs-up/heart each aggregate two; A removes thumbs-up leaving B; reload preserves exact counts and actor selection.");
await action("ms71-a", id, "Edit");
await run("ms71-a", "fill", '[aria-label="Edit message text"]', edited);
await run("ms71-a", "click", ".message-edit-panel .primary-action");
for (const session of sessions) await until(session, `document.querySelector('#${id} .message-edited') && Array.from(document.querySelectorAll('blockquote')).some(b=>b.textContent===${JSON.stringify(edited)})`, "edited source and canonical quote");
await action("ms71-a", id, "Delete");
await run("ms71-a", "click", ".message-edit-panel .danger");
for (const session of sessions) await until(session, `document.querySelector('#${id}')?.classList.contains('message-deleted') && Array.from(document.querySelectorAll('blockquote')).some(b=>b.textContent==='Message deleted')`, "source tombstone and quote");
console.log("PASS: own edit/delete propagate to A/B with edited state and canonical reply tombstone.");
