import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile);
const binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN.");
const sessions = ["ms71-a", "ms71-b"];
const room = "/room/ms7-1-qa-japan-trip-2027-6f6ae6";
const personal = "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa";
const prefix = process.env.MS711_VERIFY_PREFIX ?? `MS711 stress ${Date.now().toString(36)}`;
async function run(session, ...args) {
  const { stdout } = await exec(binary, ["--session", session, "--json", ...args], { timeout: 25000 });
  const result = JSON.parse(stdout);
  if (!result.success) throw new Error(`Browser command failed: ${args[0]}`);
  return result.data?.result ?? result.data;
}
const evaluate = (session, js) => run(session, "eval", js);
async function until(session, js, label) {
  const end = Date.now() + 25000;
  while (Date.now() < end) { if (await evaluate(session, js)) return; await new Promise((resolve) => setTimeout(resolve, 350)); }
  throw new Error(`Timed out: ${label}`);
}
async function open(session, path) {
  await run(session, "open", `http://localhost:3000${path}`);
  await until(session, "document.querySelector('.conversation-surface')?.dataset.realtime==='connected' && !!document.querySelector('.composer textarea')", "connected Chat");
  assert.equal(await evaluate(session, "document.querySelector('.composer textarea').value"), "", "Preserve unsent work");
}
async function send(session, body) {
  await run(session, "fill", ".composer textarea", body);
  await run(session, "click", ".send-button");
  await until(session, "document.querySelector('.composer textarea')?.value===''", "send ack");
}
const count = (body) => `Array.from(document.querySelectorAll('.message-bubble > p')).filter(p=>p.textContent===${JSON.stringify(body)}).length`;
if (!process.env.MS711_VERIFY_PREFIX) {
for (const session of sessions) await open(session, personal);
await run("ms71-a", "fill", ".composer textarea", `${prefix} hey, testing Tosker`);
await until("ms71-b", "document.querySelector('.chat-transport-status')?.textContent.includes('is typing')", "Personal typing");
await run("ms71-a", "click", ".send-button");
await until("ms71-b", `${count(`${prefix} hey, testing Tosker`)}===1 && !document.querySelector('.chat-transport-status')?.textContent.includes('is typing')`, "Personal delivery and typing clears");
await send("ms71-b", `${prefix} reply`);
await until("ms71-a", `${count(`${prefix} reply`)}===1`, "Personal reply");
for (const session of sessions) {
  await run(session, "reload");
  await until(session, `${count(`${prefix} reply`)}===1 && ${count(`${prefix} hey, testing Tosker`)}===1`, "Personal reload");
}
console.log("PASS: Personal A/B typing, bidirectional delivery, clear typing and reload without duplicates.");
for (const session of sessions) await open(session, room);
const traffic = [];
await Promise.all(sessions.map(async (session, actor) => {
  for (let index = 0; index < 5; index++) {
    const body = `${prefix} ${actor === 0 ? index + 1 : String.fromCharCode(65 + index)}`;
    traffic.push(body); await send(session, body);
  }
}));
for (let index = 0; index < 20; index++) { const body = `${prefix} rapid ${index + 1}`; traffic.push(body); await send("ms71-a", body); }
const rows = `Array.from(document.querySelectorAll('.message-row')).filter(r=>${JSON.stringify(traffic)}.includes(r.querySelector('.message-bubble > p')?.textContent)).map(r=>({id:r.id,body:r.querySelector('.message-bubble > p').textContent,grouped:r.classList.contains('is-grouped')}))`;
for (const session of sessions) await until(session, `(${rows}).length===30`, "30 accepted traffic messages");
const aRows = await evaluate("ms71-a", rows), bRows = await evaluate("ms71-b", rows);
assert.deepEqual(aRows, bRows);
assert.equal(new Set(aRows.map((r) => r.id)).size, 30);
assert.ok(aRows.filter((r) => r.grouped).length >= 18);
for (const session of sessions) {
  await run(session, "reload"); await until(session, `(${rows}).length===30`, "traffic reload");
  assert.deepEqual(await evaluate(session, rows), aRows);
}
console.log("PASS: simultaneous 5+5 and 20 rapid messages converge to identical order, IDs and grouping; reload retains all 30.");
}
const content = ["a".repeat(500), "readable text ".repeat(116), "W".repeat(1500), "First line\nSecond line\n\nFourth line", "🦊🌱💬 ".repeat(100)];
const longBodies = content.map((value, index) => `${prefix} long ${index + 1}\n${value}`.trim());
if (!process.env.MS711_VERIFY_PREFIX) for (const body of longBodies) await send("ms71-a", body);
for (const session of sessions) {
  const query = `Array.from(document.querySelectorAll('.message-bubble > p')).map(p=>p.textContent).filter(t=>t.startsWith(${JSON.stringify(`${prefix} long `)}))`;
  await until(session, `(${query}).length===5`, "long content delivery");
  assert.deepEqual(await evaluate(session, query), longBodies);
}
for (const width of [1440, 390, 320, 430]) {
  await run("ms71-b", "set", "viewport", `${width}`, width > 500 ? "900" : "844");
  for (const body of longBodies) {
    const id = await evaluate("ms71-b", `Array.from(document.querySelectorAll('.message-row')).find(r=>r.querySelector('.message-bubble > p')?.textContent.startsWith(${JSON.stringify(body.split("\n")[0])})).id`);
    await run("ms71-b", "scrollintoview", `#${id}`);
    const geometry = await evaluate("ms71-b", `(()=>{const r=document.querySelector('#${id} .message-bubble').getBoundingClientRect();const c=document.querySelector('.composer').getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth+1&&c.left>=0&&c.right<=innerWidth+1,page:document.documentElement.scrollWidth<=innerWidth+1,actions:!!document.querySelector('#${id} [aria-label="More message actions"]')}})()`);
    assert.deepEqual(geometry, { fits: true, page: true, actions: true }, `Long content at ${width}`);
  }
}
await run("ms71-b", "screenshot", "/tmp/tosker-ms711-long-mobile.png");
for (const session of sessions) await run(session, "set", "viewport", "1440", "900");
console.log("PASS: long, unbroken, multiline and emoji messages retain exact text and fit 1440/390/320/430 with composer/actions available.");
