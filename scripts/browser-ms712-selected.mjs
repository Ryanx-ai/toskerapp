import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN.");
const room = "/room/ms7-1-qa-japan-trip-2027-6f6ae6";
const run = (session, ...args) => { const result = JSON.parse(execFileSync(binary, ["--session", session, "--json", ...args], { encoding: "utf8", timeout: 30000 })); if (!result.success) throw new Error(`Browser command failed: ${args[0]}`); return args[0] === "eval" ? result.data?.result : result.data; };
async function until(session, js) { const end = Date.now() + 35000; while (Date.now() < end) { if (run(session, "eval", js)) return; await new Promise((resolve) => setTimeout(resolve, 400)); } throw new Error("Selected Subroom condition timed out."); }
async function main() {
  run("ms71-a", "open", `http://localhost:3000${room}`);
  await until("ms71-a", "!!document.querySelector('.room-context-trigger')");
  run("ms71-a", "click", ".room-context-trigger");
  run("ms71-a", "click", ".room-context-menu button");
  await until("ms71-a", "!!document.querySelector('#subroom-title')");
  run("ms71-a", "fill", ".wizard-field input", "Selected QA");
  run("ms71-a", "select", ".creation-panel select", "selected");
  run("ms71-a", "fill", '[placeholder="Search Room members"]', "tosker.user.b");
  await until("ms71-a", "document.querySelectorAll('[aria-label=\"Subroom people results\"] article').length===1");
  assert.match(run("ms71-a", "eval", "document.querySelector('[aria-label=\"Subroom people results\"] strong').textContent"), /tosker.user.b/);
  run("ms71-a", "click", '[aria-label="Subroom people results"] button');
  assert.equal(run("ms71-a", "eval", "document.querySelector('[aria-label=\"Subroom people results\"] button').textContent"), "Added");
  run("ms71-a", "click", ".creation-panel .overlay-actions .primary-action");
  await until("ms71-a", "location.pathname.includes('/subroom/') && !!document.querySelector('.composer textarea')");
  const child = run("ms71-a", "eval", "location.pathname");
  run("ms71-b", "open", `http://localhost:3000${child}`);
  await until("ms71-b", "document.querySelector('.conversation-surface')?.dataset.realtime==='connected'");
  assert.equal(run("ms71-b", "eval", "document.querySelector('.active-copy > span').textContent"), "Selected QA");
  run("ms71-b", "click", ".room-context-trigger");
  assert.equal(run("ms71-b", "eval", "!!document.querySelector('.room-context-menu button')"), false);
  run("ms71-b", "press", "Escape");
  console.log("PASS: selected Subroom uses current Room-member search, selected B gains persisted child access, member cannot create children.");
}
main().catch(() => { console.error("FAIL: selected-member Subroom browser check."); process.exitCode = 1; });
