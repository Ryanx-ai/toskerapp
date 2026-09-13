"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { roomDetailsAction, updateRoomAction, withdrawRoomMemberAction } from "@/server/rooms/actions";
import { useToskerIdentity } from "./tosker-identity";
import { SettingsShell, SettingsSection, SettingsDangerSection } from "./settings-shell";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { RoomInvitations } from "./room-invitations";
import { SubroomOrderRow } from "./subroom-order-row";
import { RoomCategory } from "./room-category";
import { PersonAvatar, RoomAvatar } from "./identity-avatar";
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
  return <SettingsShell title="Room Settings" context={data?.name ?? room?.name ?? "Room"} identity={<RoomAvatar name={data?.name ?? room?.name ?? "Room"} seed={slug} />} onClose={onClose} busy={busy} sections={data ? [
    { id: "overview", label: "Overview", content: <SettingsSection title="Room identity" description={owner ? "Shared with everyone in this Room. You’re the owner." : "Shared Room information. The owner manages these details."}>
      {owner ? <form className="scoped-settings-form" onSubmit={(event) => { event.preventDefault(); void run(() => updateRoomAction({ roomId: data.id, name, tags: tags.split("\n").map((tag) => tag.trim()).filter(Boolean) }), "Room saved."); }}>
        <label>Room name<input value={name} maxLength={80} disabled={busy} onChange={(event) => setName(event.target.value)} /></label>
        <label>Tags<textarea value={tags} disabled={busy} onChange={(event) => setTags(event.target.value)} aria-describedby="room-tags-help" maxLength={140} rows={3} /></label>
        <small id="room-tags-help">One per line. Up to five tags, 24 characters each.</small>
        <button className="primary-action" disabled={busy || !name.trim()} type="submit">Save Room</button>
      </form> : <><p className="settings-value">{data.name}</p><div className="room-detail-tags">{data.tags.map((tag) => <RoomCategory key={tag} value={tag} />)}</div></>}
    </SettingsSection> },
    { id: "people", label: "People", content: <SettingsSection title={`People · ${data.members.length}`} description="People with access to this Room.">
      <ul className="room-member-list">{data.members.map((member) => <li key={member.userId}><PersonAvatar seed={member.userId} initials={member.name.slice(0, 2)} /><span><strong>{member.name}</strong><small>{member.role === "owner" ? "Owner" : "Member"}{member.userId === identity?.userId ? " · You" : ""}</small></span>{owner && member.role !== "owner" ? <button className="danger" disabled={busy} onClick={() => setConfirm({ userId: member.userId, name: member.name })} aria-label={`Remove ${member.name}`}>Remove</button> : null}</li>)}</ul>
      {onInvite ? <button className="quiet-action" disabled={busy} onClick={onInvite}>Add people</button> : null}
      <RoomInvitations roomId={data.id} />
    </SettingsSection> },
    { id: "structure", label: "Structure", content: <SettingsSection title="Room and Subrooms" description={owner ? "Shared structure. Changes to order apply to everyone." : "The spaces you can access in this Room."}>
      <nav className="room-structure" aria-label="Room structure"><Link href={`/room/${slug}`} onClick={onClose}>Room Chat</Link>{room?.subrooms.map((child) => <SubroomOrderRow key={child.id} roomId={data.id} ids={room.subrooms.map((item) => item.id)} id={child.id} name={child.name} owner={Boolean(owner)}><Link href={`/room/${slug}/subroom/${child.id}`} onClick={onClose}>{child.name}</Link></SubroomOrderRow>)}</nav>
      {owner && onAddSubroom ? <button className="quiet-action" disabled={busy} onClick={onAddSubroom}>Add Subroom</button> : null}
    </SettingsSection> },
    ...(room?.conversationId ? [{ id: "preferences", label: "My preferences", content: <SettingsSection title="My Room preferences" description="Only for you. Shared Room settings stay unchanged.">
      <button className="quiet-action settings-toggle" aria-pressed={muted} disabled={busy} onClick={() => void run(() => setConversationPreferenceAction(room.conversationId, { kind: "mute", muted: !muted }), muted ? "Room unmuted." : "Room muted.")}>{muted ? "Unmute Room" : "Mute Room"}</button><p className="settings-scope">Quiets this Room and its Subrooms; messages and unread stay. Direct mentions still notify. Separately muted Subrooms stay muted when you unmute the Room.</p>
    </SettingsSection> }] : []),
  ] : [{ id: "overview", label: "Overview", content: error ? <button className="quiet-action" onClick={() => setAttempt((value) => value + 1)}>Retry</button> : <p role="status">Loading Room…</p> }]} footer={<>
    {error ? <p className="composer-error" role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}
    {data && !owner && !confirm ? <SettingsDangerSection><p>Leave for yourself. The Room and its history remain.</p><button className="danger" disabled={busy} onClick={() => identity && setConfirm({ userId: identity.userId, name: identity.displayName })}>Leave Room</button></SettingsDangerSection> : null}
  </>}>
    {confirm ? <div className="room-confirmation"><h3>{confirm.userId === identity?.userId ? "Leave this Room?" : `Remove ${confirm.name}?`}</h3><p>Access to this Room and its Subrooms will end. Existing messages and notes stay. Rejoining requires a valid invitation.</p><div className="overlay-actions"><button autoFocus disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button className="danger" disabled={busy} onClick={() => void leaveOrRemove()}>{busy ? "Withdrawing access…" : confirm.userId === identity?.userId ? "Leave Room" : "Remove member"}</button></div></div> : null}
  </SettingsShell>;
}
