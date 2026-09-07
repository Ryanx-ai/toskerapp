"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { changeOwnMessageAction, listMessagesAction, markConversationReadAction, sendMessageAction, setMessageReactionAction } from "@/server/conversations/actions";
import { archiveHallNoteAction, changeHallItemColorAction, createHallNoteAction, editHallNoteAction, listHallItemsAction, nukeHallNoteAction, pinMessageToHallAction, reorderHallItemAction, unpinHallItemAction } from "@/server/shared-state/actions";
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
import { EmojiPicker } from "./emoji-picker";
import { InteractionPopover } from "./interaction-popover";
import { ModalLayer } from "./modal-layer";
import type { HallReaction } from "@/lib/hall-contract";
import {
  CalendarDays,
  ArrowLeft,
  GripVertical,
  File,
  ImageIcon,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Search,
  ArrowUp,
  ChevronDown,
  Settings,
  Smile,
  Video,
  X,
} from "lucide-react";

const utilityCopy: Record<string, string> = {
  Search: "Search this conversation.",
  Voice: "Voice calls are coming later.",
  Video: "Video calls are coming later.",
  Calendar: "Calendar isn't connected yet.",
  Settings: "More settings are coming later.",
  More: "More conversation tools will live here.",
};
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

function UtilityButton({
  label,
  icon: Icon,
  onOpen,
  expanded,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  onOpen: (label: string) => void;
  expanded: boolean;
}) {
  return (
    <button
      className="action-icon"
      data-tip={label}
      aria-label={label}
      aria-expanded={expanded}
      onClick={() => onOpen(label)}
    >
      <Icon size={16} />
    </button>
  );
}

