"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { roomDetailsAction, updateRoomAction, withdrawRoomMemberAction } from "@/server/rooms/actions";
import { useToskerIdentity } from "./tosker-identity";
import { ModalLayer } from "./modal-layer";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { RoomInvitations } from "./room-invitations";
import { RoomCategory } from "./room-category";
import { PersonAvatar } from "./identity-avatar";
import { workspaceSnapshot } from "./workspace-snapshot";
import { setConversationPreferenceAction } from "@/server/conversations/preference-actions";

type Details = Awaited<ReturnType<typeof roomDetailsAction>>;
export function RoomDetails({ slug, onClose, onInvite, onAddSubroom }: { slug: string; onClose: () => void; onInvite?: () => void; onAddSubroom?: () => void }) {
  const identity = useToskerIdentity(), router = useRouter();
  const snapshot = useSyncExternalStore(workspaceSnapshot.subscribe, () => workspaceSnapshot.get(identity?.userId), workspaceSnapshot.server);
  const room = identity?.rooms.find((entry) => entry.slug === slug);
  const muted = snapshot.preferences.some((pref) => pref.conversationId === room?.conversationId && pref.muted);
  const [data, setData] = useState<Details | null>(null);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirm, setConfirm] = useState<{ userId: string; name: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    roomDetailsAction(slug).then((result) => { if (active) { setData(result); setName(result.name); setTags(result.tags.join("\n")); setError(""); } })
      .catch(() => { if (active) setError("Room details unavailable. Check your access or try again."); });
    return () => { active = false; };
  }, [slug, attempt]);
  const run = async (operation: () => Promise<void>, message: string) => {
    if (busy) return;
    setBusy(true); setError(""); setFeedback("");
    try {
      await operation();
      window.dispatchEvent(new Event(ACTIVITY_REFRESH));
      setData(await roomDetailsAction(slug));
      setFeedback(message);
    } catch { setError("That change couldn't be completed. Check your connection and permissions, then retry."); }
    finally { setBusy(false); }
  };
  const leaveOrRemove = async () => {
    if (!data || !confirm || !identity || busy) return;
    const target = confirm;
    setBusy(true); setError("");
    try {
      await withdrawRoomMemberAction(data.id, target.userId);
      window.dispatchEvent(new Event(ACTIVITY_REFRESH));
      if (target.userId === identity.userId) { onClose(); router.replace("/app"); router.refresh(); return; }
      setConfirm(null); setData(await roomDetailsAction(slug)); setFeedback("Member removed.");
    } catch { setError("Access couldn't be withdrawn. Nothing is confirmed until the retry succeeds."); }
    finally { setBusy(false); }
  };
  const owner = data?.role === "owner";
  return <ModalLayer onClose={() => { if (!busy) onClose(); }}><section className="creation-panel room-details-panel" role="dialog" aria-modal="true" aria-labelledby="room-details-title">
    <button className="overlay-close" aria-label="Close Room details" disabled={busy} onClick={onClose}><X size={17} /></button>
    <p className="eyebrow">{owner ? "Manage Room" : "Room details"}</p>
    <h2 id="room-details-title">{data?.name ?? "Room details"}</h2>
    {!data ? error ? <button className="quiet-action" onClick={() => setAttempt((value) => value + 1)}>Retry</button> : <p role="status">Loading Room…</p> : confirm ? <div className="room-confirmation">
      <h3>{confirm.userId === identity?.userId ? "Leave this Room?" : `Remove ${confirm.name}?`}</h3>
      <p>Access to this Room and its Subrooms will end. Existing messages and notes stay. Rejoining requires a valid invitation.</p>
      <div className="overlay-actions"><button disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button className="danger" disabled={busy} onClick={() => void leaveOrRemove()}>{busy ? "Withdrawing access…" : confirm.userId === identity?.userId ? "Leave Room" : "Remove member"}</button></div>
    </div> : <>
      {owner ? <form onSubmit={(event) => { event.preventDefault(); void run(() => updateRoomAction({ roomId: data.id, name, tags: tags.split("\n").map((tag) => tag.trim()).filter(Boolean) }), "Room saved."); }}>
        <label>Room name<input value={name} maxLength={80} disabled={busy} onChange={(event) => setName(event.target.value)} /></label>
        <label>Tags<textarea value={tags} disabled={busy} onChange={(event) => setTags(event.target.value)} aria-describedby="room-tags-help" maxLength={140} rows={3} /></label>
        <small id="room-tags-help">One per line. Up to five tags, 24 characters each.</small>
        <button className="primary-action" disabled={busy || !name.trim()} type="submit">Save Room</button>
      </form> : data.tags.length ? <div className="room-detail-tags">{data.tags.map((tag) => <RoomCategory key={tag} value={tag} />)}</div> : null}
      <h3>People · {data.members.length}</h3>
      <ul className="room-member-list">{data.members.map((member) => <li key={member.userId}><PersonAvatar seed={member.userId} initials={member.name.slice(0, 2)} /><span><strong>{member.name}</strong><small>{member.role === "owner" ? "Owner" : "Member"}{member.userId === identity?.userId ? " · You" : ""}</small></span>{owner && member.role !== "owner" ? <button className="danger" disabled={busy} onClick={() => setConfirm({ userId: member.userId, name: member.name })} aria-label={`Remove ${member.name}`}>Remove</button> : null}</li>)}</ul>
      {!owner ? <button className="danger" disabled={busy} onClick={() => identity && setConfirm({ userId: identity.userId, name: identity.displayName })}>Leave Room</button> : null}
      {onInvite ? <button className="quiet-action" disabled={busy} onClick={onInvite}>Add people</button> : null}
      <RoomInvitations roomId={data.id} />
      <h3>Structure</h3>
      <nav className="room-structure" aria-label="Room structure"><Link href={`/room/${slug}`} onClick={onClose}>Room Chat</Link>{room?.subrooms.map((child) => <Link key={child.id} href={`/room/${slug}/subroom/${child.id}`} onClick={onClose}>{child.name}</Link>)}</nav>
      {owner && onAddSubroom ? <button className="quiet-action" disabled={busy} onClick={onAddSubroom}>Add Subroom</button> : null}
      {room?.conversationId ? <><h3>My Room preferences</h3><button className="quiet-action" aria-pressed={muted} disabled={busy} onClick={() => void run(() => setConversationPreferenceAction(room.conversationId, { kind: "mute", muted: !muted }), muted ? "Room unmuted." : "Room muted.")}>{muted ? "Unmute Room" : "Mute Room"}</button><p className="room-management-note">Only for you. Quiets this Room and its Subrooms; messages and unread stay. Direct mentions still notify. Subrooms you muted separately stay muted when you unmute the Room.</p></> : null}
    </>}
    {error ? <p className="composer-error" role="alert">{error}</p> : null}
    {feedback ? <p role="status">{feedback}</p> : null}
  </section></ModalLayer>;
}
