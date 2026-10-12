import assert from "node:assert/strict";
import { composeWorkspace, normalizeComposition, surfaceIsVisible, workspaceSurfaces, type WorkspaceComposition } from "../src/lib/workspace-composition";

const all = { map: true, live: true };
const states: WorkspaceComposition[] = [
  { primary: "map", companion: null }, { primary: "hall", companion: null },
  { primary: "live", companion: null }, { primary: "chat", companion: null },
  { primary: "map", companion: "chat" }, { primary: "map", companion: "live" },
  { primary: "hall", companion: "chat" }, { primary: "hall", companion: "live" },
  { primary: "live", companion: "chat" },
];
const legal = new Set(states.map(state => JSON.stringify(state)));
let checks = 0;
for (const state of states) for (const surface of workspaceSurfaces) for (const type of ["choose", "alone"] as const) {
  const next = composeWorkspace(state, { type, surface }, all);
  assert(legal.has(JSON.stringify(next)));
  if (type === "alone") assert.deepEqual(next, { primary: surface, companion: null });
  if (type === "choose" && surface === state.primary) assert.deepEqual(next, state);
  if (type === "choose" && surface === state.companion) assert.deepEqual(next, { primary: state.primary, companion: null });
  for (const wide of [false, true]) {
    const visible = workspaceSurfaces.filter(candidate => surfaceIsVisible(next, candidate, wide, next.companion ?? next.primary));
    assert.equal(visible.length, wide && next.companion ? 2 : 1);
  }
  checks++;
}
assert.deepEqual(composeWorkspace({ primary: "map", companion: "chat" }, { type: "choose", surface: "live" }, all), { primary: "map", companion: "live" });
assert.deepEqual(composeWorkspace({ primary: "live", companion: "chat" }, { type: "choose", surface: "hall" }, all), { primary: "hall", companion: "live" });
assert.deepEqual(composeWorkspace({ primary: "hall", companion: "live" }, { type: "choose", surface: "map" }, all), { primary: "map", companion: "live" });
for (const map of [false, true]) for (const live of [false, true]) {
  const capabilities = { map, live };
  for (const primary of [...workspaceSurfaces, "invalid", undefined]) for (const companion of [...workspaceSurfaces, "invalid", null]) {
    const state = normalizeComposition(primary, companion, capabilities);
    assert(legal.has(JSON.stringify(state)));
    assert(map || state.primary !== "map");
    assert(live || (state.primary !== "live" && state.companion !== "live"));
    for (const surface of workspaceSurfaces) {
      const next = composeWorkspace(state, { type: "choose", surface }, capabilities);
      assert(legal.has(JSON.stringify(next)));
      assert(map || next.primary !== "map");
      assert(live || (next.primary !== "live" && next.companion !== "live"));
      checks++;
    }
  }
}
console.log(JSON.stringify({ gate: "FP2A composition model", checks, result: "pass" }));
