"use client";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readOwnProfileAction, updateOwnProfileAction } from "@/server/profiles/owner-actions";
import type { OwnProfileChange } from "@/server/profiles/owner-profile";
import type { CanonicalIdentity } from "@/server/accounts/bootstrap";
import { PROFILE_AUDIENCES, IDENTITY_ACCENTS, audienceLabels, normalizeProfileText, type ProfileAudience } from "@/lib/profile-contract";
import { BANNER_PREFERENCES, type BannerPreference } from "@/lib/banner-preference";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { SettingsSection, SettingsShell } from "./settings-shell";
import { AccountSecurity } from "./account-security";
import { IdentityCard } from "./identity-card";
import { CopyTid } from "./copy-tid";

const editable = ["displayName", "presenceStatus", "namecardBio", "detailsAudience", "statusAudience", "identityAccent", "bannerPreference"] as const;
export function OwnProfileEditor({ identity, onClose, accountMode = false, selectedSection, onSectionChange }: { identity: CanonicalIdentity; onClose: () => void; accountMode?: boolean; selectedSection?: string; onSectionChange?: (id: string) => void }) {
  const router = useRouter(), formId = useId();
  // A deliberate edit snapshot: background revalidation must not replace a draft.
  const [base, setBase] = useState(identity.ownProfile), [draft, setDraft] = useState(identity.ownProfile);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [conflict, setConflict] = useState(false);
  const [feedback,setFeedback] = useState("");
  const changed = editable.some(key => (draft[key] ?? "") !== (base[key] ?? ""));
  useEffect(() => {
    // Clean Account views follow newer durable revisions; edits keep their snapshot.
    if (accountMode && !changed && identity.ownProfile.revision > base.revision) queueMicrotask(() => { setBase(identity.ownProfile); setDraft(identity.ownProfile); });
  }, [accountMode,changed,identity.ownProfile,base.revision]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !changed) return;
    setBusy(true); setError(""); setConflict(false);
    try {
      const normalized = { ...draft, displayName: normalizeProfileText(draft.displayName,80,true), namecardBio: normalizeProfileText(draft.namecardBio ?? "",160) };
      const changes = Object.fromEntries(editable.filter(key => (normalized[key] ?? "") !== (base[key] ?? "")).map(key => [key,normalized[key]])) as OwnProfileChange;
      if (!Object.keys(changes).length) { setDraft(base); return; }
      const result = await updateOwnProfileAction(changes,base.revision);
      if (!result.ok) { setConflict(true); setError("Your profile changed elsewhere. Your draft is still here."); return; }
      window.dispatchEvent(new Event(ACTIVITY_REFRESH)); router.refresh();
      if (accountMode) { setBase(result.profile); setDraft(result.profile); setFeedback("Changes saved."); }
      else onClose();
    } catch { setError("Profile wasn't saved. Use valid text and check your connection; your draft is still here."); }
    finally { setBusy(false); }
  };
  const section = (title: string, description: string, children: ReactNode) => <form id={formId} onSubmit={save}><SettingsSection title={title} description={description}>{children}</SettingsSection></form>;
  const audience = (field: "detailsAudience" | "statusAudience", label: string) => <label className="owner-profile-field">{label}<select value={draft[field]} disabled={busy} onChange={event => setDraft({...draft,[field]:event.target.value as ProfileAudience})}>{PROFILE_AUDIENCES.map(value => <option key={value} value={value}>{audienceLabels[value]}</option>)}</select></label>;
  return <SettingsShell title={accountMode ? "Settings" : "Edit Profile"} context={accountMode ? "Your account, profile and preferences" : "Your global identity"} selectedSection={selectedSection} onSectionChange={onSectionChange} onClose={onClose} busy={busy} dirty={changed} onDiscard={() => { setDraft(base); setError(""); setConflict(false); }} sections={[
    { id:accountMode ? "profile" : "identity",label:accountMode ? "Profile" : "Identity",content:section("Profile","Your global name. Other people's private nicknames for you stay theirs.",<>
      <label className="owner-profile-field">Global display name<input name="displayName" value={draft.displayName} maxLength={80} required disabled={busy} onChange={event => setDraft({...draft,displayName:event.target.value})} autoComplete="nickname" /></label>
      <label className="owner-profile-field">Bio <span className="settings-scope">Optional · {audienceLabels[draft.detailsAudience]}</span><input name="namecardBio" value={draft.namecardBio ?? ""} maxLength={160} disabled={busy} onChange={event => setDraft({...draft,namecardBio:event.target.value})} /></label>
      <dl className="owner-profile-identifiers"><div><dt>Username</dt><dd>@{identity.username}</dd></div><div><dt>TID</dt><dd>{identity.tid} <CopyTid tid={identity.tid} /></dd></div></dl>
      <p className="settings-scope">Username and TID stay fixed. Avatar uploads aren’t connected.</p>
    </>) },
    { id:"status",label:"Status",content:section("Availability","A manual status, not live activity tracking.",<><label className="owner-profile-field">Your status<select value={draft.presenceStatus} disabled={busy} onChange={event => setDraft({...draft,presenceStatus:event.target.value as CanonicalIdentity["presenceStatus"]})}><option value="online">Online</option><option value="idle">Idle</option><option value="away">Away</option><option value="meeting">In a meeting</option></select></label><p className="settings-scope">Visible to: {audienceLabels[draft.statusAudience]}.</p></>) },
    { id:"privacy",label:"Privacy",content:section("Profile visibility","Your name and identifiers still appear where people can already find or talk with you.",<>
      {audience("detailsAudience","Bio and identity accent")}
      {audience("statusAudience","Manual status")}
      <p className="settings-scope">Room members means people currently sharing a Room with you. A Personal Chat alone doesn’t share these details.</p>
    </>) },
    ...(accountMode ? [
      { id:"account", label:"Account", content:<AccountSecurity disabled={busy || changed} /> },
      { id:"notifications", label:"Notifications", content:section("In-app banners","Choose which new updates appear as a temporary banner while Tosker is open.",<>
        <label className="owner-profile-field">Show banners<select value={draft.bannerPreference} disabled={busy} onChange={event=>setDraft({...draft,bannerPreference:event.target.value as BannerPreference})}>{BANNER_PREFERENCES.map(value=><option key={value} value={value}>{({all:"All eligible updates",direct_mentions:"Direct conversations and mentions",quiet:"Quiet"})[value]}</option>)}</select></label>
        <p className="settings-scope">Unread dots and your notification list stay unchanged. Chat and Room mutes still apply; direct mentions can pass those mutes, but never Quiet. Email, push and browser notifications aren’t connected.</p>
      </>) },
      { id:"appearance", label:"Appearance", content:<SettingsSection title="Your view" description="Tosker currently uses its dark, warm interface."><p className="settings-scope">The interface follows your system’s reduced-motion setting and supports browser zoom. Saved themes aren’t available yet. Your Personal Brand accent changes your identity card, not anyone’s workspace.</p></SettingsSection> },
      { id:"language", label:"Language", content:<SettingsSection title="Language" description="The interface currently uses English."><p className="settings-scope">Names and messages support Unicode. Interface translations and message translation aren’t connected yet.</p></SettingsSection> },
      { id:"brand", label:"Personal Brand", content:section("Your identity accent",`A small personal touch. Visible to: ${audienceLabels[draft.detailsAudience]}.`,<>
        <fieldset className="identity-accent-options" disabled={busy}><legend>Accent</legend>{IDENTITY_ACCENTS.map(value=><label key={value}><input type="radio" name="identityAccent" value={value} checked={draft.identityAccent===value} onChange={()=>setDraft({...draft,identityAccent:value})} /><i className={`identity-accent-swatch accent-${value}`} aria-hidden="true" /><span>{value[0].toUpperCase()+value.slice(1)}</span></label>)}</fieldset>
        <p className="settings-scope">Preview · your card only. Text and status colors stay readable.</p>
        <IdentityCard compact label="Accent preview" profile={{userId:identity.userId,avatarUrl:identity.avatarUrl,name:draft.displayName,username:identity.username,tid:identity.tid,initials:draft.displayName.slice(0,2),color:"gold",status:"",identityAccent:draft.identityAccent}} />
        <button type="button" className="quiet-action" disabled={busy || draft.identityAccent==="neutral"} onClick={()=>setDraft({...draft,identityAccent:"neutral"})}>Reset to neutral</button>
      </>) },
      { id:"support", label:"Support", content:<SettingsSection title="Help and feedback" description="Find your way around Tosker."><Link className="quiet-action" href="/help">Open Help</Link><a className="quiet-action" href="mailto:ryanchinqf2@gmail.com">Contact support</a><p className="settings-scope">Opens your email app. Include the page, what you expected and what happened. Don’t include passwords or verification codes.</p></SettingsSection> },
    ] : []),
  ]} footer={requestClose => <div className="owner-profile-save">{error ? <p role="alert">{error}</p> : null}{feedback && !changed ? <p role="status">{feedback}</p> : null}
    {accountMode && ["account","appearance","language","support"].includes(selectedSection ?? "") ? <form id={formId} onSubmit={save} /> : null}
    {conflict ? <button className="quiet-action" disabled={busy} onClick={async () => {
      setBusy(true);
      try { const saved=await readOwnProfileAction(); setBase(saved); setDraft(saved); setConflict(false); setError(""); }
      catch { setError("Saved profile unavailable. Your draft is still here; try again."); }
      finally { setBusy(false); }
    }}>Discard draft and reload saved profile</button> : null}
    <div className="overlay-actions"><button disabled={busy} onClick={requestClose}>{accountMode ? "Close" : "Cancel"}</button><button className="primary-action" form={formId} type="submit" disabled={busy || !changed || !draft.displayName.trim()}>{busy ? "Saving…" : accountMode ? "Save changes" : "Save Profile"}</button></div>
  </div>} />;
}
