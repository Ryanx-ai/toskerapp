import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { profiles, rooms, subrooms } from "../src/server/db/schema";

// Isolated, reversible QA metadata only. Never seed messages or touch credentials.
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
assert(bin, "Set AGENT_BROWSER_BIN");
const db = getDatabase(), root = "/room/ms7-1-qa-japan-trip-2027-6f6ae6";
const actors = ["0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", "d7a58753-9877-45b2-9fc7-cca188559fed"];
async function run(...args: string[]) {
  const { stdout } = await exec(bin!, ["--session", "ms71-a", "--json", ...args], { timeout: 45000 });
  const out = JSON.parse(stdout); assert(out.success);
  return args[0] === "eval" ? out.data?.result : out.data;
}
const ev = (js: string) => run("eval", js);
async function until(js: string, label: string) {
  const end = Date.now() + 60000;
  while (Date.now() < end) { if (await ev(js)) return; await new Promise(r => setTimeout(r, 400)); }
  throw new Error(`Timeout: ${label}`);
}
async function geometry(label: string) {
  const result = await ev(`(()=>{const selectors=['.conversation-header','.composer','.room-details-panel','.room-context-menu','.mention-suggestions','.conversation-search'];return {page:document.documentElement.scrollWidth<=innerWidth+1,panels:selectors.flatMap(s=>Array.from(document.querySelectorAll(s)).filter(e=>e.getClientRects().length).map(e=>({selector:s,inside:e.getBoundingClientRect().left>=-1&&e.getBoundingClientRect().right<=innerWidth+1,overflow:e.scrollWidth>e.clientWidth+2})))}})()`);
  assert(result.page, `${label}: document overflow`);
  for (const panel of result.panels) assert(panel.inside && !panel.overflow, `${label}: ${JSON.stringify(panel)}`);
  const clippedNames = await ev("Array.from(document.querySelectorAll('.message-author,.reply-source,.hall-object footer')).filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className||e.tagName)");
  assert.deepEqual(clippedNames, [], `${label}: message/reply identity overflow`);
}
async function main() {
  const originalProfiles = await db.select({ userId: profiles.userId, displayName: profiles.displayName, username: profiles.username }).from(profiles).where(inArray(profiles.userId, actors));
  assert.equal(originalProfiles.length, 2);
  for (const p of originalProfiles) assert.match(p.username, /^tosker-user-[ab]-clerk-test$/);
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, root.slice(6)));
  assert.equal(room?.ownerId, actors[0]); assert.equal(room.name, "MS7.1 QA Japan Trip 2027");
  const children = await db.select().from(subrooms).where(eq(subrooms.roomId, room.id));
  assert(children.length >= 2);
  const roomName = "MS719" + "VeryLongRoomIdentity".repeat(4).slice(0, 75);
  const childName = "MS719" + "LongSubroomIdentity".repeat(4).slice(0, 55);
  const names = actors.map((_, i) => `MS719${i}` + "LongDisplayIdentity".repeat(4).slice(0, 58));
  const recovery = { room: { id: room.id, name: room.name, testName: roomName }, child: { id: children[0].id, name: children[0].name, testName: childName }, profiles: originalProfiles.map((p, i) => ({ ...p, testName: names[i] })) };
  await writeFile("/tmp/tosker-ms719-identity-recovery.json", JSON.stringify(recovery, null, 2), { mode: 0o600 });
  try {
    for (const [i, p] of originalProfiles.entries()) await db.update(profiles).set({ displayName: names[i] }).where(and(eq(profiles.userId, p.userId), eq(profiles.displayName, p.displayName)));
    await db.update(rooms).set({ name: roomName }).where(and(eq(rooms.id, room.id), eq(rooms.name, room.name)));
    await db.update(subrooms).set({ name: childName }).where(and(eq(subrooms.id, children[0].id), eq(subrooms.name, children[0].name)));
    const widths = process.env.MS719_WIDTHS ? process.env.MS719_WIDTHS.split(",").map(Number) : [320, 375, 390, 430, 768, 1024, 1440, 1728];
    assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320 && width <= 1728));
    for (const width of widths) {
      await run("set", "viewport", String(width), width < 768 ? "844" : "900");
      await run("open", `http://localhost:3000${root}`);
      await until(`document.querySelector('.room-context-trigger')?.textContent===${JSON.stringify(roomName)}&&!document.querySelector('.chat-load-state')`, "canonical long Room loaded");
      await geometry(`${width} Chat`);
      await run("click", ".room-context-trigger");
      await until("!!document.querySelector('.room-context-menu')", "switcher");
      assert(await ev(`document.querySelector('.room-context-menu').textContent.includes(${JSON.stringify(childName)})`), "Full child identity recoverable");
      await geometry(`${width} switcher`); await run("press", "Escape");
      await run("click", '[aria-label="Conversation options"]');
      await until("!!document.querySelector('.interaction-popover')", "options menu");
      await run("find", "role", "button", "click", "--name", "Room details", "--exact");
      await until("!!document.querySelector('.room-member-list li')", "details loaded");
      await geometry(`${width} management`);
      await run("click", '[aria-label="Close Room details"]');
      await until("!document.querySelector('.room-details-panel')", "details dismissed");
      assert.equal(await ev("document.querySelector('.composer textarea').value"), "", "Preserve unrelated draft");
      await run("fill", ".composer textarea", "@");
      await until("document.querySelectorAll('.mention-suggestions [role=option]').length===2", "long member suggestions");
      await geometry(`${width} mentions`);
      await ev("document.querySelector('.composer textarea').focus();document.querySelector('.composer textarea').select();true"); await run("press", "Backspace");
      await run("click", `.surface-tabs a[href="${root}/hall"]`);
      await until("!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')", "Hall loaded");
      await geometry(`${width} Hall`);
      await run("screenshot", `/tmp/tosker-ms719-long-${width}.png`);
      await run("open", `http://localhost:3000${root}/subroom/${children[0].id}`);
      await until("!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')", "long child loaded");
      await geometry(`${width} child Chat`);
      console.log(`PASS ${width}: canonical 80-character Room, 60-character child, 64-character profiles; Chat/switcher/management/mention/Hall geometry.`);
    }
  } finally {
    for (const [i, p] of originalProfiles.entries()) await db.update(profiles).set({ displayName: p.displayName }).where(and(eq(profiles.userId, p.userId), eq(profiles.displayName, names[i])));
    await db.update(rooms).set({ name: room.name }).where(and(eq(rooms.id, room.id), eq(rooms.name, roomName)));
    await db.update(subrooms).set({ name: children[0].name }).where(and(eq(subrooms.id, children[0].id), eq(subrooms.name, childName)));
    console.log("Restored exact QA identity fields with compare-and-set guards; no conversations/content deleted.");
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$client.end());
