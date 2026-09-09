"use client";
import { MESSAGE_LOCATION_REQUEST, type MessageLocationRequest } from "@/lib/message-location";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ConversationSearch } from "./conversation-search";
import { adjustMentions, type MentionSpan, type MentionCandidate } from "@/lib/mentions";
import { setConversationPreferenceAction } from "@/server/conversations/preference-actions";
import { type ConversationPreference, EMPTY_PREFERENCE } from "@/lib/conversation-preferences";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { changeOwnMessageAction, markConversationReadAction, sendMessageAction, setMessageReactionAction } from "@/server/conversations/actions";
import type { HistoryPage } from "@/server/conversations/history";
import { fetchMessageHistory } from "@/lib/message-history";
import { archiveHallNoteAction, restoreHallNoteAction, changeHallItemColorAction, createHallNoteAction, editHallNoteAction, listHallItemsAction, nukeHallNoteAction, pinMessageToHallAction, reorderHallItemAction, unpinHallItemAction } from "@/server/shared-state/actions";
import {
  hallNotices,
  type Conversation,
  type Message,
} from "@/data/messaging-data";
import { prototypeUser } from "@/data/prototype-user";
import { useCurrentToskerUser, useToskerIdentity } from "@/components/tosker-identity";
import { prototypeStore } from "@/lib/prototype-store";
import { HallNoteInteractions } from "@/components/hall-note-interactions";
import { MessageBubble } from "./message-bubble";
import type { useConversationRealtime } from "./use-conversation-realtime";
import { ACTIVITY_REFRESH, CHAT_REFRESH, HALL_REFRESH } from "@/lib/realtime-contract";
import { acknowledgeDraft, chatDraftKey, chatDrafts, type DraftReply } from "@/lib/chat-drafts";
import { groupMessages, messageDay, messageDayLabel } from "@/lib/message-presentation";
import { communicationTiming } from "@/lib/communication-performance";
import { PersonAvatar, RoomAvatar } from "./identity-avatar";
import { EmojiPicker } from "./emoji-picker";
import { listHallSnapshotAction } from "@/server/shared-state/actions";
import { AttentionMark } from "./attention-mark";
import { InteractionPopover } from "./interaction-popover";
import { ModalLayer } from "./modal-layer";
import type { HallReaction } from "@/lib/hall-contract";
import {
  ArrowLeft,
  Search,
  BellOff,
  GripVertical,
  MoreHorizontal,
  Plus,
  ArrowUp,
  ChevronDown,
  Smile,
  UsersRound,
  X,
} from "lucide-react";

const titleOf = (conversation: Conversation, displayName = prototypeUser.displayName) =>
  conversation.kind === "my-room"
    ? `${displayName}'s Sandbox`
    : conversation.name;
const baseHref = (conversation: Conversation) =>
  conversation.href ?? (conversation.kind === "room"
    ? `/room/${conversation.slug}`
    : `/personal/${conversation.slug}`);

export function useDismissLayer(
  open: boolean,
  onClose: () => void,
  ref?: React.RefObject<HTMLElement | null>,
  closeOutside = true,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    // Native modal owns Escape, inertness, outside intent and focus restoration.
    if (ref?.current?.closest("dialog")) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const outside = (event: PointerEvent) => {
      if (!ref?.current || !ref.current.contains(event.target as Node))
        onCloseRef.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    const globalClose = () => onCloseRef.current();
    if (closeOutside) document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("tosker:close-popovers", globalClose);
    return () => {
      if (closeOutside) document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("tosker:close-popovers", globalClose);
      previousFocus?.focus();
    };
  }, [open, ref, closeOutside]);
}

function openLayer() {
  window.dispatchEvent(new Event("tosker:close-popovers"));
}

