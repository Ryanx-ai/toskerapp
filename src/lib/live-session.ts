import { isConversationId } from "./realtime-contract";
import { LIVE_MAX_PARTICIPANTS, LIVE_RECOVERY_MS, type LiveParticipant, type LiveSnapshot } from "./live-contract";

/** The workspace owns the connection. This port cannot open another transport or
 * publish arbitrary payloads; media and location are deliberately absent. */
export type LivePort = {
  connected(): boolean;
  authorize(): Promise<unknown>;
  observe(changed: () => void): Promise<void>;
  unobserve(): void;
  enter(): Promise<void>;
  leave(): Promise<void>;
  detach(): Promise<void>;
  members(): Promise<{ clientId?: string }[]>;
  profiles(ids: string[]): Promise<LiveParticipant[]>;
  onConnection(changed: () => void): () => void;
  closeUnsafeConnection(): void;
};

const initial: LiveSnapshot = { phase: "not-joined", participants: [], ready: false, message: "Connecting to Live…" };

/** Small external store: roster events render Live, not the whole chat workspace.
 * All enter/leave operations serialize; generation changes invalidate late work.
 * Offline detach clears SDK auto-reentry before any deliberate recovery join. */
export class LiveSession {
  private snapshot: LiveSnapshot = initial;
  private listeners = new Set<() => void>();
  private port?: LivePort;
  private connectionCleanup?: () => void;
  private active = false;
  private visible = true;
  private intent = false;
  private generation = 0;
  private queue: Promise<void> = Promise.resolve();
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private recoveryTimer?: ReturnType<typeof setTimeout>;
  private refreshGeneration = 0;
  private recovering = false;
  private recoveryDeadline = 0;
  private denied = false;
  private lastJoinAt = 0;

  constructor(private readonly recoveryMs = LIVE_RECOVERY_MS) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => initial;

