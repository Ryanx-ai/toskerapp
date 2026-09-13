"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { removeConnectionNicknameAction, setConnectionNicknameAction } from "@/server/connections/actions";
import { ModalLayer } from "./modal-layer";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";

type Target = { id: string; name: string; nickname: string | null };
export function PrivateNicknameForm({ target, onSaved, onBusy }: { target: Target; onSaved?: () => Promise<unknown>; onBusy?: (busy: boolean) => void }) {
  const [value, setValue] = useState(target.nickname ?? ""), [saved, setSaved] = useState(target.nickname ?? "");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [feedback, setFeedback] = useState("");
  return <form className="scoped-settings-form" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); onBusy?.(true); setError(""); setFeedback("");
    try { if (value.trim()) await setConnectionNicknameAction({ connectionId: target.id, nickname: value }); else await removeConnectionNicknameAction(target.id); setSaved(value.trim()); setFeedback("Nickname saved."); window.dispatchEvent(new Event(ACTIVITY_REFRESH)); await onSaved?.(); }
    catch { setError("Couldn't save that nickname. Check your connection and try again."); }
    finally { setBusy(false); onBusy?.(false); }
  }}><label>Private nickname<input value={value} maxLength={60} disabled={busy} onChange={(event) => setValue(event.target.value)} placeholder={target.name} /></label><small>Only you see this name. Leave blank to use their display name.</small><button className="primary-action" disabled={busy || value.trim() === saved}>{busy ? "Saving…" : "Save nickname"}</button>{error ? <p role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}</form>;
}
export function NicknameDialog({ target, onClose, onSaved }: { target: Target; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return <ModalLayer onClose={() => { if (!busy) onClose(); }}><section className="identity-dialog nickname-dialog" aria-labelledby="nickname-title"><button className="overlay-close" disabled={busy} onClick={onClose} aria-label="Close"><X size={17} /></button><p className="eyebrow">Private nickname</p><h2 id="nickname-title">{target.name}</h2><PrivateNicknameForm target={target} onBusy={setBusy} onSaved={async () => { await onSaved(); onClose(); }} /><button className="quiet-action" disabled={busy} onClick={onClose}>Cancel</button></section></ModalLayer>;
}
