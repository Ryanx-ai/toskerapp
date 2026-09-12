"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ModalLayer } from "./modal-layer";
import { PersonAvatar } from "./identity-avatar";
import { FakeQr } from "./fake-qr";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { invitationCandidatesAction, invitationManagementAction, sendDirectInvitationsAction, generateShareInvitationAction, cancelInvitationAction } from "@/server/rooms/invitation-actions";

type Candidate = Awaited<ReturnType<typeof invitationCandidatesAction>>[number];
type Management = Awaited<ReturnType<typeof invitationManagementAction>>;
const refreshActivity = () => window.dispatchEvent(new Event(ACTIVITY_REFRESH));

export function RoomInvitations({ roomId }: { roomId: string }) {
  const [data, setData] = useState<Management | null>(null);
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let active = true, sequence = 0;
    const load = async () => {
      const request = ++sequence;
      try { const next = await invitationManagementAction(roomId); if (active && request === sequence) { setData(next); setError(""); } }
      catch { if (active && request === sequence) { setData(null); setError("Invitations unavailable. Check your access and retry."); } }
    };
    void load();
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const foreground = () => { if (!document.hidden) void load(); };
    window.addEventListener(ACTIVITY_REFRESH, load);
    document.addEventListener("visibilitychange", foreground);
    return () => { active = false; window.clearInterval(clock); window.removeEventListener(ACTIVITY_REFRESH, load); document.removeEventListener("visibilitychange", foreground); };
  }, [roomId, attempt]);
  const share = data?.share && Date.parse(data.share.expiresAt) > now ? data.share : null;
  const link = share && typeof window !== "undefined" ? `${window.location.origin}/join/${share.token}` : "";
  const run = async (operation: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true); setError(""); setFeedback("");
    try { await operation(); setData(await invitationManagementAction(roomId)); setFeedback(message); refreshActivity(); }
    catch {
      // Reconcile uncertain mutations without erasing the actionable failure message.
      try { setData(await invitationManagementAction(roomId)); } catch { setData(null); }
      setError("That invitation change wasn't confirmed. Check access or wait a minute, then retry.");
    }
    finally { setBusy(false); }
  };
  return <section className="fp2-invitation-management" aria-label="Room invitations">
    <h3>Pending invitations</h3>
    {!data && !error ? <p role="status">Loading invitations…</p> : null}
    {data ? <ul className="room-invite-list">{data.direct.filter((invite) => !invite.expiresAt || Date.parse(invite.expiresAt) > now).map((invite) => <li key={invite.id}><span><strong>{invite.name ?? "Unavailable person"}</strong><small>{invite.username ? `@${invite.username} · ` : ""}Invited</small></span><button disabled={busy} onClick={() => void run(() => cancelInvitationAction(roomId, invite.id), "Invitation cancelled.")} aria-label={`Cancel invitation to ${invite.name ?? "person"}`}>Cancel invite</button></li>)}</ul> : null}
    {data && !data.direct.some((invite) => !invite.expiresAt || Date.parse(invite.expiresAt) > now) ? <p>No pending invitations.</p> : null}
    {data?.owner ? <section className="fp2-share" aria-label="Share invite"><h3>Share invite</h3>
      {share ? <>
        <p>Anyone with this link can join before it expires.</p>
        <div className="invite-layout"><FakeQr value={link} /><label>Invitation link<input readOnly value={link} onFocus={(event) => event.currentTarget.select()} /></label></div>
        <p>Expires <time dateTime={share.expiresAt}>{new Date(share.expiresAt).toLocaleString()}</time></p>
        <div className="fp2-action-row"><button disabled={busy} onClick={async () => {
          try {
            const fresh = await invitationManagementAction(roomId);
            setData(fresh);
            if (fresh.share?.id !== share.id) { setError("This link changed or expired. Use the current invite."); return; }
            await navigator.clipboard.writeText(`${window.location.origin}/join/${fresh.share.token}`); setFeedback("Link copied.");
          } catch { setError("Copy unavailable. Select the current link to copy it."); }
        }}>Copy link</button><button className="danger" disabled={busy} onClick={() => void run(() => cancelInvitationAction(roomId, share.id), "Share invite revoked.")}>Revoke link</button></div>
      </> : <p>No active share invite.</p>}
      <label>Valid for<select value={hours} disabled={busy} onChange={(event) => setHours(Number(event.target.value))}><option value={1}>1 hour</option><option value={24}>24 hours</option><option value={168}>7 days</option></select></label>
      {share ? <p className="room-management-note">Generating a replacement invalidates the old link. Members stay.</p> : null}
      <button className="quiet-action" disabled={busy} onClick={() => void run(() => generateShareInvitationAction(roomId, hours), share ? "Share invite replaced." : "Share invite created.")}>{busy ? "Saving…" : share ? "Generate replacement" : "Generate invite"}</button>
    </section> : data ? <p className="room-management-note">The owner manages the shared invite link.</p> : null}
    {error ? <p role="alert" className="composer-error">{error} <button onClick={() => setAttempt((value) => value + 1)} disabled={busy}>Retry</button></p> : null}
    {feedback ? <p role="status">{feedback}</p> : null}
  </section>;
}

