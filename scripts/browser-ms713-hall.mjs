import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN.");
const room = "/room/ms7-1-qa-japan-trip-2027-6f6ae6", prefix = `MS713 ${Date.now().toString(36)}`;
const a = "ms71-a", b = "ms71-b";
async function run(session, ...args) { const { stdout } = await exec(binary, ["--session", session, "--json", ...args], { timeout: 30000 }); const result = JSON.parse(stdout); if (!result.success) throw new Error(`Command failed: ${args[0]}`); return args[0] === "eval" ? result.data?.result : result.data; }
const ev = (session, js) => run(session, "eval", js);
async function until(session, js, label) { const end = Date.now() + 45000; while (Date.now() < end) { if (await ev(session, js)) return; await new Promise((resolve) => setTimeout(resolve, 400)); } throw new Error(`Timed out: ${label}`); }
async function click(session, selector) { await run(session, "scrollintoview", selector); await until(session, `(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e?.getBoundingClientRect();return e&&!e.disabled&&r.top>=0&&r.bottom<=innerHeight})()`, "control ready"); await run(session, "click", selector); }
async function hall(session) { await run(session, "open", `http://localhost:3000${room}/hall`); await until(session, "!!document.querySelector('.hall-view-switch') && !document.querySelector('.hall-load-status')", "Hall loaded"); }
async function create(session, suffix) { await click(session, ".new-hall-card"); await until(session, "!!document.querySelector('.hall-note-panel')", "editor"); await run(session, "fill", '[aria-label="Title"]', `${prefix} ${suffix}`); await run(session, "fill", '[aria-label="Note"]', `Retained ${suffix} content`); await click(session, ".hall-note-panel .primary-action"); await until(session, "!document.querySelector('.hall-note-panel')", "note saved"); return ev(session, `Array.from(document.querySelectorAll('[data-hall-id]')).find(e=>e.querySelector('h3').textContent===${JSON.stringify(`${prefix} ${suffix}`)})?.dataset.hallId`); }
const card = (id) => `[data-hall-id="${id}"]`;
async function present(session, id, yes = true) { await until(session, `${yes ? "!!" : "!"}document.querySelector('${card(id)}')`, `note ${yes ? "present" : "absent"}`); }
async function menu(session, id) { await click(session, `${card(id)} .hall-card-more`); await until(session, "!!document.querySelector('.hall-context')", "Hall menu"); return ev(session, "Array.from(document.querySelectorAll('.hall-context > button')).map(e=>e.textContent)"); }
async function act(session, id, name) { const labels = await menu(session, id); const index = labels.indexOf(name); assert(index >= 0, `Action available: ${name}`); await click(session, `.hall-context > button:nth-of-type(${index + 1})`); }
async function view(session, archived) { await click(session, `.hall-view-switch button:nth-child(${archived ? 2 : 1})`); await until(session, "!document.querySelector('.hall-load-status')", "Hall view loaded"); }
async function main() {
  await hall(a); await hall(b);
  const noteA = await create(a, "A"), noteB = await create(b, "B"); assert(noteA && noteB);
  await present(a, noteB); await present(b, noteA);
  const memberMenu = await menu(b, noteA);
  for (const forbidden of ["Edit", "Archive", "Nuke"]) assert(!memberMenu.includes(forbidden));
  await run(b, "press", "Escape");
  await act(b, noteB, "Edit"); await run(b, "fill", '[aria-label="Note"]', "B edited retained content"); await click(b, ".hall-note-panel .primary-action");
  await until(b, "!document.querySelector('.hall-note-panel')", "edit dialog closed");
  await until(a, `document.querySelector('${card(noteB)} p')?.textContent==='B edited retained content'`, "edit reaches owner");
  await click(b, `${card(noteA)} .hall-comments-toggle`);
  await until(b, `!!document.querySelector('${card(noteA)} [aria-label="Add a comment"]')`, "comment composer expanded");
  await run(b, "fill", `${card(noteA)} [aria-label="Add a comment"]`, "B retained comment"); await click(b, `${card(noteA)} [aria-label="Post comment"]`);
  await until(b, `document.querySelector('${card(noteA)} .hall-comment')?.textContent.includes('B retained comment')`, "comment saved");
  await click(a, `${card(noteA)} .hall-comments-toggle`);
  await until(a, `document.querySelector('${card(noteA)} .hall-comment')?.textContent.includes('B retained comment')`, "comment reaches A");
  for (const session of [a, b]) {
    await click(session, `${card(noteA)} [aria-label="React to note"]`);
    await until(session, "!!document.querySelector('.emoji-quick button')", "note reactions");
    const index = await ev(session, "Array.from(document.querySelectorAll('.emoji-quick button')).findIndex(e=>e.textContent==='❤️')"); assert(index >= 0);
    await click(session, `.emoji-quick button:nth-child(${index + 1})`);
    await until(session, "!document.querySelector('.interaction-popover')", "reaction saved");
  }
  await until(a, `document.querySelector('${card(noteA)} .hall-reactions')?.textContent.includes('❤️2')`, "two note reactions");
  console.log("PASS: two-user Hall create/edit, member destructive controls absent, retained comment and actor-scoped note reactions.");
  await act(a, noteA, "Archive"); await present(a, noteA, false); await present(b, noteA, false);
  await view(a, true); await present(a, noteA); await view(b, true); await present(b, noteA);
  assert.equal(await ev(b, `!!document.querySelector('${card(noteA)} .hall-card-more')`), false);
  assert.equal(await ev(a, `!!document.querySelector('${card(noteA)} .hall-drag-handle') || !!document.querySelector('${card(noteA)} .hall-note-context')`), false);
  await act(a, noteA, "Restore"); await present(a, noteA, false); await view(a, false); await view(b, false); await present(a, noteA); await present(b, noteA);
  assert.equal(await ev(b, `document.querySelector('${card(noteA)} .hall-comments-toggle').textContent`), "1");
  assert((await ev(b, `document.querySelector('${card(noteA)} .hall-reactions').textContent`)).includes("❤️2"));
  await act(a, noteB, "Archive"); await present(b, noteB, false); await view(a, true); await act(a, noteB, "Restore"); await view(a, false); await present(b, noteB);
  for (const session of [a, b]) { await hall(session); await present(session, noteA); await present(session, noteB); }
  console.log("PASS: author and owner archive/restore, member restrictions, retained comments/reactions and both-client reload persistence.");
  await act(b, noteB, "Nuke"); await until(b, "!!document.querySelector('.hall-nuke-panel')", "delete confirmation"); await run(b, "press", "Escape"); await present(b, noteB);
  await act(b, noteB, "Nuke"); await until(b, "!!document.querySelector('.hall-nuke-panel')", "delete confirmation again"); await click(b, ".hall-nuke-panel .danger"); await present(b, noteB, false); await present(a, noteB, false);
  await run(a, "set", "viewport", "390", "844");
  assert.equal(await ev(a, "document.documentElement.scrollWidth<=innerWidth"), true);
  await act(a, noteA, "Nuke"); await until(a, "!!document.querySelector('.hall-nuke-panel')", "mobile confirmation");
  assert.equal(await ev(a, "(()=>{const r=document.querySelector('.hall-nuke-panel').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"), true);
  await run(a, "screenshot", "/tmp/tosker-ms713-mobile-confirmation.png"); await run(a, "press", "Escape"); await run(a, "set", "viewport", "1440", "900");
  console.log(`PASS: own Nuke/cancel propagates, mobile confirmation fits; retained Hall QA prefix ${prefix}.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