export function SurfaceHeader({
  conversation,
  surface,
  onAdd,
  onInvite,
  onAddSubroom,
  chatUnread = 0,
  hallUnread = 0,
}: {
  conversation: Conversation;
  surface: "chat" | "hall";
  onAdd: () => void;
  onInvite?: () => void;
  onAddSubroom?: () => void;
  chatUnread?: number;
  hallUnread?: number;
}) {
  const user = useCurrentToskerUser() ?? prototypeUser;
  const identity = useToskerIdentity();
  const parentRoom = conversation.kind === "room" ? identity?.rooms.find((room) => room.slug === conversation.slug.split("--")[0]) : undefined;
  const [contextAnchor, setContextAnchor] = useState<HTMLElement | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismissLayer(Boolean(panel), () => setPanel(null), popoverRef);
  const utilities: Array<[string, React.ComponentType<{ size?: number }>]> =
    conversation.kind === "my-room"
      ? [
          ["Search", Search],
          ["Calendar", CalendarDays],
          ["Settings", Settings],
          ["More", MoreHorizontal],
        ]
      : [
          ["Search", Search],
          ["Voice", Phone],
          ["Video", Video],
          ["Calendar", CalendarDays],
          ["Settings", Settings],
          ["More", MoreHorizontal],
        ];
  const showPanel = (label: string) => {
    openLayer();
    setPanel(label);
  };
  return (
    <header className="conversation-header">
      <div className="header-identity-zone">
        <Link href="/app" className="mobile-back" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <span
          className={`avatar avatar-${conversation.color} avatar-pattern ${conversation.kind === "room" ? "avatar-room" : ""} avatar-large`}
          role={conversation.kind === "room" ? "img" : undefined}
          aria-label={
            conversation.kind === "room"
              ? `${titleOf(conversation, user.displayName)} Room`
              : undefined
          }
        >
          {conversation.initials}
        </span>
        <div className="active-copy">
          {parentRoom ? <button className="room-context-trigger" aria-label={`Switch Room context: ${parentRoom.name}${conversation.tag === "SUBROOM" ? ` / ${conversation.name}` : ""}`} aria-haspopup="dialog" aria-expanded={Boolean(contextAnchor)} onClick={(event) => setContextAnchor(event.currentTarget)}><span>{parentRoom.name}</span><ChevronDown size={15} /></button> : <h2>{titleOf(conversation, user.displayName)}</h2>}
          {conversation.kind === "personal" && conversation.presenceStatus ? <span className="header-presence"><i className={`presence-mark ${conversation.presenceStatus}`} aria-label={{ online: "Online", idle: "Idle", away: "Away", meeting: "In a meeting" }[conversation.presenceStatus]} />{{ online: "Online", idle: "Idle", away: "Away", meeting: "In a meeting" }[conversation.presenceStatus]}</span> : null}
          {conversation.kind === "room" && conversation.context ? <span>{parentRoom ? conversation.name : conversation.context}</span> : null}
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
          Chat{chatUnread ? <i className="surface-unread-dot" aria-label={`${chatUnread} new messages`} /> : null}
        </Link>
        <Link
          className={surface === "hall" ? "active" : ""}
          aria-current={surface === "hall" ? "page" : undefined}
          href={`${baseHref(conversation)}/hall`}
        >
          Hall{hallUnread ? <i className="surface-unread-dot" aria-label="New Hall activity" /> : null}
        </Link>
        <button onClick={onAdd} aria-label="Add Gizmo">
          <Plus size={15} />
          <small>Add</small>
        </button>
      </nav>
      <div className="header-utilities">
        {utilities.map(([label, icon]) => (
          <UtilityButton
            key={label}
            label={label}
            icon={icon}
            onOpen={showPanel}
            expanded={panel === label}
          />
        ))}
      </div>
      {panel ? (
        <div ref={popoverRef} className="header-popover" role="dialog">
          <strong>{panel}</strong>
          {panel === "More" ? utilities.filter(([label]) => label !== "More").map(([label]) => <button key={label} onClick={() => setPanel(label)}>{label}</button>) : <><p>{utilityCopy[panel]}</p><button onClick={() => setPanel(null)}>Got it</button></>}
        </div>
      ) : null}
      {contextAnchor && parentRoom ? <InteractionPopover anchor={contextAnchor} label="Room contexts" onClose={() => setContextAnchor(null)}><nav className="room-context-menu" aria-label="Room and Subrooms">
        <Link href={`/room/${parentRoom.slug}`} aria-current={conversation.slug === parentRoom.slug ? "page" : undefined} onClick={() => setContextAnchor(null)}>{parentRoom.name}</Link>
        {parentRoom.subrooms.map((child) => <Link key={child.id} className="context-child" href={`/room/${parentRoom.slug}/subroom/${child.id}`} aria-current={conversation.slug.endsWith(`--${child.id}`) ? "page" : undefined} onClick={() => setContextAnchor(null)}>{child.name}</Link>)}
        {parentRoom.role === "owner" && onAddSubroom ? <><hr /><button onClick={() => { setContextAnchor(null); onAddSubroom(); }}><Plus size={15} />Add Subroom</button></> : null}
      </nav></InteractionPopover> : null}
    </header>
  );
}


function Composer({
  name,
  reply,
  onCancelReply,
  onSend,
}: {
  name: string;
  reply: Message | null;
  onCancelReply: () => void;
  onSend: (body: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  const [toolNote, setToolNote] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const send = async () => {
    if (!value.trim() || sending) return;
    const draft = value;
    setSending(true);
    try {
      if (await onSend(draft.trim())) setValue((current) => current === draft ? "" : current);
    } finally { setSending(false); }
    inputRef.current?.focus({ preventScroll: true });
  };
  return (
    <div className="composer-wrap">
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
          <button aria-label="Attach" onClick={() => setToolNote("Attachments are planned for a later milestone.")}>
            <Paperclip size={17} />
          </button>
          <button aria-label="Add image" onClick={() => setToolNote("Image sharing is planned for a later milestone.")}>
            <ImageIcon size={17} />
          </button>
          <button aria-label="Add file" onClick={() => setToolNote("File sharing is planned for a later milestone.")}>
            <File size={17} />
          </button>
          <button aria-label="Add emoji" onClick={(event) => setEmojiAnchor(event.currentTarget)}>
            <Smile size={17} />
          </button>
        </div>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
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
      {toolNote ? <p className="composer-hint" role="status">{toolNote}</p> : null}
      {emojiAnchor ? <InteractionPopover anchor={emojiAnchor} label="Insert emoji" onClose={() => setEmojiAnchor(null)}><EmojiPicker onClose={() => setEmojiAnchor(null)} onPick={(emoji) => {
        const input = inputRef.current;
        const from = input?.selectionStart ?? value.length, to = input?.selectionEnd ?? value.length;
        setValue((current) => (current.slice(0, from) + emoji + current.slice(to)).slice(0, 8000));
        setEmojiAnchor(null);
        requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(from + emoji.length, from + emoji.length); });
      }} /></InteractionPopover> : null}
    </div>
  );
}

