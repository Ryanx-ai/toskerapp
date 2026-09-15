"use client";
import { useEffect, useId, useState } from "react";
import { removeConnectionNicknameAction, setConnectionNicknameAction } from "@/server/connections/actions";
import { SettingsShell, SettingsSection } from "./settings-shell";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";

type Target = { id: string; name: string; nickname: string | null };
export function PrivateNicknameForm({ target, onSaved, onBusy, onDirty, formId }: { target: Target; onSaved?: () => Promise<unknown>; onBusy?: (busy: boolean) => void; onDirty?: (dirty: boolean) => void; formId?: string }) {
  const [value, setValue] = useState(target.nickname ?? ""), [saved, setSaved] = useState(target.nickname ?? "");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [feedback, setFeedback] = useState("");
  useEffect(() => { onDirty?.(value.trim() !== saved); }, [value, saved, onDirty]);
  return <form id={formId} className="scoped-settings-form" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); onBusy?.(true); setError(""); setFeedback("");
    let persisted = false;
    try { if (value.trim()) await setConnectionNicknameAction({ connectionId: target.id, nickname: value }); else await removeConnectionNicknameAction(target.id); persisted = true; setSaved(value.trim()); window.dispatchEvent(new Event(ACTIVITY_REFRESH)); await onSaved?.(); setFeedback("Nickname saved."); }
    catch { setError(persisted ? "Nickname saved. Reopen to refresh." : "Couldn't save that nickname. Check your connection and try again."); }
    finally { setBusy(false); onBusy?.(false); }
  }}><label>Private nickname<input value={value} maxLength={60} disabled={busy} onChange={(event) => setValue(event.target.value)} placeholder={target.name} /></label><small>Only you can see this. Leave blank to use their display name.</small>{!formId ? <button className="primary-action" disabled={busy || value.trim() === saved}>{busy ? "Saving…" : "Save nickname"}</button> : null}{error ? <p role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}</form>;
}
export function NicknameDialog({ target, onClose, onSaved }: { target: Target; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const formId = useId();
  return <SettingsShell title="Private nickname" context={target.name} onClose={onClose} busy={busy} dirty={dirty} sections={[
    { id: "nickname", label: "Nickname", content: <SettingsSection title="Just for you"><PrivateNicknameForm formId={formId} target={target} onBusy={setBusy} onDirty={setDirty} onSaved={async () => { await onSaved(); onClose(); }} /></SettingsSection> },
  ]} footer={(requestClose) => <div className="overlay-actions"><button className="quiet-action" disabled={busy} onClick={requestClose}>Cancel</button><button className="primary-action" form={formId} type="submit" disabled={busy || !dirty}>{busy ? "Saving…" : "Save nickname"}</button></div>} />;
}
