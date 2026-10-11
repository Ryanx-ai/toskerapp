import type { BaseRealtime } from "ably/modular";
import type { TokenDetails } from "ably";

export type RealtimeScope = {
  userId: string;
  sessionId: string;
  conversationId?: string;
  token(): Promise<string>;
  denied(): void;
};
type Cleanup = () => Promise<void>;
type Lease = { scope: RealtimeScope; valid: boolean; abort: AbortController; cleanup?: Cleanup };
type Factory = (scope: RealtimeScope, authorize: () => Promise<TokenDetails>) => Promise<BaseRealtime>;

async function createClient(scope: RealtimeScope, authorize: () => Promise<TokenDetails>) {
  const { BaseRealtime, WebSocketTransport, FetchRequest, RealtimePresence } = await import("ably/modular");
  return new BaseRealtime({
    plugins: { WebSocketTransport, FetchRequest, RealtimePresence },
    clientId: scope.userId, autoConnect: false, queueMessages: false, logLevel: 0,
    authCallback: (_params, callback) => {
      void authorize().then(token => callback(null, token), () => callback("Realtime authorization unavailable.", null));
    },
  });
}

/** One SDK instance per authenticated workspace. Pages own cancellable leases,
 * not sockets. Cleanup and reauthorization serialize across context changes.
 * A retired identity is never reused: a new login requires a new document. */
export class WorkspaceRealtimeOwner {
  private client?: BaseRealtime;
  private identity?: { userId: string; sessionId: string };
  private active?: Lease;
  private authorizationLease?: Lease;
  private tail: Promise<void> = Promise.resolve();
  private retired = false;
  private authorizedContext?: string;
  private authorized = false;
  private failed = false;
  private listeners = new Set<() => void>();

  constructor(private readonly factory: Factory = createClient) {}

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.failed;
  getServerSnapshot = () => false;
  fail = () => {
    this.retire();
    this.failed = true;
    for (const listener of this.listeners) listener();
  };

  matchesSession(sessionId: string | undefined) {
    return !this.identity || this.identity.sessionId === sessionId;
  }

  private async token() {
    const lease = this.authorizationLease;
    if (!lease?.valid || this.retired) throw new Error("Inactive workspace.");
    const token = await lease.scope.token();
    if (!lease.valid || this.active !== lease || this.retired) throw new Error("Stale session.");
    const response = await fetch("/api/realtime/token", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ conversationId: lease.scope.conversationId }),
      signal: AbortSignal.any([lease.abort.signal, AbortSignal.timeout(10000)]),
    });
    if (!lease.valid || this.active !== lease || this.retired) throw new Error("Stale authorization.");
    if (response.status === 401 || response.status === 403) lease.scope.denied();
    if (!response.ok) throw new Error("Realtime authorization unavailable.");
    const details = await response.json() as TokenDetails;
    if (!lease.valid || this.active !== lease || this.retired || details.clientId !== lease.scope.userId) throw new Error("Stale identity.");
    return details;
  }

  private cancel(lease: Lease) {
    if (!lease.valid) return;
    lease.valid = false;
    lease.abort.abort();
    // Cleanup removes callbacks synchronously before it awaits provider detach.
    const cleanup = lease.cleanup?.().catch(() => { this.fail(); });
    this.tail = this.tail.then(async () => {
      if (!cleanup) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([cleanup, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Cleanup timed out.")), 10000); })]);
      } finally { clearTimeout(timer); }
    }).catch(() => this.fail());
  }

  acquire(scope: RealtimeScope, setup: (client: BaseRealtime) => Cleanup) {
    if (this.active) this.cancel(this.active);
    const lease: Lease = { scope, valid: true, abort: new AbortController() };
    this.active = lease;
    if (this.identity && (this.identity.userId !== scope.userId || this.identity.sessionId !== scope.sessionId)) this.retire();
    this.identity ??= { userId: scope.userId, sessionId: scope.sessionId };
    this.tail = this.tail.then(async () => {
      if (!lease.valid || this.retired) return;
      this.authorizationLease = lease;
      this.client ??= await this.factory(scope, () => this.token());
      if (!lease.valid || this.retired) { if (this.retired) this.client.close(); return; }
      // Reuse a same-context token during surface remounts; every Join still
      // reauthorizes, and SDK token renewal always consults the current lease.
      if (!this.authorized || this.authorizedContext !== scope.conversationId) {
        await this.client.auth.authorize();
        if (!lease.valid || this.retired) return;
        this.authorized = true;
        this.authorizedContext = scope.conversationId;
      }
      lease.cleanup = setup(this.client);
      this.client.connect();
    }).catch(() => {
      // Network/SDK failure is not proof of membership withdrawal. Only an
      // actual401/403 above invokes denied; other failures offer explicit recovery.
      if (lease.valid) this.fail();
    });
    return () => this.cancel(lease);
  }

  retire = () => {
    if (this.retired) return;
    this.retired = true;
    if (this.active) this.cancel(this.active);
    this.client?.close();
  };
}