export function ChatSurface({ conversation }: { conversation: Conversation }) {
  const user = useCurrentToskerUser() ?? prototypeUser;
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const initial =
    conversation.kind === "my-room"
      ? state.sandboxMessages.length
        ? state.sandboxMessages
        : state.mode === "demo"
          ? conversation.messages
          : []
      : conversation.messages;
  const [messages, setMessages] = useState(initial);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [reply, setReply] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const alive = useRef(true);
  const loadingMessages = useRef(false);
  const readThrough = useRef<string | null>(null);
  const mergePersisted = useCallback((current: Message[], incoming: Message[]) => {
    const byId = new Map(current.map((message) => [message.id, message]));
    let changed = false;
    incoming.forEach((message) => {
      const previous = byId.get(message.id);
      if (!previous || previous.createdAt !== message.createdAt || previous.body !== message.body || previous.author !== message.author || previous.replyTo !== message.replyTo || previous.editedAt !== message.editedAt || previous.deletedAt !== message.deletedAt || JSON.stringify(previous.reactionSummary) !== JSON.stringify(message.reactionSummary)) {
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
  const loadPersisted = useCallback(async () => {
    if (!conversation.databaseId || document.hidden || loadingMessages.current) return;
    loadingMessages.current = true;
    try {
    const { messages: persisted } = await listMessagesAction(conversation.databaseId);
    if (!alive.current || document.hidden) return;
    const mapped = persisted.map((message) => ({
      id: message.id,
      authorId: message.authorId,
      createdAt: message.createdAt,
      author: message.author,
      initials: message.author.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      body: message.body,
      reactionSummary: message.reactionSummary,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      replyToId: message.replyToId,
      replyTo: message.replyTo ?? undefined,
      time: new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      color: message.mine ? "gold" : "pink",
      mine: message.mine,
    } satisfies Message));
    setMessages((current) => mergePersisted(current, mapped));
    const latest = persisted.at(-1)?.id ?? "empty";
    if (readThrough.current !== latest) {
      await markConversationReadAction(conversation.databaseId, "chat");
      readThrough.current = latest;
    }
    } finally { loadingMessages.current = false; }
  }, [conversation.databaseId, mergePersisted]);
  const lastMessageId = messages.at(-1)?.id;
  useEffect(() => {
    if (!conversation.databaseId) return;
    alive.current = true;
    let active = true;
    queueMicrotask(() => void loadPersisted().catch(() => active && setMessageError("Messages couldn't be loaded. Try again.")));
    const timer = window.setInterval(() => void loadPersisted().catch(() => undefined), 12000);
    const onVisible = () => void loadPersisted().catch(() => undefined);
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; alive.current = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [conversation.databaseId, loadPersisted]);
  useLayoutEffect(() => {
    const area = scrollRef.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [conversation.slug]);
  useEffect(() => {
    const area = scrollRef.current;
    if (area && nearBottom.current)
      area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
  }, [lastMessageId]);
  const persist = (message: Message) => {
    if (conversation.kind === "my-room")
      prototypeStore.addSandboxMessage(message);
    else if (state.chats.some((chat) => chat.slug === conversation.slug))
      prototypeStore.addChatMessage(conversation.slug, message);
    else if (state.rooms.some((room) => room.slug === conversation.slug))
      prototypeStore.addRoomMessage(conversation.slug, message);
  };
  const send = async (body: string) => {
    const message: Message = {
      id: crypto.randomUUID(),
      author: user.displayName,
      initials: user.initials,
      body,
      replyTo: reply?.body,
      replyToId: reply?.id,
      time: "Now",
      color: "gold",
      mine: true,
      createdAt: new Date().toISOString(),
    };
    nearBottom.current = true;
    setMessages((current) => [...current, message]);
    setMessageError(null);
    if (!conversation.databaseId) {
      persist(message);
      setReply(null);
      return true;
    }
    try {
      await sendMessageAction({ id: message.id, conversationId: conversation.databaseId, body, replyToId: reply?.id });
      setReply((current) => current?.id === reply?.id ? null : current);
      return true;
    } catch {
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setMessageError("That message wasn't sent. Please try again.");
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
    <section className="conversation-surface art-layer-ready">
      <div
        ref={scrollRef}
        className={`message-scroll ${messages.length ? "" : "is-empty"}`}
        onScroll={(event) => {
          const area = event.currentTarget;
          nearBottom.current =
            area.scrollHeight - area.scrollTop - area.clientHeight < 80;
        }}
      >
        {messages.length ? (
          <>
            <div className="day-marker">
              <span>Today</span>
            </div>
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const grouped = Boolean(previous && previous.authorId && message.authorId && previous.authorId === message.authorId && message.createdAt && previous.createdAt && Date.parse(message.createdAt) - Date.parse(previous.createdAt) <= 60_000);
              return (
              <MessageBubble
                key={message.id}
                message={message}
                grouped={grouped}
                onReply={setReply}
                onReaction={react}
                onChange={change}
                onPin={
                  conversation.kind === "room"
                    ? async (item) => {
                        if (conversation.databaseId) await pinMessageToHallAction({ conversationId: conversation.databaseId, messageId: item.id });
                        else prototypeStore.pinMessageToHall({ slug: conversation.slug, name: conversation.name, message: item });
                      }
                    : undefined
                }
              />
              );
            })}
          </>
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
                ? "Links, thoughts, notes, explore plugins"
                : "Invite someone or say something!"}
            </p>
          </div>
        )}
      </div>
      <Composer
        name={titleOf(conversation)}
        reply={reply}
        onCancelReply={() => setReply(null)}
        onSend={send}
      />
      {messageError ? <p className="composer-error" role="alert">{messageError}</p> : null}
    </section>
  );
}

function HallCard({ notice }: { notice: (typeof hallNotices)[number] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissLayer(open, () => setOpen(false), ref);
  return (
    <article
      className={`notice-card notice-${notice.accent}`}
      onContextMenu={(event) => {
        event.preventDefault();
        openLayer();
        setOpen(true);
      }}
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
      <button
        className="hall-card-more"
        onClick={() => {
          openLayer();
          setOpen(true);
        }}
        aria-label={`Actions for ${notice.title}`}
      >
        <MoreHorizontal size={15} />
      </button>
      {open ? (
        <div ref={ref} className="context-menu hall-context">
          <button onClick={() => { navigator.clipboard?.writeText(notice.title); setOpen(false); }}>
            Copy title
          </button>
        </div>
      ) : null}
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
}: {
  item: HallSurfaceItem;
  conversation: Conversation;
  onColor: (color: string) => void;
  onReorder: (direction: "left" | "right") => void;
  onArchive: () => void;
  onNuke: () => void;
  onUnpin: () => void;
  onChanged: () => Promise<void>;
  onEdit?: () => void;
  dragging: boolean;
  dropTarget: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissLayer(open || confirming, () => { setOpen(false); setConfirming(false); setColorsOpen(false); }, ref);
  const pinned = item.kind === "pinned_message" || item.kind === "pinned-message";
  return (
    <article data-hall-id={item.id} onDragOver={onDragOver} onDrop={onDrop} className={`notice-card hall-object hall-local-${pinned ? "pinned-message" : "note"} hall-color-${item.color ?? "neutral"} ${dragging ? "hall-dragging" : ""} ${dropTarget ? "hall-drop-target" : ""}`}>
      <span className="notice-icon">{pinned ? "⌖" : "✎"}</span>
      <div>
        {pinned ? <small>Pinned from Chat</small> : null}
        <h3>{item.title ?? "Pinned from Chat"}</h3>
        <p>{item.body}</p>
      </div>
      <button className="hall-drag-handle" draggable onDragStart={onDragStart} onDragEnd={onDragEnd} aria-label={`Reorder ${item.title ?? "pinned message"}; use arrow keys to move`} title="Drag to reorder · Arrow keys to move" onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) { event.preventDefault(); onReorder(event.key === "ArrowLeft" || event.key === "ArrowUp" ? "left" : "right"); }
      }}><GripVertical size={16} /></button>
      {!pinned && conversation.databaseId ? <HallNoteInteractions conversationId={conversation.databaseId} item={item} onChanged={onChanged} /> : null}
      <button className="hall-card-more" onClick={() => { openLayer(); setOpen((value) => !value); }} aria-label={`Actions for ${item.title ?? "Pinned message"}`} aria-expanded={open}>
        <MoreHorizontal size={15} />
      </button>
      {open ? (
        <div ref={ref} className="context-menu hall-context" role="menu">
          {pinned ? <button onClick={onUnpin}>Unpin from Hall</button> : <>
            {onEdit ? <button onClick={() => { setOpen(false); onEdit(); }}>Edit</button> : null}
            <button onClick={() => setColorsOpen((value) => !value)} aria-expanded={colorsOpen}>Change color</button>
            {colorsOpen ? <div className="hall-color-options" role="group" aria-label="Hall note colors">{hallColors.map((color) => <button key={color} className={`hall-color-choice hall-color-${color}`} aria-label={color} onClick={() => { onColor(color); setOpen(false); }}>{color}</button>)}</div> : null}
            <button onClick={onArchive}>Archive</button>
            <button className="danger" onClick={() => setConfirming(true)}>Nuke</button>
          </>}
          <button onClick={() => { onReorder("left"); setOpen(false); }}>Move earlier</button>
          <button onClick={() => { onReorder("right"); setOpen(false); }}>Move later</button>
          {pinned && item.sourceMessageId ? <Link className="context-menu-link" href={`${baseHref(conversation)}#message-${item.sourceMessageId}`}>Open in Chat</Link> : null}
        </div>
      ) : null}
      {confirming ? <div ref={ref} className="confirm-menu" role="alertdialog" aria-label="Nuke note confirmation"><strong>Nuke this note?</strong><p>This cannot be undone.</p><div><button onClick={() => setConfirming(false)}>Cancel</button><button className="danger" onClick={onNuke}>Nuke</button></div></div> : null}
    </article>
  );
}

export function HallSurface({
  conversation,
  empty,
}: {
  conversation: Conversation;
  empty: boolean;
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
  const [hallError, setHallError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoHint, setPhotoHint] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [orderNotice, setOrderNotice] = useState("");
  const mutating = useRef(false);
  const noteRef = useRef<HTMLElement>(null);
  useDismissLayer(creating, () => setCreating(false), noteRef);
  const localItems = room?.hallItems ?? [];
  useEffect(() => {
    if (!conversation.databaseId) return;
    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (document.hidden || inFlight || mutating.current) return;
      inFlight = true;
      try {
        const items = await listHallItemsAction(conversation.databaseId!);
        if (active && !mutating.current) {
          setPersistentItems(items);
          await markConversationReadAction(conversation.databaseId!, "hall");
        }
      } catch { if (active) setHallError("Hall couldn't be loaded."); }
      finally { inFlight = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 12000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [conversation.databaseId]);
  const runMutation = async (operation: () => Promise<void>) => {
    if (mutating.current) return;
    mutating.current = true;
    setHallError("");
    try { await operation(); await refreshPersistentItems(); }
    catch { setHallError("That change couldn't be saved. Please try again."); }
    finally { mutating.current = false; }
  };
  const reorder = (itemId: string, direction?: "left" | "right", dropId?: string) => {
    const databaseId = conversation.databaseId;
    const from = displayedItems.findIndex((item) => item.id === itemId);
    const to = dropId ? displayedItems.findIndex((item) => item.id === dropId) : from + (direction === "left" ? -1 : 1);
    if (from < 0 || to < 0 || to >= displayedItems.length || to === from || mutating.current) return;
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
      setPersistentItems(await listHallItemsAction(databaseId));
    } catch {
      setHallError("Hall couldn't be refreshed.");
    }
  }, [conversation.databaseId]);
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
          <h2>{contextual.title}</h2>
          {conversation.kind === "room" && contextual.support ? <p>{contextual.support}</p> : null}
        </div>
      </header>
      <div className="notice-list">
          <button className="new-hall-card" onClick={() => { setEditingItem(null); setNoteTitle(""); setNoteBody(""); setCreating(true); }}>
            <Plus size={16} /> New Note
          </button>
          {displayedItems.map((item) => <PersistentHallCard key={item.id} item={item} conversation={conversation}
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
            onArchive={() => { const databaseId = conversation.databaseId; if (databaseId) void runMutation(() => archiveHallNoteAction({ conversationId: databaseId, itemId: item.id })); else prototypeStore.archiveHallItem(conversation.slug, item.id); }}
            onNuke={() => { const databaseId = conversation.databaseId; if (databaseId) void runMutation(() => nukeHallNoteAction({ conversationId: databaseId, itemId: item.id })); else prototypeStore.nukeHallItem(conversation.slug, item.id); }}
            onUnpin={() => { const databaseId = conversation.databaseId; if (databaseId) void runMutation(() => unpinHallItemAction({ conversationId: databaseId, itemId: item.id })); else prototypeStore.unpinHallItem(conversation.slug, item.id); }} />)}
          {!empty
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
              <input autoFocus aria-label="Title" placeholder="Title" value={noteTitle} disabled={saving} onChange={(event) => setNoteTitle(event.target.value)} maxLength={80} />
              <textarea aria-label="Note" placeholder="Note / description" maxLength={4000} disabled={saving} value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={5} />
              <button type="button" className="attachment-boundary" aria-disabled="true" onClick={() => setPhotoHint(true)} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "none"; }} onDrop={(event) => { event.preventDefault(); setPhotoHint(true); }}><ImageIcon size={20} /><span>Image or file<small>Uploads not configured</small></span></button>
            </div>
            {photoHint ? <p role="status">Uploads aren’t available yet. No file was uploaded or saved.</p> : null}
            <div className="wizard-actions"><button className="button button-primary primary-action" disabled={!noteTitle.trim() || saving} onClick={async () => {
              if (saving) return;
              setSaving(true);
              if (conversation.databaseId) {
                try {
                  if (editingItem) await editHallNoteAction({ conversationId: conversation.databaseId, itemId: editingItem, title: noteTitle, body: noteBody });
                  else await createHallNoteAction({ conversationId: conversation.databaseId, title: noteTitle, body: noteBody });
                  setPersistentItems(await listHallItemsAction(conversation.databaseId));
                } catch { setHallError("Hall note couldn't be saved."); setSaving(false); return; }
              } else if (editingItem) prototypeStore.updateHallItem(conversation.slug, editingItem, { title: noteTitle, body: noteBody });
              else prototypeStore.addHallNote({ slug: conversation.slug, name: conversation.name, title: noteTitle, body: noteBody });
              setCreating(false); setNoteTitle(""); setNoteBody(""); setSaving(false); setPhotoHint(false);
            }}>{saving ? "Saving…" : editingItem ? "Save" : "Add note"}</button></div>
            {hallError ? <p role="alert">{hallError}</p> : null}
          </section>
        </ModalLayer>
      ) : null}
      {hallError ? <p role="alert">{hallError}</p> : null}
      <span className="sr-only" role="status">{orderNotice}</span>
    </section>
  );
}
