"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { listMessagesAction, sendMessageAction } from "@/server/conversations/actions";
import {
  hallNotices,
  type Conversation,
  type Message,
} from "@/data/messaging-data";
import { prototypeUser } from "@/data/prototype-user";
import { useCurrentToskerUser } from "@/components/tosker-identity";
import { prototypeStore } from "@/lib/prototype-store";
import {
  CalendarDays,
  ArrowLeft,
  File,
  ImageIcon,
  Laugh,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Reply,
  Search,
  Send,
  Settings,
  Smile,
  Video,
  X,
} from "lucide-react";

const reactions = ["❤️", "👍", "😂", "🔥", "✨", "👀"];
const utilityCopy: Record<string, string> = {
  Search: "Search this conversation.",
  Voice: "Voice calls are coming later.",
  Video: "Video is a future capability.",
  Calendar: "Calendar isn't connected yet.",
  Settings: "These settings are still a prototype.",
  More: "More conversation tools will live here.",
};
const titleOf = (conversation: Conversation, displayName = prototypeUser.displayName) =>
  conversation.kind === "my-room"
    ? `${displayName}'s Sandbox`
    : conversation.name;
const baseHref = (conversation: Conversation) =>
  conversation.kind === "room"
    ? `/room/${conversation.slug}`
    : `/personal/${conversation.slug}`;

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
}: {
  conversation: Conversation;
  surface: "chat" | "hall";
  onAdd: () => void;
  onInvite?: () => void;
}) {
  const user = useCurrentToskerUser() ?? prototypeUser;
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
        <Link href="/" className="mobile-back" aria-label="Back">
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
          <h2>{titleOf(conversation, user.displayName)}</h2>
          {conversation.kind === "room" ? <span>{conversation.context}</span> : null}
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
          Chat
        </Link>
        <Link
          className={surface === "hall" ? "active" : ""}
          aria-current={surface === "hall" ? "page" : undefined}
          href={`${baseHref(conversation)}/hall`}
        >
          Hall
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
          <p>{utilityCopy[panel]}</p>
          <button onClick={() => setPanel(null)}>Got it</button>
        </div>
      ) : null}
    </header>
  );
}

