"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSession } from "@clerk/nextjs";
import { WorkspaceRealtimeOwner } from "@/lib/workspace-realtime-owner";
import { REALTIME_SIGNOUT } from "@/lib/live-contract";

const OwnerContext = createContext<WorkspaceRealtimeOwner | null>(null);

export function WorkspaceRealtimeProvider({ children }: { children: ReactNode }) {
  const [owner] = useState(() => new WorkspaceRealtimeOwner());
  const { session, isLoaded } = useSession();
  const [sessionChanged, setSessionChanged] = useState(false);
  const disposal = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sessionMismatch = isLoaded && !owner.matchesSession(session?.id);
  const transportFailed = useSyncExternalStore(owner.subscribe, owner.getSnapshot, owner.getServerSnapshot);
  useEffect(() => {
    if (sessionMismatch) owner.retire();
  }, [sessionMismatch, owner]);
  useEffect(() => {
    clearTimeout(disposal.current);
    const stop = () => owner.retire();
    const restored = (event: PageTransitionEvent) => { if (event.persisted) setSessionChanged(true); };
    window.addEventListener(REALTIME_SIGNOUT, stop);
    window.addEventListener("pagehide", stop);
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener(REALTIME_SIGNOUT, stop);
      window.removeEventListener("pagehide", stop);
      window.removeEventListener("pageshow", restored);
      // Deferred only to tolerate React's setup/cleanup replay. Page leases
      // cancel immediately; a real document exit is handled synchronously above.
      disposal.current = setTimeout(stop, 0);
    };
  }, [owner]);
  if ((sessionChanged || sessionMismatch || transportFailed) && session) return <main className="auth-page"><section className="auth-card" role="alert">
    <h1>Refresh your workspace</h1><p>{transportFailed ? "Updates stopped safely. Reload to reconnect." : "Your session changed. Reload to continue with your Tosker identity."}</p>
    <button className="button button-primary" onClick={() => window.location.reload()}>Reload workspace</button>
  </section></main>;
  return <OwnerContext.Provider value={owner}>{children}</OwnerContext.Provider>;
}

export function useWorkspaceRealtimeOwner() { return useContext(OwnerContext); }
