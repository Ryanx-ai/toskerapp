import assert from "node:assert/strict";
import { composeWorkspace, normalizeComposition, surfaceIsVisible, workspaceSurfaces } from "../src/lib/workspace-composition";
import { LIVE_BETA_ENABLED, MAP_FIRST_BETA } from "../src/lib/beta-features";

assert.equal(LIVE_BETA_ENABLED, false);
assert.equal(MAP_FIRST_BETA, true);
let checks = 0;
for (const map of [true, false]) {
  const caps = { map, live: false, mapFirst: true };
  for (const primary of [...workspaceSurfaces, null, "bad"]) for (const companion of [...workspaceSurfaces, null, "bad"]) {
    const state = normalizeComposition(primary, companion, caps);
    assert.notEqual(state.primary, "live"); assert.notEqual(state.companion, "live");
    assert.equal(!!state.mapCanvas, map);
    assert(map || state.primary !== "map");
    for (const surface of workspaceSurfaces) for (const type of ["choose", "alone", "compact"] as const) {
      const next = composeWorkspace(state, { type, surface }, caps);
      assert.equal(!!next.mapCanvas, map);
      assert.notEqual(next.primary, "live"); assert.notEqual(next.companion, "live");
      assert(map || !next.companion);
      if (map) for (const wide of [true, false]) assert(surfaceIsVisible(next, "map", wide, next.companion ?? next.primary), "Map effects must survive panel changes");
      checks++;
    }
  }
}
const caps = { map: true, live: false, mapFirst: true };
const base = normalizeComposition("map", null, caps);
const chat = composeWorkspace(base, { type: "choose", surface: "chat" }, caps);
assert.equal(chat.companion, "chat");
assert.deepEqual(composeWorkspace(chat, { type: "choose", surface: "chat" }, caps), base);
const board = composeWorkspace(chat, { type: "choose", surface: "hall" }, caps);
assert.equal(board.companion, "hall");
const expanded = composeWorkspace(board, { type: "alone", surface: "hall" }, caps);
assert.equal(expanded.primary, "hall"); assert.equal(expanded.companion, null);
assert.deepEqual(composeWorkspace(expanded, { type: "compact", surface: "hall" }, caps), board);
assert.deepEqual(composeWorkspace(expanded, { type: "choose", surface: "hall" }, caps), base);
assert.deepEqual(normalizeComposition("live", "live", caps), base);
console.log(JSON.stringify({ gate: "FP4 Map-first state model", checks, pass: true, browserVerified: false }));
