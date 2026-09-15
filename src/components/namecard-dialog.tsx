"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { getNamecardAction } from "@/server/profiles/namecard-actions";
import type { Namecard } from "@/server/profiles/namecard";
import { startPersonalConversationAction } from "@/server/conversations/actions";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { NamecardContext } from "./namecard-context";
import { ModalLayer } from "./modal-layer";
import { PersonAvatar } from "./identity-avatar";
import { NicknameDialog } from "./nickname-editor";
import { PersonalChatSettings } from "./personal-chat-settings";

const statusNames = { online: "Online", idle: "Idle", away: "Away", meeting: "In a meeting" };

export function NamecardProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [target, setTarget] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const open = useCallback((userId: string) => { if (!target) trigger.current = document.activeElement as HTMLElement | null; setTarget(userId); }, [target]);
  const close = () => { setTarget(null); requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }); }); };
  return <NamecardContext.Provider value={enabled ? open : null}>{children}{enabled && target ? <NamecardDialog key={target} userId={target} onClose={close} /> : null}</NamecardContext.Provider>;
}

function NamecardDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const id = useId(), router = useRouter();
  const [person, setPerson] = useState<Namecard | null>(null);
  const [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false), [nickname, setNickname] = useState(false), [settings, setSettings] = useState(false);
  const revision = useRef(0);
  const refresh = useCallback(async () => { const version = ++revision.current; const next = await getNamecardAction(userId); if (version === revision.current) setPerson(next); return next; }, [userId]);
  useEffect(() => {
    let active = true, pending = false;
    const read = async () => {
      if (pending || document.hidden) return;
      pending = true;
      const version = revision.current;
      try { const next = await getNamecardAction(userId); if (active && version === revision.current) { setPerson(next); setError(""); } }
      catch { if (active && version === revision.current) { setPerson(null); setError("Namecard unavailable. Check your connection or access and try again."); } }
      finally { pending = false; }
    };
    void read();
    // Only while deliberately open. Foreground/activity refresh rechecks current access.
    const timer = window.setInterval(() => void read(), 12_000);
    window.addEventListener(ACTIVITY_REFRESH, read); document.addEventListener("visibilitychange", read);
    return () => { active = false; clearInterval(timer); window.removeEventListener(ACTIVITY_REFRESH, read); document.removeEventListener("visibilitychange", read); };
  }, [userId, attempt]);
  const name = person?.nickname || person?.displayName || "Namecard";
  if (settings && person?.conversationId && !person.self) return <PersonalChatSettings conversation={{ databaseId: person.conversationId, slug: `chat-${person.conversationId}`, identitySeed: person.userId, avatarUrl: person.avatarUrl, kind: "personal", name, initials: person.displayName.slice(0, 2), color: "pink", context: `@${person.username}`, preview: "", time: "", messages: [] }} onClose={() => setSettings(false)} />;
  if (nickname && person?.connectionId) return <NicknameDialog target={{ id: person.connectionId, name: person.displayName, nickname: person.nickname }} onSaved={refresh} onClose={() => {
    setNickname(false);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".namecard-actions .namecard-nickname")?.focus());
  }} />;
  return <ModalLayer onClose={() => { if (!busy) onClose(); }}><section className="identity-dialog contextual-namecard" aria-labelledby={`${id}-title`}>
    <button className="overlay-close" aria-label="Close Namecard" disabled={busy} onClick={onClose}><X size={18} /></button>
    <p className="eyebrow">Namecard{person?.self ? " · You" : ""}</p>
    {person ? <>
      <PersonAvatar seed={person.userId} initials={person.displayName.slice(0, 2)} imageUrl={person.avatarUrl} className="avatar-large" />
      <h2 id={`${id}-title`}>{name}</h2>
      {person.nickname ? <p className="namecard-canonical">{person.displayName}</p> : null}
      <p className="namecard-handle">@{person.username} · {person.tid}</p>
      {person.presenceStatus ? <p className="namecard-status"><i className={`presence-mark ${person.presenceStatus}`} aria-hidden="true" />{statusNames[person.presenceStatus]}</p> : null}
      {person.namecardBio ? <p className="namecard-bio">{person.namecardBio}</p> : null}
        {!person.self ? <div className="namecard-actions"><button className="primary-action" disabled={busy} onClick={async () => {
          setBusy(true); setError("");
          try { await refresh(); const chat = await startPersonalConversationAction(userId); onClose(); router.push(`/personal/${chat.slug}`); router.refresh(); }
          catch { setError("Couldn't open this Chat. Try again."); }
          finally { setBusy(false); }
        }}>{busy ? "Opening…" : "Message"}</button>{person.conversationId ? <button className="quiet-action" disabled={busy} onClick={() => setSettings(true)}>Chat Settings</button> : null}
          {person.connectionId ? <button className="quiet-action namecard-nickname" disabled={busy} onClick={() => setNickname(true)}>Private nickname</button> : null}</div> : <Link className="quiet-action" href="/profile" onClick={onClose}>Your Profile</Link>}
        {!person.self ? <section className="namecard-common"><h3>Common Rooms</h3>{person.commonRooms.length ? <ul>{person.commonRooms.map((room) => <li key={room.id}><Link href={`/room/${room.slug}`} onClick={onClose}>{room.name}</Link></li>)}</ul> : <p>No shared Rooms.</p>}{person.moreCommonRooms ? <small>Showing the first 20 shared Rooms.</small> : null}</section> : null}
    </> : <><h2 id={`${id}-title`}>Namecard</h2>{!error ? <p role="status">Loading identity…</p> : null}</>}
    {error ? <p role="alert">{error} <button className="quiet-action" disabled={busy} onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Retry</button></p> : null}
  </section></ModalLayer>;
}
