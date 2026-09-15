"use client";
import { useEffect, useId, useState } from "react";
import { readOwnRoomIdentityAction, setOwnRoomNicknameAction } from "@/server/rooms/identity-actions";
import { PROFILE_REFRESH } from "@/lib/realtime-contract";
import { SettingsSection, SettingsShell } from "./settings-shell";

type Identity = Awaited<ReturnType<typeof readOwnRoomIdentityAction>>;
export function RoomIdentityEditor({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const formId = useId();
  const [base, setBase] = useState<Identity | null>(null), [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [conflict, setConflict] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    readOwnRoomIdentityAction(roomId).then(saved => { if (active) { setBase(saved); setNickname(saved.nickname ?? ""); setError(""); setConflict(false); } })
      .catch(() => { if (active) setError("Room identity unavailable. Check your access or try again."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [roomId, attempt]);
  const dirty = Boolean(base && nickname !== (base.nickname ?? ""));
  return <SettingsShell title="Your Room identity" context={base?.roomName ?? "Room"} onClose={onClose} busy={busy} dirty={dirty} onDiscard={() => setNickname(base?.nickname ?? "")} sections={[
    { id: "identity", label: "Room name", content: <SettingsSection title="Your name here" description="Shared in this Room and its Subrooms. Your global name and Personal Chats stay unchanged.">
      {base ? <form id={formId} onSubmit={async event => {
        event.preventDefault(); if (busy || !dirty) return;
        setBusy(true); setError("");
        try {
          const result = await setOwnRoomNicknameAction(roomId, nickname, base.revision);
          if (!result.ok) { setConflict(true); setError("Your Room identity changed elsewhere. Your draft is still here."); return; }
          window.dispatchEvent(new Event(PROFILE_REFRESH)); onClose();
        } catch { setError("Name wasn't saved. Check your connection and Room access; your draft is still here."); }
        finally { setBusy(false); }
      }}><label className="owner-profile-field">Room nickname<input autoComplete="off" value={nickname} maxLength={60} disabled={busy} onChange={event => setNickname(event.target.value)} placeholder={base.globalName} /></label><p className="settings-scope">Leave blank to use {base.globalName}. The owner can reset a nickname, but can’t choose one for you.</p></form> : !error ? <p role="status">Loading identity…</p> : <button className="quiet-action" onClick={() => setAttempt(value => value + 1)}>Retry</button>}
    </SettingsSection> },
  ]} footer={requestClose => <>
    {error ? <p role="alert" className="composer-error">{error}</p> : null}
    {conflict ? <button className="quiet-action" disabled={busy} onClick={() => { setBusy(true); setAttempt(value => value + 1); }}>Discard draft and reload Room identity</button> : null}
    <div className="overlay-actions"><button disabled={busy} onClick={requestClose}>Cancel</button><button className="primary-action" form={formId} type="submit" disabled={busy || !dirty}>{busy ? "Saving…" : "Save Room nickname"}</button></div>
  </>} />;
}
