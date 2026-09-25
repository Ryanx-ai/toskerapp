"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, MessageCircle, Pencil, UsersRound, Settings, Check, UserPlus } from "lucide-react";
import { acceptConnectionAction, requestConnectionAction } from "@/server/connections/actions";
import { getNamecardAction } from "@/server/profiles/namecard-actions";
import type { Namecard } from "@/server/profiles/namecard";
import { startPersonalConversationAction } from "@/server/conversations/actions";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { NamecardContext } from "./namecard-context";
import { ModalLayer } from "./modal-layer";
import { PersonAvatar } from "./identity-avatar";
import { NicknameDialog } from "./nickname-editor";
import { PersonalChatSettings } from "./personal-chat-settings";
import { CopyTid } from "./copy-tid";
import { RevealName } from "./reveal-name";
import { useToskerIdentity } from "./tosker-identity";
import { OwnProfileEditor } from "./own-profile-editor";
import { RoomIdentityEditor } from "./room-identity-editor";

const statusNames = { online: "Online", idle: "Idle", away: "Away", meeting: "In a meeting" };

export function NamecardProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [target, setTarget] = useState<{userId:string;roomId?:string} | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const open = useCallback((userId: string, roomId?: string) => { if (!target) trigger.current = document.activeElement as HTMLElement | null; setTarget({userId,roomId}); }, [target]);
  const close = () => { setTarget(null); requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }); }); };
  return <NamecardContext.Provider value={enabled ? open : null}>{children}{enabled && target ? <NamecardDialog key={`${target.userId}:${target.roomId ?? "global"}`} userId={target.userId} roomId={target.roomId} onClose={close} /> : null}</NamecardContext.Provider>;
}

