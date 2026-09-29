import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasRoomMap, resolveWorkspaceSurface, type WorkspaceSurface } from "../src/lib/workspace-surfaces";

const room = { kind: "room", slug: "trip", tag: "TRIP" };
const contexts = [room, { ...room, tag: undefined }, { ...room, slug: "trip--child", tag: "SUBROOM" }, { kind: "personal", slug: "chat-id" }, { kind: "my-room", slug: "my-room" }];
for (const [index, context] of contexts.entries()) {
  assert.equal(hasRoomMap(context), index < 2);
  for (const surface of ["chat", "hall", "map"] satisfies WorkspaceSurface[]) {
    assert.equal(resolveWorkspaceSurface(surface, context), surface === "map" && index > 1 ? "chat" : surface);
  }
}
assert.equal(hasRoomMap({ ...room, slug: "trip--child" }), false);
assert.equal(hasRoomMap({ ...room, tag: "SUBROOM" }), false);
assert.equal(resolveWorkspaceSurface("map"), "chat");

const header = readFileSync("src/components/communication-ui.tsx", "utf8");
assert.match(header, /href=\{`\$\{baseHref\(conversation\)\}\/hall`\}/, "Board retains old URLs");
assert.match(header, /Board<AttentionMark/, "Board is the visible name");
assert.match(header, /prefetch=\{false\}>Map/, "Map is opt-in");
const page = readFileSync("src/app/(workspace)/room/[slug]/map/page.tsx", "utf8");
assert.match(page, /if \(!userId \|\| !\(await canAccessRoom\(userId, slug\)\)\) notFound\(\)/);
const app = readFileSync("src/components/messaging-app.tsx", "utf8");
assert.match(app, /dynamic\(\(\) => import\("\.\/room-map-workspace"\)/);
assert.match(app, /activeConversationRef.current = surface === "chat"/);
assert.match(app, /surface === "map" \? <RoomMapWorkspace/);
console.log("PASS MS7.3 surface eligibility, single primary resolution, legacy Board URL, lazy Map boundary, auth guard and Chat attention isolation (unit/source contracts; not live auth proof)");