export function InvitePeople({ roomId, name, onClose }: { roomId: string; name: string; onClose: () => void }) {
  const [mode, setMode] = useState<"friends" | "username">("friends");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [attempt, setAttempt] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    const current = ++request.current;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try { const rows = await invitationCandidatesAction(roomId, query, mode); if (active && current === request.current) { setPeople(rows); setError(""); } }
      catch { if (active && current === request.current) { setPeople([]); setError("People couldn't be loaded. Check your access or wait a minute and retry."); } }
      finally { if (active && current === request.current) setLoading(false); }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [roomId, mode, query, attempt]);
  const send = async () => {
    if (busy || !selected.length) return;
    setBusy(true); setError(""); setFeedback("");
    try {
      const results = await sendDirectInvitationsAction(mode === "friends" ? { roomId, mode, userIds: selected } : { roomId, mode, username: query });
      setPeople((rows) => rows.map((row) => ({ ...row, state: results.find((result) => result.userId === row.userId)?.state ?? row.state })));
      setSelected([]); setFeedback("Invitations sent. People join after accepting."); refreshActivity();
    } catch { setError("Invitations weren't confirmed. Check your selection and access, or wait and retry. Retrying won't duplicate pending invites."); }
    finally { setBusy(false); }
  };
  const changeMode = (next: typeof mode) => { request.current++; setMode(next); setQuery(""); setPeople([]); setSelected([]); setLoading(true); setFeedback(""); };
  return <ModalLayer onClose={() => { if (!busy) onClose(); }}><section className="creation-panel fp2-invite-panel" aria-labelledby="fp2-invite-title">
    <button className="overlay-close" disabled={busy} onClick={onClose} aria-label="Close Invite people"><X size={17} /></button>
    <h2 id="fp2-invite-title">Invite people</h2><p className="fp2-room-name">{name}</p>
    <nav className="fp2-tabs" aria-label="Find people to invite">{(["friends", "username"] as const).map((tab) => <button key={tab} disabled={busy} aria-pressed={mode === tab} onClick={() => changeMode(tab)}>{tab === "friends" ? "Friends" : "Username"}</button>)}</nav>
    <label>{mode === "friends" ? "Find a Friend" : "Exact username"}<input value={query} disabled={busy} autoComplete="off" maxLength={80} placeholder={mode === "friends" ? "Name or username" : "@username"} onChange={(event) => { request.current++; setQuery(event.target.value); setPeople([]); setSelected([]); setLoading(true); }} /></label>
    <div className="fp2-people" aria-busy={loading}>
      {loading ? <p role="status">Finding people…</p> : people.length ? people.map((person) => <label key={person.userId} className={`fp2-person ${person.state}`}>
        <input type="checkbox" checked={selected.includes(person.userId)} disabled={busy || person.state !== "eligible" || !selected.includes(person.userId) && selected.length >= (mode === "username" ? 1 : 10)} onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, person.userId] : ids.filter((id) => id !== person.userId))} />
        <PersonAvatar seed={person.userId} initials={person.displayName.slice(0, 2)} imageUrl={person.avatarUrl} />
        <span><strong>{person.nickname || person.displayName}</strong><small>@{person.username}</small></span><small>{person.state === "member" ? "Already a member" : person.state === "invited" ? "Invited" : ""}</small>
      </label>) : <p>{mode === "friends" ? "No matching Friends. Try an exact username instead." : query.trim() ? "No matching person." : "Enter a complete username."}</p>}
    </div>
    <button className="primary-action" disabled={busy || loading || !selected.length} onClick={() => void send()}>{busy ? "Sending…" : selected.length ? `Invite ${selected.length === 1 ? "person" : `${selected.length} people`}` : "Invite people"}</button>
    {error ? <p role="alert" className="composer-error">{error} <button disabled={busy} onClick={() => setAttempt((value) => value + 1)}>Retry</button></p> : null}
    {feedback ? <p role="status">{feedback}</p> : null}
    <RoomInvitations roomId={roomId} />
  </section></ModalLayer>;
}
