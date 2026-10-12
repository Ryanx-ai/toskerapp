"use client";

import { useSyncExternalStore } from "react";
import { LogIn, LogOut, Users } from "lucide-react";
import type { LiveSession } from "@/lib/live-session";
import { PersonAvatar } from "./identity-avatar";
import { roomShorthand } from "@/lib/identity-visual";

export default function LivePanel({ live, userId }: { live: LiveSession; userId?: string }) {
  const state = useSyncExternalStore(live.subscribe, live.getSnapshot, live.getServerSnapshot);
  const joined = state.phase === "connected" || state.phase === "joining" || state.phase === "reconnecting";
  const label = state.phase === "connected" ? "In Live" : state.phase === "joining" ? "Joining" : state.phase === "reconnecting" ? "Reconnecting" : "Not joined";
  return <section className="live-panel" aria-labelledby="live-title" data-phase={state.phase}>
    <header className="live-panel-header">
      <div><span className="live-panel-eyebrow"><Users size={16} aria-hidden="true" />Presence only</span><h2 id="live-title">Live, together</h2><p>See who has joined this space. No microphone, camera or location is shared.</p></div>
      <button type="button" className={`live-action ${joined ? "quiet-action" : "primary-action"}`} onClick={joined ? live.leave : live.join} disabled={!userId || (!joined && !state.ready)}>
        {joined ? <LogOut size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}{joined ? "Leave Live" : "Join Live"}
      </button>
    </header>
    <p className="live-panel-status" role="status" aria-live="polite" aria-atomic="true"><strong>{label}</strong><span>{userId ? state.message : "Sign in to join Live."} {state.ready ? `${state.participants.length} ${state.participants.length === 1 ? "person has" : "people have"} joined.` : ""}</span></p>
    {state.participants.length ? <ul className="live-participants" aria-label="Live participants">{state.participants.map(person => <li key={person.userId} data-live-user={person.userId}>
      <PersonAvatar seed={person.userId} initials={roomShorthand(person.displayName)} imageUrl={person.avatarUrl} />
      <div><strong>{person.displayName}</strong><span>{person.userId === userId ? "You · Joined" : "Joined"}</span></div>
    </li>)}</ul> : <div className="live-empty"><Users size={28} aria-hidden="true" /><h3>{state.ready ? "No one has joined yet" : "A shared space to be here"}</h3><p>{state.ready ? "Join when you’re ready. Opening this tab does not announce you." : "Participants appear once the connection is ready."}</p></div>}
    <p className="live-panel-note">You stay in Live when you change this workspace layout. Leave explicitly when finished. Changing conversations, reloading or putting the page in the background leaves Live.</p>
  </section>;
}
