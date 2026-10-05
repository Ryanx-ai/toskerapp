import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasRoomMap, resolveWorkspaceSurface, type WorkspaceSurface } from "../src/lib/workspace-surfaces";

const room = { kind: "room", slug: "trip", tag: "TRIP" };
const contexts = [room, { ...room, tag: undefined }, { ...room, slug: "trip--child", tag: "SUBROOM" }, { kind: "personal", slug: "chat-id" }, { kind: "my-room", slug: "my-room" }];
for (const [index, context] of contexts.entries()) {
  assert.equal(hasRoomMap(context), index < 3 || index === 4);
  for (const surface of ["chat", "hall", "map", "live"] satisfies WorkspaceSurface[]) {
    assert.equal(resolveWorkspaceSurface(surface, context), ((surface === "map" || surface === "live") && index === 3) || (surface === "live" && index === 4) ? "chat" : surface);
  }
}
assert.equal(hasRoomMap({ ...room, slug: "trip--child" }), true);
assert.equal(hasRoomMap({ ...room, tag: "SUBROOM" }), true);
assert.equal(resolveWorkspaceSurface("map"), "chat");
assert.equal(hasRoomMap({ kind: "personal", slug: "chat-id", mapAvailable: true }), true);
assert.equal(resolveWorkspaceSurface("live", { kind: "personal", slug: "chat-id", mapAvailable: true }), "live");

const header = readFileSync("src/components/communication-ui.tsx", "utf8");
assert(header.includes('`${baseHref(conversation)}/hall`'), "Board retains old URLs");
assert.match(header, /Board<AttentionMark/, "Board is the visible name");
assert.match(header, /prefetch=\{false\}><MapIcon/, "Map navigation does not prefetch the provider");
const page = readFileSync("src/app/(workspace)/room/[slug]/map/page.tsx", "utf8");
assert.match(page, /if \(!userId \|\| !\(await canAccessRoom\(userId, slug\)\)\) notFound\(\)/);
const app = readFileSync("src/components/messaging-app.tsx", "utf8");
assert.match(app, /dynamic\(\(\) => import\("\.\/room-map-workspace"\)/);
assert.match(app, /activeConversationRef.current = surface === "chat"/);
assert.match(app, /surface === "map" \? <RoomMapWorkspace/);
const live = readFileSync("src/components/live-preview.tsx", "utf8");
assert(!/getUserMedia|watchPosition|setInterval|fetch\(/.test(live), "Live preview has no media, location or network APIs");
assert(!header.includes('DeferredControl kind="schedule"'), "composer timer removed");
console.log("PASS FP1 Room/Subroom eligibility, single primary, legacy Board URL, lazy Map, auth guard, synthetic Live and timer removal (source contracts; separate live auth proof required)");
