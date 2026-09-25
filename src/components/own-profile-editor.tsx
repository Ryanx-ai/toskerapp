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
import { SUPPORT_EMAIL } from "@/config/support";
import { IDENTITY_BANNERS, IDENTITY_FRAMES, INTERFACE_ACCENTS, interfacePalette, type InterfaceAccent } from "@/lib/profile-contract";

const editable = ["displayName", "presenceStatus", "namecardBio", "detailsAudience", "statusAudience", "identityAccent", "bannerPreference", "identityBanner", "identityFrame", "interfaceAccent"] as const;
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
      <label className="owner-profile-field">Global display name<input name="displayName" placeholder="What should we call you?" value={draft.displayName} maxLength={80} required disabled={busy} onChange={event => setDraft({...draft,displayName:event.target.value})} autoComplete="nickname" /></label>
      <label className="owner-profile-field">Bio <span className="settings-scope">Optional · {audienceLabels[draft.detailsAudience]}</span><input name="namecardBio" placeholder="Tell people a little about you" value={draft.namecardBio ?? ""} maxLength={160} disabled={busy} onChange={event => setDraft({...draft,namecardBio:event.target.value})} /></label>
      <dl className="owner-profile-identifiers"><div><dt>Username</dt><dd>@{identity.username}</dd></div><div><dt>TID</dt><dd>{identity.tid} <CopyTid tid={identity.tid} /></dd></div></dl>
      <p className="settings-scope">Username and TID stay fixed. Avatar uploads aren’t connected.</p>
    </>) },
    { id:"status",label:"Status",content:section("Availability","A manual status, not live activity tracking.",<><label className="owner-profile-field">Your status<select value={draft.presenceStatus} disabled={busy} onChange={event => setDraft({...draft,presenceStatus:event.target.value as CanonicalIdentity["presenceStatus"]})}><option value="online">Online</option><option value="idle">Idle</option><option value="away">Away</option><option value="meeting">In a meeting</option></select></label><p className="settings-scope">Visible to: {audienceLabels[draft.statusAudience]}.</p></>) },
    { id:"privacy",label:"Privacy",content:section("Profile visibility","Your name and identifiers still appear where people can already find or talk with you.",<>
      {audience("detailsAudience","Bio and Profile Card")}
      {audience("statusAudience","Manual status")}
      <p className="settings-scope">Room members means people currently sharing a Room with you. A Personal Chat alone doesn’t share these details.</p>
    </>) },
    { id:"brand", label:"Profile Card", content:section("Make it yours",`Your Namecard and Profile. Visible to: ${audienceLabels[draft.detailsAudience]}.`,<>
      <div className="brand-preview">
        <p className="settings-scope">Preview · not saved until you save changes</p>
        <IdentityCard preview label="Your Namecard preview" profile={{userId:identity.userId,avatarUrl:identity.avatarUrl,name:draft.displayName,username:identity.username,tid:identity.tid,initials:draft.displayName.slice(0,2),color:"gold",status:"",identityAccent:draft.identityAccent,identityBanner:draft.identityBanner,identityFrame:draft.identityFrame}} />
      </div>
      <fieldset className="identity-accent-options" disabled={busy}><legend>Accent</legend>{IDENTITY_ACCENTS.map(value=><label key={value}><input type="radio" name="identityAccent" value={value} checked={draft.identityAccent===value} onChange={()=>setDraft({...draft,identityAccent:value})} /><i className={`identity-accent-swatch accent-${value}`} aria-hidden="true" /><span>{value==="neutral" ? "Tosker" : value[0].toUpperCase()+value.slice(1)}</span></label>)}</fieldset>
      <fieldset className="identity-accent-options" disabled={busy}><legend>Banner</legend>{IDENTITY_BANNERS.map(value=><label key={value}><input type="radio" name="identityBanner" value={value} checked={draft.identityBanner===value} onChange={()=>setDraft({...draft,identityBanner:value})} /><span>{({glow:"Glow",weave:"Weave",plain:"Plain"})[value]}</span></label>)}</fieldset>
      <fieldset className="identity-accent-options" disabled={busy}><legend>Avatar frame</legend>{IDENTITY_FRAMES.map(value=><label key={value}><input type="radio" name="identityFrame" value={value} checked={draft.identityFrame===value} onChange={()=>setDraft({...draft,identityFrame:value})} /><span>{value==="none"?"None":"Ring"}</span></label>)}</fieldset>
      <button type="button" className="quiet-action" disabled={busy || (draft.identityAccent==="neutral" && draft.identityBanner==="glow" && draft.identityFrame==="none")} onClick={()=>setDraft({...draft,identityAccent:"neutral",identityBanner:"glow",identityFrame:"none"})}>Reset to Tosker default</button>
      <p className="settings-scope">Reset is saved with your changes. Your interface and Room nickname stay unchanged. Custom images and fonts aren’t available.</p>
    </>) },
    ...(accountMode ? [
      { id:"account", label:"Account", content:<AccountSecurity disabled={busy || changed} /> },
      { id:"notifications", label:"Notifications", content:section("In-app banners","Choose which new updates appear as a temporary banner while Tosker is open.",<>
        <label className="owner-profile-field">Show banners<select value={draft.bannerPreference} disabled={busy} onChange={event=>setDraft({...draft,bannerPreference:event.target.value as BannerPreference})}>{BANNER_PREFERENCES.map(value=><option key={value} value={value}>{({all:"All eligible updates",direct_mentions:"Direct conversations and mentions",quiet:"Quiet"})[value]}</option>)}</select></label>
        <p className="settings-scope">Unread dots and your notification list stay unchanged. Chat and Room mutes still apply; direct mentions can pass those mutes, but never Quiet. Email, push and browser notifications aren’t connected.</p>
      </>) },
      { id:"appearance", label:"Appearance", content:section("Your interface","Only you see this. Your saved accent follows your account across browsers.",<>
        <fieldset className="identity-accent-options" disabled={busy}><legend>Interface accent</legend>{INTERFACE_ACCENTS.map(value=><label key={value}><input type="radio" name="interfaceAccent" value={value} checked={draft.interfaceAccent===value} onChange={()=>setDraft({...draft,interfaceAccent:value})} /><i className="identity-accent-swatch" style={{background:interfacePalette[value].fill}} aria-hidden="true" /><span>{value[0].toUpperCase()+value.slice(1)}</span></label>)}</fieldset>
        <AppearancePreview accent={draft.interfaceAccent} />
        <button type="button" className="quiet-action" disabled={busy || draft.interfaceAccent==="tosker"} onClick={()=>setDraft({...draft,interfaceAccent:"tosker"})}>Reset to Tosker default</button>
        <p className="settings-scope">Save to apply; reset is saved with your changes. Your Namecard, other people’s interfaces, status and safety colors stay unchanged.</p>
      </>) },
      { id:"support", label:"Support", content:<SettingsSection title="Help and feedback" description="Find your way around Tosker."><Link className="quiet-action" href="/help">Open Help</Link><a className="quiet-action" href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a><p className="settings-scope">Opens your email app. Include the page, what you expected and what happened. Don’t include passwords or verification codes.</p><p className="settings-scope">Tosker uses English and a dark interface with curated accents. Browser zoom and reduced motion follow your device. Translation, uploads and full themes aren’t available.</p></SettingsSection> },
    ] : []),
  ]} footer={requestClose => <div className="owner-profile-save">{error ? <p role="alert">{error}</p> : null}{feedback && !changed ? <p role="status">{feedback}</p> : null}
    {accountMode && ["account","support"].includes(selectedSection ?? "") ? <form id={formId} onSubmit={save} /> : null}
    {conflict ? <button className="quiet-action" disabled={busy} onClick={async () => {
      setBusy(true);
      try { const saved=await readOwnProfileAction(); setBase(saved); setDraft(saved); setConflict(false); setError(""); }
      catch { setError("Saved profile unavailable. Your draft is still here; try again."); }
      finally { setBusy(false); }
    }}>Discard draft and reload saved profile</button> : null}
    <div className="overlay-actions"><button disabled={busy} onClick={requestClose}>{accountMode ? "Close" : "Cancel"}</button><button className="primary-action" form={formId} type="submit" disabled={busy || !changed || !draft.displayName.trim()}>{busy ? "Saving…" : accountMode ? "Save changes" : "Save Profile"}</button></div>
  </div>} />;
}

function AppearancePreview({accent}:{accent:InterfaceAccent}) {
  const palette=interfacePalette[accent];
  return <figure className="appearance-preview" style={{"--preview-fill":palette.fill,"--preview-highlight":palette.highlight} as React.CSSProperties}>
    <figcaption>Interface preview</figcaption>
    <div><span className="appearance-selected">Selected conversation</span><span className="appearance-primary">Primary action</span></div>
    <p>Preview only · controls, highlights and your outgoing bubbles</p>
  </figure>;
}
