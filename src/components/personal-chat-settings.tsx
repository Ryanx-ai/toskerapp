"use client";
import { useEffect, useState } from "react";
import type { Conversation } from "@/data/messaging-data";
import type { ConversationPreference } from "@/lib/conversation-preferences";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { setConversationPreferenceAction } from "@/server/conversations/preference-actions";
import { listConversationPreferencesAction } from "@/server/conversations/preference-actions";
import { getNamecardAction } from "@/server/profiles/namecard-actions";
import type { Namecard } from "@/server/profiles/namecard";
import { NamecardButton } from "./namecard-context";
import { PersonAvatar } from "./identity-avatar";
import { PrivateNicknameForm } from "./nickname-editor";
import { SettingsSection, SettingsShell } from "./settings-shell";

export function PersonalChatSettings({ conversation, preference, onClose }: { conversation: Conversation; preference?: ConversationPreference; onClose: () => void }) {
  const [person, setPerson] = useState<Namecard | null>(null);
  const [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [feedback, setFeedback] = useState("");
  const [muted, setMuted] = useState(Boolean(preference?.muted));
  const [dirty, setDirty] = useState(false), [draftKey, setDraftKey] = useState(0);
  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const next = await getNamecardAction(conversation.identitySeed ?? "");
        const saved = preference ?? (await listConversationPreferencesAction()).find((item) => item.conversationId === conversation.databaseId);
        if (active) { setPerson(next); setMuted(Boolean(saved?.muted)); setError(""); setLoading(false); }
      } catch { if (active) { setPerson(null); setError("Chat Settings unavailable. Try again."); setLoading(false); } }
    };
    void read();
    return () => { active = false; };
  }, [conversation.identitySeed, conversation.databaseId, preference, attempt]);
  return <SettingsShell title="Chat Settings" context={conversation.name} identity={<PersonAvatar seed={conversation.identitySeed ?? conversation.slug} initials={conversation.initials} imageUrl={conversation.avatarUrl} />} onClose={onClose} busy={busy} dirty={dirty} onDiscard={() => { setDirty(false); setDraftKey((value) => value + 1); }} sections={[
    { id: "overview", label: "Identity", content: <SettingsSection title={conversation.name} description="Your private nickname stays just for you.">
      {person ? <><p className="settings-scope">{person.displayName} · @{person.username}</p>{!dirty ? <NamecardButton userId={person.userId} name={person.displayName} className="quiet-action" onOpen={onClose}>Open Namecard</NamecardButton> : null}{person.connectionId ? <PrivateNicknameForm key={draftKey} target={{ id: person.connectionId, name: person.displayName, nickname: person.nickname }} onBusy={setBusy} onDirty={setDirty} /> : null}</> : loading ? <p role="status">Loading identity…</p> : error ? <p role="alert">{error} <button className="quiet-action" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Retry</button></p> : null}
    </SettingsSection> },
    { id: "communication", label: "Notifications", content: <SettingsSection title="Notifications" description="Mute quiets notifications. Messages and unread stay; direct mentions can still notify.">
      <button className="quiet-action settings-toggle" aria-pressed={muted} disabled={busy || loading || !person} onClick={async () => {
        if (!conversation.databaseId || busy) return;
        setBusy(true); setError(""); setFeedback("");
        try { await setConversationPreferenceAction(conversation.databaseId, { kind: "mute", muted: !muted }); setMuted(!muted); setFeedback(muted ? "Chat unmuted." : "Chat muted."); window.dispatchEvent(new Event(ACTIVITY_REFRESH)); }
        catch { setError("Couldn't save that preference. Try again."); }
        finally { setBusy(false); }
      }}>{muted ? "Unmute Chat" : "Mute Chat"}</button>{error ? <p role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}
    </SettingsSection> },
    { id: "content", label: "Shared content", content: <SettingsSection title="Shared content" description="Find links in conversation Search. Pin important messages to Hall."><div className="media-deferred"><strong>Photos, files and gallery · not available yet</strong><p>Private uploads and protected downloads are being prepared.</p></div></SettingsSection> },
    { id: "organization", label: "Organization", content: <SettingsSection title="Organization" description="Pin this Chat in the sidebar, then drag it or use Move earlier/later."><div className="media-deferred"><strong>Private tags · not available yet</strong><p>Your tags will belong only to you. Shared Room tags stay separate.</p></div><p className="settings-scope">This Chat uses your interface accent from Settings → Appearance. Chat-specific themes are not available.</p></SettingsSection> },
    { id: "privacy", label: "Privacy", content: <SettingsSection title="Privacy" description="Only participants can open this Chat. Nicknames and mute preferences belong only to you."><p className="settings-scope">Blocking and disappearing messages are not available yet.</p></SettingsSection> },
  ]} />;
}
