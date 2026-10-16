"use client";

import { useId, useSyncExternalStore } from "react";
import { LogIn, LogOut, Users } from "lucide-react";
import type { LiveSession } from "@/lib/live-session";
import { PersonAvatar } from "./identity-avatar";
import { roomShorthand } from "@/lib/identity-visual";

const routineMessages = new Set(["You’re in Live.", "You haven’t joined Live.", "You left Live.", "Joining Live…", "Connecting to Live…"]);

export default function LivePanel({ live, userId, companion = false }: { live: LiveSession; userId?: string; companion?: boolean }) {
  const titleId = useId();
  const state = useSyncExternalStore(live.subscribe, live.getSnapshot, live.getServerSnapshot);
  const joined = state.phase === "connected" || state.phase === "joining" || state.phase === "reconnecting";
  const label = !userId ? "Sign in to join" : state.phase === "connected" ? "In Live" : state.phase === "joining" ? "Joining…" : state.phase === "reconnecting" ? "Reconnecting…" : state.phase === "disconnected" ? "Disconnected" : state.ready ? "Ready to join" : "Connecting…";
  const notice = routineMessages.has(state.message) ? null : state.message;
  const count = `${state.participants.length} ${state.participants.length === 1 ? "person" : "people"} here`;
  return <section className="live-panel" aria-labelledby={titleId} data-phase={state.phase} data-live-layout={companion ? "companion" : "expanded"}>
    <header className="live-panel-header">
      <h2 id={titleId}>Live, together</h2>
      {state.ready && <span className="live-count" aria-hidden="true"><Users size={16} aria-hidden="true" />{state.participants.length} here</span>}
    </header>
    <p className="live-capability">Presence only · no microphone or camera.</p>
    <div className="live-control-dock" aria-label="Live controls">
      <p className="live-panel-status" role="status" aria-live="polite" aria-atomic="true"><span className="live-status-dot" aria-hidden="true" />{label}<span className="live-sr-only">{state.ready ? `. ${count}.` : ""}{notice ? ` ${notice}` : ""}</span></p>
      <button type="button" className={`live-action ${joined ? "quiet-action" : "primary-action"}`} onClick={joined ? live.leave : live.join} disabled={!userId || (!joined && !state.ready)}>
        {joined ? <LogOut size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}{joined ? "Leave Live" : "Join Live"}
      </button>
    </div>
    {notice && <p className="live-connection-notice">{notice}</p>}
    {state.participants.length ? <ul className="live-participants" aria-label="Live participants">{state.participants.map(person => <li key={person.userId} data-live-user={person.userId}>
      <PersonAvatar seed={person.userId} initials={roomShorthand(person.displayName)} imageUrl={person.avatarUrl} />
      <div className="live-person-copy"><strong>{person.displayName}</strong><span><i aria-hidden="true" />{person.userId === userId ? "You · Here" : "Here"}</span></div>
    </li>)}</ul> : <div className="live-empty"><Users size={24} aria-hidden="true" /><div><h3>{state.ready ? "No one here yet" : "Waiting for connection"}</h3><p>{state.ready ? "Join and be here together." : "Participants appear when connected."}</p></div></div>}
    <details className="live-panel-help"><summary>How Live works</summary><p>Join to appear here. Live itself does not share location. Switching workspace panels keeps you in Live; leaving this conversation, reloading or hiding this tab leaves Live.</p></details>
  </section>;
}
