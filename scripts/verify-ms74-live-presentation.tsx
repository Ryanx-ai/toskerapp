/** Pure presentation checks: no provider, account, database or browser mutation. */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LivePanel from "../src/components/live-panel";
import { LiveSession } from "../src/lib/live-session";
import type { LivePhase, LiveSnapshot } from "../src/lib/live-contract";

let checks = 0;
for (const companion of [false, true]) {
  for (const phase of ["not-joined", "joining", "connected", "reconnecting", "disconnected"] satisfies LivePhase[]) {
    const live = new LiveSession();
    const state: LiveSnapshot = { phase, ready: phase === "connected" || phase === "not-joined",
      participants: phase === "connected" ? [{ userId: "synthetic", displayName: "A very long synthetic participant name with no clipped identity", avatarUrl: null }] : [],
      message: phase === "disconnected" ? "Live is unavailable. Try joining again when connected." : "You haven’t joined Live." };
    live.getServerSnapshot = () => state;
    const html = renderToStaticMarkup(createElement(LivePanel, { live, userId: "synthetic", companion }));
    assert.equal((html.match(/<button /g) ?? []).length, 1);
    assert.equal((html.match(/role="status"/g) ?? []).length, 1);
    assert.equal((html.match(/Presence only/g) ?? []).length, 1);
    assert(html.includes(`data-live-layout="${companion ? "companion" : "expanded"}"`));
    assert(!/<button[^>]*>[^<]*(?:Mute|Camera|Push-to-Talk)/.test(html));
    if (phase === "connected") {
      assert(html.includes(state.participants[0].displayName));
      assert(html.includes("You · Here") && html.includes("Leave Live"));
    }
    if (phase === "disconnected") assert(html.includes(state.message) && html.includes("disabled"));
    checks++;
  }
}
console.log(JSON.stringify({ livePresentation: "PASS", statesAndLayouts: checks, transportChanged: false, providerCalls: 0 }));
