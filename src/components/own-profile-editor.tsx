"use client";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { readOwnProfileAction, updateOwnProfileAction } from "@/server/profiles/owner-actions";
import type { OwnProfileChange } from "@/server/profiles/owner-profile";
import type { CanonicalIdentity } from "@/server/accounts/bootstrap";
import { PROFILE_AUDIENCES, audienceLabels, normalizeProfileText, type ProfileAudience } from "@/lib/profile-contract";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { SettingsSection, SettingsShell } from "./settings-shell";

const editable = ["displayName", "presenceStatus", "namecardBio", "detailsAudience", "statusAudience", "identityAccent"] as const;
export function OwnProfileEditor({ identity, onClose }: { identity: CanonicalIdentity; onClose: () => void }) {
  const router = useRouter(), formId = useId();
  // A deliberate edit snapshot: background revalidation must not replace a draft.
  const [base, setBase] = useState(identity.ownProfile), [draft, setDraft] = useState(identity.ownProfile);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [conflict, setConflict] = useState(false);
  const changed = editable.some(key => (draft[key] ?? "") !== (base[key] ?? ""));
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !changed) return;
    setBusy(true); setError(""); setConflict(false);
    try {
      const normalized = { ...draft, displayName: normalizeProfileText(draft.displayName,80,true), namecardBio: normalizeProfileText(draft.namecardBio ?? "",160) };
      const changes = Object.fromEntries(editable.filter(key => (normalized[key] ?? "") !== (base[key] ?? "")).map(key => [key,normalized[key]])) as OwnProfileChange;
      if (!Object.keys(changes).length) { setDraft(base); return; }
      const result = await updateOwnProfileAction(changes,base.revision);
      if (!result.ok) { setConflict(true); setError("Your profile changed elsewhere. Your draft is still here."); return; }
      window.dispatchEvent(new Event(ACTIVITY_REFRESH)); router.refresh(); onClose();
    } catch { setError("Profile wasn't saved. Use valid text and check your connection; your draft is still here."); }
    finally { setBusy(false); }
  };
  const section = (title: string, description: string, children: ReactNode) => <form id={formId} onSubmit={save}><SettingsSection title={title} description={description}>{children}</SettingsSection></form>;
  const audience = (field: "detailsAudience" | "statusAudience", label: string) => <label className="owner-profile-field">{label}<select value={draft[field]} disabled={busy} onChange={event => setDraft({...draft,[field]:event.target.value as ProfileAudience})}>{PROFILE_AUDIENCES.map(value => <option key={value} value={value}>{audienceLabels[value]}</option>)}</select></label>;
  return <SettingsShell title="Edit Profile" context="Your global identity" onClose={onClose} busy={busy} dirty={changed} onDiscard={() => { setDraft(base); setError(""); setConflict(false); }} sections={[
    { id:"identity",label:"Identity",content:section("Profile","Your global name. Other people's private nicknames for you stay theirs.",<>
      <label className="owner-profile-field">Global display name<input name="displayName" value={draft.displayName} maxLength={80} required disabled={busy} onChange={event => setDraft({...draft,displayName:event.target.value})} autoComplete="nickname" /></label>
      <label className="owner-profile-field">Bio <span className="settings-scope">Optional · {audienceLabels[draft.detailsAudience]}</span><input name="namecardBio" value={draft.namecardBio ?? ""} maxLength={160} disabled={busy} onChange={event => setDraft({...draft,namecardBio:event.target.value})} /></label>
      <dl className="owner-profile-identifiers"><div><dt>Username</dt><dd>@{identity.username}</dd></div><div><dt>TID</dt><dd>{identity.tid}</dd></div></dl>
      <p className="settings-scope">Username and TID stay fixed. Avatar uploads aren’t connected.</p>
    </>) },
    { id:"status",label:"Status",content:section("Availability","A manual status, not live activity tracking.",<><label className="owner-profile-field">Your status<select value={draft.presenceStatus} disabled={busy} onChange={event => setDraft({...draft,presenceStatus:event.target.value as CanonicalIdentity["presenceStatus"]})}><option value="online">Online</option><option value="idle">Idle</option><option value="away">Away</option><option value="meeting">In a meeting</option></select></label><p className="settings-scope">Visible to: {audienceLabels[draft.statusAudience]}.</p></>) },
    { id:"privacy",label:"Privacy",content:section("Profile visibility","Your name and identifiers still appear where people can already find or talk with you.",<>
      {audience("detailsAudience","Bio and identity accent")}
      {audience("statusAudience","Manual status")}
      <p className="settings-scope">Room members means people currently sharing a Room with you. A Personal Chat alone doesn’t share these details.</p>
    </>) },
  ]} footer={requestClose => <div className="owner-profile-save">{error ? <p role="alert">{error}</p> : null}
    {conflict ? <button className="quiet-action" disabled={busy} onClick={async () => {
      setBusy(true);
      try { const saved=await readOwnProfileAction(); setBase(saved); setDraft(saved); setConflict(false); setError(""); }
      catch { setError("Saved profile unavailable. Your draft is still here; try again."); }
      finally { setBusy(false); }
    }}>Discard draft and reload saved profile</button> : null}
    <div className="overlay-actions"><button disabled={busy} onClick={requestClose}>Cancel</button><button className="primary-action" form={formId} type="submit" disabled={busy || !changed || !draft.displayName.trim()}>{busy ? "Saving…" : "Save Profile"}</button></div>
  </div>} />;
}
