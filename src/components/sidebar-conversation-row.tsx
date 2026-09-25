"use client";

import { useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { BellOff, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Conversation } from "@/data/messaging-data";
import { EMPTY_PREFERENCE } from "@/lib/conversation-preferences";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { setConversationPreferenceAction } from "@/server/conversations/preference-actions";
import { useToskerIdentity } from "./tosker-identity";
import { workspaceSnapshot } from "./workspace-snapshot";
import { NamecardContext } from "./namecard-context";
import { SidebarPinRow } from "./sidebar-pin-row";
import { SubroomOrderRow } from "./subroom-order-row";
import { PersonalChatSettings } from "./personal-chat-settings";
import { RoomDetails } from "./room-details";
import { InvitePeople } from "./room-invitations";

/** Entry points only: authorization and persistence stay in existing services. */
export function SidebarConversationRow({ item, pinnedIds, onPinsSaved, selected, onReadingPause, children }: {
  item: Conversation; pinnedIds: string[]; onPinsSaved: (ids: string[]) => void;
  selected: boolean; onReadingPause: (paused: boolean) => void; children: ReactNode;
}) {
  const identity = useToskerIdentity(), router = useRouter(), openNamecard = useContext(NamecardContext);
  const snapshot = useSyncExternalStore(workspaceSnapshot.subscribe, () => workspaceSnapshot.get(identity?.userId), workspaceSnapshot.server);
  const [panel, setPanel] = useState<"settings" | "invite" | "leave" | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const child = item.tag === "SUBROOM", sandbox = item.kind === "my-room";
  const room = item.kind === "room" ? identity?.rooms.find((entry) => entry.slug === item.slug.split("--")[0]) : undefined;
  const preference = snapshot.preferences.find((entry) => entry.conversationId === item.databaseId) ?? { ...EMPTY_PREFERENCE, conversationId: item.databaseId ?? "" };
  const change = async (kind: "mute" | "unread", close: () => void) => {
    if (!item.databaseId || busy) return;
    setBusy(true); setError("");
    if (kind === "unread" && selected) onReadingPause(true);
    try {
      await setConversationPreferenceAction(item.databaseId, kind === "mute" ? { kind, muted: !preference.muted } : { kind, surface: "chat" });
      window.dispatchEvent(new Event(ACTIVITY_REFRESH)); close();
      if (kind === "unread" && selected) router.push("/app?view=list");
    } catch {
      setError("That preference wasn't saved. Check your access or connection and try again.");
      if (kind === "unread" && selected) onReadingPause(false);
    } finally { setBusy(false); }
  };
  const actions = (close: () => void) => <>
    {sandbox ? <><Link href="/profile" onClick={close}>Your Profile</Link><Link href="/settings" onClick={close}>Settings</Link></> : <>
      {item.kind === "personal" && item.identitySeed && openNamecard ? <button disabled={busy} onClick={() => { close(); requestAnimationFrame(() => openNamecard(item.identitySeed!)); }}>Open Namecard</button> : null}
      {item.kind === "personal" || room ? <button disabled={busy} onClick={() => { close(); setPanel("settings"); }}>{item.kind === "personal" ? "Chat Settings" : child ? "Parent Room Settings" : "Room Settings"}</button> : null}
      {room && !child ? <button disabled={busy} onClick={() => { close(); setPanel("invite"); }}>Invite</button> : null}
      <button disabled={busy || !snapshot.userId || preference.inheritedMute} onClick={() => void change("mute", close)}><BellOff size={16} aria-hidden="true" />{preference.inheritedMute ? "Muted by Room" : preference.muted ? "Unmute" : "Mute"}</button>
      <button disabled={busy} onClick={() => void change("unread", close)}><Mail size={16} aria-hidden="true" />Mark Chat unread</button>
      {room && !child && room.role !== "owner" ? <button className="danger" disabled={busy} onClick={() => { close(); setPanel("leave"); }}>Leave Room</button> : null}
    </>}
    {busy ? <p role="status">Saving…</p> : null}
  </>;
  if (!identity || !item.databaseId) return children;
  return <>
    {child && room ? <SubroomOrderRow roomId={room.id} ids={room.subrooms.map((entry) => entry.id)} id={item.slug.split("--")[1]} name={item.name} owner={room.role === "owner"} actions={actions}>{children}</SubroomOrderRow>
      : <SidebarPinRow id={item.databaseId} name={sandbox ? "your Sandbox" : item.name} ids={pinnedIds} enabled pinAllowed={!sandbox} actions={actions} onSaved={onPinsSaved}>{children}</SidebarPinRow>}
    {error ? <p className="sidebar-pin-error" role="alert">{error}</p> : null}
    {panel === "settings" && item.kind === "personal" ? <PersonalChatSettings conversation={item} preference={preference} onClose={() => setPanel(null)} /> : null}
    {(panel === "settings" || panel === "leave") && room ? <RoomDetails slug={room.slug} initialAction={panel === "leave" ? "leave" : undefined} onClose={() => setPanel(null)} onInvite={() => setPanel("invite")} /> : null}
    {panel === "invite" && room ? <InvitePeople roomId={room.id} name={room.name} onClose={() => setPanel(null)} /> : null}
  </>;
}
