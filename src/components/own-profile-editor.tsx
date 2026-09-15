"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOwnProfileAction } from "@/server/profiles/owner-actions";
import type { OwnProfileChange } from "@/server/profiles/owner-profile";
import type { CanonicalIdentity } from "@/server/accounts/bootstrap";
import { SettingsSection, SettingsShell } from "./settings-shell";

export function OwnProfileEditor({ identity, onClose }: { identity: CanonicalIdentity; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(identity.displayName), [status, setStatus] = useState(identity.presenceStatus);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const changed = name.trim() !== identity.displayName || status !== identity.presenceStatus;
  return <SettingsShell title="Edit Profile" context="Your global identity" onClose={onClose} busy={busy} dirty={changed} onDiscard={() => { setName(identity.displayName); setStatus(identity.presenceStatus); setError(""); }} sections={[
    { id: "identity", label: "Identity", content: <SettingsSection title="Display name" description="Your name across Tosker. Private nicknames other people use for you stay theirs.">
      <label className="owner-profile-field">Global display name<input value={name} maxLength={80} disabled={busy} onChange={event => setName(event.target.value)} autoComplete="nickname" /></label>
      <dl className="owner-profile-identifiers"><div><dt>Username</dt><dd>@{identity.username}</dd></div><div><dt>TID</dt><dd>{identity.tid}</dd></div></dl>
      <p className="settings-scope">Username and TID cannot be changed here. Avatar uploads and a shared bio are not available in this slice.</p>
    </SettingsSection> },
    { id: "status", label: "Status", content: <SettingsSection title="Availability" description="A manual status, not live activity tracking."><label className="owner-profile-field">Your status<select value={status} disabled={busy} onChange={event => setStatus(event.target.value as CanonicalIdentity["presenceStatus"])}><option value="online">Online</option><option value="idle">Idle</option><option value="away">Away</option><option value="meeting">In a meeting</option></select></label></SettingsSection> },
  ]} footer={(requestClose) => <div className="owner-profile-save">{error ? <p role="alert">{error}</p> : null}<div className="overlay-actions"><button disabled={busy} onClick={requestClose}>Cancel</button><button className="primary-action" disabled={busy || !changed || !name.trim()} onClick={async () => {
    setBusy(true); setError("");
    const change: OwnProfileChange = {};
    if (name.trim() !== identity.displayName) change.displayName = name;
    if (status !== identity.presenceStatus) change.presenceStatus = status;
    try { await updateOwnProfileAction(change); router.refresh(); onClose(); }
    catch { setError("Profile wasn't saved. Check your connection and try again; your changes are still here."); }
    finally { setBusy(false); }
  }}>{busy ? "Saving…" : "Save Profile"}</button></div></div>} />;
}
