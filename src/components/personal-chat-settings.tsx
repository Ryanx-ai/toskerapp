"use client";
import { useEffect, useState } from "react";
import type { Conversation } from "@/data/messaging-data";
import type { ConversationPreference } from "@/lib/conversation-preferences";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { setConversationPreferenceAction } from "@/server/conversations/preference-actions";
import { listConnectionsAction } from "@/server/connections/actions";
import { PersonAvatar } from "./identity-avatar";
import { PrivateNicknameForm } from "./nickname-editor";
import { SettingsSection, SettingsShell } from "./settings-shell";

export function PersonalChatSettings({ conversation, preference, onClose }: { conversation: Conversation; preference?: ConversationPreference; onClose: () => void }) {
  const [friend, setFriend] = useState<Awaited<ReturnType<typeof listConnectionsAction>>[number] | null>(null);
  const [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [feedback, setFeedback] = useState("");
  const [muted, setMuted] = useState(Boolean(preference?.muted));
  useEffect(() => {
    let active = true;
    listConnectionsAction().then((rows) => { if (active) { setFriend(rows.find((row) => row.status === "accepted" && row.person?.userId === conversation.identitySeed) ?? null); setError(""); setLoading(false); } }).catch(() => { if (active) { setError("Private nickname unavailable. Try again."); setLoading(false); } });
    return () => { active = false; };
  }, [conversation.identitySeed, attempt]);
  return <SettingsShell title="Chat Settings" context={conversation.name} identity={<PersonAvatar seed={conversation.identitySeed ?? conversation.slug} initials={conversation.initials} imageUrl={conversation.avatarUrl} />} onClose={onClose} busy={busy} sections={[
    { id: "overview", label: "Overview", content: <SettingsSection title={conversation.name} description={conversation.context}>
      {friend?.person ? <><p className="settings-scope">Display name · {friend.person.displayName}</p><PrivateNicknameForm target={{ id: friend.id, name: friend.person.displayName, nickname: friend.person.nickname }} onBusy={setBusy} /></> : loading ? <p role="status">Loading identity…</p> : error ? <p role="alert">{error} <button className="quiet-action" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Retry</button></p> : null}
    </SettingsSection> },
    { id: "communication", label: "Communication", content: <SettingsSection title="Notifications" description="Only for you. Mute quiets this Chat; messages and unread stay.">
      <button className="quiet-action settings-toggle" aria-pressed={muted} disabled={busy} onClick={async () => {
        if (!conversation.databaseId || busy) return;
        setBusy(true); setError(""); setFeedback("");
        try { await setConversationPreferenceAction(conversation.databaseId, { kind: "mute", muted: !muted }); setMuted(!muted); setFeedback(muted ? "Chat unmuted." : "Chat muted."); window.dispatchEvent(new Event(ACTIVITY_REFRESH)); }
        catch { setError("Couldn't save that preference. Try again."); }
        finally { setBusy(false); }
      }}>{muted ? "Unmute Chat" : "Mute Chat"}</button>{error ? <p role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}
    </SettingsSection> },
  ]} />;
}
