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
import {
  hallNotices,
  type Conversation,
  type Message,
} from "@/data/messaging-data";
import { prototypeUser, sandboxLabel } from "@/data/prototype-user";
import { prototypeStore } from "@/lib/prototype-store";

const reactions = ["❤️", "👍", "😂", "🔥", "✨", "👀"];
const utilityCopy: Record<string, string> = {
  Search: "Search this conversation.",
  Voice: "Voice calls are coming later.",
  Video: "Video is a future capability.",
  Calendar: "Calendar isn't connected yet.",
  Settings: "These settings are still a prototype.",
  More: "More conversation tools will live here.",
};
const titleOf = (conversation: Conversation) =>
  conversation.kind === "my-room"
    ? sandboxLabel(prototypeUser)
    : conversation.name;
const baseHref = (conversation: Conversation) =>
  conversation.kind === "room"
    ? `/room/${conversation.slug}`
    : `/personal/${conversation.slug}`;

export function useDismissLayer(
  open: boolean,
  onClose: () => void,
  ref?: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref?.current || !ref.current.contains(event.target as Node))
        onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const globalClose = () => onClose();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("tosker:close-popovers", globalClose);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("tosker:close-popovers", globalClose);
    };
  }, [open, onClose, ref]);
}

function openLayer() {
  window.dispatchEvent(new Event("tosker:close-popovers"));
}

function UtilityButton({
  label,
  icon,
  onOpen,
}: {
  label: string;
  icon: string;
  onOpen: (label: string) => void;
}) {
  return (
    <button
      className="action-icon"
      data-tip={label}
      aria-label={label}
      onClick={() => onOpen(label)}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

export function SurfaceHeader({
  conversation,
  surface,
  onAdd,
}: {
  conversation: Conversation;
  surface: "chat" | "hall";
  onAdd: () => void;
}) {
  const [panel, setPanel] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismissLayer(Boolean(panel), () => setPanel(null), popoverRef);
  const utilities =
    conversation.kind === "my-room"
      ? [
          ["Search", "⌕"],
          ["Calendar", "▦"],
          ["Settings", "⚙"],
          ["More", "•••"],
        ]
      : [
          ["Search", "⌕"],
          ["Voice", "◖"],
          ["Video", "▹"],
          ["Calendar", "▦"],
          ["Settings", "⚙"],
          ["More", "•••"],
        ];
  const showPanel = (label: string) => {
    openLayer();
    setPanel(label);
  };
  return (
    <header className="conversation-header">
      <Link href="/" className="mobile-back" aria-label="Back to chats">
        ←
      </Link>
      <span
        className={`avatar avatar-${conversation.color} avatar-pattern avatar-large`}
      >
        {conversation.initials}
      </span>
      <div className="active-copy">
        <h2>{titleOf(conversation)}</h2>
        <span>{conversation.context}</span>
      </div>
      <nav className="surface-tabs" aria-label="Space surfaces">
        <Link
          className={surface === "chat" ? "active" : ""}
          href={baseHref(conversation)}
        >
          Chat
        </Link>
        <Link
          className={surface === "hall" ? "active" : ""}
          href={`${baseHref(conversation)}/hall`}
        >
          Hall
        </Link>
        <button onClick={onAdd}>
          ＋<small>Add</small>
        </button>
      </nav>
      <div className="header-utilities">
        {utilities.map(([label, icon]) => (
          <UtilityButton
            key={label}
            label={label}
            icon={icon}
            onOpen={showPanel}
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
  onClose,
}: {
  message: Message;
  onReply: () => void;
  onReact: () => void;
  onDelete: () => void;
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
}: {
  message: Message;
  onReply: (message: Message) => void;
  onReaction: (id: string, reaction: string) => void;
  onDelete: (id: string) => void;
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
                <span>{message.attachment.type === "image" ? "▧" : "▤"}</span>
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
              ♡
            </button>
            <button aria-label="Reply" onClick={() => onReply(message)}>
              ↩
            </button>
            <button aria-label="More message actions" onClick={showMenu}>
              •••
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
            ×
          </button>
        </div>
      ) : null}
      <div className="composer">
        <div className="composer-tools">
          <button aria-label="Add image">▧</button>
          <button aria-label="Add file">▤</button>
          <button aria-label="Add emoji">☺</button>
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
          ↑
        </button>
      </div>
    </div>
  );
}

export function ChatSurface({ conversation }: { conversation: Conversation }) {
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
  const [reply, setReply] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
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
  const send = (body: string) => {
    const message: Message = {
      id: crypto.randomUUID(),
      author: prototypeUser.displayName,
      initials: prototypeUser.initials,
      body,
      replyTo: reply?.body,
      time: "Now",
      color: "gold",
      mine: true,
    };
    nearBottom.current = true;
    setMessages((current) => [...current, message]);
    persist(message);
    setReply(null);
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
        •••
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
  return (
    <section
      className={`hall-surface art-layer-ready ${empty ? "hall-is-empty" : ""}`}
    >
      <header>
        <div>
          <h2>{empty ? "Nothing here yet" : contextual.title}</h2>
          <p>
            {empty ? "Pin the stuff everyone should know" : contextual.support}
          </p>
        </div>
        <button className="new-hall-note">＋ New note</button>
      </header>
      {empty ? null : (
        <div className="notice-list">
          {hallNotices.map((notice) => (
            <HallCard notice={notice} key={notice.id} />
          ))}
        </div>
      )}
    </section>
  );
}
