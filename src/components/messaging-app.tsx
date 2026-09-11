"use client";
import { useConversationRealtime } from "./use-conversation-realtime";
import { RoomDetails } from "./room-details";
import { ACTIVITY_REFRESH, CONVERSATION_ACCESS_LOST } from "@/lib/realtime-contract";
import { notificationHref } from "@/lib/notification-href";
import { deriveAttention } from "@/lib/attention";
import { AttentionMark } from "./attention-mark";
import { PersonAvatar, RoomAvatar, SandboxAvatar } from "./identity-avatar";
import { activeRoomSlug, sandboxName } from "@/lib/workspace-navigation";
import { RoomCategory } from "./room-category";
import type { refreshWorkspaceNavigationAction } from "@/server/accounts/actions";
import { acknowledgeFriendRequestsAction } from "@/server/connections/actions";
import { workspaceSnapshot } from "./workspace-snapshot";
import type { ConversationPreference } from "@/lib/conversation-preferences";
/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import { ModalLayer } from "./modal-layer";
import { DEFAULT_ROOM_TAGS, normalizeRoomTags } from "@/lib/room-tags";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import { useMobileViewport } from "@/components/use-mobile-viewport";
import { ToskerIdentityProvider, useCurrentToskerUser, useToskerIdentity } from "@/components/tosker-identity";
import { createRoomAction, createRoomInviteAction, createSubroomAction, findRoomMembersAction } from "@/server/rooms/actions";
import { findPeopleAction, startPersonalConversationAction } from "@/server/conversations/actions";
import { acceptConnectionAction, listConnectionsAction, requestConnectionAction, removeConnectionNicknameAction, setConnectionNicknameAction } from "@/server/connections/actions";
import type { listNotificationsAction } from "@/server/shared-state/actions";
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
  UsersRound,
  X,
} from "lucide-react";