  private update(patch: Partial<LiveSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
  private current(port: LivePort, generation: number) {
    return this.port === port && this.generation === generation && this.active && this.visible && !this.denied;
  }
  private enqueue(work: () => Promise<void>) {
    this.queue = this.queue.then(work).catch(() => { /* Each task handles its UI error without exposing SDK credentials. */ });
    return this.queue;
  }
  bind(port: LivePort) {
    this.port = port;
    this.denied = false;
    this.connectionCleanup = port.onConnection(() => this.connectionChanged());
    this.connectionChanged();
    return () => {
      if (this.port !== port) return;
      this.stop("Connection closed.");
      this.connectionCleanup?.(); this.connectionCleanup = undefined;
      this.port = undefined;
      return this.queue;
    };
  }
  activate = () => {
    this.active = true;
    this.connectionChanged();
    return () => { this.active = false; this.stop("You left Live."); };
  };
  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) this.stop("You left Live while this page was in the background.");
    else if (this.active) this.connectionChanged();
  }
  revoke = () => { this.denied = true; this.stop("Live access ended."); };

  private async clean(port: LivePort) {
    port.unobserve();
    try { if (port.connected()) await port.leave(); } catch { /* Detach also removes presence. */ }
    try { await port.detach(); }
    catch { port.closeUnsafeConnection(); } // Never retain an SDK auto-reentry member after a failed detach.
  }
  private stop(message: string) {
    this.intent = false; this.recovering = false; this.recoveryDeadline = 0; this.generation++; this.refreshGeneration++;
    clearTimeout(this.refreshTimer); clearTimeout(this.recoveryTimer);
    const port = this.port;
    this.update({ phase: "not-joined", participants: [], ready: false, message });
    if (port) {
      port.unobserve();
      // Offline detach is synchronous inside the SDK, unlike a queued leave.
      if (!port.connected()) void port.detach().catch(() => port.closeUnsafeConnection());
      void this.enqueue(() => this.clean(port));
    }
  }
  leave = () => {
    this.stop("You left Live.");
    this.observe();
  };
  join = () => {
    if (this.intent || !this.snapshot.ready || !this.active || !this.visible || this.denied) return;
    // Coalesce clicks/retries locally; provider/account limits remain the hard cap.
    if (Date.now() - this.lastJoinAt < 1000) return;
    this.lastJoinAt = Date.now();
    this.intent = true;
    this.update({ phase: "joining", ready: false, message: "Joining Live…" });
    this.observe(true);
  };
  refresh = () => {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => { void this.readRoster(); }, 80);
  };
  private async readRoster() {
    const port = this.port, generation = this.generation, refresh = ++this.refreshGeneration;
    if (!port || !this.current(port, generation) || !port.connected()) return;
    try {
      const members = await port.members();
      const ids = [...new Set(members.map(member => member.clientId).filter(isConversationId))].sort().slice(0, LIVE_MAX_PARTICIPANTS);
      const participants = await port.profiles(ids);
      if (!this.current(port, generation) || refresh !== this.refreshGeneration || !port.connected()) return;
      this.update({ participants, ready: this.snapshot.phase !== "joining", message: this.snapshot.phase === "joining" ? "Joining Live…" : this.intent ? "You’re in Live." : "You haven’t joined Live." });
    } catch {
      if (this.current(port, generation) && refresh === this.refreshGeneration) {
        this.update({ participants: [], message: "Participant list unavailable. Leave and join again to retry." });
      }
    }
  }
  private observe(join = false) {
    const port = this.port, generation = this.generation;
    if (!port || !this.current(port, generation) || !port.connected()) return;
    void this.enqueue(async () => {
      if (!this.current(port, generation) || !port.connected()) return;
      try {
        // Every explicit/recovery Join refreshes server membership + session authorization.
        if (join) await port.authorize();
        if (!this.current(port, generation)) return;
        await port.observe(this.refresh);
        if (!this.current(port, generation)) { await this.clean(port); return; }
        // Join already refreshed exact-context authority. The snapshot projection
        // checks observers (including empty rosters) and every displayed identity.
        if (!join) await port.profiles([]);
        if (!this.current(port, generation)) return;
        if (join && this.intent) {
          await port.enter();
          if (!this.current(port, generation) || !this.intent) { await this.clean(port); return; }
          clearTimeout(this.recoveryTimer); this.recovering = false; this.recoveryDeadline = 0;
          this.update({ phase: "connected", ready: true, message: "You’re in Live." });
        } else this.update({ ready: true, message: "You haven’t joined Live." });
        this.refresh();
      } catch {
        if (!this.current(port, generation)) return;
        this.stop("Live is unavailable. Try joining again when connected.");
        this.update({ phase: "disconnected", ready: port.connected() });
      }
    });
  }
  private connectionChanged() {
    const port = this.port;
    if (!port || !this.active || !this.visible || this.denied) return;
    if (port.connected()) {
      // Background/suspended browsers can delay timers. Wall-clock expiry must
      // be checked before recovery, not inferred from whether a timer ran.
      if (this.intent && this.recoveryDeadline && Date.now() >= this.recoveryDeadline) {
        this.stop("Connection lost. Join Live again when connected.");
        this.update({ phase: "disconnected" });
      }
      this.observe(this.intent); return;
    }
    this.generation++; this.refreshGeneration++;
    clearTimeout(this.refreshTimer);
    port.unobserve();
    void port.detach().catch(() => port.closeUnsafeConnection());
    this.update({ participants: [], ready: false, phase: this.intent ? "reconnecting" : "disconnected", message: this.intent ? "Connection interrupted. Reconnecting to Live…" : "Connecting to Live…" });
    if (this.intent && !this.recovering) {
      this.recovering = true;
      this.recoveryDeadline = Date.now() + this.recoveryMs;
      this.recoveryTimer = setTimeout(() => {
        this.stop("Connection lost. Join Live again when connected.");
        this.update({ phase: "disconnected" });
        if (this.port?.connected()) this.observe();
      }, this.recoveryMs);
    }
  }
}
