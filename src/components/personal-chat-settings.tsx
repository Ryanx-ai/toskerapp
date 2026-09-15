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
    { id: "overview", label: "Overview", content: <SettingsSection title={conversation.name} description={conversation.context}>
      {person ? <><p className="settings-scope">{person.displayName} · @{person.username}</p>{!dirty ? <NamecardButton userId={person.userId} name={person.displayName} className="quiet-action" onOpen={onClose}>Open Namecard</NamecardButton> : null}{person.connectionId ? <PrivateNicknameForm key={draftKey} target={{ id: person.connectionId, name: person.displayName, nickname: person.nickname }} onBusy={setBusy} onDirty={setDirty} /> : null}</> : loading ? <p role="status">Loading identity…</p> : error ? <p role="alert">{error} <button className="quiet-action" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Retry</button></p> : null}
    </SettingsSection> },
    { id: "communication", label: "Communication", content: <SettingsSection title="Notifications" description="Only for you. Mute quiets this Chat; messages and unread stay.">
      <button className="quiet-action settings-toggle" aria-pressed={muted} disabled={busy || loading || !person} onClick={async () => {
        if (!conversation.databaseId || busy) return;
        setBusy(true); setError(""); setFeedback("");
        try { await setConversationPreferenceAction(conversation.databaseId, { kind: "mute", muted: !muted }); setMuted(!muted); setFeedback(muted ? "Chat unmuted." : "Chat muted."); window.dispatchEvent(new Event(ACTIVITY_REFRESH)); }
        catch { setError("Couldn't save that preference. Try again."); }
        finally { setBusy(false); }
      }}>{muted ? "Unmute Chat" : "Mute Chat"}</button>{error ? <p role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}
    </SettingsSection> },
    { id: "media", label: "Media", content: <SettingsSection title="Media" description="Shared photos and video will appear here when private attachments are available."><p className="settings-scope">Not available in this Development review. No uploads or media library are connected.</p></SettingsSection> },
    { id: "files", label: "Files", content: <SettingsSection title="Files" description="Private file sharing is not available yet."><p className="settings-scope">It requires authorized storage, protected downloads and a retention policy. Your Chat remains text-only.</p></SettingsSection> },
    { id: "links", label: "Links", content: <SettingsSection title="Links" description="Links remain in their original messages."><p className="settings-scope">Use conversation Search to find them. A separate shared-link collection is not available yet.</p></SettingsSection> },
    { id: "privacy", label: "Privacy", content: <SettingsSection title="Privacy" description="Personal Chat is shared with its participants. Nicknames and mute preferences belong only to you."><p className="settings-scope">This is a Development review. Blocking, disappearing messages and a separate privacy policy editor are not available here.</p></SettingsSection> },
  ]} />;
}