export type AppWorkspace = ProductWorkspace | "friends" | "create";
type Overlay = "choose" | "chat" | "room" | "invite" | "subroom" | "manage" | null;
type NotificationActivity = Awaited<ReturnType<typeof listNotificationsAction>>[number];
const nav = [
  { label: "Explore", icon: Compass, href: "/explore" },
  { label: "Friends", icon: UsersRound, href: "/friends" },
];
function PresenceMark({ status, label = true }: { status?: "online" | "idle" | "away" | "meeting"; label?: boolean }) {
  if (!status) return null;
  const names = { online: "Online", idle: "Idle", away: "Away", meeting: "In a meeting" };
  return <span className={`presence-mark ${status}`} title={names[status]} aria-label={label ? names[status] : undefined} />;
}
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
const roomTags = DEFAULT_ROOM_TAGS;
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
    ? sandboxName(displayName)
    : item.name;
}
function hrefOf(item: Conversation) {
  return item.href ?? (item.kind === "room" ? `/room/${item.slug}` : `/personal/${item.slug}`);
}
function Avatar({
  item,
  large = false,
}: {
  item: Conversation;
  large?: boolean;
}) {
  if (item.kind === "my-room") return <SandboxAvatar className={large ? "avatar-large" : ""} />;
  return item.kind === "room" ? <RoomAvatar name={item.name} seed={item.identitySeed ?? item.slug.split("--")[0]} subroom={item.tag === "SUBROOM"} className={large ? "avatar-large" : ""} /> : <PersonAvatar seed={item.identitySeed ?? item.slug} initials={item.initials} imageUrl={item.avatarUrl} className={large ? "avatar-large" : ""} />;
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
  return (
    <div ref={ref} className="context-menu conversation-context" role="menu">
      {action(pinned ? "Unpin" : "Pin to top", () =>
        prototypeStore.togglePinned(item.slug),
      )}
      {action("Archive", () => prototypeStore.archive(item.slug))}
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
  // No prototype lifecycle menu in the beta shell. Real Room actions live in details.
  const hasActions = false;
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginPress = () => {
    if (!hasActions) return;
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
      className={`conversation-row-shell ${active ? "active" : ""} ${item.tag === "SUBROOM" ? "subroom-row" : ""}`}
      draggable={hasActions}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.slug);
        event.currentTarget.classList.add("is-dragging");
      }}
      onDragEnd={(event) => event.currentTarget.classList.remove("is-dragging")}
      onDragOver={(event) => {
        if (!hasActions) return;
        event.preventDefault();
        event.currentTarget.classList.add("drag-target");
      }}
      onDragLeave={(event) =>
        event.currentTarget.classList.remove("drag-target")
      }
      onDrop={(event) => {
        if (!hasActions) return;
        event.preventDefault();
        event.currentTarget.classList.remove("drag-target");
        onDropItem(event.dataTransfer.getData("text/plain"), item.slug);
      }}
      onContextMenu={(event) => {
        if (!hasActions) return;
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
        aria-label={`${nameOf(item, displayName)}${item.kind === "room" ? item.tag === "SUBROOM" ? ", Subroom" : ", Room" : ""}`}
        data-name={nameOf(item, displayName)}
      >
        <Avatar item={item} />
        <span className="conversation-copy">
          <span className="conversation-name">
            <span>{nameOf(item, displayName)}</span>
          </span>
          {item.kind !== "my-room" ? <span className="conversation-preview">{item.kind === "room" && item.tag !== "SUBROOM" ? <RoomCategory value={item.tag ?? "Room"} /> : item.preview}</span> : null}
        </span>
        <span className="conversation-trailing">
          <time>{item.time}</time>
          {pinned ? (
            <i aria-label="Pinned">⌖</i>
          ) : unread || item.unread ? (
            <AttentionMark count={unread || item.unread || 0} label="unread activities" />
          ) : null}
        </span>
      </Link>
      {hasActions ? (
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
      {open && hasActions ? (
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
  notificationCount = 0,
}: {
  workspace?: AppWorkspace;
  notificationCount?: number;
}) {
  const user = useCurrentToskerUser() ?? prototypeUser;
  const identity = useToskerIdentity();
  return (
    <div className="sidebar-bottom">
      <div className="profile-nameplate">
        <Link className="profile-avatar-button" href="/profile" aria-label="Open your Namecard">
        <PersonAvatar seed={identity?.userId ?? "demo-self"} initials={user.initials} imageUrl={identity?.avatarUrl} className="profile-avatar">
          <i className="profile-avatar-badge" aria-hidden="true" />
          <PresenceMark status={"presenceStatus" in user ? user.presenceStatus as "online" | "idle" | "away" | "meeting" : undefined} label />
        </PersonAvatar>
        </Link>
        <span>
          <strong>{user.displayName}</strong>
          <small>{user.role}</small>
        </span>
        <div className="profile-actions">
          <Link
            href="/notifications"
            aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ""}`}
            data-tip="Notifications"
            className="has-tip profile-notifications"
            aria-current={workspace === "notifications" ? "page" : undefined}
          >
            <Bell size={16} />
            <AttentionMark count={notificationCount} label="unread notifications" />
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
      <Link href="/" className="landing-footer-link">View landing page</Link>
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
  friendAttention,
  notificationCount,
}: {
  selected?: Conversation;
  surface: "chat" | "hall";
  workspace?: AppWorkspace;
  onCreate: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadByConversation: Record<string, number>;
  latestActivityByConversation: Record<string, string>;
  friendAttention: number;
  notificationCount: number;
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
        .map((item) => ({ ...item, databaseId: identity.sandboxConversationId, identitySeed: identity.userId, avatarUrl: identity.avatarUrl }))
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
  const serverSubrooms: Conversation[] = (identity?.rooms ?? []).flatMap((room) => room.subrooms.map((subroom) => ({
    slug: `${room.slug}--${subroom.id}`,
    kind: "room" as const,
    name: subroom.name,
    initials: subroom.name.slice(0, 2).toUpperCase(),
    color: "green",
    preview: "",
    time: "Now",
    context: `${room.name} · ${subroom.name}`,
    messages: [],
    tag: "SUBROOM",
    databaseId: subroom.conversationId,
    href: `/room/${room.slug}/subroom/${subroom.id}`,
  })));
  const serverChats: Conversation[] = (identity?.personalConversations ?? []).map((chat) => ({
    identitySeed: chat.userId,
    avatarUrl: chat.avatarUrl,
    slug: chat.slug,
    kind: "personal",
    name: chat.nickname || chat.displayName,
    initials: chat.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    color: "pink",
    preview: "",
    time: "Now",
    context: `@${chat.username} · ${chat.tid}`,
    messages: [],
    databaseId: chat.conversationId,
    presenceStatus: chat.presenceStatus,
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
  const currentRoomSlug = activeRoomSlug(selected, workspace);
  const visibleServerSubrooms = serverSubrooms.filter((child) => child.slug.split("--")[0] === currentRoomSlug);
  const all = [...standard, ...serverChats, ...serverRooms, ...visibleServerSubrooms, ...(identity ? [] : localChats), ...(identity ? [] : localRooms)].filter(
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
  const orderedRoots = [...filtered.filter((item) => !item.slug.includes("--"))].sort((a, b) =>
    a.kind === "my-room"
      ? -1
      : b.kind === "my-room"
        ? 1
        : (!identity ? Number(state.pinned.includes(b.slug)) -
            Number(state.pinned.includes(a.slug)) : 0) ||
          (latestActivityByConversation[b.databaseId ?? ""] ?? "").localeCompare(latestActivityByConversation[a.databaseId ?? ""] ?? "") ||
          rank(a) - rank(b),
  );
  const ordered = orderedRoots.flatMap((item) => [item, ...visibleServerSubrooms.filter((child) => child.slug.startsWith(`${item.slug}--`) && (!query || filtered.some((result) => result.slug === child.slug)))]);
  // A matching child keeps its parent context, even when only the child name matches.
  if (query) for (const child of filtered.filter((item) => item.slug.includes("--"))) {
    if (ordered.some((item) => item.slug === child.slug)) continue;
    const parent = serverRooms.find((item) => child.slug.startsWith(`${item.slug}--`));
    if (parent && !ordered.some((item) => item.slug === parent.slug)) ordered.push(parent);
    ordered.push(child);
  }
  return (
    <aside className="messenger-sidebar">
      <div className="sidebar-brand">
        <Link href="/app" aria-label="Tosker chats">
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
              aria-label={`${item.label}${item.label === "Friends" && friendAttention ? `, ${friendAttention} new requests` : ""}`}
              aria-current={
                (workspace === "studio" || workspace === "marketplace" ? "explore" : workspace) === item.label.toLowerCase() ? "page" : undefined
              }
              className={`product-nav-item ${(workspace === "studio" || workspace === "marketplace" ? "explore" : workspace) === item.label.toLowerCase() ? "active" : ""}`}
            >
              <span>
                <Icon size={17} />
              </span>
              <strong>{item.label}</strong>
              {item.label === "Friends" ? <AttentionMark count={friendAttention} label="new friend requests" /> : null}
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
              pinned={false}
              onDropItem={identity ? () => undefined : prototypeStore.reorder}
              displayName={user.displayName}
              unread={(item.databaseId ? unreadByConversation[item.databaseId] ?? 0 : 0) + (item.kind === "room" && !item.slug.includes("--") ? serverSubrooms.filter((child) => child.slug.startsWith(`${item.slug}--`)).reduce((sum, child) => sum + (unreadByConversation[child.databaseId!] ?? 0), 0) : 0)}
            />
          ))}
          {query && ordered.length === 0 ? (
            <p className="search-empty">Nothing found</p>
          ) : null}
        </div>
      </section>
      <ProfileRegion workspace={workspace} notificationCount={notificationCount} />
    </aside>
  );
}

function FriendsSurface({
  onMessage,
  requestActivity,
}: {
  onMessage: (friend: (typeof friends)[number]) => void;
  requestActivity: NotificationActivity[];
}) {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<(typeof friends)[number] | null>(null);
  const [nicknameTarget, setNicknameTarget] = useState<{ id: string; name: string; nickname: string | null } | null>(null);
  const [friendMenuId, setFriendMenuId] = useState<string | null>(null);
  const identity = useToskerIdentity();
  const router = useRouter();
  const [serverConnections, setServerConnections] = useState<Awaited<ReturnType<typeof listConnectionsAction>>>([]);
  const [peopleResults, setPeopleResults] = useState<Awaited<ReturnType<typeof findPeopleAction>>>([]);
  const [searchState, setSearchState] = useState({ term: "", loading: false, error: false });
  const identityId = identity?.userId;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const discovering = Boolean(query.trim());
  const refreshConnections = useCallback(() => listConnectionsAction().then(setServerConnections), []);
  useEffect(() => {
    if (!identityId) return;
    let active = true, inFlight = false, pending = false;
    let pendingTimer: number | undefined;
    const refresh = async () => {
      if (document.hidden || !active) return;
      if (inFlight) { pending = true; return; }
      pending = false;
      inFlight = true;
      try { const next = await listConnectionsAction(); if (active) setServerConnections(next); }
      catch { /* Retain the last successful result during a temporary outage. */ }
      finally { inFlight = false; if (pending && active) pendingTimer = window.setTimeout(refresh, 100); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 12000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(ACTIVITY_REFRESH, refresh);
    return () => { active = false; window.clearInterval(timer); window.clearTimeout(pendingTimer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener(ACTIVITY_REFRESH, refresh); };
  }, [identityId, refreshConnections]);
  useEffect(() => {
    if (!identityId || query.trim().length < 2) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchState({ term: query.trim(), loading: true, error: false });
      try {
        const results = await findPeopleAction(query, true);
        if (active) { setPeopleResults(results); setSearchState({ term: query.trim(), loading: false, error: false }); }
      } catch { if (active) setSearchState({ term: query.trim(), loading: false, error: true }); }
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [identityId, query]);
  const requestIds = requestActivity.filter((item) => serverConnections.some((connection) => connection.status === "pending" && connection.direction === "incoming" && connection.person?.userId === item.actorId)).slice(0, 500).map((item) => item.id).join(",");
  useEffect(() => {
    if (!identityId || tab !== "Requests" || discovering || !requestIds || document.hidden) return;
    void acknowledgeFriendRequestsAction(requestIds.split(",")).catch(() => undefined);
  }, [identityId, tab, discovering, requestIds]);
  const actOnPerson = async (id: string, operation: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(id); setActionError("");
    try { await operation(); await refreshConnections(); window.dispatchEvent(new Event(ACTIVITY_REFRESH)); }
    catch { setActionError("Couldn't save that change. Please try again."); }
    finally { setBusyId(null); }
  };
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
            onClick={() => {
              setTab("All");
              document
                .querySelector<HTMLInputElement>(".friends-search input")
                ?.focus();
            }}
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
          aria-controls={discovering ? "friend-discovery" : undefined}
          onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }}
        />
        {discovering ? <button className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}><X size={15} /></button> : null}
      </label>
      {identity && discovering ? <section className="friend-discovery" id="friend-discovery" aria-label="People search results" aria-busy={query.trim().length >= 2 && (searchState.term !== query.trim() || searchState.loading)}>
        <h2>Search results</h2>
        {query.trim().length < 2 ? <p role="status">Enter at least 2 characters.</p> : searchState.term !== query.trim() || searchState.loading ? <p role="status">Searching…</p> : searchState.error ? <p role="alert">Search couldn't load. Change your search to try again.</p> : !peopleResults.length ? <p role="status">No people found.</p> : <div className="discovery-results">{peopleResults.map((person) => {
          const relationship = serverConnections.find((item) => item.person?.userId === person.userId);
          const label = person.userId === identity.userId ? "You" : relationship?.status === "accepted" ? "Friend" : relationship?.direction === "incoming" ? "Accept" : relationship ? "Pending" : "Add";
          const name = relationship?.person?.nickname || person.displayName;
          return <article key={person.userId}>
            <PersonAvatar seed={person.userId} initials={person.displayName.slice(0, 2).toUpperCase()} />
            <div className="discovery-identity"><strong>{name}</strong><small>@{person.username}</small><small>{person.tid}</small></div>
            <div className="discovery-actions"><span className="relationship-state">{label === "Accept" ? "Request received" : label === "Add" ? "" : label}</span>
              {label === "Friend" ? <button aria-label={`Message ${name}`} disabled={Boolean(busyId)} onClick={() => void actOnPerson(person.userId, async () => { const chat = await startPersonalConversationAction(person.userId); router.push(`/personal/${chat.slug}`); })}><MessageCircle size={16} /></button> : label === "Add" || label === "Accept" ? <button disabled={Boolean(busyId)} onClick={() => void actOnPerson(person.userId, () => label === "Accept" && relationship ? acceptConnectionAction(relationship.id) : requestConnectionAction(person.userId))}>{busyId === person.userId ? "Saving…" : label}</button> : null}
            </div>
          </article>;
        })}</div>}
      </section> : <><nav aria-label="Friend lists">
        {["All", "Online", "Requests"].map((item) => (
          <button
            className={tab === item ? "active" : ""}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
            {item === "Requests" ? <AttentionMark count={requestIds ? requestIds.split(",").length : 0} label="new friend requests" /> : null}
          </button>
        ))}
      </nav>
      {tab === "Requests" ? (
        serverConnections.filter((item) => item.status === "pending" && item.direction === "incoming").length ? (
          <div className="friend-list">{serverConnections.filter((item) => item.status === "pending" && item.direction === "incoming").map((item) => item.person ? (
            <article key={item.id}><PersonAvatar seed={item.person.userId} imageUrl={item.person.avatarUrl} initials={item.person.displayName.slice(0, 1).toUpperCase()} /><div><strong>{item.person.displayName}</strong><small>@{item.person.username} · {item.person.tid}</small></div><button disabled={Boolean(busyId)} onClick={() => void actOnPerson(item.person!.userId, () => acceptConnectionAction(item.id))}>{busyId === item.person.userId ? "Saving…" : "Accept"}</button></article>
          ) : null)}</div>
        ) : <div className="two-line-empty"><h2>No new requests</h2><p>You're all caught up</p></div>
      ) : (
          <div className="friend-list">
          {identity ? serverConnections.filter((item) => item.status === "accepted" && item.person && (tab !== "Online" || item.person.presenceStatus === "online") && `${item.person.nickname ?? ""} ${item.person.displayName} ${item.person.username} ${item.person.tid}`.toLowerCase().includes(query.toLowerCase())).map((item) => item.person ? (
            <article key={item.id}><PersonAvatar seed={item.person.userId} imageUrl={item.person.avatarUrl} initials={item.person.displayName.slice(0, 1).toUpperCase()}><PresenceMark status={item.person.presenceStatus} /></PersonAvatar><div className="friend-nameplate"><strong>{item.person.nickname || item.person.displayName}</strong><small>@{item.person.username} · {item.person.tid}</small></div><i>Friend</i><div className="friend-actions"><button aria-label={`Message ${item.person.nickname || item.person.displayName}`} onClick={async () => { const chat = await startPersonalConversationAction(item.person!.userId); router.push(`/personal/${chat.slug}`); router.refresh(); }}><MessageCircle size={15} /></button><button aria-label={`More actions for ${item.person.nickname || item.person.displayName}`} aria-expanded={friendMenuId === item.id} onClick={() => setFriendMenuId(friendMenuId === item.id ? null : item.id)}><MoreHorizontal size={16} /></button>{friendMenuId === item.id ? <div className="context-menu friend-context-menu"><button onClick={() => { setFriendMenuId(null); setNicknameTarget({ id: item.id, name: item.person!.displayName, nickname: item.person!.nickname }); }}>{item.person.nickname ? "Edit nickname" : "Set nickname"}</button>{item.person.nickname ? <button onClick={async () => { await removeConnectionNicknameAction(item.id); await refreshConnections(); setFriendMenuId(null); }}>Remove nickname</button> : null}</div> : null}</div></article>
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
        </div>
      )}</>}
      {actionError ? <p role="alert">{actionError}</p> : null}
    </section>
    {profile ? <FriendNamecard profile={profile} onClose={() => setProfile(null)} onMessage={() => onMessage(profile)} /> : null}
    {nicknameTarget ? <NicknameDialog target={nicknameTarget} onClose={() => setNicknameTarget(null)} onSaved={refreshConnections} /> : null}
    </>
  );
}

function NicknameDialog({ target, onClose, onSaved }: { target: { id: string; name: string; nickname: string | null }; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const [value, setValue] = useState(target.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  useDismissLayer(true, onClose, ref);
  const save = async () => { setSaving(true); setError(null); try { if (value.trim()) await setConnectionNicknameAction({ connectionId: target.id, nickname: value }); else await removeConnectionNicknameAction(target.id); await onSaved(); onClose(); } catch { setError("Could not save that nickname."); } finally { setSaving(false); } };
  return <ModalLayer onClose={onClose}><section ref={ref} className="identity-dialog nickname-dialog" role="dialog" aria-modal="true" aria-labelledby="nickname-title"><button className="overlay-close" onClick={onClose} aria-label="Close"><X size={17} /></button><p className="eyebrow">Private nickname</p><h2 id="nickname-title">{target.name}</h2><p>Only you will see this name.</p><label className="invite-link">Nickname<input value={value} maxLength={60} onChange={(event) => setValue(event.target.value)} placeholder="e.g. Army Jon" /></label><div className="overlay-actions"><button className="primary-action" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save nickname"}</button><button className="quiet-action" onClick={onClose}>Cancel</button></div>{error ? <p className="composer-error" role="alert">{error}</p> : null}</section></ModalLayer>;
}

function FriendNamecard({ profile, onClose, onMessage }: { profile: (typeof friends)[number]; onClose: () => void; onMessage: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useDismissLayer(true, onClose, ref);
  return (
    <ModalLayer onClose={onClose}>
      <section ref={ref} className="identity-dialog" role="dialog" aria-modal="true" aria-label={`${profile.name} Namecard`}>
        <button className="overlay-close" onClick={onClose} aria-label="Close"><X size={17} /></button>
        <IdentityCard label="Friend" profile={profile} action={<button onClick={onMessage}>Message</button>} />
      </section>
    </ModalLayer>
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
    <ModalLayer onClose={onClose}>
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
        <p>One person can join with this link.</p>
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
              onClick={async () => {
                try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); }
                catch { setError("Copy unavailable. Select the invitation link to copy it."); }
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            {invitePath ? <Link href={invitePath}>Preview invitation</Link> : null}
          </div>
        </div>
        <small className="prototype-note">{error || "Secure invitation · Expires in 14 days"}</small>
      </section>
    </ModalLayer>
  );
}

function SubroomOverlay({ room, onClose }: { room: Conversation; onClose: () => void }) {
  const router = useRouter();
  const identity = useToskerIdentity();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"everyone" | "selected" | "owners">("everyone");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ userId: string; displayName: string; username: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const close = () => { if (!saving) onClose(); };
  useDismissLayer(true, close, panelRef);
  useEffect(() => {
    if (!identity || query.trim().length < 2 || visibility !== "selected") return;
    let active = true;
    queueMicrotask(() => { if (active) { setResults([]); setSearchState("loading"); } });
    const timer = window.setTimeout(() => {
      findRoomMembersAction(room.slug, query).then((next) => { if (active) { setResults(next); setSearchState("ready"); } }).catch(() => { if (active) setSearchState("error"); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [identity, query, visibility, room.slug]);
  const visibleResults = visibility === "selected" && query.trim().length >= 2 ? results : [];
  const create = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const created = await createSubroomAction({ roomSlug: room.slug, name, visibility, userIds: selectedIds });
      router.refresh();
      router.push(`/room/${room.slug}/subroom/${created.id}`);
      onClose();
    } catch {
      setError("Could not create the Subroom. Check your Room permissions and try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalLayer onClose={close}>
      <section ref={panelRef} className="creation-panel" role="dialog" aria-modal="true" aria-labelledby="subroom-title">
        <button className="overlay-close" disabled={saving} onClick={close} aria-label="Close"><X size={17} /></button>
        <button className="overlay-back" disabled={saving} onClick={close}><ArrowLeft size={16} /> Back</button>
        <p className="eyebrow">Add to {nameOf(room)}</p>
        <h2 id="subroom-title">Create a Subroom</h2>
        <p>A focused space inside this Room.</p>
        <label className="wizard-field">
          <span>Name</span>
          <input autoFocus disabled={saving} value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="ONIC MLBB" />
        </label>
        <label className="wizard-field">
          <span>Visibility</span>
          <select disabled={saving} value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}>
            <option value="everyone">Everyone in Room</option>
            <option value="selected">Selected people</option>
            <option value="owners">Room owner only</option>
          </select>
        </label>
        {visibility === "selected" ? (
          <>
            <label className="wizard-field"><span>Room members</span><input disabled={saving} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Room members" /></label>
            {query.trim().length >= 2 ? <p role={searchState === "error" ? "alert" : "status"}>{searchState === "loading" ? "Finding members…" : searchState === "error" ? "Members couldn't be loaded. Try another search." : !visibleResults.length ? "No matching members." : `${selectedIds.length} selected`}</p> : <p>Type at least 2 characters to find Room members.</p>}
            {visibleResults.length ? <div className="friend-list compact" aria-label="Subroom people results">{visibleResults.map((person) => {
              const selected = selectedIds.includes(person.userId);
              return <article key={person.userId}><PersonAvatar seed={person.userId} initials={person.displayName.slice(0, 2)} /><div><strong>{person.displayName}</strong><small>@{person.username}</small></div><button disabled={saving} className={selected ? "selected" : ""} onClick={() => setSelectedIds((current) => selected ? current.filter((id) => id !== person.userId) : [...current, person.userId])}>{selected ? "Added" : "Add"}</button></article>;
            })}</div> : null}
          </>
        ) : null}
        <div className="overlay-actions"><button className="primary-action" disabled={!name.trim() || saving} onClick={() => void create()}>{saving ? "Creating…" : "Create Subroom"}</button><button disabled={saving} onClick={close}>Cancel</button></div>
        {error ? <p className="composer-error" role="alert">{error}</p> : null}
      </section>
    </ModalLayer>
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
  const [tags, setTags] = useState<string[]>(["Just Chilling"]);
  const [customTag, setCustomTag] = useState("");
  const [acceptedFriends, setAcceptedFriends] = useState<Awaited<ReturnType<typeof listConnectionsAction>>>([]);
  const user = useCurrentToskerUser() ?? prototypeUser;
  const [room, setRoom] = useState<{ slug: string; name: string; tags: string[]; inviteToken: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<Array<{ userId: string; displayName: string; username: string; tid: string }>>([]);
  const [peopleSearching, setPeopleSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useDismissLayer(true, close, panelRef, false);
  useEffect(() => {
    if (!identity) return;
    let active = true;
    listConnectionsAction().then((items) => { if (active) setAcceptedFriends(items.filter((item) => item.status === "accepted")); }).catch(() => { if (active) setSaveError("Friends couldn't be loaded. You can still search by name or TID."); });
    return () => { active = false; };
  }, [identity]);
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
        .catch(() => active && setSaveError("Search couldn't be completed. Try again."))
        .finally(() => active && setPeopleSearching(false));
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [friendQuery, identity]);
  const startPersistentChat = async (userId: string) => {
    if (saving) return;
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
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      if (!identity) {
        const created = prototypeStore.createRoom({ name, tags, things: [] });
        router.push(`/room/${created.slug}`); onClose(); return;
      }
      const created = await createRoomAction({
        name,
        tags,
        capabilities: [],
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
    if (step === 2) void finishRoom();
    else setStep((current) => current + 1);
  };
  return (
    <ModalLayer onClose={onClose} dismissOutside={false}>
      <section
        ref={panelRef}
        className="creation-panel"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "chat" ? "Start Chat" : mode === "room" ? "Create Room" : "Create"}
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
              {identity && friendQuery.trim().length < 2 ? <>
                <h3 className="contact-list-label">Friends</h3>
                {acceptedFriends.map(({ id, person }) => person ? <article key={id}><span className="avatar avatar-pink">{person.displayName.slice(0, 2).toUpperCase()}</span><div><strong>{person.nickname || person.displayName}</strong><small>@{person.username}</small></div><button disabled={saving} onClick={() => void startPersistentChat(person.userId)}>Chat</button></article> : null)}
                {!acceptedFriends.length ? <p>No Friends yet. Search by name or TID.</p> : null}
                {identity.personalConversations.length ? <><h3 className="contact-list-label">Your conversations</h3>{identity.personalConversations.map((chat) => <Link className="recent-chat-link" key={chat.slug} href={`/personal/${chat.slug}`} onClick={onClose}>{chat.nickname || chat.displayName}</Link>)}</> : null}
              </> : null}
              {identity ? (friendQuery.trim().length >= 2 ? peopleResults : []).map((person) => (
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
              <b>{step < 5 ? `${step} / 2` : "Ready"}</b>
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
                  {[...new Set([...roomTags, ...tags])].map((tag, index) => (
                    <button
                      autoFocus={index === 0}
                      className={tags.includes(tag) ? "active" : ""}
                      aria-pressed={tags.includes(tag)}
                      disabled={tags.length >= 5 && !tags.includes(tag)}
                      onClick={() =>
                        setTags((current) =>
                          current.includes(tag)
                            ? current.filter((item) => item !== tag)
                            : [...current, tag],
                        )
                      }
                      key={tag}
                    >
                      <RoomCategory value={tag} />
                    </button>
                  ))}
                </div>
                <div className="custom-tag-field"><input aria-label="Custom tag" placeholder="Custom tag" maxLength={24} value={customTag} onChange={(event) => setCustomTag(event.target.value)} /><button disabled={!customTag.trim() || tags.length >= 5} onClick={() => {
                  try { setTags(normalizeRoomTags([...tags, customTag])); setCustomTag(""); setSaveError(""); }
                  catch { setSaveError("Use up to five tags, 24 characters each."); }
                }}>Add tag</button></div>
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
                    : step === 2
                      ? saving ? "Creating…" : "Create Room"
                      : "Next"}
                </button>
                {saveError ? <p role="alert">{saveError}</p> : null}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </ModalLayer>
  );
}

function MobileNav({ friendAttention, notificationCount, chatAttention }: { friendAttention: number; notificationCount: number; chatAttention: number }) {
  const user = useCurrentToskerUser() ?? prototypeUser;
  return (
    <nav className="mobile-app-nav" aria-label="Mobile destinations">
      <Link href="/app" aria-label={`Chats${chatAttention ? `, ${chatAttention} unread activities` : ""}`}>
        <span>
          <MessageCircle size={17} />
          <AttentionMark count={chatAttention} label="unread activities" />
        </span>
        Chats
      </Link>
      <Link href="/friends" aria-label={`Friends${friendAttention ? `, ${friendAttention} new requests` : ""}`}>
        <span>
          <UsersRound size={17} />
          <AttentionMark count={friendAttention} label="new requests" />
        </span>
        Friends
      </Link>
      <Link href="/notifications" aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ""}`}>
        <span>
          <Bell size={17} />
          <AttentionMark count={notificationCount} label="unread notifications" />
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
  useMobileViewport();
  const user = useCurrentToskerUser() ?? prototypeUser;
  const baseIdentity = useToskerIdentity();
  const snapshot = useSyncExternalStore(workspaceSnapshot.subscribe, () => workspaceSnapshot.get(baseIdentity?.userId), workspaceSnapshot.server);
  const identity = useMemo(() => baseIdentity && snapshot.navigation && snapshot.navigationBasis === baseIdentity ? { ...baseIdentity, ...snapshot.navigation } : baseIdentity, [baseIdentity, snapshot.navigation, snapshot.navigationBasis]);
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const router = useRouter();
  const [overlay, setOverlay] = useState<Overlay>(
    workspace === "create" ? "room" : null,
  );
  const activity = snapshot.activity;
  const [readingPaused, setReadingPaused] = useState(false);
  useEffect(() => { queueMicrotask(() => setReadingPaused(false)); }, [selectedSlug, surface]);
  const [toast, setToast] = useState<NotificationActivity | null>(null);
  const seenActivity = useRef<Set<string> | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  const liveConnected = useRef(false);
  useEffect(() => {
    const identity = baseIdentity;
    if (!identity) {
      seenActivity.current = null;
      return;
    }
    let active = true;
    let inFlight = false;
    let pending = false;
    let pendingTimer: number | undefined;
    let toastTimer: number | undefined;
    let lastRefresh = 0;
    const refresh = async () => {
      if (document.hidden || !active) return;
      if (inFlight) { pending = true; return; }
      pending = false;
      lastRefresh = Date.now();
      inFlight = true;
      const snapshot = await fetch("/api/workspace", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) })
        .then(async (response) => response.ok ? await response.json() as { activity: Awaited<ReturnType<typeof listNotificationsAction>>; navigation: Awaited<ReturnType<typeof refreshWorkspaceNavigationAction>>; preferences: ConversationPreference[] } : null)
        .catch(() => null);
      const next = snapshot?.activity, nextNavigation = snapshot?.navigation;
      inFlight = false;
      if (pending && active) pendingTimer = window.setTimeout(refresh, 100);
      if (!next) return;
      if (!active) return;
      const previous = seenActivity.current;
      workspaceSnapshot.publish({ userId: identity.userId, activity: next, navigation: nextNavigation ?? workspaceSnapshot.get(identity.userId).navigation, preferences: snapshot?.preferences ?? [], navigationBasis: identity });
      seenActivity.current = new Set(next.map((item) => item.id));
      if (previous) {
        const incoming = next.find((item) => !previous.has(item.id) && !item.readAt && !item.muted && item.actorId !== identity.userId && !(item.type === "message" && item.conversationId === activeConversationRef.current));
        if (incoming) {
          setToast(incoming);
          window.clearTimeout(toastTimer);
          toastTimer = window.setTimeout(() => setToast((current) => current?.id === incoming.id ? null : current), 6500);
        }
      }
    };
    void refresh();
    const timer = window.setInterval(() => { if (!liveConnected.current || Date.now() - lastRefresh >= 60000) void refresh(); }, 12000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(ACTIVITY_REFRESH, refresh);
    return () => { active = false; window.clearInterval(timer); window.clearTimeout(toastTimer); window.clearTimeout(pendingTimer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener(ACTIVITY_REFRESH, refresh); };
  }, [baseIdentity]);
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
      ? { ...canonical, databaseId: identity.sandboxConversationId, identitySeed: identity.userId, avatarUrl: identity.avatarUrl }
      : canonical;
  const prototypeRoom = !identity ? state.rooms.find((room) => room.slug === selectedSlug) : undefined;
  const prototypeChat = !identity ? state.chats.find((chat) => chat.slug === selectedSlug) : undefined;
  const serverRoom = identity?.rooms.find((room) => room.slug === selectedSlug);
  const serverSubroom = identity?.rooms.flatMap((room) => room.subrooms.map((subroom) => ({ parent: room, subroom }))).find(({ parent, subroom }) => `${parent.slug}--${subroom.id}` === selectedSlug);
  const serverChat = identity?.personalConversations.find((chat) => chat.slug === selectedSlug);
  const contextRoom = serverRoom ?? serverSubroom?.parent;
  const parentConversation: Conversation | undefined = contextRoom ? { slug: contextRoom.slug, name: contextRoom.name, kind: "room", initials: contextRoom.name.slice(0, 2), color: "green", preview: "", time: "", context: "", messages: [], databaseId: contextRoom.conversationId } : undefined;
  const selected =
    (identity && authenticatedCanonical?.kind !== "my-room" ? undefined : authenticatedCanonical) ??
    (serverSubroom
      ? {
          slug: `${serverSubroom.parent.slug}--${serverSubroom.subroom.id}`,
          kind: "room" as const,
          name: serverSubroom.subroom.name,
          initials: serverSubroom.subroom.name.slice(0, 2).toUpperCase(),
          color: "green",
          preview: "",
          time: "Now",
          context: `${serverSubroom.parent.name} · ${serverSubroom.subroom.name}`,
          messages: [],
          tag: "SUBROOM",
          databaseId: serverSubroom.subroom.conversationId,
          href: `/room/${serverSubroom.parent.slug}/subroom/${serverSubroom.subroom.id}`,
        }
      : serverChat
      ? {
          slug: serverChat.slug,
          identitySeed: serverChat.userId,
          avatarUrl: serverChat.avatarUrl,
          kind: "personal" as const,
          name: serverChat.nickname || serverChat.displayName,
          initials: serverChat.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
          color: "pink",
          preview: "",
          time: "Now",
          context: `@${serverChat.username} · ${serverChat.tid}`,
          messages: [],
          databaseId: serverChat.conversationId,
          presenceStatus: serverChat.presenceStatus,
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
        : selectedSlug && !identity
          ? conversations[0]
          : undefined));
  const realtime = useConversationRealtime(selected?.databaseId, identity?.userId);
  useEffect(() => {
    const denied = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== selected?.databaseId) return;
      setOverlay(null);
      window.dispatchEvent(new Event(ACTIVITY_REFRESH));
      router.replace("/app");
    };
    window.addEventListener(CONVERSATION_ACCESS_LOST, denied);
    return () => window.removeEventListener(CONVERSATION_ACCESS_LOST, denied);
  }, [router, selected?.databaseId]);
  useEffect(() => { liveConnected.current = realtime.connected; }, [realtime.connected]);
  useEffect(() => { activeConversationRef.current = surface === "hall" ? null : selected?.databaseId ?? null; }, [selected?.databaseId, surface]);
  const attention = deriveAttention(activity, snapshot.preferences);
  const selectedPreference = snapshot.preferences.find((pref) => pref.conversationId === selected?.databaseId);
  const unreadByConversation = attention.conversations;
  const latestActivityByConversation = activity.reduce<Record<string, string>>((latest, item) => {
    if (item.conversationId && (!latest[item.conversationId] || item.createdAt > latest[item.conversationId])) latest[item.conversationId] = item.createdAt;
    return latest;
  }, {});
  const unreadForSurface = (kind: "message" | "hall") => Number(Boolean(kind === "message" ? selectedPreference?.manualChatUnreadId : selectedPreference?.manualHallUnreadId)) + activity.filter((item) => selected?.databaseId && item.conversationId === selected.databaseId && !item.destinationReadAt && (kind === "message" ? item.type === "message" : item.type === "hall_note" || item.type === "hall_pin")).length;
  const activityHref = notificationHref;
  const messageFriend = (friend: (typeof friends)[number]) => {
    const chat = prototypeStore.createChat(friend);
    router.push(`/personal/${chat.slug}`);
  };
  return (
    <ToskerIdentityProvider identity={identity}><main
      className={`messaging-app ${selected ? "has-selection" : "list-only"} ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <AppSidebar
        selected={selected}
        surface={surface}
        workspace={workspace}
        onCreate={() => setOverlay("choose")}
        collapsed={collapsed}
        onToggleCollapse={collapseStore.toggle}
        unreadByConversation={unreadByConversation}
        latestActivityByConversation={latestActivityByConversation}
        friendAttention={attention.requests}
        notificationCount={attention.notifications}
      />
      <div className="working-surface">
        {selected ? (
          <>
            <SurfaceHeader
              conversation={selected}
              surface={surface}
              preference={selectedPreference}
              onReadingPause={setReadingPaused}
              onInvite={identity ? () => setOverlay("invite") : undefined}
              onAddSubroom={contextRoom?.role === "owner" ? () => setOverlay("subroom") : undefined}
              onManage={contextRoom ? () => setOverlay("manage") : undefined}
              chatUnread={unreadForSurface("message")}
              hallUnread={unreadForSurface("hall")}
              unreadByConversation={unreadByConversation}
            />
            {surface === "hall" ? (
              <HallSurface
                connected={realtime.connected}
                manualUnreadId={selectedPreference?.manualHallUnreadId}
                readingPaused={readingPaused}
                key={selected.slug}
                conversation={selected}
                empty={Boolean(identity) || Boolean(prototypeRoom && !canonical)}
              />
            ) : (
              <ChatSurface key={selected.slug} conversation={selected} realtime={realtime} manualUnreadId={selectedPreference?.manualChatUnreadId} readingPaused={readingPaused} />
            )}
          </>
        ) : selectedSlug && identity ? (
          <div className="desktop-welcome" role="status"><h2>Conversation unavailable</h2><p>Check your access or return to Chats.</p><Link className="quiet-action" href="/app">Return to Chats</Link></div>
        ) : workspace === "friends" ? (
          <FriendsSurface onMessage={messageFriend} requestActivity={activity.filter((item) => item.type === "connection_request" && item.requestPending && !item.destinationReadAt)} />
        ) : workspace && workspace !== "create" ? (
          <ProductSurface surface={workspace} mode={state.mode} activity={activity} />
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
      <MobileNav friendAttention={attention.requests} notificationCount={attention.notifications} chatAttention={Object.values(attention.conversations).reduce((sum, count) => sum + count, 0)} />
      {overlay === "choose" || overlay === "chat" || overlay === "room" ? (
        <CreationOverlay initial={overlay} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay === "invite" && selected?.kind === "room" ? (
        <InviteOverlay room={parentConversation ?? selected} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay === "subroom" && selected?.kind === "room" && identity ? (
        <SubroomOverlay room={parentConversation ?? selected} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay === "manage" && contextRoom ? <RoomDetails slug={contextRoom.slug} onClose={() => setOverlay(null)} onInvite={() => setOverlay("invite")} onAddSubroom={contextRoom.role === "owner" ? () => setOverlay("subroom") : undefined} /> : null}
      {toast ? <button className="activity-toast" onClick={() => { router.push(activityHref(toast)); setToast(null); }} aria-label="Open new activity"><strong>{toast.actorName ?? "Someone"}</strong><span>{toast.type === "message" ? (toast.messageBody || "New message") : toast.type === "connection_request" ? "sent you a friend request" : toast.type === "connection_accepted" ? "accepted your friend request" : "updated Hall"}</span></button> : null}
    </main></ToskerIdentityProvider>
  );
}