function MessageMenu({
  message,
  onReply,
  onReact,
  onDelete,
  onPin,
  onClose,
}: {
  message: Message;
  onReply: () => void;
  onReact: () => void;
  onDelete: () => void;
  onPin?: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismissLayer(true, onClose, ref);
  return (
    <div ref={ref} className="context-menu message-context" role="menu">
      <button onClick={onReply}>Reply</button>
      <button onClick={onReact}>React</button>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(message.body);
          onClose();
        }}
      >
        Copy text
      </button>
      <button onClick={onClose}>
        Save <small>Prototype</small>
      </button>
      <button onClick={onClose}>More</button>
      {onPin ? <button onClick={onPin}>Pin to Hall</button> : null}
      {message.mine ? (
        <>
          <hr />
          <button onClick={onClose}>
            Edit <small>Prototype</small>
          </button>
          <button className="danger" onClick={onDelete}>
            Nuke message
          </button>
        </>
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  onReply,
  onReaction,
  onDelete,
  onPin,
}: {
  message: Message;
  onReply: (message: Message) => void;
  onReaction: (id: string, reaction: string) => void;
  onDelete: (id: string) => void;
  onPin?: (message: Message) => void;
}) {
  const [translated, setTranslated] = useState(false);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useDismissLayer(picker, () => setPicker(false), pickerRef);
  const showMenu = () => {
    openLayer();
    setPicker(false);
    setMenu(true);
  };
  const showPicker = () => {
    openLayer();
    setMenu(false);
    setPicker(true);
  };
  return (
    <article
      id={`message-${message.id}`}
      className={`message-row ${message.mine ? "mine" : ""}`}
      onContextMenu={(event) => {
        event.preventDefault();
        showMenu();
      }}
    >
      <span className={`avatar avatar-${message.color} avatar-pattern`}>
        {message.initials}
      </span>
      <div className="message-column">
        <div className="message-author">
          <strong>{message.author}</strong>
          <time>{message.time}</time>
        </div>
        <div className="message-body-wrap">
          <div className="message-bubble">
            {message.replyTo ? (
              <blockquote>{message.replyTo}</blockquote>
            ) : null}
            <p>{message.body}</p>
            {message.attachment ? (
              <div className="message-attachment">
                <span>
                  {message.attachment.type === "image" ? (
                    <ImageIcon size={20} />
                  ) : (
                    <File size={20} />
                  )}
                </span>
                <div>
                  <strong>{message.attachment.name}</strong>
                  <small>{message.attachment.meta}</small>
                </div>
              </div>
            ) : null}
            {message.translation ? (
              <button
                className="translate-button"
                onClick={() => setTranslated((value) => !value)}
              >
                {translated ? "Hide translation" : "Translate"}
              </button>
            ) : null}
            {translated ? (
              <div className="translation">
                <p>{message.translation}</p>
                <span>Translated from {message.language}</span>
              </div>
            ) : null}
          </div>
          <div className="message-hover-actions">
            <button aria-label="React" onClick={showPicker}>
              <Laugh size={14} />
            </button>
            <button aria-label="Reply" onClick={() => onReply(message)}>
              <Reply size={14} />
            </button>
            <button aria-label="More message actions" onClick={showMenu}>
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>
        {message.reactions?.length ? (
          <div className="message-reactions">
            {message.reactions.map((reaction, index) => (
              <button key={`${reaction}-${index}`}>{reaction}</button>
            ))}
          </div>
        ) : null}
      </div>
      {menu ? (
        <MessageMenu
          message={message}
          onReply={() => {
            onReply(message);
            setMenu(false);
          }}
          onReact={showPicker}
          onDelete={() => onDelete(message.id)}
          onPin={
            onPin
              ? () => {
                  onPin(message);
                  setMenu(false);
                }
              : undefined
          }
          onClose={() => setMenu(false)}
        />
      ) : null}
      {picker ? (
        <div ref={pickerRef} className="reaction-picker">
          {reactions.map((reaction) => (
            <button
              key={reaction}
              onClick={() => {
                onReaction(message.id, reaction);
                setPicker(false);
              }}
            >
              {reaction}
            </button>
          ))}
        </div>
      ) : null}
    </article>
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
  onSend: (body: string) => void;
}) {
  const [value, setValue] = useState("");
  const send = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
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
          <button aria-label="Attach">
            <Paperclip size={17} />
          </button>
          <button aria-label="Add image">
            <ImageIcon size={17} />
          </button>
          <button aria-label="Add file">
            <File size={17} />
          </button>
          <button aria-label="Add emoji">
            <Smile size={17} />
          </button>
        </div>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${name}…`}
          aria-label={`Message ${name}`}
          rows={1}
        />
        <button
          className="send-button"
          disabled={!value.trim()}
          onClick={send}
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      </div>
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
  useEffect(() => {
    if (!conversation.databaseId) return;
    let active = true;
    listMessagesAction(conversation.databaseId)
      .then(({ messages: persisted }) => {
        if (!active) return;
        setMessages(persisted.map((message) => ({
          id: message.id,
          author: message.author,
          initials: message.author.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
          body: message.body,
          time: new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          color: message.mine ? "gold" : "pink",
          mine: message.mine,
        })));
      })
      .catch(() => active && setMessageError("Messages couldn't be loaded. Try again."));
    return () => { active = false; };
  }, [conversation.databaseId]);
  useLayoutEffect(() => {
    const area = scrollRef.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [conversation.slug]);
  useEffect(() => {
    const area = scrollRef.current;
    if (area && nearBottom.current)
      area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
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
    const message: Message = {
      id: crypto.randomUUID(),
      author: user.displayName,
      initials: user.initials,
      body,
      replyTo: reply?.body,
      time: "Now",
      color: "gold",
      mine: true,
    };
    nearBottom.current = true;
    setMessages((current) => [...current, message]);
    setReply(null);
    setMessageError(null);
    if (!conversation.databaseId) {
      persist(message);
      return;
    }
    try {
      await sendMessageAction({ id: message.id, conversationId: conversation.databaseId, body });
    } catch {
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setMessageError("That message wasn't sent. Please try again.");
    }
  };
  const react = (id: string, reaction: string) =>
    setMessages((current) =>
      current.map((message) =>
        message.id === id
          ? { ...message, reactions: [...(message.reactions ?? []), reaction] }
          : message,
      ),
    );
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
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onReply={setReply}
                onReaction={react}
                onDelete={(id) =>
                  setMessages((current) =>
                    current.filter((item) => item.id !== id),
                  )
                }
                onPin={
                  conversation.kind === "room"
                    ? (item) => prototypeStore.pinMessageToHall({ slug: conversation.slug, name: conversation.name, message: item })
                    : undefined
                }
              />
            ))}
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
          <button>Pin</button>
          <button>Save</button>
          <button onClick={() => navigator.clipboard?.writeText(notice.title)}>
            Copy link
          </button>
          <button>
            Edit <small>Own notes</small>
          </button>
          <hr />
          <button className="danger">Nuke note</button>
        </div>
      ) : null}
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
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const room = state.rooms.find((item) => item.slug === conversation.slug);
  const [creating, setCreating] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const noteRef = useRef<HTMLElement>(null);
  useDismissLayer(creating, () => setCreating(false), noteRef);
  const localItems = room?.hallItems ?? [];
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
            support: "The useful stuff, without the scroll hunt",
          };
  const isEmpty = empty && localItems.length === 0;
  return (
    <section
      className={`hall-surface art-layer-ready ${isEmpty ? "hall-is-empty" : ""}`}
    >
      <header>
        <div>
          <h2>{isEmpty ? "Nothing here yet" : contextual.title}</h2>
          <p>
            {isEmpty ? "Pin the stuff everyone should know" : contextual.support}
          </p>
        </div>
        <button className="new-hall-note primary-action" onClick={() => setCreating(true)}>
          <Plus size={15} /> New
        </button>
      </header>
      {isEmpty ? null : (
        <div className="notice-list">
          {localItems.map((item) => (
            <article className={`notice-card hall-local-${item.kind}`} key={item.id}>
              <span className="notice-icon">{item.kind === "note" ? "✎" : "⌖"}</span>
              <div>
                <small>{item.kind === "note" ? "Note" : "Pinned from Chat"}</small>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <footer>{item.author} · {item.time}</footer>
              </div>
            </article>
          ))}
          {!empty
            ? hallNotices.map((notice) => (
                <HallCard notice={notice} key={notice.id} />
              ))
            : null}
        </div>
      )}
      {creating ? (
        <div className="overlay-backdrop">
          <section ref={noteRef} className="creation-panel hall-note-panel" role="dialog" aria-modal="true" aria-labelledby="hall-note-title">
            <button className="overlay-close" onClick={() => setCreating(false)} aria-label="Close"><X size={17} /></button>
            <p className="eyebrow">Hall</p>
            <h2 id="hall-note-title">New note</h2>
            <label className="wizard-field"><span>Title</span><input autoFocus value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} maxLength={80} /></label>
            <label className="wizard-field"><span>Note</span><textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={4} /></label>
            <div className="wizard-actions"><button className="button button-primary primary-action" disabled={!noteTitle.trim()} onClick={() => { prototypeStore.addHallNote({ slug: conversation.slug, name: conversation.name, title: noteTitle, body: noteBody }); setCreating(false); setNoteTitle(""); setNoteBody(""); }}>Add</button></div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
