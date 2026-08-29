"use client";
/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { conversations, type Conversation } from "@/data/messaging-data";
import { prototypeUser, sandboxLabel } from "@/data/prototype-user";
import { prototypeStore } from "@/lib/prototype-store";
import {
  ProductSurface,
  type ProductWorkspace,
} from "@/components/product-surface";
import {
  ChatSurface,
  HallSurface,
  SurfaceHeader,
  useDismissLayer,
} from "@/components/communication-ui";

export type AppWorkspace = ProductWorkspace | "friends" | "create";
type Overlay = "choose" | "chat" | "room" | "invite" | "add" | null;
const nav = [
  { label: "Explore", icon: "⌕", href: "/explore" },
  { label: "Friends", icon: "◎", href: "/friends" },
  { label: "Marketplace", icon: "◇", href: "/marketplace" },
  { label: "Studio", icon: "✦", href: "/studio" },
];
const friends = [
  {
    name: "Mika Tan",
    username: "@mika",
    tid: "TID-2048-MIKA",
    initials: "MK",
    color: "pink",
    status: "Online",
  },
  {
    name: "Jordan Lee",
    username: "@jordy",
    tid: "TID-7312-JORD",
    initials: "JL",
    color: "yellow",
    status: "Away",
  },
  {
    name: "Anika Rai",
    username: "@anika",
    tid: "TID-4831-ANIK",
    initials: "AN",
    color: "blue",
    status: "Online",
  },
  {
    name: "Theo Park",
    username: "@theop",
    tid: "TID-9154-THEO",
    initials: "TH",
    color: "green",
    status: "Offline",
  },
];
const things = ["Poll", "Schedule", "Map", "Board"];
const roomTags = ["TRIP", "EVENT", "WORK", "GAMING", "FAMILY"];

function nameOf(item: Conversation) {
  return item.kind === "my-room" ? sandboxLabel(prototypeUser) : item.name;
}
function hrefOf(item: Conversation) {
  return item.kind === "room" ? `/room/${item.slug}` : `/personal/${item.slug}`;
}
function Avatar({
  item,
  large = false,
}: {
  item: Pick<Conversation, "initials" | "color">;
  large?: boolean;
}) {
  return (
    <span
      className={`avatar avatar-${item.color} avatar-pattern ${large ? "avatar-large" : ""}`}
    >
      {item.initials}
    </span>
  );
}

