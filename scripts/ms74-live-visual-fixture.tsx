/** Local presentation fixture only. No credentials, DB, auth or transport. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, sep } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LivePanel from "../src/components/live-panel";
import { LiveSession } from "../src/lib/live-session";
import type { LiveSnapshot } from "../src/lib/live-contract";

assert.equal(process.argv[2], "--serve", "Explicit local presentation-only mode required.");
const root = resolve(".next/static");
const styles = readdirSync(resolve(root, "chunks")).filter(name => name.endsWith(".css"));
assert(styles.length > 0, "Verified local build required.");
const server = createServer((request, response) => {
  response.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-ancestors 'none'");
  response.setHeader("Cache-Control", "no-store");
  const url = new URL(request.url ?? "/", "http://localhost:3001");
  if (url.pathname.startsWith("/_next/static/")) {
    const file = resolve(root, url.pathname.slice("/_next/static/".length));
    if (!file.startsWith(root + sep) || !/\.(css|woff2?)$/.test(file)) { response.writeHead(404).end(); return; }
    try { response.setHeader("Content-Type", file.endsWith(".css") ? "text/css" : "font/woff2"); response.end(readFileSync(file)); }
    catch { response.writeHead(404).end(); }
    return;
  }
  if (url.pathname !== "/") { response.writeHead(404).end(); return; }
  const variant = url.searchParams.get("state") ?? "long";
  const companion = url.searchParams.get("layout") === "companion";
  const state: LiveSnapshot = {
    phase: variant === "disconnected" ? "disconnected" : variant === "empty" ? "not-joined" : "connected",
    ready: variant !== "disconnected",
    message: variant === "disconnected" ? "Connection interrupted. Rejoin when connected." : "You’re in Live.",
    participants: variant === "long" ? [
      { userId: "synthetic-a", displayName: "SyntheticLongParticipantName".repeat(3).slice(0,80), avatarUrl: null },
      { userId: "synthetic-b", displayName: "Short name", avatarUrl: null },
    ] : [],
  };
  const live = new LiveSession();
  live.getServerSnapshot = () => state;
  const html = renderToStaticMarkup(createElement(LivePanel, { live, userId: "synthetic-a", companion }));
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic Live presentation fixture</title>${styles.map(name => `<link rel="stylesheet" href="/_next/static/chunks/${name}">`).join("")}<style>body{margin:0;padding:16px;background:var(--bg);color:var(--text-primary)}.fixture-note{font:12px/1.5 sans-serif;margin:0 0 16px}.fixture-shell{display:flex;min-width:0;${companion ? "max-width:400px" : ""}}</style></head><body><p class="fixture-note">Synthetic presentation only — no account, transport or functional Join button.</p><main class="fixture-shell">${html}</main></body></html>`);
});
server.listen(3001, "localhost", () => console.log("Live presentation fixture: http://localhost:3001 — no provider calls"));
const timeout = setTimeout(() => server.close(), 20 * 60000);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { clearTimeout(timeout); server.close(); });
