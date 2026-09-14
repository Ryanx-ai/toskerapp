"use client";
import { useState } from "react";
import { ModalLayer } from "./modal-layer";

/** Shared canonical-message editor. Callers supply the same author-checked mutation. */
export function EditMessageDialog({ body, onSave, onClose }: { body: string; onSave: (body: string) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState(body), [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <ModalLayer onClose={() => { if (!busy) onClose(); }}><section className="creation-panel message-edit-panel" aria-label="Edit message">
    <h2>Edit message</h2><textarea autoFocus aria-label="Edit message text" maxLength={8000} rows={4} value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)} />
    <div className="overlay-actions"><button disabled={busy} onClick={onClose}>Cancel</button><button className="primary-action" disabled={busy || !draft.trim()} onClick={async () => {
      setBusy(true); setError("");
      try { await onSave(draft); onClose(); } catch { setError("That change couldn't be completed. Your draft is still here. Try again."); } finally { setBusy(false); }
    }}>{busy ? "Saving…" : "Save"}</button></div>{error ? <p role="alert">{error}</p> : null}
  </section></ModalLayer>;
}
