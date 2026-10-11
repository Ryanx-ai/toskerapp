/** Normal Clerk Development sign-in only; never inject cookies or bypass auth. */
export async function loginLive(page, actor, fixture, origin = "http://localhost:3000") {
  // Gate on Clerk/application readiness below, not unrelated image/asset load.
  await page.goto(`${origin}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, {}, { timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('[aria-label="Open your Namecard"]') || [...document.querySelectorAll("button")].some(b => b.textContent === "Sign in"), {}, { timeout: 30000 });
  const signIn = page.getByRole("button", { name: "Sign in", exact: true });
  if (await signIn.count()) {
    const email = `tosker.user.${actor}+clerk_test@example.com`;
    await signIn.click(); await page.getByRole("textbox", { name: "Email address", exact: true }).fill(email);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("link", { name: "Use another method", exact: true }).click();
    await Promise.all([page.waitForResponse(response => response.url().includes("/prepare_first_factor") && response.status() === 200, { timeout: 30000 }), page.getByRole("button", { name: `Email code to ${email}`, exact: true }).click()]);
    await page.getByRole("textbox", { name: "Enter verification code", exact: true }).fill("424242");
    await page.waitForFunction(() => window.Clerk?.session?.status === "active", {}, { timeout: 30000 });
    // Clerk activation precedes its forced /app redirect. Wait for the actual
    // authenticated shell so that redirect cannot interrupt fixture navigation.
    await page.getByRole("button", { name: "Open your Namecard", exact: true }).waitFor({ timeout: 60000 });
  }
  await page.goto(`${origin}/room/${fixture.slug}/live`, { waitUntil: "domcontentloaded" });
  await liveReady(page);
}
export const liveReady = page => page.waitForFunction(() => { const b = document.querySelector(".live-action"); return b && !b.disabled; }, {}, { timeout: 30000 });
export const liveCount = (page, count) => page.waitForFunction(count => document.querySelectorAll("[data-live-user]").length === count, count, { timeout: 30000 });
export const liveJoined = page => page.locator('.live-panel[data-phase="connected"]').waitFor({ timeout: 30000 });
export const liveButton = (page, name) => page.getByRole("button", { name, exact: true });
export async function leaveLiveBeforeClose(page) {
  if (page.isClosed()) return;
  const leave = liveButton(page, "Leave Live");
  if (await leave.count()) {
    await leave.click({ timeout: 3000 });
    await liveReady(page);
  }
}
export async function traceLivePort(page) {
  await page.evaluate(() => {
    const element = document.querySelector(".live-panel");
    let fiber = element?.[Object.keys(element).find(k => k.startsWith("__reactFiber"))];
    while (fiber && !fiber.memoizedProps?.live) fiber = fiber.return;
    const live = fiber?.memoizedProps.live, port = live?.port;
    if (!port || port.__qaTraced) return;
    port.__qaTraced = true;
    window.__livePortTrace = [];
    for (const name of ["authorize", "observe", "enter", "leave", "detach", "members", "profiles"]) {
      const original = port[name];
      port[name] = async (...args) => {
        const row = { name, state: "pending", at: Math.round(performance.now()) };
        window.__livePortTrace.push(row); if (window.__livePortTrace.length > 60) window.__livePortTrace.shift();
        if (name === "profiles") row.requestedCount = args[0]?.length;
        try { const value = await original(...args); row.state = "done"; row.durationMs = Math.round(performance.now()) - row.at; if (Array.isArray(value)) row.resultCount = value.length; return value; }
        catch (error) { row.state = "failed"; row.durationMs = Math.round(performance.now()) - row.at; throw error; }
      };
    }
  });
}
export async function installLiveMetrics(context) {
  await context.addInitScript(() => {
    const Native = window.WebSocket, sockets = new Set();
    let blocked = false;
    const state = { outgoing: 0, incoming: 0, maxConnections: 0, connectivityProbes: 0, payloadSafe: true, actions: {}, liveChannels: [], recent: [], connectionEvents: [] };
    let socketId = 0;
    const socketEvent = (id, event) => { state.connectionEvents.push({ id, event, at: Math.round(performance.now()), open: [...sockets].filter(s => s.readyState === 1).length }); if (state.connectionEvents.length > 60) state.connectionEvents.shift(); };
    const record = (direction, m) => {
      state.recent.push({ direction, action: m.action, live: !!m.channel?.startsWith("tosker:live:"), presence: m.presence?.map(p => p.action), errorCode: m.error?.code });
      if (state.recent.length > 50) state.recent.shift();
    };
    const channels = new Set();
    window.__liveQa = {
      snapshot: () => ({ ...state, connections: [...sockets].filter(s => s.readyState === 1).length, liveChannels: [...channels].length }),
      cut: () => { blocked = true; for (const socket of sockets) socket.close(); },
      restore: () => { blocked = false; },
    };
    window.WebSocket = class extends Native {
      constructor(...args) {
        // Playwright HTTP offline does not consistently block WebSocket retries.
        // Test-only transport fault, never shipped in the application bundle.
        if (blocked && String(args[0]).includes("ably")) throw new DOMException("QA network offline", "NetworkError");
        super(...args);
        if (!String(args[0]).includes("ably")) return;
        // Ably2.28 checkWsConnectivity() opens an unauthenticated ws-up probe.
        // It is not a second realtime connection. Count it separately, without
        // recording URLs/query strings (which may contain authentication).
        const url = new URL(String(args[0]));
        if (url.hostname === "ws-up.ably-realtime.com" && !url.search) { state.connectivityProbes++; return; }
        const id = ++socketId;
        sockets.add(this);
        socketEvent(id, "create");
        this.addEventListener("open", () => { state.maxConnections = Math.max(state.maxConnections, [...sockets].filter(s => s.readyState === 1).length); socketEvent(id, "open"); });
        this.addEventListener("close", () => { sockets.delete(this); socketEvent(id, "close"); });
        this.addEventListener("message", event => {
          state.incoming++;
          try { const m = JSON.parse(event.data); record("in", m); if (m.channel?.startsWith("tosker:live:")) { if (m.action === 11) channels.add(m.channel); if (m.action === 13) channels.delete(m.channel); } } catch {}
        });
      }
      send(data) {
        if (sockets.has(this)) {
          state.outgoing++;
          try {
            const m = JSON.parse(data); record("out", m); state.actions[m.action] = (state.actions[m.action] ?? 0) + 1;
            if (m.channel?.startsWith("tosker:live:") && m.presence) for (const p of m.presence) if (p.data && Object.keys(typeof p.data === "string" ? JSON.parse(p.data) : p.data).some(k => k !== "v")) state.payloadSafe = false;
          } catch {}
        }
        return super.send(data);
      }
    };
  });
}
