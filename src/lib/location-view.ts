import { LOCATION_VIEW_MS, validLocationView, type LocationCurrentView } from "./shared-location-contract";
type Peers = LocationCurrentView["peers"];
type Clock = { now: () => number; set: (fn: () => void, ms: number) => unknown; clear: (timer: unknown) => void };
const browserClock: Clock = { now: () => performance.now(), set: (fn, ms) => setTimeout(fn, ms), clear: timer => clearTimeout(timer as ReturnType<typeof setTimeout>) };

/** One in-memory, context-bound view. No storage, background reads or transport.
 * Timers are independent of request completion; late responses cannot renew it. */
export class LocationView {
  private ready = false;
  private epoch = 0;
  private request: AbortController | null = null;
  private dirty = false;
  private failures = 0;
  private poll: unknown;
  private expiry: unknown;
  private timeout: unknown;
  constructor(private context: string, private read: (signal: AbortSignal) => Promise<unknown>, private changed: (peers: Peers) => void, private clock: Clock = browserClock) {}
  setReady(value: boolean) {
    if (value === this.ready) return;
    this.ready = value;
    if (value) this.refresh(); else this.clear();
  }
  clear() {
    ++this.epoch; this.ready = false; this.request?.abort(); this.request = null; this.dirty = false; this.failures = 0;
    this.clock.clear(this.poll); this.clock.clear(this.expiry); this.clock.clear(this.timeout);
    this.changed([]);
  }
  refresh() {
    if (!this.ready) return;
    if (this.request) { this.dirty = true; return; }
    this.clock.clear(this.poll);
    const epoch = this.epoch, start = this.clock.now(), controller = new AbortController();
    let displayedPeers = false, failed = false;
    this.request = controller;
    this.timeout = this.clock.set(() => { controller.abort(); if (epoch === this.epoch) this.changed([]); }, LOCATION_VIEW_MS);
    // Token acquisition or a transport shim may not observe AbortSignal. Race
    // the whole read so it cannot prevent future foreground reconciliation.
    const cancelled = new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("View deadline")), { once: true }));
    void Promise.race([new Promise<unknown>(resolve => resolve(this.read(controller.signal))), cancelled]).then(value => {
      if (epoch !== this.epoch || !this.ready || controller.signal.aborted) return;
      if (!validLocationView(value, this.context)) throw new Error("Invalid location view");
      const remaining = value.validForMs - (this.clock.now() - start);
      this.clock.clear(this.expiry);
      if (remaining <= 0) { failed = true; this.changed([]); return; }
      this.failures = 0;
      displayedPeers = value.peers.length > 0;
      this.changed(value.peers);
      this.expiry = this.clock.set(() => this.changed([]), remaining);
    }).catch(() => { failed = true; if (epoch === this.epoch) { this.clock.clear(this.expiry); this.changed([]); } })
      .finally(() => {
        if (epoch !== this.epoch) return;
        this.clock.clear(this.timeout); this.request = null;
        if (!this.ready) return;
        const elapsed = this.clock.now() - start;
        // Recheck sooner only while displaying peers, reserving observed read
        // latency plus 250ms of headroom. Never extend their expiry or overlap
        // requests. Slow (>half-window) reads still clear rather than go stale.
        const interval = failed ? Math.min(60000,5000*2**Math.min(this.failures++,4))
          : displayedPeers ? Math.min(3000, LOCATION_VIEW_MS - elapsed - 250) : 3000;
        // Failure/quota backoff cannot extend a marker: catch already cleared
        // it, and its independent request-start expiry is never renewed here.
        const delay = this.dirty && !failed ? 0 : failed ? interval : Math.max(0, interval - elapsed); this.dirty = false;
        this.poll = this.clock.set(() => this.refresh(), delay);
      });
  }
}