function NamecardDialog({ userId, roomId, onClose }: { userId: string; roomId?: string; onClose: () => void }) {
  const id = useId(), router = useRouter();
  const identity = useToskerIdentity();
  const [editing, setEditing] = useState<"global" | "room" | null>(null);
  const [person, setPerson] = useState<Namecard | null>(null);
  const [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false), [nickname, setNickname] = useState(false), [settings, setSettings] = useState(false);
  const [privateExpanded, setPrivateExpanded] = useState(false);
  const returnFocus = useRef<string | null>(null);
  useEffect(() => {
    if (editing || nickname || settings || !returnFocus.current) return;
    const selector = returnFocus.current;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true });
      returnFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [editing, nickname, settings]);
  const revision = useRef(0);
  const refresh = useCallback(async () => { const version = ++revision.current; const next = await getNamecardAction(userId,roomId); if (version === revision.current) setPerson(next); return next; }, [userId,roomId]);
  useEffect(() => {
    let active = true, pending = false;
    const read = async () => {
      if (pending || document.hidden) return;
      pending = true;
      const version = revision.current;
      try { const next = await getNamecardAction(userId,roomId); if (active && version === revision.current) { setPerson(next); setError(""); } }
      catch { if (active && version === revision.current) { setPerson(null); setError("Namecard unavailable. Check your connection or access and try again."); } }
      finally { pending = false; }
    };
    void read();
    // Only while deliberately open. Foreground/activity refresh rechecks current access.
    const timer = window.setInterval(() => void read(), 12_000);
    window.addEventListener(ACTIVITY_REFRESH, read); document.addEventListener("visibilitychange", read);
    return () => { active = false; clearInterval(timer); window.removeEventListener(ACTIVITY_REFRESH, read); document.removeEventListener("visibilitychange", read); };
  }, [userId, roomId, attempt]);
  const name = (person?.roomContext ? person.roomNickname || person.displayName : person?.nickname || person?.displayName) || "Namecard";
  const closeEditor = () => {
    const selector = editing === "room" ? ".namecard-edit-room" : ".namecard-edit-profile";
    returnFocus.current = selector;
    setEditing(null);
    void refresh().catch(() => { setPerson(null); setError("Namecard unavailable. Try again."); });
  };
  if (editing === "global" && person?.self && identity) return <OwnProfileEditor identity={identity} onClose={closeEditor} />;
  if (editing === "room" && person?.self && roomId) return <RoomIdentityEditor roomId={roomId} onClose={closeEditor} />;
  if (settings && person?.conversationId && !person.self) return <PersonalChatSettings conversation={{ databaseId: person.conversationId, slug: `chat-${person.conversationId}`, identitySeed: person.userId, avatarUrl: person.avatarUrl, kind: "personal", name: person.nickname || person.displayName, initials: person.displayName.slice(0, 2), color: "pink", context: `@${person.username}`, preview: "", time: "", messages: [] }} onClose={() => setSettings(false)} />;
  if (nickname && person?.connectionId) return <NicknameDialog target={{ id: person.connectionId, name: person.displayName, nickname: person.nickname }} onSaved={refresh} onClose={() => {
    returnFocus.current = ".namecard-actions .namecard-nickname";
    setNickname(false);
  }} />;
  return <ModalLayer onClose={() => { if (!busy) onClose(); }}><section className={`identity-dialog contextual-namecard identity-accent-${person?.identityAccent ?? "neutral"}`} data-identity-banner={person?.identityBanner ?? "glow"} data-identity-frame={person?.identityFrame ?? "none"} aria-labelledby={`${id}-title`}>
    <div className="namecard-banner" aria-hidden="true" />
    <button className="overlay-close" aria-label="Close Namecard" disabled={busy} onClick={onClose}><X size={18} /></button>
    {person ? <>
      <div className="namecard-content">
      <PersonAvatar seed={person.userId} initials={person.displayName.slice(0, 2)} imageUrl={person.avatarUrl} className="avatar-large" />
      <h2 id={`${id}-title`}><RevealName focusable>{name}</RevealName></h2>
      {name !== person.displayName ? <p className="namecard-canonical">{person.displayName}</p> : null}
      {person.roomContext ? <p className="settings-scope">In {person.roomContext.name}{person.nickname ? <> · You call them {person.nickname}</> : null}</p> : null}
      <p className="namecard-handle identity-username">@{person.username}</p>
      <div className="namecard-identifier"><span className="identity-tid">TID {person.tid}</span><CopyTid tid={person.tid} /></div>
      {person.presenceStatus ? <p className="namecard-status"><i className={`presence-mark ${person.presenceStatus}`} aria-hidden="true" />{statusNames[person.presenceStatus]}</p> : null}
      {person.namecardBio ? <p className="namecard-bio">{person.namecardBio}</p> : null}
        {!person.self ? <div className="namecard-actions"><button className="primary-action" disabled={busy} onClick={async () => {
          setBusy(true); setError("");
          try { await refresh(); const chat = await startPersonalConversationAction(userId); onClose(); router.push(`/personal/${chat.slug}`); router.refresh(); }
          catch { setError("Couldn't open this Chat. Try again."); }
          finally { setBusy(false); }
        }}><MessageCircle size={16} aria-hidden="true" />{busy ? "Opening…" : "Message"}</button>
          {person.connectionId ? <span className="namecard-relationship"><Check size={15} aria-hidden="true" />Friends</span> : person.relationship?.status === "pending" && !person.relationship.incoming ? <span className="namecard-relationship">Request sent</span> : <button className="quiet-action" disabled={busy} onClick={async () => {
            setBusy(true); setError("");
            try { if (person.relationship?.incoming) await acceptConnectionAction(person.relationship.id); else await requestConnectionAction(userId); await refresh(); }
            catch { setError("Couldn't update this friendship. Try again."); }
            finally { setBusy(false); }
          }}><UserPlus size={16} aria-hidden="true" />{person.relationship?.incoming ? "Accept request" : "Add Friend"}</button>}
          </div> : <div className="namecard-actions">
          {identity ? <button className="primary-action namecard-edit-profile" onClick={() => setEditing("global")}><Pencil size={16} aria-hidden="true" />Edit Profile</button> : null}
          {roomId ? <button className="quiet-action namecard-edit-room" onClick={() => setEditing("room")}>Your Room identity</button> : null}
          <Link className="quiet-action" href="/friends" onClick={onClose}><UsersRound size={16} aria-hidden="true" />Friends</Link>
          <Link className="quiet-action" href="/settings" onClick={onClose}><Settings size={16} aria-hidden="true" />Settings</Link>
        </div>}
        {!person.self && (person.connectionId || person.conversationId) ? <details className="namecard-private" open={privateExpanded} onToggle={event => setPrivateExpanded(event.currentTarget.open)}><summary>Just for you</summary><p>Your preferences, never their identity.</p><div className="namecard-actions">{person.connectionId ? <button className="quiet-action namecard-nickname" disabled={busy} onClick={() => setNickname(true)}>Private nickname</button> : null}{person.conversationId ? <button className="quiet-action" disabled={busy} onClick={() => setSettings(true)}>Chat Settings</button> : null}</div></details> : null}
        {!person.self ? <section className="namecard-common"><h3>Common Rooms</h3>{person.commonRooms.length ? <ul>{person.commonRooms.map((room) => <li key={room.id}><Link href={`/room/${room.slug}`} onClick={onClose}>{room.name}</Link></li>)}</ul> : <p>No shared Rooms.</p>}{person.moreCommonRooms ? <small>Showing the first 20 shared Rooms.</small> : null}</section> : null}
      </div>
    </> : <><h2 id={`${id}-title`}>Namecard</h2>{!error ? <p role="status">Loading identity…</p> : null}</>}
    {error ? <p role="alert">{error} <button className="quiet-action" disabled={busy} onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Retry</button></p> : null}
  </section></ModalLayer>;
}