function ContextMenu({
  item,
  pinned,
  onClose,
}: {
  item: Conversation;
  pinned: boolean;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissLayer(true, onClose, ref);
  if (confirming)
    return (
      <div ref={ref} className="confirm-menu" role="alertdialog">
        <strong>Nuke {item.kind === "room" ? "Room" : "conversation"}?</strong>
        <p>Gone from this prototype.</p>
        <div>
          <button onClick={() => setConfirming(false)}>Cancel</button>
          <button
            className="danger"
            onClick={() => {
              prototypeStore.nuke(item.slug);
              onClose();
            }}
          >
            Nuke
          </button>
        </div>
      </div>
    );
  const action = (label: string, handler?: () => void) => (
    <button
      role="menuitem"
      onClick={() => {
        handler?.();
        onClose();
      }}
    >
      {label}
    </button>
  );
  if (item.kind === "my-room")
    return (
      <div ref={ref} className="context-menu conversation-context" role="menu">
        {action("Mark unread")}
        {action("Mute")}
      </div>
    );
  return (
    <div ref={ref} className="context-menu conversation-context" role="menu">
      {action(pinned ? "Unpin" : "Pin to top", () =>
        prototypeStore.togglePinned(item.slug),
      )}
      {action("Mark unread")}
      {action("Mute")}
      {item.kind === "room" ? action("Manage Room") : null}
      {action("Archive", () => prototypeStore.archive(item.slug))}
      {item.kind === "room" ? action("Leave Room") : null}
      <hr />
      <button className="danger" onClick={() => setConfirming(true)}>
        Nuke {item.kind === "room" ? "Room" : "conversation"}
      </button>
    </div>
  );
}

function ConversationRow({
  item,
  active,
  pinned,
  onDropItem,
}: {
  item: Conversation;
  active: boolean;
  pinned: boolean;
  onDropItem: (source: string, target: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginPress = () => {
    pressTimer.current = setTimeout(() => {
      window.dispatchEvent(new Event("tosker:close-popovers"));
      setOpen(true);
    }, 550);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };
  return (
    <div
      className={`conversation-row-shell ${active ? "active" : ""}`}
      draggable={item.kind !== "my-room"}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.slug);
        event.currentTarget.classList.add("is-dragging");
      }}
      onDragEnd={(event) => event.currentTarget.classList.remove("is-dragging")}
      onDragOver={(event) => {
        event.preventDefault();
        event.currentTarget.classList.add("drag-target");
      }}
      onDragLeave={(event) =>
        event.currentTarget.classList.remove("drag-target")
      }
      onDrop={(event) => {
        event.preventDefault();
        event.currentTarget.classList.remove("drag-target");
        onDropItem(event.dataTransfer.getData("text/plain"), item.slug);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        window.dispatchEvent(new Event("tosker:close-popovers"));
        setOpen(true);
      }}
      onPointerDown={beginPress}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={endPress}
    >
      <Link href={hrefOf(item)} className="conversation-row">
        <Avatar item={item} />
        <span className="conversation-copy">
          <span className="conversation-name">
            {item.kind === "room" ? (
              <i className="room-mark" aria-label="Room">
                ✦
              </i>
            ) : null}
            {nameOf(item)}{" "}
            {item.kind === "room" ? <small>{item.tag ?? "ROOM"}</small> : null}
          </span>
          <span className="conversation-preview">{item.preview}</span>
        </span>
        <span className="conversation-trailing">
          <time>{item.time}</time>
          {pinned ? (
            <i aria-label="Pinned">⌖</i>
          ) : item.unread ? (
            <b>{item.unread}</b>
          ) : null}
        </span>
      </Link>
      {open ? (
        <ContextMenu
          item={item}
          pinned={pinned}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ProfileRegion({ mode }: { mode: "new" | "demo" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissLayer(open, close, ref);
  return (
    <div className="sidebar-bottom">
      <div className="utility-nav">
        <Link href="/help">
          <span>?</span>
          <strong>Help &amp; Feedback</strong>
        </Link>
      </div>
      <div className="profile-nameplate">
        <span className="avatar avatar-gold">{prototypeUser.initials}</span>
        <span>
          <strong>{prototypeUser.displayName}</strong>
          <small>{prototypeUser.role}</small>
        </span>
        <div className="profile-actions">
          <button
            aria-label="Notifications and recent activity"
            onClick={() => {
              window.dispatchEvent(new Event("tosker:close-popovers"));
              setOpen(true);
            }}
          >
            ♢
          </button>
          <Link href="/settings" aria-label="Settings">
            ⚙
          </Link>
        </div>
        {open ? (
          <div ref={ref} className="notification-popover">
            <strong>Recent activity</strong>
            {[
              "Mika replied",
              "Mentioned in Tokyo 2027",
              "New Hall note",
              "Room invite accepted",
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="walkthrough-controls">
        <span>Prototype state</span>
        <button
          className={mode === "new" ? "active" : ""}
          onClick={() => prototypeStore.setMode("new")}
        >
          Fresh
        </button>
        <button
          className={mode === "demo" ? "active" : ""}
          onClick={() => prototypeStore.setMode("demo")}
        >
          Demo
        </button>
      </div>
    </div>
  );
}

function AppSidebar({
  selected,
  workspace,
  onCreate,
}: {
  selected?: Conversation;
  workspace?: AppWorkspace;
  onCreate: () => void;
}) {
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const [query, setQuery] = useState("");
  const standard =
    state.mode === "demo"
      ? conversations
      : conversations.filter((item) => item.kind === "my-room");
  const standardSlugs = new Set(standard.map((item) => item.slug));
  const localRooms: Conversation[] = state.rooms
    .filter((room) => !standardSlugs.has(room.slug))
    .map((room) => ({
      slug: room.slug,
      kind: "room",
      name: room.name,
      initials: room.name.slice(0, 2).toUpperCase(),
      color: "green",
      preview: "Room's ready",
      time: room.createdAt,
      context: `${Math.max(1, room.people.length + 1)} people`,
      messages: room.messages,
      tag: room.tags[0] ?? "ROOM",
    }));
  const localChats: Conversation[] = state.chats
    .filter((chat) => !standardSlugs.has(chat.slug))
    .map((chat) => ({
      slug: chat.slug,
      kind: "personal",
      name: chat.name,
      initials: chat.initials,
      color: chat.color,
      preview: "Start the conversation",
      time: "Now",
      context: chat.tid,
      messages: chat.messages,
    }));
  const all = [...standard, ...localChats, ...localRooms].filter(
    (item) => !state.archived.includes(item.slug),
  );
  const filtered = all.filter((item) =>
    `${nameOf(item)} ${item.name} ${item.tag ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const rank = (item: Conversation) =>
    state.order.indexOf(item.slug) < 0
      ? Number.MAX_SAFE_INTEGER
      : state.order.indexOf(item.slug);
  const ordered = [...filtered].sort((a, b) =>
    a.kind === "my-room"
      ? -1
      : b.kind === "my-room"
        ? 1
        : Number(state.pinned.includes(b.slug)) -
            Number(state.pinned.includes(a.slug)) || rank(a) - rank(b),
  );
  return (
    <aside className="messenger-sidebar">
      <div className="sidebar-brand">
        <Link href="/" aria-label="Tosker chats">
          <Image
            className="full-logo"
            src="/brand/toskerlogo-full-white.svg"
            alt="Tosker"
            width={150}
            height={72}
            priority
          />
        </Link>
      </div>
      <nav className="product-nav" aria-label="Tosker destinations">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`product-nav-item ${workspace === item.label.toLowerCase() ? "active" : ""}`}
          >
            <span>{item.icon}</span>
            <strong>{item.label}</strong>
          </Link>
        ))}
      </nav>
      <section className="conversation-section">
        <div className="unified-search">
          <label>
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search"
            />
          </label>
          <button
            className="create-trigger"
            onClick={onCreate}
            aria-label="Start a chat or create a Room"
          >
            ＋
          </button>
        </div>
        <div className="conversation-list">
          {ordered.map((item) => (
            <ConversationRow
              key={item.slug}
              item={item}
              active={selected?.slug === item.slug}
              pinned={state.pinned.includes(item.slug)}
              onDropItem={prototypeStore.reorder}
            />
          ))}
          {query && ordered.length === 0 ? (
            <p className="search-empty">Nothing found</p>
          ) : null}
        </div>
      </section>
      <ProfileRegion mode={state.mode} />
    </aside>
  );
}

function FriendsSurface({
  onMessage,
}: {
  onMessage: (friend: (typeof friends)[number]) => void;
}) {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const shown = friends.filter((friend) =>
    `${friend.name} ${friend.username} ${friend.tid}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="friends-surface workspace-scroll">
      <header>
        <div>
          <p className="eyebrow">Friends</p>
          <h1>Your people</h1>
        </div>
        <button
          onClick={() =>
            document
              .querySelector<HTMLInputElement>(".friends-search input")
              ?.focus()
          }
        >
          ＋ Add friend
        </button>
      </header>
      <label className="friends-search">
        <span>⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, username or TID"
        />
      </label>
      <nav>
        {["All", "Online", "Requests"].map((item) => (
          <button
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </nav>
      {tab === "Requests" ? (
        <div className="two-line-empty">
          <h2>No new requests</h2>
          <p>You're all caught up</p>
        </div>
      ) : (
        <div className="friend-list">
          {shown
            .filter((friend) => tab !== "Online" || friend.status === "Online")
            .map((friend) => (
              <article key={friend.tid}>
                <span
                  className={`avatar avatar-${friend.color} avatar-pattern`}
                >
                  {friend.initials}
                </span>
                <div>
                  <strong>{friend.name}</strong>
                  <small>
                    {friend.username} · {friend.tid}
                  </small>
                </div>
                <i>{friend.status}</i>
                <button onClick={() => onMessage(friend)}>Message</button>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}

function FakeQr({ value }: { value: string }) {
  const bits = Array.from(
    { length: 121 },
    (_, index) =>
      (index * 17 + value.length * 7 + Math.floor(index / 11) * 3) % 5 < 2,
  );
  return (
    <div className="fake-qr" aria-label="Prototype Room invite QR code">
      {bits.map((on, index) => (
        <i key={index} className={on ? "on" : ""} />
      ))}
    </div>
  );
}

function CreationOverlay({
  initial,
  onClose,
}: {
  initial: "choose" | "chat" | "room";
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initial);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedThings, setThings] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [room, setRoom] = useState<{ slug: string; name: string } | null>(null);
  const [friendQuery, setFriendQuery] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useDismissLayer(true, close, panelRef);
  const startChat = (friend: (typeof friends)[number]) => {
    const chat = prototypeStore.createChat(friend);
    router.push(`/personal/${chat.slug}`);
    onClose();
  };
  const finishRoom = () => {
    const created = prototypeStore.createRoom({
      name,
      tags,
      people,
      things: selectedThings,
    });
    setRoom(created);
    setStep(5);
  };
  const nextRoom = () => {
    if (step === 4) finishRoom();
    else setStep((current) => current + 1);
  };
  return (
    <div
      className="overlay-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        className="creation-panel"
        role="dialog"
        aria-modal="true"
      >
        <button className="overlay-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {mode === "choose" ? (
          <>
            <h2>Make something</h2>
            <p>Chat with someone or make a Room.</p>
            <div className="creation-choices">
              <button onClick={() => setMode("chat")}>
                <span>◎</span>
                <strong>Start a chat</strong>
                <small>Friends or TID</small>
              </button>
              <button onClick={() => setMode("room")}>
                <span>▦</span>
                <strong>Create a Room</strong>
                <small>Name it and go</small>
              </button>
            </div>
          </>
        ) : null}
        {mode === "chat" ? (
          <>
            <p className="eyebrow">Start a chat</p>
            <h2>Who are you looking for?</h2>
            <label className="friends-search">
              <span>⌕</span>
              <input
                autoFocus
                value={friendQuery}
                onChange={(event) => setFriendQuery(event.target.value)}
                placeholder="Name, username or TID"
              />
            </label>
            <div className="friend-list compact">
              {friends
                .filter((friend) =>
                  `${friend.name} ${friend.username} ${friend.tid}`
                    .toLowerCase()
                    .includes(friendQuery.toLowerCase()),
                )
                .map((friend) => (
                  <article key={friend.tid}>
                    <span className={`avatar avatar-${friend.color}`}>
                      {friend.initials}
                    </span>
                    <div>
                      <strong>{friend.name}</strong>
                      <small>
                        {friend.username} · {friend.tid}
                      </small>
                    </div>
                    <button onClick={() => startChat(friend)}>Chat</button>
                  </article>
                ))}
            </div>
          </>
        ) : null}
        {mode === "room" ? (
          <>
            <div className="wizard-progress">
              <span>Room</span>
              <b>{step < 5 ? `${step} / 4` : "Ready"}</b>
            </div>
            {step === 1 ? (
              <>
                <h2>Name your Room</h2>
                <p>That's all you need.</p>
                <label className="wizard-field">
                  <span>Room name</span>
                  <input
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Sunday Dinner"
                  />
                </label>
              </>
            ) : null}
            {step === 2 ? (
              <>
                <h2>Add tags</h2>
                <p>Optional. Keep it easy to spot.</p>
                <div className="option-grid tags">
                  {roomTags.map((tag) => (
                    <button
                      className={tags.includes(tag) ? "active" : ""}
                      onClick={() =>
                        setTags((current) =>
                          current.includes(tag)
                            ? current.filter((item) => item !== tag)
                            : [...current, tag],
                        )
                      }
                      key={tag}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {step === 3 ? (
              <>
                <h2>Add things</h2>
                <p>Optional. You can do this later.</p>
                <div className="option-grid">
                  {things.map((thing) => (
                    <button
                      className={selectedThings.includes(thing) ? "active" : ""}
                      onClick={() =>
                        setThings((current) =>
                          current.includes(thing)
                            ? current.filter((item) => item !== thing)
                            : [...current, thing],
                        )
                      }
                      key={thing}
                    >
                      {thing}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {step === 4 ? (
              <>
                <h2>Add people</h2>
                <p>Optional. Friends can join later.</p>
                <div className="friend-list compact">
                  {friends.map((friend) => (
                    <article key={friend.tid}>
                      <span className={`avatar avatar-${friend.color}`}>
                        {friend.initials}
                      </span>
                      <div>
                        <strong>{friend.name}</strong>
                        <small>{friend.username}</small>
                      </div>
                      <button
                        className={
                          people.includes(friend.tid) ? "selected" : ""
                        }
                        onClick={() =>
                          setPeople((current) =>
                            current.includes(friend.tid)
                              ? current.filter((item) => item !== friend.tid)
                              : [...current, friend.tid],
                          )
                        }
                      >
                        {people.includes(friend.tid) ? "Added" : "Add"}
                      </button>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {step === 5 && room ? (
              <div className="room-ready">
                <FakeQr value={room.slug} />
                <h2>Room's ready</h2>
                <p>{room.name}</p>
                <div>
                  <button
                    onClick={() =>
                      navigator.clipboard?.writeText(
                        `https://toskerapp.vercel.app/room/${room.slug}`,
                      )
                    }
                  >
                    Copy link
                  </button>
                  <button
                    onClick={() => {
                      router.push(`/room/${room.slug}`);
                      onClose();
                    }}
                  >
                    Open Room
                  </button>
                </div>
                <small>Prototype invite · local only</small>
              </div>
            ) : null}
            {step < 5 ? (
              <div className="wizard-actions">
                {step > 1 ? (
                  <button onClick={() => setStep((current) => current - 1)}>
                    Back
                  </button>
                ) : (
                  <button onClick={onClose}>Cancel</button>
                )}
                <button
                  className="text-button"
                  onClick={nextRoom}
                  disabled={step === 1 && !name.trim()}
                >
                  {step === 1
                    ? "Create now"
                    : step === 4
                      ? "Create Room"
                      : "Skip for now"}
                </button>
                {step > 1 && step < 4 ? (
                  <button className="button button-primary" onClick={nextRoom}>
                    Next
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function MobileNav() {
  return (
    <nav className="mobile-app-nav" aria-label="Mobile destinations">
      <Link href="/">
        <span>◉</span>Chats
      </Link>
      <Link href="/explore">
        <span>⌕</span>Explore
      </Link>
      <Link href="/friends">
        <span>◎</span>Friends
      </Link>
      <Link href="/marketplace">
        <span>◇</span>Market
      </Link>
      <Link href="/studio">
        <span>✦</span>Studio
      </Link>
    </nav>
  );
}

export function MessagingApp({
  selectedSlug,
  surface = "chat",
  workspace,
}: {
  selectedSlug?: string;
  surface?: "chat" | "hall";
  workspace?: AppWorkspace;
}) {
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const router = useRouter();
  const [overlay, setOverlay] = useState<Overlay>(
    workspace === "create" ? "room" : null,
  );
  const canonical = selectedSlug
    ? conversations.find((item) => item.slug === selectedSlug)
    : undefined;
  const prototypeRoom = state.rooms.find((room) => room.slug === selectedSlug);
  const prototypeChat = state.chats.find((chat) => chat.slug === selectedSlug);
  const selected =
    canonical ??
    (prototypeRoom
      ? {
          slug: prototypeRoom.slug,
          kind: "room" as const,
          name: prototypeRoom.name,
          initials: prototypeRoom.name.slice(0, 2).toUpperCase(),
          color: "green",
          preview: "Room's ready",
          time: prototypeRoom.createdAt,
          context: `${Math.max(1, prototypeRoom.people.length + 1)} people`,
          messages: prototypeRoom.messages,
          tag: prototypeRoom.tags[0] ?? "ROOM",
        }
      : prototypeChat
        ? {
            slug: prototypeChat.slug,
            kind: "personal" as const,
            name: prototypeChat.name,
            initials: prototypeChat.initials,
            color: prototypeChat.color,
            preview: "Start the conversation",
            time: "Now",
            context: prototypeChat.tid,
            messages: prototypeChat.messages,
          }
        : selectedSlug
          ? conversations[0]
          : undefined);
  const messageFriend = (friend: (typeof friends)[number]) => {
    const chat = prototypeStore.createChat(friend);
    router.push(`/personal/${chat.slug}`);
  };
  return (
    <main
      className={`messaging-app ${selected ? "has-selection" : "list-only"}`}
    >
      <AppSidebar
        selected={selected}
        workspace={workspace}
        onCreate={() => setOverlay("choose")}
      />
      <div className="working-surface">
        {selected ? (
          <>
            <SurfaceHeader
              conversation={selected}
              surface={surface}
              onAdd={() => setOverlay("add")}
            />
            {surface === "hall" ? (
              <HallSurface
                conversation={selected}
                empty={Boolean(prototypeRoom && !canonical)}
              />
            ) : (
              <ChatSurface key={selected.slug} conversation={selected} />
            )}
          </>
        ) : workspace === "friends" ? (
          <FriendsSurface onMessage={messageFriend} />
        ) : workspace && workspace !== "create" ? (
          <ProductSurface surface={workspace} />
        ) : (
          <div className="desktop-welcome">
            <div className="welcome-orbit">
              <Image
                src="/brand/toskerlogo-icon-main.svg"
                alt=""
                width={90}
                height={90}
              />
              <span>✦</span>
              <span>◌</span>
              <span>⌁</span>
            </div>
            <h2>
              Hey {prototypeUser.displayName}, let's pick up where you left off
            </h2>
            <p>Choose a conversation or Room</p>
          </div>
        )}
      </div>
      <MobileNav />
      {overlay === "choose" || overlay === "chat" || overlay === "room" ? (
        <CreationOverlay initial={overlay} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay === "add" ? (
        <div className="overlay-backdrop">
          <section className="creation-panel">
            <button className="overlay-close" onClick={() => setOverlay(null)}>
              ×
            </button>
            <h2>Add something</h2>
            <p>Add to this space.</p>
            <div className="option-grid">
              {[...things, "Photo Wall", "Subroom"].map((item) => (
                <button key={item}>{item}</button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
