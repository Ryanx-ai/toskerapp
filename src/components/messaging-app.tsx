"use client";
/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { conversations, type Conversation } from "@/data/messaging-data";
import { prototypeUser } from "@/data/prototype-user";
import { prototypeStore } from "@/lib/prototype-store";
import { APP_VERSION_LABEL } from "@/config/app";
import {
  ProductSurface,
  type ProductWorkspace,
} from "@/components/product-surface";
import { WorkspaceBanner } from "@/components/workspace-banner";
import { FakeQr } from "@/components/fake-qr";
import { IdentityCard } from "@/components/identity-card";
import { useCurrentToskerUser, useToskerIdentity } from "@/components/tosker-identity";
import { createRoomAction, createRoomInviteAction } from "@/server/rooms/actions";
import { findPeopleAction, startPersonalConversationAction } from "@/server/conversations/actions";
import { installRoomCapabilityAction } from "@/server/shared-state/actions";
import { acceptConnectionAction, listConnectionsAction, requestConnectionAction } from "@/server/connections/actions";
import { listNotificationsAction } from "@/server/shared-state/actions";
import {
  ChatSurface,
  HallSurface,
  SurfaceHeader,
  useDismissLayer,
} from "@/components/communication-ui";
import {
  ArrowLeft,
  Bell,
  CircleHelp,
  Compass,
  MessageCircle,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";

export type AppWorkspace = ProductWorkspace | "friends" | "create";
type Overlay = "choose" | "chat" | "room" | "invite" | "add" | null;
type NotificationActivity = Awaited<ReturnType<typeof listNotificationsAction>>[number];
const nav = [
  { label: "Explore", icon: Compass, href: "/explore" },
  { label: "Friends", icon: UsersRound, href: "/friends" },
  { label: "Marketplace", icon: ShoppingBag, href: "/marketplace" },
  { label: "Studio", icon: WandSparkles, href: "/studio" },
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
const COLLAPSE_KEY = "tosker.sidebar.collapsed";
const collapseStore = {
  subscribe(listener: () => void) {
    window.addEventListener("tosker:sidebar", listener);
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener("tosker:sidebar", listener);
      window.removeEventListener("storage", listener);
    };
  },
  getSnapshot() {
    return window.localStorage.getItem(COLLAPSE_KEY) === "true";
  },
  getServerSnapshot() {
    return false;
  },
  toggle() {
    window.localStorage.setItem(
      COLLAPSE_KEY,
      String(!collapseStore.getSnapshot()),
    );
    window.dispatchEvent(new Event("tosker:sidebar"));
  },
};

function nameOf(item: Conversation, displayName = prototypeUser.displayName) {
  return item.kind === "my-room"
    ? `${displayName}'s Sandbox`
    : item.name;
}
function hrefOf(item: Conversation) {
  return item.kind === "room" ? `/room/${item.slug}` : `/personal/${item.slug}`;
}
function Avatar({
  item,
  large = false,
}: {
  item: Pick<Conversation, "initials" | "color" | "kind">;
  large?: boolean;
}) {
  return (
    <span
      className={`avatar avatar-${item.color} avatar-pattern ${item.kind === "room" ? "avatar-room" : ""} ${large ? "avatar-large" : ""}`}
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
  displayName,
  unread,
}: {
  item: Conversation;
  active: boolean;
  pinned: boolean;
  onDropItem: (source: string, target: string) => void;
  displayName: string;
  unread?: number;
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
      <Link
        href={hrefOf(item)}
        className="conversation-row"
        aria-label={`${nameOf(item, displayName)}${item.kind === "room" ? ", Room" : ""}`}
        data-name={nameOf(item, displayName)}
      >
        <Avatar item={item} />
        <span className="conversation-copy">
          <span className="conversation-name">
            {nameOf(item, displayName)}{" "}
            {item.kind === "room" ? <small>{item.tag ?? "ROOM"}</small> : null}
          </span>
          <span className="conversation-preview">{item.preview}</span>
        </span>
        <span className="conversation-trailing">
          <time>{item.time}</time>
          {pinned ? (
            <i aria-label="Pinned">⌖</i>
          ) : unread || item.unread ? (
            <b>{unread || item.unread}</b>
          ) : null}
        </span>
      </Link>
      {item.kind !== "my-room" ? (
        <button
          className="row-options"
          aria-label={`Actions for ${nameOf(item)}`}
          aria-expanded={open}
          onClick={() => {
            window.dispatchEvent(new Event("tosker:close-popovers"));
            setOpen(true);
          }}
        >
          <MoreHorizontal size={15} />
        </button>
      ) : null}
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

function ProfileRegion({
  workspace,
}: {
  workspace?: AppWorkspace;
}) {
  const user = useCurrentToskerUser() ?? prototypeUser;
  return (
    <div className="sidebar-bottom">
      <div className="profile-nameplate">
        <Link className="profile-avatar-button" href="/profile" aria-label="Open your Namecard">
        <span className="avatar avatar-gold profile-avatar">
          {user.initials}
          <i className="profile-avatar-badge" aria-hidden="true" />
        </span>
        </Link>
        <span>
          <strong>{user.displayName}</strong>
          <small>{user.role}</small>
        </span>
        <div className="profile-actions">
          <Link
            href="/notifications"
            aria-label="Notifications"
            data-tip="Notifications"
            className="has-tip profile-notifications"
            aria-current={workspace === "notifications" ? "page" : undefined}
          >
            <Bell size={16} />
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            data-tip="Settings"
            className="has-tip"
            aria-current={workspace === "settings" ? "page" : undefined}
          >
            <Settings size={16} />
          </Link>
          <Link
            href="/help"
            aria-label="Help & Feedback"
            data-tip="Help & Feedback"
            className="has-tip"
            aria-current={workspace === "help" ? "page" : undefined}
          >
            <CircleHelp size={16} />
          </Link>
        </div>
      </div>
      <small className="app-version-marker">{APP_VERSION_LABEL}</small>
    </div>
  );
}

function AppSidebar({
  selected,
  workspace,
  onCreate,
  collapsed,
  onToggleCollapse,
  unreadByConversation,
  latestActivityByConversation,
}: {
  selected?: Conversation;
  workspace?: AppWorkspace;
  onCreate: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadByConversation: Record<string, number>;
  latestActivityByConversation: Record<string, string>;
}) {
  const identity = useToskerIdentity();
  const user = useCurrentToskerUser() ?? prototypeUser;
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const [query, setQuery] = useState("");
  const [expandedForSearch, setExpandedForSearch] = useState(false);
  const sidebarRouter = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openCollapsedSearch = () => {
    setExpandedForSearch(true);
    onToggleCollapse();
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => searchInputRef.current?.focus()),
    );
  };
  const standard = identity
    ? conversations
        .filter((item) => item.kind === "my-room")
        .map((item) => ({ ...item, databaseId: identity.sandboxConversationId }))
    : state.mode === "new"
      ? conversations.filter((item) => item.kind === "my-room")
      : conversations;
  const standardSlugs = new Set(standard.map((item) => item.slug));
  const localRooms: Conversation[] = state.rooms
    .filter((room) => !standardSlugs.has(room.slug))
    .map((room) => ({
      slug: room.slug,
      kind: "room",
      name: room.name,
      initials: room.name.slice(0, 2).toUpperCase(),
      color: "green",
      preview: "",
      time: room.createdAt,
      context: `${Math.max(1, room.people.length + 1)} people`,
      messages: room.messages,
      tag: room.tags[0] ?? "ROOM",
    }));
  const serverRooms: Conversation[] = (identity?.rooms ?? []).map((room) => ({
    slug: room.slug,
    kind: "room",
    name: room.name,
    initials: room.name.slice(0, 2).toUpperCase(),
    color: "green",
    preview: "",
    time: "Now",
    context: "",
    messages: [],
    tag: room.tag,
    databaseId: room.conversationId,
  }));
  const serverChats: Conversation[] = (identity?.personalConversations ?? []).map((chat) => ({
    slug: chat.slug,
    kind: "personal",
    name: chat.displayName,
    initials: chat.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    color: "pink",
    preview: "",
    time: "Now",
    context: `@${chat.username} · ${chat.tid}`,
    messages: [],
    databaseId: chat.conversationId,
  }));
  const localChats: Conversation[] = state.chats
    .filter((chat) => !standardSlugs.has(chat.slug))
    .map((chat) => ({
      slug: chat.slug,
      kind: "personal",
      name: chat.name,
      initials: chat.initials,
      color: chat.color,
      preview: "",
      time: "Now",
      context: chat.tid,
      messages: chat.messages,
    }));
  const all = [...standard, ...serverChats, ...serverRooms, ...(identity ? [] : localChats), ...(identity ? [] : localRooms)].filter(
    (item) => Boolean(identity) || !state.archived.includes(item.slug),
  );
  const filtered = all.filter((item) =>
    `${nameOf(item, user.displayName)} ${item.name} ${item.tag ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const rank = (item: Conversation) =>
    identity
      ? Number.MAX_SAFE_INTEGER
      : state.order.indexOf(item.slug) < 0
        ? Number.MAX_SAFE_INTEGER
        : state.order.indexOf(item.slug);
  const ordered = [...filtered].sort((a, b) =>
    a.kind === "my-room"
      ? -1
      : b.kind === "my-room"
        ? 1
        : Number(state.pinned.includes(b.slug)) -
            Number(state.pinned.includes(a.slug)) ||
          (latestActivityByConversation[b.databaseId ?? ""] ?? "").localeCompare(latestActivityByConversation[a.databaseId ?? ""] ?? "") ||
          rank(a) - rank(b),
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
          <Image
            className="mark-logo"
            src="/brand/toskerlogo-icon-main.svg"
            alt=""
            width={38}
            height={38}
          />
        </Link>
        <button
          className="collapse-button has-tip"
          data-tip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
        >
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
      </div>
      <nav className="product-nav" aria-label="Tosker destinations">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={
                workspace === item.label.toLowerCase() ? "page" : undefined
              }
              className={`product-nav-item ${workspace === item.label.toLowerCase() ? "active" : ""}`}
            >
              <span>
                <Icon size={17} />
              </span>
              <strong>{item.label}</strong>
            </Link>
          );
        })}
      </nav>
      <section className="conversation-section">
        <div className="unified-search">
          {collapsed ? (
            <button
              className="collapsed-search-trigger has-tip"
              data-tip="Search"
              aria-label="Search conversations"
              onClick={openCollapsedSearch}
            >
              <Search size={15} />
            </button>
          ) : (
            <label>
              <span>
                <Search size={15} />
              </span>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && expandedForSearch) {
                    setExpandedForSearch(false);
                    onToggleCollapse();
                  }
                  if (event.key === "Enter" && ordered[0]) {
                    sidebarRouter.push(hrefOf(ordered[0]));
                  }
                }}
                placeholder="Search"
                aria-label="Search"
              />
            </label>
          )}
          <button
            className="create-trigger"
            onClick={onCreate}
            aria-label="Start a chat or create a Room"
          >
            <Plus size={17} />
          </button>
        </div>
        <div className="conversation-list">
          {ordered.map((item) => (
            <ConversationRow
              key={item.slug}
              item={item}
              active={selected?.slug === item.slug}
              pinned={!identity && state.pinned.includes(item.slug)}
              onDropItem={identity ? () => undefined : prototypeStore.reorder}
              displayName={user.displayName}
              unread={item.databaseId ? unreadByConversation[item.databaseId] : undefined}
            />
          ))}
          {query && ordered.length === 0 ? (
            <p className="search-empty">Nothing found</p>
          ) : null}
        </div>
      </section>
      <ProfileRegion workspace={workspace} />
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
  const [profile, setProfile] = useState<(typeof friends)[number] | null>(null);
  const identity = useToskerIdentity();
  const router = useRouter();
  const [serverConnections, setServerConnections] = useState<Awaited<ReturnType<typeof listConnectionsAction>>>([]);
  const [peopleResults, setPeopleResults] = useState<Awaited<ReturnType<typeof findPeopleAction>>>([]);
  const refreshConnections = useCallback(() => listConnectionsAction().then(setServerConnections), []);
  useEffect(() => {
    if (!identity) return;
    void refreshConnections();
    const timer = window.setInterval(() => void refreshConnections(), 12000);
    return () => window.clearInterval(timer);
  }, [identity, refreshConnections]);
  useEffect(() => {
    if (!identity || query.trim().length < 2) return;
    const timer = window.setTimeout(() => void findPeopleAction(query).then(setPeopleResults), 180);
    return () => window.clearTimeout(timer);
  }, [identity, query]);
  const shown = friends.filter((friend) =>
    `${friend.name} ${friend.username} ${friend.tid}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
    <section className="friends-surface workspace-scroll">
      <WorkspaceBanner
        eyebrow="Friends"
        title="Your connections."
        intensity="quiet"
        action={
          <button
            onClick={() =>
              document
                .querySelector<HTMLInputElement>(".friends-search input")
                ?.focus()
            }
          >
            <Plus size={15} /> Add friend
          </button>
        }
      />
      <label className="friends-search">
        <Search size={16} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, username or TID"
          aria-label="Search friends"
        />
      </label>
      <nav>
        {["All", "Online", "Requests"].map((item) => (
          <button
            className={tab === item ? "active" : ""}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </nav>
      {tab === "Requests" ? (
        serverConnections.filter((item) => item.status === "pending" && item.direction === "incoming").length ? (
          <div className="friend-list">{serverConnections.filter((item) => item.status === "pending" && item.direction === "incoming").map((item) => item.person ? (
            <article key={item.id}><span className="avatar avatar-pink">{item.person.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{item.person.displayName}</strong><small>@{item.person.username} · {item.person.tid}</small></div><button onClick={async () => { await acceptConnectionAction(item.id); await refreshConnections(); }}>Accept</button></article>
          ) : null)}</div>
        ) : <div className="two-line-empty"><h2>No new requests</h2><p>You're all caught up</p></div>
      ) : (
        <div className="friend-list">
          {identity ? serverConnections.filter((item) => item.status === "accepted" && item.person && `${item.person.displayName} ${item.person.username} ${item.person.tid}`.toLowerCase().includes(query.toLowerCase())).map((item) => item.person ? (
            <article key={item.id}><span className="avatar avatar-pink avatar-pattern">{item.person.displayName.slice(0, 1).toUpperCase()}</span><div className="friend-nameplate"><strong>{item.person.displayName}</strong><small>@{item.person.username} · {item.person.tid}</small></div><i>Friend</i><button onClick={async () => { const chat = await startPersonalConversationAction(item.person!.userId); router.push(`/personal/${chat.slug}`); router.refresh(); }}>Message</button></article>
          ) : null) : shown
            .filter((friend) => tab !== "Online" || friend.status === "Online")
            .map((friend) => (
              <article key={friend.tid}>
                <span
                  className={`avatar avatar-${friend.color} avatar-pattern`}
                >
                  {friend.initials}
                </span>
                <div className="friend-nameplate">
                  <button
                    className="friend-name"
                    onClick={() => setProfile(friend)}
                  >
                    {friend.name}
                  </button>
                  <small>
                    {friend.username} · {friend.tid}
                  </small>
                </div>
                <i>{friend.status}</i>
                <button onClick={() => onMessage(friend)}>Message</button>
              </article>
            ))}
          {identity && query.trim().length >= 2 ? peopleResults.filter((person) => !serverConnections.some((item) => item.person?.userId === person.userId)).map((person) => (
            <article key={person.userId}><span className="avatar avatar-gold">{person.displayName.slice(0, 1).toUpperCase()}</span><div className="friend-nameplate"><strong>{person.displayName}</strong><small>@{person.username} · {person.tid}</small></div><button onClick={async () => { await requestConnectionAction(person.userId); await refreshConnections(); }}>Add</button></article>
          )) : null}
        </div>
      )}
    </section>
    {profile ? <FriendNamecard profile={profile} onClose={() => setProfile(null)} onMessage={() => onMessage(profile)} /> : null}
    </>
  );
}

function FriendNamecard({ profile, onClose, onMessage }: { profile: (typeof friends)[number]; onClose: () => void; onMessage: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useDismissLayer(true, onClose, ref);
  return (
    <div className="overlay-backdrop">
      <section ref={ref} className="identity-dialog" role="dialog" aria-modal="true" aria-label={`${profile.name} Namecard`}>
        <button className="overlay-close" onClick={onClose} aria-label="Close"><X size={17} /></button>
        <IdentityCard label="Friend" profile={profile} action={<button onClick={onMessage}>Message</button>} />
      </section>
    </div>
  );
}

function InviteOverlay({
  room,
  onClose,
}: {
  room: Conversation;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  useDismissLayer(true, onClose, panelRef);
  useEffect(() => {
    createRoomInviteAction(room.slug)
      .then((result) => setToken(result.inviteToken))
      .catch(() => setError("Could not create an invitation."));
  }, [room.slug]);
  const invitePath = token ? `/join/${token}` : "";
  const inviteUrl = token && typeof window !== "undefined" ? `${window.location.origin}${invitePath}` : "";
  return (
    <div className="overlay-backdrop">
      <section
        ref={panelRef}
        className="creation-panel invite-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
      >
        <button className="overlay-close" onClick={onClose} aria-label="Close">
          <X size={17} />
        </button>
        <p className="eyebrow">Invite to this Room</p>
        <h2 id="invite-title">{nameOf(room)}</h2>
        <p>Anyone with this link can understand the invitation and join.</p>
        <div className="invite-layout">
          <FakeQr value={inviteUrl} />
          <div>
            <label className="invite-link">
              Invitation link
              <input readOnly value={inviteUrl || "Creating secure link…"} />
            </label>
            <button
              className="primary-action"
              disabled={!inviteUrl}
              onClick={() => {
                navigator.clipboard?.writeText(inviteUrl);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            {invitePath ? <Link href={invitePath}>Preview invitation</Link> : null}
          </div>
        </div>
        <small className="prototype-note">{error || "Secure invitation · Expires in 14 days"}</small>
      </section>
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
  const identity = useToskerIdentity();
  const [mode, setMode] = useState(initial);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedThings, setThings] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const user = useCurrentToskerUser() ?? prototypeUser;
  const [room, setRoom] = useState<{ slug: string; name: string; tags: string[]; inviteToken: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<Array<{ userId: string; displayName: string; username: string; tid: string }>>([]);
  const [peopleSearching, setPeopleSearching] = useState(false);
  const [invitee, setInvitee] = useState("");
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useDismissLayer(true, close, panelRef, false);
  const startChat = (friend: (typeof friends)[number]) => {
    const chat = prototypeStore.createChat(friend);
    router.push(`/personal/${chat.slug}`);
    onClose();
  };
  useEffect(() => {
    if (!identity || friendQuery.trim().length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      findPeopleAction(friendQuery)
        .then((results) => active && setPeopleResults(results))
        .finally(() => active && setPeopleSearching(false));
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [friendQuery, identity]);
  const startPersistentChat = async (userId: string) => {
    setSaving(true);
    setSaveError("");
    try {
      const chat = await startPersonalConversationAction(userId);
      router.push(`/personal/${chat.slug}`);
      router.refresh();
      onClose();
    } catch {
      setSaveError("Could not start this chat. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const finishRoom = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const created = await createRoomAction({
        name,
        tags,
        capabilities: selectedThings,
        recipientHint: people[0] ?? null,
      });
      setRoom(created);
      setStep(5);
      router.refresh();
    } catch {
      setSaveError("Could not create the Room. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const nextRoom = () => {
    if (step === 4) void finishRoom();
    else setStep((current) => current + 1);
  };
  return (
    <div className="overlay-backdrop">
      <section
        ref={panelRef}
        className="creation-panel"
        role="dialog"
        aria-modal="true"
      >
        <button className="overlay-close" onClick={onClose} aria-label="Close">
          <X size={17} />
        </button>
        {mode !== "choose" ? (
          <button
            className="overlay-back"
            onClick={() => {
              if (mode === "room" && step > 1 && step < 5)
                setStep((current) => current - 1);
              else {
                setMode("choose");
                setStep(1);
              }
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : null}
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
              <Search size={16} aria-hidden="true" />
              <input
                autoFocus
                value={friendQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setFriendQuery(value);
                  setPeopleSearching(Boolean(identity && value.trim().length >= 2));
                  if (value.trim().length < 2) setPeopleResults([]);
                }}
                placeholder="Name, username or TID"
                aria-label="Find a friend to chat with"
              />
            </label>
            <div className="friend-list compact">
              {identity ? peopleResults.map((person) => (
                <article key={person.userId}>
                  <span className="avatar avatar-pink">{person.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                  <div><strong>{person.displayName}</strong><small>@{person.username} · {person.tid}</small></div>
                  <button disabled={saving} onClick={() => void startPersistentChat(person.userId)}>Chat</button>
                </article>
              )) : friends
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
              {identity && peopleSearching ? <p>Searching…</p> : null}
              {identity && !peopleSearching && friendQuery.trim().length >= 2 && !peopleResults.length ? <p>No people found.</p> : null}
              {saveError ? <p role="alert">{saveError}</p> : null}
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
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && name.trim()) nextRoom();
                    }}
                    maxLength={80}
                    placeholder="Sunday Dinner"
                    aria-label="Room name"
                  />
                </label>
              </>
            ) : null}
            {step === 2 ? (
              <>
                <h2>Add tags</h2>
                <p>Optional. Keep it easy to spot.</p>
                <div className="option-grid tags">
                  {roomTags.map((tag, index) => (
                    <button
                      autoFocus={index === 0}
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
                  {things.map((thing, index) => (
                    <button
                      autoFocus={index === 0}
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
                <p>Optional. Add a friend, username or TID.</p>
                <div className="invite-person-field">
                  <input
                    value={invitee}
                    onChange={(event) => setInvitee(event.target.value)}
                    placeholder="Username or TID"
                    aria-label="Invite by username or TID"
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || !invitee.trim()) return;
                      event.preventDefault();
                      setPeople((current) => current.includes(invitee.trim()) ? current : [...current, invitee.trim()]);
                      setInvitee("");
                    }}
                  />
                  <button
                    disabled={!invitee.trim()}
                    onClick={() => {
                      const value = invitee.trim();
                      if (!value) return;
                      setPeople((current) => current.includes(value) ? current : [...current, value]);
                      setInvitee("");
                    }}
                  >Add</button>
                </div>
                <div className="invited-identifiers" aria-label="Added invitations">
                  {people
                    .filter((person) => !friends.some((friend) => friend.tid === person))
                    .map((person) => (
                      <button
                        key={person}
                        onClick={() => setPeople((current) => current.filter((item) => item !== person))}
                        aria-label={`Remove ${person}`}
                      >
                        {person} <X size={13} aria-hidden="true" />
                      </button>
                    ))}
                </div>
                <div className="friend-list compact">
                  {friends.map((friend, index) => (
                    <article key={friend.tid}>
                      <span className={`avatar avatar-${friend.color}`}>
                        {friend.initials}
                      </span>
                      <div>
                        <strong>{friend.name}</strong>
                        <small>{friend.username}</small>
                      </div>
                      <button
                        autoFocus={index === 0}
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
                <FakeQr value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${room.inviteToken}`} />
                <h2>Room's ready</h2>
                <p>{room.name} · Created by {user.displayName}</p>
                <div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        `${window.location.origin}/join/${room.inviteToken}`,
                      );
                      setCopied(true);
                    }}
                  >
                    {copied ? "Copied" : "Copy invite"}
                  </button>
                  <Link
                    className="room-ready-preview"
                    href={`/join/${room.inviteToken}`}
                  >
                    Preview
                  </Link>
                  <button
                    onClick={() => {
                      router.push(`/room/${room.slug}`);
                      onClose();
                    }}
                  >
                    Open Room
                  </button>
                </div>
                <small>Secure invitation · Expires in 14 days</small>
              </div>
            ) : null}
            {step < 5 ? (
              <div className="wizard-actions">
                <button
                  className="button button-primary primary-action"
                  onClick={nextRoom}
                  disabled={saving || (step === 1 && !name.trim())}
                >
                  {step === 1
                    ? "Next"
                    : step === 4
                      ? saving ? "Creating…" : "Create Room"
                      : "Next"}
                </button>
                {saveError ? <p role="alert">{saveError}</p> : null}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function MobileNav() {
  const user = useCurrentToskerUser() ?? prototypeUser;
  return (
    <nav className="mobile-app-nav" aria-label="Mobile destinations">
      <Link href="/">
        <span>
          <MessageCircle size={17} />
        </span>
        Chats
      </Link>
      <Link href="/friends">
        <span>
          <UsersRound size={17} />
        </span>
        Friends
      </Link>
      <Link href="/notifications">
        <span>
          <Bell size={17} />
        </span>
        Notifications
      </Link>
      <Link href="/explore">
        <span>
          <Compass size={17} />
        </span>
        Explore
      </Link>
      <Link href="/profile">
        <span className="mobile-profile-avatar">{user.initials}</span>
        Profile
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
  const user = useCurrentToskerUser() ?? prototypeUser;
  const identity = useToskerIdentity();
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const router = useRouter();
  const [overlay, setOverlay] = useState<Overlay>(
    workspace === "create" ? "room" : null,
  );
  const [activity, setActivity] = useState<NotificationActivity[]>([]);
  const [toast, setToast] = useState<NotificationActivity | null>(null);
  const seenActivity = useRef<Set<string> | null>(null);
  const addPanelRef = useRef<HTMLElement>(null);
  const closeAdd = useCallback(() => setOverlay(null), []);
  useDismissLayer(overlay === "add", closeAdd, addPanelRef);
  useEffect(() => {
    if (!identity) {
      seenActivity.current = null;
      return;
    }
    let active = true;
    const refresh = async () => {
      const next = await listNotificationsAction().catch(() => [] as NotificationActivity[]);
      if (!active) return;
      const previous = seenActivity.current;
      setActivity(next);
      seenActivity.current = new Set(next.map((item) => item.id));
      if (previous) {
        const incoming = next.find((item) => !previous.has(item.id) && !item.readAt && item.actorId !== identity.userId);
        if (incoming) {
          setToast(incoming);
          window.setTimeout(() => setToast((current) => current?.id === incoming.id ? null : current), 6500);
        }
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 12000);
    return () => { active = false; window.clearInterval(timer); };
  }, [identity]);
  const collapsed = useSyncExternalStore(
    collapseStore.subscribe,
    collapseStore.getSnapshot,
    collapseStore.getServerSnapshot,
  );
  const canonical = selectedSlug
    ? conversations.find((item) => item.slug === selectedSlug)
    : undefined;
  const authenticatedCanonical =
    identity && canonical?.kind === "my-room"
      ? { ...canonical, databaseId: identity.sandboxConversationId }
      : canonical;
  const prototypeRoom = state.rooms.find((room) => room.slug === selectedSlug);
  const prototypeChat = state.chats.find((chat) => chat.slug === selectedSlug);
  const serverRoom = identity?.rooms.find((room) => room.slug === selectedSlug);
  const serverChat = identity?.personalConversations.find((chat) => chat.slug === selectedSlug);
  const selected =
    (identity && authenticatedCanonical?.kind !== "my-room" ? undefined : authenticatedCanonical) ??
    (serverChat
      ? {
          slug: serverChat.slug,
          kind: "personal" as const,
          name: serverChat.displayName,
          initials: serverChat.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
          color: "pink",
          preview: "",
          time: "Now",
          context: `@${serverChat.username} · ${serverChat.tid}`,
          messages: [],
          databaseId: serverChat.conversationId,
        }
      : undefined) ??
    (serverRoom
      ? {
          slug: serverRoom.slug,
          kind: "room" as const,
          name: serverRoom.name,
          initials: serverRoom.name.slice(0, 2).toUpperCase(),
          color: "green",
          preview: "",
          time: "Now",
          context: "",
          messages: [],
          tag: serverRoom.tag,
          databaseId: serverRoom.conversationId,
        }
      :
    (prototypeRoom
      ? {
          slug: prototypeRoom.slug,
          kind: "room" as const,
          name: prototypeRoom.name,
          initials: prototypeRoom.name.slice(0, 2).toUpperCase(),
          color: "green",
          preview: "",
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
            preview: "",
            time: "Now",
            context: prototypeChat.tid,
            messages: prototypeChat.messages,
          }
        : selectedSlug
          ? conversations[0]
          : undefined));
  const unreadByConversation = activity.reduce<Record<string, number>>((counts, item) => {
    if (item.type === "message" && item.conversationId && !item.readAt) counts[item.conversationId] = (counts[item.conversationId] ?? 0) + 1;
    return counts;
  }, {});
  const latestActivityByConversation = activity.reduce<Record<string, string>>((latest, item) => {
    if (item.conversationId && (!latest[item.conversationId] || item.createdAt > latest[item.conversationId])) latest[item.conversationId] = item.createdAt;
    return latest;
  }, {});
  const unreadForSurface = (kind: "message" | "hall") => activity.filter((item) => selected?.databaseId && item.conversationId === selected.databaseId && !item.readAt && (kind === "message" ? item.type === "message" : item.type === "hall_note" || item.type === "hall_pin")).length;
  const activityHref = (item: NotificationActivity) => item.conversationKind === "room" && item.roomSlug ? `/room/${item.roomSlug}` : item.conversationKind === "personal" && item.conversationId ? `/personal/chat-${item.conversationId}` : item.conversationKind === "sandbox" ? "/personal/my-room" : "/friends";
  const messageFriend = (friend: (typeof friends)[number]) => {
    const chat = prototypeStore.createChat(friend);
    router.push(`/personal/${chat.slug}`);
  };
  return (
    <main
      className={`messaging-app ${selected ? "has-selection" : "list-only"} ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <AppSidebar
        selected={selected}
        workspace={workspace}
        onCreate={() => setOverlay("choose")}
        collapsed={collapsed}
        onToggleCollapse={collapseStore.toggle}
        unreadByConversation={unreadByConversation}
        latestActivityByConversation={latestActivityByConversation}
      />
      <div className="working-surface">
        {selected ? (
          <>
            <SurfaceHeader
              conversation={selected}
              surface={surface}
              onAdd={() => setOverlay("add")}
              onInvite={() => setOverlay("invite")}
              chatUnread={unreadForSurface("message")}
              hallUnread={unreadForSurface("hall")}
            />
            {surface === "hall" ? (
              <HallSurface
                conversation={selected}
                empty={Boolean(identity) || Boolean(prototypeRoom && !canonical)}
              />
            ) : (
              <ChatSurface key={selected.slug} conversation={selected} />
            )}
          </>
        ) : workspace === "friends" ? (
          <FriendsSurface onMessage={messageFriend} />
        ) : workspace && workspace !== "create" ? (
          <ProductSurface surface={workspace} mode={state.mode} />
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
              Hey {user.displayName}, let's pick up where you left off
            </h2>
            <p>Choose a conversation or Room</p>
            {state.mode === "new" ? (
              <div className="first-run-actions">
                <button onClick={() => setOverlay("chat")}>Start Chat</button>
                <button onClick={() => setOverlay("room")}>Create Room</button>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <MobileNav />
      {overlay === "choose" || overlay === "chat" || overlay === "room" ? (
        <CreationOverlay initial={overlay} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay === "invite" && selected?.kind === "room" ? (
        <InviteOverlay room={selected} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay === "add" ? (
        <div className="overlay-backdrop">
          <section ref={addPanelRef} className="creation-panel" role="dialog" aria-modal="true" aria-labelledby="add-title">
            <button
              className="overlay-close"
              onClick={() => setOverlay(null)}
              aria-label="Close"
            >
              <X size={17} />
            </button>
            <h2 id="add-title">Add something</h2>
            <p>Add to this space.</p>
            <div className="option-grid">
              {[...things, "Photo Wall", "Subroom"].map((item, index) => {
                const installed = serverRoom?.capabilities.includes(item) ?? prototypeRoom?.things.includes(item) ?? false;
                const supported = things.includes(item);
                return (
                <button
                  autoFocus={index === 0}
                  key={item}
                  className={installed ? "active" : ""}
                  disabled={installed || selected?.kind !== "room" || Boolean(identity && !supported)}
                  aria-label={`${item}${installed ? ", Added" : ""}`}
                  onClick={async () => {
                    if (!selected || selected.kind !== "room") return;
                    if (identity && selected.databaseId) {
                      await installRoomCapabilityAction({ conversationId: selected.databaseId, capability: item });
                      router.refresh();
                    } else prototypeStore.addThing({ slug: selected.slug, name: selected.name, thing: item });
                    setOverlay(null);
                  }}
                >
                  {item}{installed ? <small>Added</small> : null}
                </button>
              );})}
            </div>
          </section>
        </div>
      ) : null}
      {toast ? <button className="activity-toast" onClick={() => { router.push(activityHref(toast)); setToast(null); }} aria-label="Open new activity"><strong>{toast.actorName ?? "Someone"}</strong><span>{toast.type === "message" ? (toast.messageBody || "New message") : toast.type === "connection_request" ? "sent you a friend request" : toast.type === "connection_accepted" ? "accepted your friend request" : "updated Hall"}</span></button> : null}
    </main>
  );
}
