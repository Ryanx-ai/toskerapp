import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";

const exec = promisify(execFile), binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN.");
const session = "ms71-a", root = "/room/ms7-1-qa-japan-trip-2027-6f6ae6";
async function run(...args) {
  const { stdout } = await exec(binary, ["--session", session, "--json", ...args], { timeout: 30000 });
  const out = JSON.parse(stdout);
  assert(out.success, `Browser command failed: ${args[0]}`);
  return args[0] === "eval" ? out.data?.result : out.data;
}
const ev = (js) => run("eval", js);
async function until(js, label) {
  const end = Date.now() + 45000;
  while (Date.now() < end) { if (await ev(js)) return; await new Promise((r) => setTimeout(r, 400)); }
  throw new Error(`Timed out: ${label}`);
}
const visible = "e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'";
async function main() {
  await run("open", `http://localhost:3000${root}`);
  await until("!!document.querySelector('.conversation-header')", "authenticated workspace");
  const sandbox = await ev("Array.from(document.querySelectorAll('a')).find(e=>e.getAttribute('aria-label')?.endsWith(\"'s Sandbox\"))?.getAttribute('href')");
  assert(sandbox?.startsWith("/"), "Sandbox route must come from rendered navigation");
  const contexts = [["Personal", "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa"], ["Room", root], ["Subroom", `${root}/subroom/4dabe4eb-acf4-4e5c-aac9-c12eb0614dd4`], ["Sandbox", sandbox]];
  for (const width of [1440, 390]) {
    await run("set", "viewport", String(width), width === 390 ? "844" : "900");
    for (const [name, path] of contexts) {
      for (const surface of ["Chat", "Hall"]) {
        await run("open", `http://localhost:3000${path}${surface === "Hall" ? "/hall" : ""}`);
        await until("!!document.querySelector('.conversation-header')&&!document.querySelector('.chat-load-state,.hall-load-status')", `${name} ${surface} loaded`);
        const controls = await ev(`Array.from(document.querySelectorAll('.conversation-header button,.conversation-header a,.composer-wrap button,.row-options')).filter(${visible}).map(e=>e.getAttribute('aria-label')||e.textContent.trim())`);
        for (const control of controls) assert(!/search|mute|mark unread|voice|video|calendar|attach|image|file|translate|gizmo|coming soon|prototype/i.test(control), `Unsupported core control: ${control}`);
        assert.equal(await ev("document.documentElement.scrollWidth<=innerWidth+1"), true, `${name} ${surface} page overflow`);
        if (surface === "Chat") {
          const selector = await ev("Array.from(document.querySelectorAll('.message-row:not(.message-deleted)')).find(e=>e.querySelector('[aria-label=\"More message actions\"]'))?.id");
          if (selector) {
            await run("scrollintoview", `#${selector} [aria-label="More message actions"]`);
            await run("click", `#${selector} [aria-label="More message actions"]`);
            await until("!!document.querySelector('.message-action-list')", "message actions");
            const actions = await ev("Array.from(document.querySelectorAll('.message-action-list button')).map(e=>e.textContent.trim())");
            for (const action of actions) assert(["React", "Reply", "Copy", "Pin to Hall", "Edit", "Delete"].includes(action), `Unexpected message action: ${action}`);
            await run("press", "Escape");
          }
        } else {
          await run("click", ".hall-view-switch button:nth-child(2)");
          await until("document.querySelector('.hall-view-switch button:nth-child(2)')?.getAttribute('aria-pressed')==='true'&&!document.querySelector('.hall-load-status')", "Archived view");
          await run("click", ".hall-view-switch button:first-child");
          await until("document.querySelector('.hall-view-switch button:first-child')?.getAttribute('aria-pressed')==='true'&&!document.querySelector('.hall-load-status')", "Board restored");
        }
        console.log(`PASS: ${width}px ${name} ${surface}: deferred controls absent, visible header/composer inventory and surface navigation checked.`);
      }
    }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
