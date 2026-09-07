// Deterministic AuthGate render cases. This does not substitute for Clerk browser QA.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const state = { signedIn: true, identity: null, demo: false, pathname: "/friends" };
const exports = {};
const source = readFileSync(new URL("../src/components/auth-gate.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
vm.runInNewContext(compiled.outputText, {
  exports,
  require(name) {
    if (name === "react") return { ...React, useSyncExternalStore: () => state.demo };
    if (name === "next/navigation") return { usePathname: () => state.pathname };
    if (name === "next/image") return { __esModule: true, default: () => null };
    if (name === "@clerk/nextjs") return {
      Show: ({ children, fallback }) => state.signedIn ? children : fallback,
      SignInButton: ({ children }) => children,
      SignUpButton: ({ children }) => children,
    };
    if (name === "@/components/tosker-identity") return { useToskerIdentity: () => state.identity };
    if (name === "@/lib/prototype-store") return { prototypeStore: {} };
    return require(name);
  },
});
const render = (allowDemo = true) => renderToStaticMarkup(React.createElement(exports.AuthGate, { allowDemo }, "CANONICAL_WORKSPACE"));
assert.match(render(), /Reload workspace/);
assert.doesNotMatch(render(), /CANONICAL_WORKSPACE/);
state.identity = { userId: "test-actor" };
assert.match(render(false), /CANONICAL_WORKSPACE/);
state.signedIn = false; state.identity = null;
assert.match(render(), /Sign in/);
assert.doesNotMatch(render(), /CANONICAL_WORKSPACE/);
state.demo = true;
assert.match(render(), /Exit Demo/);
assert.match(render(), /CANONICAL_WORKSPACE/);
state.signedIn = true; state.identity = { userId: "test-actor" };
assert.doesNotMatch(render(false), /Exit Demo/);
state.pathname = "/join/test-invite"; state.identity = null; state.demo = false;
assert.match(render(), /CANONICAL_WORKSPACE/);
console.log("PASS: identity-required workspace; signed-out; explicit demo; canonical identity; join boundary.");

const cacheExports = {};
const cacheSource = readFileSync(new URL("../src/components/workspace-snapshot.ts", import.meta.url), "utf8");
vm.runInNewContext(ts.transpileModule(cacheSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: cacheExports });
const cache = cacheExports.workspaceSnapshot;
const snapshot = { userId: "actor-a", navigation: { rooms: [], personalConversations: [] }, activity: [{ id: "activity-a" }] };
let updates = 0;
const unsubscribe = cache.subscribe(() => updates++);
cache.publish(snapshot);
assert.equal(cache.get("actor-a"), snapshot, "Canonical response survives client navigation");
assert.equal(cache.get("actor-b").activity.length, 0, "Another actor never inherits the cache");
assert.equal(cache.get().activity.length, 0, "Signed-out never inherits the cache");
assert.equal(cache.server().activity.length, 0, "SSR has no cross-request state");
unsubscribe(); cache.publish({ ...snapshot, userId: "actor-b" });
assert.equal(updates, 1);
assert.equal(cache.get("actor-a").activity.length, 0);
console.log("PASS: navigation snapshot continuity; actor isolation; signed-out/SSR empty; subscription cleanup.");