export function SurfaceHeader({
  conversation,
  surface,
  onInvite,
  onAddSubroom,
  onManage,
  chatUnread = 0,
  hallUnread = 0,
  unreadByConversation,
  preference,
  onReadingPause,
}: {
  conversation: Conversation;
  surface: "chat" | "hall";
  onInvite?: () => void;
  onAddSubroom?: () => void;
  onManage?: () => void;
  chatUnread?: number;
  hallUnread?: number;
  unreadByConversation?: Readonly<Record<string, number>>;
  preference?: ConversationPreference;
  onReadingPause?: (paused: boolean) => void;
}) {
  const user = useCurrentToskerUser() ?? prototypeUser;
  const identity = useToskerIdentity();
  const parentRoom = conversation.kind === "room" ? identity?.rooms.find((room) => room.slug === conversation.slug.split("--")[0]) : undefined;
  const [contextAnchor, setContextAnchor] = useState<HTMLElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [controlsAnchor, setControlsAnchor] = useState<HTMLElement | null>(null);
  const [controlBusy, setControlBusy] = useState(false);
  const [controlFeedback, setControlFeedback] = useState("");
  const router = useRouter();
  const pref = preference ?? EMPTY_PREFERENCE;
  const changePreference = async (kind: "mute" | "unread") => {
    if (!conversation.databaseId || controlBusy) return;
    setControlBusy(true); setControlFeedback("");
    if (kind === "unread") onReadingPause?.(true);
    try {
      await setConversationPreferenceAction(conversation.databaseId, kind === "mute" ? { kind, muted: !pref.muted } : { kind, surface });
      window.dispatchEvent(new Event(ACTIVITY_REFRESH));
      setControlsAnchor(null);
      if (kind === "unread") { router.push("/app"); }
    } catch { setControlFeedback("That change couldn't be saved. Try again."); onReadingPause?.(false); }
    finally { setControlBusy(false); }
  };
  return (
    <header className="conversation-header">
      <div className="header-identity-zone">
        <Link href="/app" className="mobile-back" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        {conversation.kind === "room" ? <RoomAvatar name={conversation.name} seed={conversation.identitySeed ?? conversation.slug.split("--")[0]} subroom={conversation.tag === "SUBROOM"} className="avatar-large" /> : <PersonAvatar seed={conversation.identitySeed ?? conversation.slug} initials={conversation.initials} imageUrl={conversation.avatarUrl} className="avatar-large" />}
        <div className="active-copy">
          {parentRoom ? <button className="room-context-trigger" aria-label={`Switch Room context: ${parentRoom.name}${conversation.tag === "SUBROOM" ? ` / ${conversation.name}` : ""}`} aria-haspopup="dialog" aria-expanded={Boolean(contextAnchor)} onClick={(event) => setContextAnchor(event.currentTarget)}><span>{parentRoom.name}</span><ChevronDown size={15} /></button> : <h2>{titleOf(conversation, user.displayName)}</h2>}
          {conversation.kind === "personal" && conversation.presenceStatus ? <span className="header-presence"><i className={`presence-mark ${conversation.presenceStatus}`} aria-label={{ online: "Online", idle: "Idle", away: "Away", meeting: "In a meeting" }[conversation.presenceStatus]} />{{ online: "Online", idle: "Idle", away: "Away", meeting: "In a meeting" }[conversation.presenceStatus]}</span> : null}
          {conversation.kind === "room" && conversation.context ? <span className="header-context" title={parentRoom ? conversation.name : conversation.context}>{parentRoom ? conversation.name : conversation.context}</span> : null}
        </div>
        {conversation.kind === "room" && onInvite ? (
          <button className="invite-button primary-action" onClick={onInvite}>
            Invite
          </button>
        ) : null}
      </div>
      <nav className="surface-tabs" aria-label="Space surfaces">
        <Link
          className={surface === "chat" ? "active" : ""}
          aria-current={surface === "chat" ? "page" : undefined}
          href={baseHref(conversation)}
        >
          Chat<AttentionMark count={chatUnread} label="new messages" />
        </Link>
        <Link
          className={surface === "hall" ? "active" : ""}
          aria-current={surface === "hall" ? "page" : undefined}
          href={`${baseHref(conversation)}/hall`}
        >
          Hall<AttentionMark count={hallUnread} label="new Hall activities" />
        </Link>
      </nav>
      <div className="core-header-controls">
        {conversation.databaseId ? <button className="action-icon" aria-label="Search conversation" title="Search conversation" onClick={() => setSearchOpen(true)}><Search size={17} /></button> : null}
        {pref.muted || pref.inheritedMute ? <span title={pref.inheritedMute ? "Muted by Room" : "Muted"} aria-label={pref.inheritedMute ? "Muted by Room" : "Muted"}><BellOff size={14} /></span> : null}
        {conversation.databaseId || onManage ? <button className="action-icon" aria-label="Conversation options" title="Conversation options" aria-expanded={Boolean(controlsAnchor)} onClick={(event) => { setControlFeedback(""); setControlsAnchor(event.currentTarget); }}><MoreHorizontal size={17} /></button> : null}
      </div>
      {searchOpen && conversation.databaseId ? <ConversationSearch key={conversation.databaseId} conversationId={conversation.databaseId} name={titleOf(conversation, user.displayName)} href={baseHref(conversation)} onClose={() => setSearchOpen(false)} /> : null}
      {controlsAnchor ? <InteractionPopover anchor={controlsAnchor} label="Conversation options" onClose={() => { if (!controlBusy) setControlsAnchor(null); }}><div className="room-context-menu communication-options">
        {onManage ? <button disabled={controlBusy} onClick={() => { setControlsAnchor(null); onManage(); }}><UsersRound size={15} />Room details</button> : null}
        {conversation.databaseId ? <>
          <button disabled={controlBusy || pref.inheritedMute} onClick={() => void changePreference("mute")}>{pref.inheritedMute ? "Muted by Room" : pref.muted ? "Unmute" : "Mute"}</button>
          <p>{conversation.kind === "room" && conversation.tag !== "SUBROOM" ? "Mute quiets this Room and its Subrooms. " : "Mute quiets notifications. "}Messages and unread indicators stay. Direct mentions still notify.</p>
          <button disabled={controlBusy} onClick={() => void changePreference("unread")}>Mark {surface === "hall" ? "Hall" : "Chat"} unread</button>
        </> : null}
        {controlBusy ? <p role="status">Saving…</p> : null}{controlFeedback ? <p role="alert">{controlFeedback}</p> : null}
      </div></InteractionPopover> : null}
      {contextAnchor && parentRoom ? <InteractionPopover anchor={contextAnchor} label="Room contexts" onClose={() => setContextAnchor(null)}><nav className="room-context-menu" aria-label="Room and Subrooms">
        <Link href={`/room/${parentRoom.slug}`} aria-current={conversation.slug === parentRoom.slug ? "page" : undefined} onClick={() => setContextAnchor(null)}>{parentRoom.name}<AttentionMark count={unreadByConversation?.[parentRoom.conversationId] ?? 0} label="unread activities" /></Link>
        {parentRoom.subrooms.map((child) => <Link key={child.id} className="context-child" href={`/room/${parentRoom.slug}/subroom/${child.id}`} aria-current={conversation.slug.endsWith(`--${child.id}`) ? "page" : undefined} onClick={() => setContextAnchor(null)}>{child.name}<AttentionMark count={unreadByConversation?.[child.conversationId] ?? 0} label="unread activities" /></Link>)}
        {parentRoom.role === "owner" && onAddSubroom ? <><hr /><button onClick={() => { setContextAnchor(null); onAddSubroom(); }}><Plus size={15} />Add Subroom</button></> : null}
      </nav></InteractionPopover> : null}
    </header>
  );
}


