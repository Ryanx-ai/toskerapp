import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN.");
const root = "/room/ms7-1-qa-japan-trip-2027-6f6ae6", a = "ms71-a", b = "ms71-b";
async function run(session, ...args) { const { stdout } = await exec(binary, ["--session", session, "--json", ...args], { timeout: 30000 }); const out = JSON.parse(stdout); if (!out.success) throw new Error(`Command failed: ${args[0]}`); return args[0] === "eval" ? out.data?.result : out.data; }
const ev = (s, js) => run(s, "eval", js);
async function until(s, js, label) { const end = Date.now() + 45000; while (Date.now() < end) { if (await ev(s, js)) return; await new Promise((r) => setTimeout(r, 400)); } throw new Error(`Timed out: ${label}`); }
async function click(s, selector) { await run(s, "scrollintoview", selector); await until(s, `(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e?.getBoundingClientRect();return e&&!e.disabled&&r.top>=0&&r.bottom<=innerHeight})()`, "visible enabled control"); await run(s, "click", selector); }
async function hall(s) { await run(s, "open", `http://localhost:3000${root}/hall`); await until(s, "!!document.querySelector('.hall-view-switch')&&!document.querySelector('.hall-load-status')", "Hall loaded"); }
async function action(s, id, label) { await click(s, `[data-hall-id="${id}"] .hall-card-more`); await until(s, "!!document.querySelector('.hall-context')", "menu"); const index = await ev(s, `Array.from(document.querySelectorAll('.hall-context > button')).findIndex(e=>e.textContent===${JSON.stringify(label)})`); assert(index >= 0); await click(s, `.hall-context > button:nth-of-type(${index + 1})`); }
async function main() {
  for (const s of [a, b]) await run(s, "set", "viewport", "1440", "900");
  await hall(a); await hall(b);
  if (!process.env.MS713_SKIP_VERIFIED_COMMENTS) {
  const note = await ev(a, "Array.from(document.querySelectorAll('[data-hall-id]')).find(e=>e.querySelector('.hall-comments-toggle')?.textContent==='1')?.dataset.hallId"); assert(note);
  for (const s of [a, b]) { await click(s, `[data-hall-id="${note}"] .hall-comments-toggle`); await until(s, `!!document.querySelector('[data-hall-id="${note}"] .hall-comment')`, "existing comment"); }
  await click(b, `[data-hall-id="${note}"] .comment-react-control`); await until(b, "!!document.querySelector('.emoji-quick button')", "comment picker");
  const thumb = await ev(b, "Array.from(document.querySelectorAll('.emoji-quick button')).findIndex(e=>e.textContent==='👍')"); assert(thumb >= 0); await click(b, `.emoji-quick button:nth-child(${thumb + 1})`);
  await until(a, `document.querySelector('[data-hall-id="${note}"] .comment-reactions')?.textContent.includes('👍1')`, "comment reaction reaches A");
  await hall(b); await click(b, `[data-hall-id="${note}"] .hall-comments-toggle`);
  await until(b, `document.querySelector('[data-hall-id="${note}"] .comment-reactions [aria-pressed=true]')?.textContent==='👍1'`, "comment reaction persists");
  await click(b, `[data-hall-id="${note}"] .comment-reactions [aria-pressed=true]`);
  await until(a, `!document.querySelector('[data-hall-id="${note}"] .comment-reactions .reaction-chips button')`, "own comment reaction removal");
  console.log("PASS: Hall comment reaction reaches other user, survives reload and actor removal propagates.");
  }
  await hall(a); await hall(b);
  const order = await ev(a, "Array.from(document.querySelectorAll('[data-hall-id]')).map(e=>e.dataset.hallId)"); assert(order.length >= 3);
  await action(a, order[0], "Move later"); const expected = [...order]; [expected[0], expected[1]] = [expected[1], expected[0]];
  for (const s of [a, b]) await until(s, `JSON.stringify(Array.from(document.querySelectorAll('[data-hall-id]')).map(e=>e.dataset.hallId))===${JSON.stringify(JSON.stringify(expected))}`, "menu reorder sync");
  await click(a, `[data-hall-id="${order[0]}"] .hall-drag-handle`); await run(a, "press", "ArrowLeft");
  await until(b, `document.querySelector('[data-hall-id]')?.dataset.hallId===${JSON.stringify(order[0])}`, "keyboard reorder");
  await action(a, order[0], "Change color"); await click(a, ".hall-color-options [aria-label=blue]");
  await until(b, `document.querySelector('[data-hall-id="${order[0]}"]').classList.contains('hall-color-blue')`, "color reaches B");
  // Recipient rendering can precede the sender's post-save refresh. A disabled
  // drag grip cannot start native dragging while that mutation is settling.
  await until(a, `document.querySelector('[data-hall-id="${order[1]}"] .hall-drag-handle')?.disabled===false`, "drag grip enabled after color save");
  // Native drag from the grip; the entire card is the drag image.
  await run(a, "scrollintoview", `[data-hall-id="${order[1]}"]`);
  await until(a, `(()=>{const e=document.querySelector('[data-hall-id="${order[1]}"] .hall-drag-handle'),r=e?.getBoundingClientRect();return e&&!e.disabled&&r.top>=0&&r.bottom<=innerHeight})()`, "visible drag grip");
  const rects = await ev(a, `(()=>{const f=document.querySelector('[data-hall-id="${order[1]}"] .hall-drag-handle').getBoundingClientRect(),t=document.querySelector('[data-hall-id="${order[0]}"]').getBoundingClientRect();return {fx:Math.round(f.x+f.width/2),fy:Math.round(f.y+f.height/2),tx:Math.round(t.x+t.width/2),ty:Math.round(t.y+t.height/2)}})()`);
  await run(a, "mouse", "move", String(rects.fx), String(rects.fy)); await run(a, "mouse", "down");
  for (let i = 1; i <= 8; i++) await run(a, "mouse", "move", String(Math.round(rects.fx + (rects.tx - rects.fx) * i / 8)), String(Math.round(rects.fy + (rects.ty - rects.fy) * i / 8)));
  // Entering a nested text node is dragenter, not dragover. Move inside the
  // target twice before releasing so the native browser accepts the drop.
  await run(a, "mouse", "move", String(rects.tx + 1), String(rects.ty));
  await run(a, "mouse", "move", String(rects.tx + 2), String(rects.ty));
  await run(a, "mouse", "up");
  await until(b, `document.querySelector('[data-hall-id]')?.dataset.hallId===${JSON.stringify(order[1])}`, "native drag reaches B");
  await hall(a); await hall(b);
  for (const s of [a, b]) assert.equal(await ev(s, "document.querySelector('[data-hall-id]').dataset.hallId"), order[1]);
  console.log("PASS: menu/keyboard/native grip drag reorder, cross-user order, color and reload persistence.");
  await run(a, "open", `http://localhost:3000${root}`); await until(a, "!!document.querySelector('.message-row')&&!document.querySelector('.chat-load-status')", "Chat loaded");
  const source = await ev(a, "Array.from(document.querySelectorAll('.message-row:not(.message-deleted)')).map(e=>({id:e.id,body:e.querySelector('.message-bubble > p')?.textContent})).filter(e=>e.body?.startsWith('MS711')&&e.body.length<200).at(-1)"); assert(source);
  await click(a, `#${source.id} [aria-label="More message actions"]`); await until(a, "!!document.querySelector('.message-action-list')", "message menu");
  const pin = await ev(a, "Array.from(document.querySelectorAll('.message-action-list button')).findIndex(e=>e.textContent==='Pin to Hall')"); assert(pin >= 0); await click(a, `.message-action-list button:nth-of-type(${pin + 1})`); await until(a, "!document.querySelector('.interaction-popover')", "pin saved");
  await hall(b);
  const pinned = await ev(b, `Array.from(document.querySelectorAll('.hall-local-pinned-message')).find(e=>e.querySelector('p')?.textContent===${JSON.stringify(source.body)})?.dataset.hallId`); assert(pinned);
  await click(b, `[data-hall-id="${pinned}"] .hall-card-more`);
  assert.equal(await ev(b, "!!document.querySelector('.hall-context .context-menu-link')"), false, "Unreliable source jump must stay hidden until history lookup ships");
  await run(b, "press", "Escape");
  await action(b, pinned, "Unpin from Hall"); await until(b, `!document.querySelector('[data-hall-id="${pinned}"]')`, "reference removed");
  assert.equal(await ev(a, `document.querySelector('#${source.id} .message-bubble > p').textContent`), source.body);
  console.log("PASS: Chat pin retains source; unreliable source jump hidden; member unpin removes Hall reference only.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