function Composer({
  name,
  value,
  onValue,
  reply,
  onCancelReply,
  onSend,
  onTyping,
  mentionConversationId,
  onMention,
}: {
  name: string;
  value: string;
  onValue: (value: string) => void;
  reply: DraftReply | null;
  onCancelReply: () => void;
  onSend: (body: string) => Promise<boolean>;
  onTyping: (active: boolean) => void;
  mentionConversationId?: string;
  onMention: (body: string, span: MentionSpan) => boolean;
}) {
  const [sending, setSending] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionSelection = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (mentionSelection.current === null) return;
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(mentionSelection.current, mentionSelection.current);
    mentionSelection.current = null;
  }, [value]);
  const [caret, setCaret] = useState(value.length);
  const [focused, setFocused] = useState(false);
  const [dismissedMention, setDismissedMention] = useState("");
  const [suggestions, setSuggestions] = useState<MentionCandidate[]>([]);
  const [suggestionState, setSuggestionState] = useState<"loading" | "ready" | "error">("loading");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const mentionMatch = value.slice(0, caret).match(/(?:^|\s)@([^\s@]{0,80})$/u);
  const mentionQuery = mentionMatch?.[1] ?? null;
  const mentionKey = `${value}:${caret}`;
  const mentionOpen = Boolean(mentionConversationId && focused && mentionQuery !== null && dismissedMention !== mentionKey && !emojiAnchor);
  useEffect(() => {
    if (!mentionOpen || !mentionConversationId || mentionQuery === null) return;
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) { setSuggestions([]); setSuggestionIndex(0); setSuggestionState("loading"); } });
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(mentionConversationId)}/members?q=${encodeURIComponent(mentionQuery)}`, { cache: "no-store", credentials: "same-origin", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) throw new Error();
        const data = await response.json() as { members: MentionCandidate[] };
        if (!controller.signal.aborted) { setSuggestions(data.members); setSuggestionState("ready"); }
      } catch { if (!controller.signal.aborted) setSuggestionState("error"); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [mentionConversationId, mentionOpen, mentionQuery]);
  const selectMention = (candidate: MentionCandidate) => {
    if (mentionQuery === null) return;
    const start = caret - mentionQuery.length - 1;
    const label = `@${candidate.username ?? candidate.name}`;
    const body = `${value.slice(0, start)}${label} ${value.slice(caret)}`;
    if (body.length > 8000) return;
    const nextCaret = start + label.length + 1;
    mentionSelection.current = nextCaret;
    if (!onMention(body, { userId: candidate.userId, start, length: label.length, label })) { mentionSelection.current = null; return; }
    setCaret(nextCaret);
    setDismissedMention(`${body}:${nextCaret}`);
  };
  const send = async () => {
    if (!value.trim() || sending) return;
    const draft = value;
    onTyping(false);
    setSending(true);
    try {
      await onSend(draft);
    } finally { setSending(false); }
    inputRef.current?.focus({ preventScroll: true });
  };
  return (
    <div className="composer-wrap">
      {mentionOpen ? <div className="mention-suggestions" id="composer-mention-options" role="listbox" aria-label="Mention a member">
        {suggestionState !== "ready" ? <p role="status">{suggestionState === "error" ? "Members couldn't be loaded. Close and try again." : "Loading members…"}</p> : !suggestions.length ? <p role="status">No matching members.</p> : suggestions.map((candidate, index) => <button key={candidate.userId} id={`mention-option-${index}`} role="option" aria-selected={index === suggestionIndex} tabIndex={-1} onPointerDown={(event) => event.preventDefault()} onClick={() => selectMention(candidate)}><strong>{candidate.name}</strong>{candidate.username ? <small>@{candidate.username}</small> : null}</button>)}
      </div> : null}
      {reply ? (
        <div className="reply-context">
          <div>
            <strong>Replying to {reply.author}</strong>
            <span>{reply.body}</span>
          </div>
          <button onClick={onCancelReply} aria-label="Cancel reply">
            <X size={15} />
          </button>
        </div>
      ) : null}
      <div className="composer">
        <div className="composer-tools">
          <button aria-label="Add emoji" onClick={(event) => setEmojiAnchor(event.currentTarget)}>
            <Smile size={17} />
          </button>
        </div>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => { setDismissedMention(""); setCaret(event.target.selectionStart); onValue(event.target.value); onTyping(Boolean(event.target.value.trim())); }}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
          onFocus={() => setFocused(true)}
          onBlur={() => { onTyping(false); setFocused(false); }}
          role={mentionConversationId ? "combobox" : undefined}
          aria-autocomplete={mentionConversationId ? "list" : undefined}
          aria-expanded={mentionConversationId ? mentionOpen : undefined}
          aria-controls={mentionOpen ? "composer-mention-options" : undefined}
          aria-activedescendant={mentionOpen && suggestions.length && suggestionState === "ready" ? `mention-option-${suggestionIndex}` : undefined}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (mentionOpen && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setDismissedMention(mentionKey); return; }
            if (mentionOpen && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key) && !event.shiftKey) {
              event.preventDefault();
              if (suggestionState === "ready" && suggestions.length) {
                if (event.key === "Enter") selectMention(suggestions[suggestionIndex]);
                else setSuggestionIndex((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
              }
              return;
            }
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Message…"
          aria-label={`Message ${name}`}
          rows={1}
          maxLength={8000}
        />
        <button
          className="send-button"
          disabled={!value.trim() || sending}
          onPointerDown={(event) => event.preventDefault()}
          onClick={send}
          aria-label="Send message"
        >
          <ArrowUp size={19} />
        </button>
      </div>
      {emojiAnchor ? <InteractionPopover anchor={emojiAnchor} label="Insert emoji" onClose={() => setEmojiAnchor(null)}><EmojiPicker onClose={() => setEmojiAnchor(null)} onPick={(emoji) => {
        const input = inputRef.current;
        const from = input?.selectionStart ?? value.length, to = input?.selectionEnd ?? value.length;
        onValue((value.slice(0, from) + emoji + value.slice(to)).slice(0, 8000));
        setEmojiAnchor(null);
        requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(from + emoji.length, from + emoji.length); });
      }} /></InteractionPopover> : null}
    </div>
  );
}

function displayMessages(persisted: HistoryPage["messages"]): Message[] {
  return persisted.map((message) => ({ ...message,
    initials: message.author.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    replyTo: message.replyTo ?? undefined,
    time: new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    color: message.mine ? "gold" : "pink",
  }));
}

export function ChatSurface({ conversation, realtime, manualUnreadId, readingPaused = false }: { conversation: Conversation; realtime: ReturnType<typeof useConversationRealtime>; manualUnreadId?: string | null; readingPaused?: boolean }) {
  const router = useRouter();
  const targetMessage = useSearchParams().get("message");
  const [targetError, setTargetError] = useState(false);
  const [targetRetry, setTargetRetry] = useState(0);
  const [targetNotice, setTargetNotice] = useState("");
  const user = useCurrentToskerUser() ?? prototypeUser;
  const identity = useToskerIdentity();
  const draftKey = chatDraftKey(identity?.userId, conversation.databaseId ?? conversation.slug);
  const draft = useSyncExternalStore(chatDrafts.subscribe, () => chatDrafts.get(draftKey), chatDrafts.server);
  const reply = draft.reply;
  const setReply = (reply: DraftReply | null) => chatDrafts.update(draftKey, (current) => ({ ...current, reply: reply ? { id: reply.id, body: reply.body, author: reply.author } : null }));
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const initial = conversation.databaseId ? [] :
    conversation.kind === "my-room"
      ? state.sandboxMessages.length
        ? state.sandboxMessages
        : state.mode === "demo"
          ? conversation.messages
          : []
      : conversation.messages;
  const [messages, setMessageState] = useState(initial);
  const currentMessages = useRef<Message[]>(initial);
  const setMessages = useCallback((update: (current: Message[]) => Message[]) => {
    const next = update(currentMessages.current);
    currentMessages.current = next;
    setMessageState(next);
  }, []);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [historyView, setHistoryView] = useState(false);
  const [newerAvailable, setNewerAvailable] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState(false);
  const historyMode = useRef(Boolean(targetMessage));
  const paging = useRef(false);
  const historyEpoch = useRef(0);
  const scrollAnchor = useRef<{ id?: string; top?: number; latest?: boolean } | null>(null);
  const [loaded, setLoaded] = useState(!conversation.databaseId);
  const [fetchError, setFetchError] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const alive = useRef(true);
  const loadingMessages = useRef(false);
  const pendingMessages = useRef(false);
  const readThrough = useRef<string | null>(null);
  const lastCanonicalId = useRef<string | null>(null);
  const mergePersisted = useCallback((current: Message[], incoming: Message[]) => {
    const byId = new Map(current.map((message) => [message.id, message]));
    let changed = false;
    incoming.forEach((message) => {
      const previous = byId.get(message.id);
      if (!previous || previous.createdAt !== message.createdAt || previous.body !== message.body || previous.author !== message.author || previous.avatarUrl !== message.avatarUrl || previous.replyTo !== message.replyTo || previous.replyAuthor !== message.replyAuthor || previous.editedAt !== message.editedAt || previous.deletedAt !== message.deletedAt || JSON.stringify(previous.mentions) !== JSON.stringify(message.mentions) || JSON.stringify(previous.reactionSummary) !== JSON.stringify(message.reactionSummary)) {
        byId.set(message.id, { ...previous, ...message }); changed = true;
      }
    });
    if (!changed) return current;
    return [...byId.values()].sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : Date.parse(a.time);
      const bTime = b.createdAt ? Date.parse(b.createdAt) : Date.parse(b.time);
      return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime) || a.id.localeCompare(b.id);
    });
  }, []);
  const acknowledgeVisible = useCallback(() => {
    requestAnimationFrame(() => {
      if (!conversation.databaseId || !alive.current || document.hidden || historyMode.current || !nearBottom.current || readingPaused) return;
      const latest = currentMessages.current.at(-1)?.id;
      const boundary = `${latest ?? "empty"}:${manualUnreadId ?? ""}`;
      if ((!latest && !manualUnreadId) || (latest && latest === chatDrafts.get(draftKey).pending?.id) || readThrough.current === boundary) return;
      readThrough.current = boundary;
      void markConversationReadAction(conversation.databaseId, "chat", latest, [], manualUnreadId).catch(() => { if (readThrough.current === boundary) readThrough.current = null; });
    });
  }, [conversation.databaseId, draftKey, manualUnreadId, readingPaused]);
  const loadPersisted = useCallback(async () => {
    if (!conversation.databaseId || document.hidden) return;
    if (loadingMessages.current || paging.current) { pendingMessages.current = true; return; }
    loadingMessages.current = true;
    try {
    do {
    pendingMessages.current = false;
    const epoch = historyEpoch.current;
    const fetchStarted = performance.now();
    communicationTiming("read-start");
    const retainedIds = currentMessages.current.map((message) => message.id).filter((id) => id !== chatDrafts.get(draftKey).pending?.id).slice(0, 200);
    const retainingHistory = historyMode.current && retainedIds.length > 0;
    let page = await fetchMessageHistory(conversation.databaseId, retainingHistory ? { ids: retainedIds } : {});
    const persisted = [...page.messages];
    // Recover a multi-page offline gap without an indefinitely growing DOM.
    let pages = 1;
    while (!retainingHistory && lastCanonicalId.current && !persisted.some((message) => message.id === lastCanonicalId.current) && page.nextCursor && pages < 4 && alive.current && !document.hidden) {
      page = await fetchMessageHistory(conversation.databaseId, { before: page.nextCursor.id });
      persisted.unshift(...page.messages); pages++;
    }
    const replaceWindow = Boolean(lastCanonicalId.current && !persisted.some((message) => message.id === lastCanonicalId.current));
    communicationTiming("read-returned", { durationMs: performance.now() - fetchStarted, rows: persisted.length });
    if (!alive.current || document.hidden || epoch !== historyEpoch.current) return;
    const mapped = displayMessages(persisted);
    if (!retainingHistory) lastCanonicalId.current = persisted.at(-1)?.id ?? null;
    setLoaded(true);
    setFetchError(false);
    const pendingId = chatDrafts.get(draftKey).pending?.id;
    if (pendingId && mapped.some((message) => message.id === pendingId && message.mine)) {
      chatDrafts.update(draftKey, (current) => acknowledgeDraft(current, pendingId));
      setMessageError(null);
    }
    const current = currentMessages.current;
    const merged = mergePersisted(retainingHistory || replaceWindow ? current.filter((message) => message.id === pendingId) : current, mapped);
    const next = merged.slice(-200);
    if (!retainingHistory) {
      if (!current.length || replaceWindow) setOlderCursor(page.nextCursor?.id ?? null);
      if (merged.length > 200) setOlderCursor(next[0].id);
    }
    setNewerAvailable(Boolean(page.latest && page.latest.id !== next.at(-1)?.id));
    setMessages(() => next);
    setMessageError((current) => current === "Messages couldn't be loaded. Try again." ? null : current);
    acknowledgeVisible();
    } while (pendingMessages.current && alive.current && !document.hidden);
    } finally {
      loadingMessages.current = false;
      if (pendingMessages.current && alive.current && !paging.current) {
        pendingMessages.current = false;
        window.setTimeout(() => { if (alive.current) window.dispatchEvent(new Event(CHAT_REFRESH)); }, 100);
      }
    }
  }, [conversation.databaseId, draftKey, mergePersisted, setMessages, acknowledgeVisible]);
  const navigateHistory = useCallback(async (direction: "older" | "newer" | "latest", cursor?: string) => {
    if (!conversation.databaseId || paging.current) return false;
    paging.current = true; setPageLoading(true); setPageError(false);
    const epoch = ++historyEpoch.current;
    const area = scrollRef.current;
    const anchor = area && Array.from(area.querySelectorAll<HTMLElement>(".message-row")).find((row) => row.getBoundingClientRect().bottom > area.getBoundingClientRect().top);
    const position = anchor ? { id: anchor.id, top: anchor.getBoundingClientRect().top } : {};
    try {
      const page = await fetchMessageHistory(conversation.databaseId, direction === "older" ? { before: cursor } : direction === "newer" ? { after: cursor } : {});
      if (!alive.current || epoch !== historyEpoch.current) return false;
      const mapped = displayMessages(page.messages);
      const merged = direction === "latest" ? mapped : mergePersisted(currentMessages.current, mapped);
      const next = direction === "older" ? merged.slice(0, 200) : merged.slice(-200);
      historyMode.current = direction !== "latest";
      if (direction === "latest") { setTargetError(false); setTargetNotice(""); }
      setHistoryView(historyMode.current);
      nearBottom.current = direction === "latest";
      scrollAnchor.current = direction === "latest" ? { latest: true } : position;
      setMessages(() => next);
      if (direction === "older" || direction === "latest") setOlderCursor(page.nextCursor?.id ?? null);
      else if (merged.length > 200) setOlderCursor(next[0]?.id ?? null);
      setNewerAvailable(Boolean(page.latest && page.latest.id !== next.at(-1)?.id));
      lastCanonicalId.current = next.at(-1)?.id ?? null;
      setLoaded(true); setFetchError(false);
      acknowledgeVisible();
      return true;
    } catch { if (alive.current) setPageError(true); return false; }
    finally { paging.current = false; if (alive.current) { setPageLoading(false); window.dispatchEvent(new Event(CHAT_REFRESH)); } }
  }, [conversation.databaseId, mergePersisted, setMessages, acknowledgeVisible]);
  const { typingCount, connected, sendTyping } = realtime;
  useEffect(() => { if (loaded) communicationTiming("render", { rows: messages.length }); }, [messages, loaded]);
  useEffect(() => {
    if (!conversation.databaseId) return;
    alive.current = true;
    let active = true;
    const onVisible = () => void loadPersisted().catch(() => active && setFetchError(true));
    queueMicrotask(onVisible);
    const timer = window.setInterval(onVisible, connected ? 60000 : 12000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(CHAT_REFRESH, onVisible);
    return () => { active = false; alive.current = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener(CHAT_REFRESH, onVisible); };
  }, [conversation.databaseId, loadPersisted, connected]);
  useEffect(() => {
    if (!targetMessage || !conversation.databaseId) return;
    let active = true;
    let highlightTimer: ReturnType<typeof setTimeout> | undefined;
    const epoch = ++historyEpoch.current;
    // Target navigation must not consume latest unread while lookup is pending
    // or denied. Only explicit Latest/normal Chat consumption exits this hold.
    historyMode.current = true; nearBottom.current = false;
    paging.current = true;
    queueMicrotask(() => { if (active) { setHistoryView(true); setPageLoading(true); setTargetError(false); setTargetNotice("Locating message…"); } });
    void fetchMessageHistory(conversation.databaseId, { target: targetMessage }).then((page) => {
      if (!active || epoch !== historyEpoch.current) return;
      if (!page.messages.some((message) => message.id === targetMessage)) throw new Error("Source unavailable");
      historyMode.current = true; nearBottom.current = false;
      setHistoryView(true); setOlderCursor(page.nextCursor?.id ?? null);
      setNewerAvailable(Boolean(page.latest && page.latest.id !== targetMessage));
      scrollAnchor.current = { id: `message-${targetMessage}`, top: (scrollRef.current?.getBoundingClientRect().top ?? 0) + 80 };
      setMessages(() => displayMessages(page.messages));
      setLoaded(true); setFetchError(false);
      requestAnimationFrame(() => {
        if (!active) return;
        const node = document.getElementById(`message-${targetMessage}`);
        node?.classList.remove("message-source-highlight");
        // One quiet, non-flashing highlight; no permanent attention mutation.
        requestAnimationFrame(() => { if (active) { node?.classList.add("message-source-highlight"); node?.focus({ preventScroll: true }); setTargetNotice("Message located."); highlightTimer = setTimeout(() => { node?.classList.remove("message-source-highlight"); if (active) setTargetNotice(""); }, 4000); } });
      });
    }).catch(() => { if (active) { setTargetError(true); setTargetNotice(""); } }).finally(() => { if (active) { paging.current = false; setPageLoading(false); window.dispatchEvent(new Event(CHAT_REFRESH)); } });
    return () => { active = false; paging.current = false; clearTimeout(highlightTimer); document.getElementById(`message-${targetMessage}`)?.classList.remove("message-source-highlight"); };
  }, [conversation.databaseId, targetMessage, targetRetry, setMessages]);
  useEffect(() => {
    const locateAgain = (event: Event) => {
      const detail = (event as CustomEvent<MessageLocationRequest>).detail;
      if (detail?.conversationId === conversation.databaseId && detail.messageId === targetMessage) setTargetRetry((value) => value + 1);
    };
    window.addEventListener(MESSAGE_LOCATION_REQUEST, locateAgain);
    return () => window.removeEventListener(MESSAGE_LOCATION_REQUEST, locateAgain);
  }, [conversation.databaseId, targetMessage]);
  useLayoutEffect(() => {
    const area = scrollRef.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [conversation.slug]);
  useLayoutEffect(() => {
    const area = scrollRef.current;
    if (!area) return;
    const anchor = scrollAnchor.current;
    if (anchor) {
      const element = anchor.id ? document.getElementById(anchor.id) : null;
      if (anchor.latest) area.scrollTop = area.scrollHeight;
      else if (element && anchor.top !== undefined) area.scrollTop += element.getBoundingClientRect().top - anchor.top;
      else area.scrollTop = 0;
      scrollAnchor.current = null;
    } else if (nearBottom.current && !historyMode.current) area.scrollTop = area.scrollHeight;
  }, [messages]);
  const persist = (message: Message) => {
    if (conversation.kind === "my-room")
      prototypeStore.addSandboxMessage(message);
    else if (state.chats.some((chat) => chat.slug === conversation.slug))
      prototypeStore.addChatMessage(conversation.slug, message);
    else if (state.rooms.some((room) => room.slug === conversation.slug))
      prototypeStore.addRoomMessage(conversation.slug, message);
  };
  const send = async (body: string) => {
    if (historyMode.current && !await navigateHistory("latest")) {
      setMessageError("Latest messages couldn't be loaded. Your draft is still here.");
      return false;
    }
    const previous = chatDrafts.get(draftKey).pending;
    const rawBody = body;
    body = body.trim();
    const mentions = adjustMentions(rawBody, body, chatDrafts.get(draftKey).mentions ?? []);
    const id = previous?.body === body && previous.replyToId === reply?.id && JSON.stringify(previous.mentions ?? []) === JSON.stringify(mentions) ? previous.id : crypto.randomUUID();
    chatDrafts.update(draftKey, (current) => ({ ...current, pending: { id, body, replyToId: reply?.id, mentions } }));
    const message: Message = {
      id,
      authorId: identity?.userId,
      author: user.displayName,
      initials: user.initials,
      body,
      mentions,
      replyTo: reply?.body,
      replyToId: reply?.id,
      time: "Now",
      color: "gold",
      mine: true,
      createdAt: new Date().toISOString(),
    };
    nearBottom.current = true;
    setMessages((current) => [...current.filter((item) => item.id !== message.id), message]);
    setMessageError(null);
    if (!conversation.databaseId) {
      persist(message);
      chatDrafts.update(draftKey, (current) => acknowledgeDraft(current, id));
      return true;
    }
    try {
      const traceId = crypto.randomUUID(), started = performance.now();
      communicationTiming("send-start", { traceId });
      const saved = await sendMessageAction({ id: message.id, conversationId: conversation.databaseId, body, replyToId: reply?.id, traceId, mentions });
      communicationTiming("send-returned", { traceId, durationMs: performance.now() - started, ...saved.timing });
      chatDrafts.update(draftKey, (current) => acknowledgeDraft(current, id));
      if (saved.createdAt) setMessages((current) => mergePersisted(current, current.filter((item) => item.id === message.id).map((item) => ({ ...item, createdAt: saved.createdAt! }))));
      return true;
    } catch {
      // A canonical refresh can confirm the send before a delayed response fails.
      if (chatDrafts.get(draftKey).pending?.id !== id) return true;
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setMessageError("Delivery couldn't be confirmed. You can safely retry.");
      return false;
    }
  };
  const react = async (id: string, emoji: string, active: boolean) => {
    if (conversation.databaseId) {
      await setMessageReactionAction({ conversationId: conversation.databaseId, messageId: id, emoji, active });
      await loadPersisted();
    } else setMessages((current) => current.map((message) => {
      if (message.id !== id) return message;
      const values = message.reactionSummary ?? [...new Set(message.reactions ?? [])].map((value) => ({ emoji: value, count: message.reactions!.filter((item) => item === value).length, mine: false, participants: [] as string[] }));
      const previous = values.find((value) => value.emoji === emoji);
      const count = (previous?.count ?? 0) + (active && !previous?.mine ? 1 : !active && previous?.mine ? -1 : 0);
      return { ...message, reactionSummary: [...values.filter((value) => value.emoji !== emoji), { emoji, count, mine: active, participants: active ? [user.displayName] : [] }] };
    }));
  };
  const change = async (id: string, body?: string, remove?: boolean) => {
    if (conversation.databaseId) {
      await changeOwnMessageAction({ conversationId: conversation.databaseId, messageId: id, body, remove });
      await loadPersisted();
    } else setMessages((current) => current.map((message) => message.id === id ? { ...message, body: remove ? "Message deleted" : body!, deletedAt: remove ? new Date().toISOString() : null, editedAt: new Date().toISOString() } : message));
  };
  return (
    <section className="conversation-surface art-layer-ready" data-realtime={conversation.databaseId ? connected ? "connected" : "reconnecting" : undefined}>
      <span className="sr-only" role="status">{targetNotice}</span>
      <div
        ref={scrollRef}
        className={`message-scroll ${messages.length ? "" : "is-empty"}`}
        onScroll={(event) => {
          const area = event.currentTarget;
          nearBottom.current =
            area.scrollHeight - area.scrollTop - area.clientHeight < 80;
          if (!paging.current && !nearBottom.current && !historyMode.current && conversation.databaseId) {
            historyMode.current = true; historyEpoch.current++; setHistoryView(true);
          }
          if (nearBottom.current) acknowledgeVisible();
        }}
      >
        {conversation.databaseId && olderCursor ? <div className="history-page-controls"><button className="quiet-action" disabled={pageLoading} onClick={() => void navigateHistory("older", olderCursor)}>{pageLoading ? "Loading messages…" : "Older messages"}</button></div> : null}
        {pageError ? <p className="composer-error" role="alert">History couldn’t be loaded. Your place is saved; try the history control again.</p> : null}
        {targetError ? <p className="composer-error" role="alert">That message couldn’t be opened. Your draft is still here. <button className="quiet-action" onClick={() => setTargetRetry((value) => value + 1)}>Retry</button></p> : null}
        {messages.length ? (
          <>
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const grouped = groupMessages(previous, message);
              return (
              <Fragment key={message.id}>
              {!previous || messageDay(previous.createdAt) !== messageDay(message.createdAt) ? <div className="day-marker"><span>{messageDayLabel(message.createdAt)}</span></div> : null}
              <MessageBubble
                message={message}
                grouped={grouped}
                onReply={setReply}
                onReaction={react}
                onChange={change}
                onLocate={conversation.databaseId ? (id) => { if (id === targetMessage) setTargetRetry((value) => value + 1); else router.push(`${baseHref(conversation)}?message=${id}`, { scroll: false }); } : undefined}
                onPin={
                  conversation.databaseId || conversation.kind === "room"
                    ? async (item) => {
                        if (conversation.databaseId) await pinMessageToHallAction({ conversationId: conversation.databaseId, messageId: item.id });
                        else prototypeStore.pinMessageToHall({ slug: conversation.slug, name: conversation.name, message: item });
                      }
                    : undefined
                }
              />
              </Fragment>
              );
            })}
          </>
        ) : !loaded || fetchError ? (
          <p className="chat-load-state" role="status">{fetchError ? "Messages couldn't be loaded." : "Loading messages…"}</p>
        ) : (
          <div className="conversation-empty">
            <div className="empty-art" aria-hidden="true">
              <Image
                src="/brand/toskerlogo-icon-main.svg"
                alt=""
                width={60}
                height={60}
              />
              <i>✦</i>
              <i>⌁</i>
            </div>
            <h2>
              {conversation.kind === "my-room"
                ? "This one's yours"
                : "It's quiet in here"}
            </h2>
            <p>
              {conversation.kind === "my-room"
                ? "Keep a thought or send yourself a note."
                : "Invite someone or say something!"}
            </p>
          </div>
        )}
      </div>
      {historyView ? <div className="history-latest"><button className="quiet-action" disabled={pageLoading} onClick={() => void navigateHistory("latest")}>{newerAvailable ? "New messages · Latest" : "Latest messages"}<ArrowUp size={14} className="point-down" aria-hidden="true" /></button>{newerAvailable ? <button className="quiet-action" disabled={pageLoading} onClick={() => void navigateHistory("newer", messages.at(-1)?.id)}>Newer messages</button> : null}</div> : null}
      <Composer
        value={draft.body}
        onValue={(body) => {
          chatDrafts.update(draftKey, (current) => ({ ...current, body, mentions: adjustMentions(current.body, body, current.mentions ?? []) }));
          setMessageError((current) => current === "Use up to 10 mentions per message." ? null : current);
        }}
        mentionConversationId={conversation.kind === "room" ? conversation.databaseId : undefined}
        onMention={(body, span) => {
          const current = chatDrafts.get(draftKey);
          const mentions = [...adjustMentions(current.body, body, current.mentions ?? []), span].sort((a, b) => a.start - b.start);
          if (mentions.length > 10) { setMessageError("Use up to 10 mentions per message."); return false; }
          chatDrafts.update(draftKey, (value) => ({ ...value, body, mentions }));
          setMessageError(null);
          return true;
        }}
        onTyping={sendTyping}
        name={titleOf(conversation)}
        reply={reply}
        onCancelReply={() => setReply(null)}
        onSend={send}
      />
      {conversation.databaseId ? <p className="chat-transport-status" role="status" aria-live="polite">
        {typingCount ? conversation.kind === "personal" ? `${titleOf(conversation)} is typing…` : typingCount === 1 ? "Someone is typing…" : "People are typing…" : !connected ? "Connecting to live updates…" : ""}
      </p> : null}
      {messageError ? <p className="composer-error" role="alert">{messageError}</p> : null}
      {fetchError ? <p className="composer-error" role="alert">Updates unavailable. <button onClick={() => { setFetchError(false); void loadPersisted().catch(() => setFetchError(true)); }}>Retry</button></p> : null}
    </section>
  );
}

function HallCard({ notice }: { notice: (typeof hallNotices)[number] }) {
  return (
    <article
      className={`notice-card notice-${notice.accent}`}
    >
      <span className="notice-icon">{notice.icon}</span>
      <div>
        <small>{notice.category}</small>
        <h3>{notice.title}</h3>
        <p>{notice.body}</p>
        <footer>
          {notice.author} · {notice.time}
        </footer>
      </div>
    </article>
  );
}

type HallSurfaceItem = {
  id: string;
  kind: "note" | "pinned_message" | "pinned-message";
  title: string | null;
  body: string;
  author: string;
  authorId?: string;
  canModerate?: boolean;
  archived?: boolean;
  createdAt?: string;
  time?: string;
  color?: string;
  position?: number;
  archivedAt?: string | null;
  sourceMessageId?: string | null;
  imagePath?: string | null;
  imageAlt?: string | null;
  commentCount?: number;
  reactions?: Array<{ reaction: HallReaction; count: number; mine: boolean }>;
};

const hallColors = ["neutral", "ivory", "gold", "pink", "green", "blue"] as const;

function PersistentHallCard({
  item,
  conversation,
  onColor,
  onReorder,
  onArchive,
  onRestore,
  onNuke,
  onUnpin,
  onChanged,
  onEdit,
  dragging,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  busy,
  canEarlier,
  canLater,
  mutationError,
}: {
  item: HallSurfaceItem;
  conversation: Conversation;
  onColor: (color: string) => void;
  onReorder: (direction: "left" | "right") => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onNuke?: () => Promise<boolean>;
  onUnpin: () => void;
  onChanged: () => Promise<void>;
  onEdit?: () => void;
  dragging: boolean;
  dropTarget: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  busy: boolean;
  canEarlier: boolean;
  canLater: boolean;
  mutationError: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissLayer(open, () => { setOpen(false); setColorsOpen(false); }, ref);
  const pinned = item.kind === "pinned_message" || item.kind === "pinned-message";
  const archived = Boolean(item.archivedAt || item.archived);
  return (
    <article data-hall-id={item.id} aria-busy={busy} onDragOver={archived ? undefined : onDragOver} onDrop={archived ? undefined : onDrop} className={`notice-card hall-object hall-local-${pinned ? "pinned-message" : "note"} hall-color-${item.color ?? "neutral"} ${dragging ? "hall-dragging" : ""} ${dropTarget ? "hall-drop-target" : ""}`}>
      <span className="notice-icon">{pinned ? "⌖" : "✎"}</span>
      <div>
        {pinned ? <small>Pinned from Chat</small> : null}
        <h3>{item.title ?? "Pinned from Chat"}</h3>
        <p>{item.body}</p>
        <footer>{item.author}</footer>
      </div>
      {!archived ? <button className="hall-drag-handle" disabled={busy || (!canEarlier && !canLater)} draggable={!busy} onDragStart={onDragStart} onDragEnd={onDragEnd} aria-label={`Reorder ${item.title ?? "pinned message"}; use arrow keys to move`} title="Drag to reorder · Arrow keys to move" onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) { event.preventDefault(); const earlier = event.key === "ArrowLeft" || event.key === "ArrowUp"; if (earlier ? canEarlier : canLater) onReorder(earlier ? "left" : "right"); }
      }}><GripVertical size={16} /></button> : null}
      {!archived && !pinned && conversation.databaseId ? <HallNoteInteractions conversationId={conversation.databaseId} item={item} onChanged={onChanged} /> : null}
      {!archived || onRestore || onNuke ? <button className="hall-card-more" disabled={busy} onClick={() => { openLayer(); setOpen((value) => !value); }} aria-label={`Actions for ${item.title ?? "Pinned message"}`} aria-expanded={open}>
        <MoreHorizontal size={15} />
      </button> : null}
      {open ? (
        <div ref={ref} className="context-menu hall-context" role="menu">
          {pinned ? <button disabled={busy} onClick={() => { setOpen(false); onUnpin(); }}>Unpin from Hall</button> : <>
            {archived ? onRestore ? <button disabled={busy} onClick={() => { setOpen(false); onRestore(); }}>Restore</button> : null : <>
            {onEdit ? <button onClick={() => { setOpen(false); onEdit(); }}>Edit</button> : null}
            <button onClick={() => setColorsOpen((value) => !value)} aria-expanded={colorsOpen}>Change color</button>
            {colorsOpen ? <div className="hall-color-options" role="group" aria-label="Hall note colors">{hallColors.map((color) => <button key={color} className={`hall-color-choice hall-color-${color}`} aria-label={color} aria-pressed={(item.color ?? "neutral") === color} disabled={busy} onClick={() => { onColor(color); setOpen(false); }}>{color}</button>)}</div> : null}
            {onArchive ? <button disabled={busy} onClick={() => { setOpen(false); onArchive(); }}>Archive</button> : null}
            </>}
            {onNuke ? <button className="danger" disabled={busy} onClick={() => { setOpen(false); setConfirming(true); }}>Nuke</button> : null}
          </>}
          {!archived ? <><button disabled={busy || !canEarlier} onClick={() => { onReorder("left"); setOpen(false); }}>Move earlier</button>
          <button disabled={busy || !canLater} onClick={() => { onReorder("right"); setOpen(false); }}>Move later</button></> : null}
          {pinned && item.sourceMessageId && conversation.databaseId ? <Link href={`${baseHref(conversation)}?message=${item.sourceMessageId}`} onClick={() => setOpen(false)}>Open in Chat</Link> : null}
        </div>
      ) : null}
      {confirming && onNuke ? <ModalLayer onClose={() => { if (!busy) setConfirming(false); }}><section className="creation-panel hall-nuke-panel" role="alertdialog" aria-label="Nuke note confirmation"><h2>Nuke this note?</h2><p>The note, comments and reactions will be permanently deleted. This cannot be undone.</p><div className="overlay-actions"><button disabled={busy} onClick={() => setConfirming(false)}>Cancel</button><button className="danger" disabled={busy} onClick={async () => { if (await onNuke()) setConfirming(false); }}>{busy ? "Deleting…" : "Nuke"}</button></div>{mutationError ? <p role="alert">{mutationError}</p> : null}</section></ModalLayer> : null}
    </article>
  );
}

export function HallSurface({
  conversation,
  empty,
  connected,
  manualUnreadId,
  readingPaused = false,
}: {
  conversation: Conversation;
  empty: boolean;
  connected: boolean;
  manualUnreadId?: string | null;
  readingPaused?: boolean;
}) {
  const currentUser = useCurrentToskerUser();
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const room = state.rooms.find((item) => item.slug === conversation.slug);
  const [creating, setCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [persistentItems, setPersistentItems] = useState<HallSurfaceItem[]>([]);
  const [archivedView, setArchivedView] = useState(false);
  const currentHallView = useRef(false);
  const [loaded, setLoaded] = useState(!conversation.databaseId);
  const [operationBusy, setOperationBusy] = useState(false);
  const draftNoteId = useRef<string | null>(null);
  const [hallError, setHallError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [orderNotice, setOrderNotice] = useState("");
  const mutating = useRef(false);
  const noteRef = useRef<HTMLElement>(null);
  useDismissLayer(creating, () => { if (!saving) setCreating(false); }, noteRef);
  const localItems = (room?.hallItems ?? []).filter((item) => Boolean(item.archived) === archivedView);
  useEffect(() => {
    if (!conversation.databaseId) return;
    let active = true;
    let inFlight = false;
    let pending = false;
    let pendingTimer: number | undefined;
    const refresh = async () => {
      if (document.hidden || !active) return;
      if (inFlight || mutating.current) { pending = true; return; }
      pending = false;
      inFlight = true;
      try {
        const snapshot = await listHallSnapshotAction(conversation.databaseId!, archivedView);
        if (active && !document.hidden && !mutating.current) {
          setPersistentItems(snapshot.items);
          setLoaded(true); setHallError("");
          if (!archivedView && !readingPaused) await markConversationReadAction(conversation.databaseId!, "hall", undefined, snapshot.activityIds, manualUnreadId);
        }
      } catch { if (active) setHallError("Hall couldn't be loaded."); }
      finally { inFlight = false; if (pending && active) pendingTimer = window.setTimeout(refresh, 100); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), connected ? 60000 : 12000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(HALL_REFRESH, refresh);
    return () => { active = false; window.clearInterval(timer); window.clearTimeout(pendingTimer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener(HALL_REFRESH, refresh); };
  }, [conversation.databaseId, connected, archivedView, manualUnreadId, readingPaused]);
  const runMutation = async (operation: () => Promise<void>) => {
    if (mutating.current) return false;
    mutating.current = true;
    setOperationBusy(true);
    setHallError("");
    let changed = false;
    try { await operation(); changed = true; await refreshPersistentItems(); }
    catch { setHallError(changed ? "Change saved. Refresh Hall to see it." : "That change couldn't be saved. Please try again."); }
    finally { mutating.current = false; setOperationBusy(false); window.dispatchEvent(new Event(HALL_REFRESH)); }
    return changed;
  };
  const reorder = (itemId: string, direction?: "left" | "right", dropId?: string) => {
    const databaseId = conversation.databaseId;
    const from = displayedItems.findIndex((item) => item.id === itemId);
    const to = dropId ? displayedItems.findIndex((item) => item.id === dropId) : from + (direction === "left" ? -1 : 1);
    if (archivedView || from < 0 || to < 0 || to >= displayedItems.length || to === from || mutating.current) return;
    if (databaseId) {
      const previous = persistentItems;
      const next = [...previous];
      next.splice(to, 0, next.splice(from, 1)[0]);
      setPersistentItems(next);
      void runMutation(async () => {
        try { await reorderHallItemAction({ conversationId: databaseId, itemId, direction, targetId: dropId }); setOrderNotice(`Moved to position ${to + 1}.`); }
        catch (error) { setPersistentItems(previous); throw error; }
      });
    } else {
      for (let index = 0; index < Math.abs(to - from); index++) prototypeStore.reorderHallItem(conversation.slug, itemId, to < from ? "left" : "right");
      setOrderNotice(`Moved to position ${to + 1}.`);
    }
  };
  const displayedItems = conversation.databaseId ? persistentItems : localItems;
  const refreshPersistentItems = useCallback(async () => {
    const databaseId = conversation.databaseId;
    if (!databaseId) return;
    try {
      const next = await listHallItemsAction(databaseId, archivedView);
      if (currentHallView.current !== archivedView) return;
      setPersistentItems(next);
      setLoaded(true); setHallError("");
    } catch (error) {
      if (currentHallView.current !== archivedView) return;
      setHallError("Hall couldn't be refreshed.");
      throw error;
    }
  }, [conversation.databaseId, archivedView, setPersistentItems, setLoaded, setHallError]);
  const contextual =
    conversation.kind === "my-room"
      ? {
          title: "Your important stuff",
          support: "Pin thoughts, links, and things worth keeping",
        }
      : conversation.kind === "personal"
        ? {
            title: `What you and ${conversation.name.split(" ")[0]} kept`,
            support: "The useful bits from this conversation",
          }
        : {
            title: "What everyone needs to know",
            support: "",
          };
  const isEmpty = (empty || Boolean(conversation.databaseId)) && displayedItems.length === 0;
  return (
    <section
      className={`hall-surface art-layer-ready ${isEmpty ? "hall-is-empty" : ""}`}
    >
      <header>
        <div>
          <h2>{archivedView ? "Archived notes" : contextual.title}</h2>
          {conversation.kind === "room" && contextual.support ? <p>{contextual.support}</p> : null}
        </div>
        <div className="hall-view-switch" role="group" aria-label="Hall view">{[false, true].map((archived) => <button key={String(archived)} aria-pressed={archivedView === archived} disabled={operationBusy || saving} onClick={() => { if (archivedView === archived) return; currentHallView.current = archived; setArchivedView(archived); setPersistentItems([]); setLoaded(!conversation.databaseId); setHallError(""); }}>{archived ? "Archived" : "Board"}</button>)}</div>
      </header>
      {!loaded && !hallError ? <p className="hall-load-status" role="status">Loading Hall…</p> : null}
      {loaded && archivedView && !displayedItems.length ? <p role="status">No archived notes.</p> : null}
      <div className="notice-list">
          {!archivedView ? <button className="new-hall-card" disabled={operationBusy} onClick={() => { draftNoteId.current = null; setEditingItem(null); setNoteTitle(""); setNoteBody(""); setHallError(""); setCreating(true); }}>
            <Plus size={16} /> New Note
          </button> : null}
          {displayedItems.map((item, index) => <PersistentHallCard key={item.id} item={item} conversation={conversation} busy={operationBusy} mutationError={hallError} canEarlier={index > 0} canLater={index < displayedItems.length - 1}
            onChanged={refreshPersistentItems} dragging={draggingId === item.id} dropTarget={targetId === item.id}
            onEdit={item.kind === "note" && (("authorId" in item && item.authorId === currentUser?.userId) || !conversation.databaseId) ? () => { setEditingItem(item.id); setNoteTitle(item.title ?? ""); setNoteBody(item.body); setCreating(true); } : undefined}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-tosker-hall", item.id);
              const card = event.currentTarget.closest<HTMLElement>("[data-hall-id]");
              if (card) { const rect = card.getBoundingClientRect(); event.dataTransfer.setDragImage(card, event.clientX - rect.left, event.clientY - rect.top); }
              setDraggingId(item.id);
            }}
            onDragEnd={() => { setDraggingId(null); setTargetId(null); }}
            onDragOver={(event) => { if (draggingId && draggingId !== item.id) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setTargetId(item.id); } }}
            onDrop={(event) => { event.preventDefault(); if (draggingId && event.dataTransfer.getData("application/x-tosker-hall") === draggingId) reorder(draggingId, undefined, item.id); setDraggingId(null); setTargetId(null); }}
            onColor={(color) => { const databaseId = conversation.databaseId; if (databaseId) void runMutation(() => changeHallItemColorAction({ conversationId: databaseId, itemId: item.id, color })); else prototypeStore.updateHallItem(conversation.slug, item.id, { color: color as "neutral" | "ivory" | "gold" | "pink" | "green" | "blue" }); }}
            onReorder={(direction) => reorder(item.id, direction)}
            onArchive={!archivedView && (!conversation.databaseId || ("canModerate" in item && item.canModerate)) ? () => { const databaseId = conversation.databaseId; if (databaseId) void runMutation(() => archiveHallNoteAction({ conversationId: databaseId, itemId: item.id })); else prototypeStore.archiveHallItem(conversation.slug, item.id); } : undefined}
            onRestore={archivedView && (!conversation.databaseId || ("canModerate" in item && item.canModerate)) ? () => { const databaseId = conversation.databaseId; if (databaseId) void runMutation(() => restoreHallNoteAction({ conversationId: databaseId, itemId: item.id })); else prototypeStore.updateHallItem(conversation.slug, item.id, { archived: false }); } : undefined}
            onNuke={!conversation.databaseId || ("canModerate" in item && item.canModerate) ? async () => { const databaseId = conversation.databaseId; if (databaseId) return runMutation(() => nukeHallNoteAction({ conversationId: databaseId, itemId: item.id })); prototypeStore.nukeHallItem(conversation.slug, item.id); return true; } : undefined}
            onUnpin={() => { const databaseId = conversation.databaseId; if (databaseId) void runMutation(() => unpinHallItemAction({ conversationId: databaseId, itemId: item.id })); else prototypeStore.unpinHallItem(conversation.slug, item.id); }} />)}
          {!empty && !archivedView
            ? hallNotices.map((notice) => (
                <HallCard notice={notice} key={notice.id} />
              ))
            : null}
        </div>
      {creating ? (
        <ModalLayer onClose={() => { if (!saving) setCreating(false); }}>
          <section ref={noteRef} className="creation-panel hall-note-panel" role="dialog" aria-modal="true" aria-labelledby="hall-note-title">
            <button className="overlay-close" disabled={saving} onClick={() => setCreating(false)} aria-label="Close"><X size={17} /></button>
            <h2 id="hall-note-title" className="note-editor-label">{editingItem ? "Edit note" : "New note"}</h2>
            <div className="composed-note-editor">
              <input autoFocus aria-label="Title" placeholder="Title" value={noteTitle} disabled={saving} onChange={(event) => { draftNoteId.current = null; setNoteTitle(event.target.value); }} maxLength={80} />
              <textarea aria-label="Note" placeholder="Note / description" maxLength={4000} disabled={saving} value={noteBody} onChange={(event) => { draftNoteId.current = null; setNoteBody(event.target.value); }} rows={5} />
            </div>
            <div className="wizard-actions"><button className="button button-primary primary-action" disabled={!noteTitle.trim() || saving} onClick={async () => {
              if (saving) return;
              setSaving(true); setHallError("");
              if (conversation.databaseId) {
                let saved = false;
                try {
                  if (editingItem) await editHallNoteAction({ conversationId: conversation.databaseId, itemId: editingItem, title: noteTitle, body: noteBody });
                  else { draftNoteId.current ??= crypto.randomUUID(); await createHallNoteAction({ id: draftNoteId.current, conversationId: conversation.databaseId, title: noteTitle, body: noteBody }); }
                  saved = true;
                  setPersistentItems(await listHallItemsAction(conversation.databaseId));
                } catch { setHallError(saved ? "Note saved. Refresh Hall to see it." : "Hall note couldn't be saved. Please try again."); if (saved) setCreating(false); setSaving(false); return; }
              } else if (editingItem) prototypeStore.updateHallItem(conversation.slug, editingItem, { title: noteTitle, body: noteBody });
              else prototypeStore.addHallNote({ slug: conversation.slug, name: conversation.name, title: noteTitle, body: noteBody });
              setCreating(false); setNoteTitle(""); setNoteBody(""); setSaving(false);
            }}>{saving ? "Saving…" : editingItem ? "Save" : "Add note"}</button></div>
            {hallError ? <p role="alert">{hallError}</p> : null}
          </section>
        </ModalLayer>
      ) : null}
      {hallError ? <p role="alert">{hallError} {conversation.databaseId ? <button className="quiet-action" disabled={operationBusy} onClick={() => void refreshPersistentItems().catch(() => undefined)}>Refresh Hall</button> : null}</p> : null}
      <span className="sr-only" role="status">{orderNotice}</span>
    </section>
  );
}
