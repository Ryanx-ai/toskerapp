import Image from "next/image";
import { OwnProfileEditor } from "./own-profile-editor";
import { AccountSettings } from "./account-settings";
import { RoomInvitationResponse } from "./room-invitation-response";
import { notificationHref } from "@/lib/notification-href";
import { notificationBursts } from "@/lib/notification-bursts";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { WorkspaceBanner } from "@/components/workspace-banner";
import { IdentityCard } from "@/components/identity-card";
import { prototypeUser } from "@/data/prototype-user";
import { useCurrentToskerUser, useToskerIdentity } from "@/components/tosker-identity";
import { listNotificationsAction, markNotificationsReadAction } from "@/server/shared-state/actions";
import {
  Bell,
  MessageCircleReply,
  Pin,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";

export type ProductWorkspace =
  | "explore"
  | "marketplace"
  | "studio"
  | "settings"
  | "help"
  | "notifications"
  | "profile";
const exploreCards = [
  ["◒", "Quick Poll", "Popular now"],
  ["▦", "Kanban Board", "Popular now"],
  ["⌖", "Shared Map", "Popular now"],
  ["▧", "Photo Wall", "Popular now"],
  ["▤", "Schedule", "Plan together"],
  ["♟", "Game Night", "Play together"],
];
const marketCards = [
  ["skin", "Midnight Garden", "Room skin", "Mina Vale", "$2"],
  ["board", "Sprint Board", "Productivity", "North Star Co.", "Free"],
  ["game", "Pixel Arcade", "Game pack", "Ollie Makes", "$5"],
  ["trip", "Travel Wall", "Trip template", "Nomad Notes", "Free"],
  ["photo", "Polaroid Board", "Image board", "Soft Focus", "$2"],
  ["skin", "Sunday Paper", "Room skin", "Mina Vale", "$3"],
];

function ProductChrome({
  current,
  children,
}: {
  current: ProductWorkspace;
  children: React.ReactNode;
}) {
  return (
    <section className={`product-canvas workspace-scroll product-${current}`}>
      {children}
    </section>
  );
}

function Explore({ studio = false }: { studio?: boolean }) {
  const [filter, setFilter] = useState("Featured");
  const exploreFilters: Record<string, string[]> = {
    Featured: exploreCards.map((card) => card[1]),
    "Popular this week": ["Quick Poll", "Kanban Board", "Shared Map"],
    "For trips": ["Shared Map", "Photo Wall", "Schedule"],
    "For friends": ["Quick Poll", "Photo Wall", "Game Night"],
    "For work": ["Kanban Board", "Schedule"],
    "For fun": ["Game Night", "Quick Poll"],
  };
  return (
    <ProductChrome current="explore">
      <WorkspaceBanner
        eyebrow="Explore"
        title="Make your Room more than chat."
        intensity="hero"
        action={studio ? <Link href="/explore">Browse Gizmos</Link> :
          <button
            onClick={() =>
              document.querySelector(".filter-pills")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            Browse all
          </button>
        }
      />
      <nav className="explore-sections" aria-label="Explore sections"><Link href="/explore" aria-current={!studio ? "page" : undefined}>Gizmos</Link><Link href="/explore/create" aria-current={studio ? "page" : undefined}>Create / Studio</Link></nav>
      {studio ? <Studio /> : <>
      <div className="filter-pills">
        {Object.keys(exploreFilters).map((item) => <button key={item} className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      <section className="surface-section compact-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Browse ideas</p>
            <h2>What does your Room need?</h2>
          </div>
          <span>Concept previews</span>
        </div>
        <div className="explore-grid">
          {exploreCards.filter((card) => exploreFilters[filter].includes(card[1])).map(([icon, title, category], index) => (
            <article key={title} className={`explore-card card-${index + 1}`}>
              <div className="explore-card-art" aria-hidden="true">
                <span>{icon}</span>
              </div>
              <div className="explore-card-copy">
                <small>{category}</small>
                <h3>{title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Marketplace />
      </>}
    </ProductChrome>
  );
}
function Marketplace() {
  const [filter, setFilter] = useState("All");
  return (
      <section id="community" className="surface-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Fresh finds</p>
            <h2>From the future community</h2>
          </div>
          <div className="market-tabs">
            {["All", "Skins", "Apps", "Games", "Templates"].map((item) => <button key={item} className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
          </div>
        </div>
        <div className="market-grid">
          {marketCards.filter((card) => filter === "All" || card[2].toLowerCase().includes(filter.slice(0, -1).toLowerCase())).map(([style, title, kind, creator, price]) => (
            <article key={title} className="market-card">
              <div className={`market-art art-${style}`}>
                <span>{title.slice(0, 1)}</span>
              </div>
              <div>
                <small>{kind}</small>
                <h3>{title}</h3>
                <p>by {creator}</p>
                <strong>{price}</strong>
              </div>
            </article>
          ))}
        </div>
        <p className="prototype-strip">Preview only · Purchases aren’t available yet</p>
      </section>
  );
}
function Studio() {
  return (
      <section className="surface-section studio-work">
        <div className="section-title">
          <div>
            <p className="eyebrow">Create / Studio</p>
            <h2>Things taking shape</h2>
          </div>
          <span>Concept preview · Creator tools aren’t available yet</span>
        </div>
        <div className="creation-list">
          {[
            ["▤", "Tokyo Itinerary Board", "Template", "Draft", "—"],
            ["◐", "Neon Nights", "Room skin", "Published", "$25"],
            ["♟", "Puzzle Rush", "Mini game", "Draft", "—"],
            ["▧", "Photo Collage", "Image board", "Published", "$74"],
          ].map(([icon, name, type, status, earnings]) => (
            <article key={name}>
              <span>{icon}</span>
              <div>
                <strong>{name}</strong>
                <small>{type}</small>
              </div>
              <b className={status === "Published" ? "published" : ""}>
                {status}
              </b>
              <i>{earnings}</i>
            </article>
          ))}
        </div>
        <button className="studio-create" disabled>
          ＋ Create something
        </button>
        <div className="section-title creation-heading">
          <div>
            <p className="eyebrow">Creation types</p>
            <h2>Pick a starting point</h2>
          </div>
        </div>
        <div className="creation-types">
          {[
            ["◇", "App", "Useful"],
            ["◐", "Skin", "Visual"],
            ["▤", "Template", "A head start"],
            ["♟", "Game", "Playful"],
          ].map(([icon, title, body]) => (
            <button key={title} disabled>
              <span>{icon}</span>
              <strong>{title}</strong>
              <small>{body}</small>
            </button>
          ))}
        </div>
      </section>
  );
}
function Settings() {
  return <ProductChrome current="settings"><WorkspaceBanner title="Settings" intensity="quiet" /><Suspense fallback={<p role="status">Loading Settings…</p>}><AccountSettings /></Suspense></ProductChrome>;
}
function Help() {
  return (
    <ProductChrome current="help">
      <WorkspaceBanner
        title="Help"
        intensity="quiet"
      />
      <div className="help-grid">
        {[
          [
            "✎",
            "Send feedback",
            "A thought, a feeling, a suspiciously specific opinion.",
          ],
          [
            "!",
            "Report a problem",
            "Something broke. Let’s make it less broken.",
          ],
          ["✦", "Request a feature", "What should Tosker learn to do next?"],
        ].map(([icon, title, body]) => (
          <button key={title} disabled>
            <span>{icon}</span>
            <strong>{title}</strong>
            <small>{body}</small>
            <i>Coming later</i>
          </button>
        ))}
      </div>
      <aside className="help-note">
        <Image
          src="/brand/toskerlogo-icon-main.svg"
          alt=""
          width={64}
          height={64}
        />
        <div>
          <h2>Still finding our feet.</h2>
          <p>
            This help surface will become useful as Tosker grows. For now, bring
            your notes to the founder walkthrough.
          </p>
          <Link href="/" className="back-link">View landing page</Link>
        </div>
      </aside>
    </ProductChrome>
  );
}

const notificationItems = [
  {
    id: "demo-mention-mika",
    type: "Mentions",
    icon: MessageCircleReply,
    title: "Mika replied to you",
    context: "Personal · That listening bar looks perfect.",
    time: "4m",
    href: "/personal/mika-tan",
  },
  {
    id: "demo-room-mention",
    type: "Rooms",
    icon: Sparkles,
    title: "You were mentioned in Tokyo 2027",
    context: "Theo asked about Thursday's plan.",
    time: "18m",
    href: "/room/tokyo-2027",
  },
  {
    id: "demo-hall-pin",
    type: "Activity",
    icon: Pin,
    title: "A Hall note was pinned",
    context: "Flight details updated · Tokyo 2027",
    time: "1h",
    href: "/room/tokyo-2027/hall",
  },
  {
    id: "demo-room-join",
    type: "Rooms",
    icon: UserPlus,
    title: "Someone joined Design Hack Night",
    context: "Anika is now in the Room.",
    time: "2h",
    href: "/room/design-hack-night",
  },
  {
    id: "demo-invite-accepted",
    type: "Activity",
    icon: UsersRound,
    title: "A Room invite was accepted",
    context: "Jordan joined Friday Pokémon.",
    time: "Yesterday",
    href: "/room/friday-pokemon",
  },
  {
    id: "demo-reaction",
    type: "Activity",
    icon: Bell,
    title: "A reaction was added to your message",
    context: "Mika reacted ❤️ in Tokyo 2027.",
    time: "Yesterday",
    href: "/room/tokyo-2027",
  },
];

function Notifications({ empty = false, persistent, state = "ready" }: { empty?: boolean; persistent: Awaited<ReturnType<typeof listNotificationsAction>>; state?: "loading" | "error" | "ready" }) {
  const [filter, setFilter] = useState("All");
  const identity = useToskerIdentity();
  const acknowledgedView = useRef<string | null>(null);
  const realItems = notificationBursts(persistent, identity?.userId ?? "").map((group) => {
    const item = group.latest;
    return ({
    id: group.id,
    eventIds: group.events.map((event) => event.id),
    invitationId: item.invitationId,
    invitationStatus: item.invitationStatus,
    roomSlug: item.roomSlug,
    type: item.type === "message" ? item.isMention ? "Mentions" : "Messages" : item.type.startsWith("connection") ? "Activity" : "Rooms",
    icon: item.type.startsWith("connection") ? UserPlus : Pin,
    title: item.type === "room_invitation" ? "Room invitation" : item.type === "message" ? item.isMention ? "Mentioned you" : "New message" : item.type === "connection_request" ? "New friend request" : item.type === "connection_accepted" ? "Friend request accepted" : "New Hall note",
    context: item.type === "room_invitation" ? `${item.actorName ?? "Someone"} invited you to ${item.roomName ?? "a Room"}` : item.type === "message" ? group.events.length > 1 ? `${item.actorName ?? "Someone"} sent you ${group.events.length} messages` : `${item.actorName ?? "Someone"} ${item.isMention ? "mentioned you" : "sent you a message"}` : item.type === "connection_request" ? `${item.actorName ?? "Someone"} sent you a friend request` : item.type === "connection_accepted" ? `${item.actorName ?? "Someone"} accepted your friend request` : `${item.actorName ?? "Someone"} added something to Hall`,
    time: new Date(item.createdAt).toLocaleDateString(),
    destination: item.roomName && item.type !== "room_invitation" ? `${item.roomName}${item.subroomId && item.conversationTitle ? ` / ${item.conversationTitle}` : ""} · ${item.type === "message" ? "Chat" : "Hall"}` : "",
    href: notificationHref(item),
  }); });
  const source = identity ? realItems : notificationItems.map((item) => ({ ...item, eventIds: [] as string[], invitationId: null, invitationStatus: null, roomSlug: null }));
  const shown = empty && !identity
    ? []
    : filter === "All"
      ? source
      : source.filter((item) => item.type === filter);
  const renderedIds = shown.flatMap((item) => item.eventIds);
  const renderedKey = JSON.stringify(renderedIds);
  const unreadKey = JSON.stringify(persistent.filter((item) => !item.readAt).map((item) => item.id));
  useEffect(() => {
    if (!identity) return;
    const key = `${identity.userId}:${filter}`;
    const acknowledge = () => {
      if (document.hidden || acknowledgedView.current === key) return;
      const rendered = JSON.parse(renderedKey) as string[];
      if (!rendered.length) return;
      acknowledgedView.current = key;
      const unseen = new Set<string>(JSON.parse(unreadKey));
      const observedIds = rendered.filter((id) => unseen.has(id));
      // Snapshot exact rendered events once per view/filter. Arrivals while this
      // acknowledgement is in flight (or after it) are not consumed implicitly.
      void (async () => {
        for (let i = 0; i < observedIds.length; i += 500) await markNotificationsReadAction(observedIds.slice(i, i + 500));
      })().catch(() => { acknowledgedView.current = null; });
    };
    acknowledge();
    const foreground = () => { if (!document.hidden) { acknowledgedView.current = null; acknowledge(); } };
    document.addEventListener("visibilitychange", foreground);
    return () => document.removeEventListener("visibilitychange", foreground);
  }, [identity, filter, renderedKey, unreadKey]);
  return (
    <ProductChrome current="notifications">
      <WorkspaceBanner
        title="Notifications"
        intensity="quiet"
      />
      <section className="notifications-workspace">
        <nav aria-label="Notification filters">
          {["All", "Messages", "Mentions", "Rooms", "Activity"].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="notification-list">
          {shown.map((item) => {
            const Icon = item.icon;
            return (
                <article key={item.id} data-event-count={item.eventIds.length}>
                <span className="notification-symbol">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.context}</p>
                  {"destination" in item && typeof item.destination === "string" ? <small>{item.destination}</small> : null}
                </div>
                <time>{item.time}</time>
                {item.invitationId ? <RoomInvitationResponse id={item.invitationId} status={item.invitationStatus} roomSlug={item.roomSlug} /> : <Link href={item.href}>Open</Link>}
              </article>
            );
          })}
        </div>
        {state !== "ready" ? <div className="notification-load-state" role={state === "error" ? "alert" : "status"}>{state === "loading" ? "Loading notifications…" : <>Notifications couldn’t be loaded. <button className="quiet-action" onClick={()=>window.dispatchEvent(new Event(ACTIVITY_REFRESH))}>Retry</button></>}</div> : shown.length === 0 ? (
          <div className="two-line-empty">
            <h2>Nothing here</h2>
            <p>{filter === "All" ? "You’re caught up." : `No ${filter.toLowerCase()} to show.`}</p>
          </div>
        ) : null}
        {!identity ? <p className="prototype-strip">A preview of Tosker activity.</p> : null}
      </section>
    </ProductChrome>
  );
}

function Profile() {
  const user = useCurrentToskerUser() ?? prototypeUser;
  const identity = useToskerIdentity();
  const [editing, setEditing] = useState(false);
  return (
    <ProductChrome current="profile">
      <section className="profile-surface">
        <IdentityCard
          label="Your Namecard"
          profile={{ userId: identity?.userId, avatarUrl: identity?.avatarUrl, name: user.displayName, username: user.username, tid: user.tid, initials: user.initials, color: "gold", status: identity ? "" : user.role, identityAccent:identity?.ownProfile.identityAccent, identityBanner:identity?.ownProfile.identityBanner, identityFrame:identity?.ownProfile.identityFrame }}
          action={identity ? <><p className="namecard-status"><i className={`presence-mark ${identity.ownProfile.presenceStatus}`} aria-hidden="true" />{({online:"Online",idle:"Idle",away:"Away",meeting:"In a meeting"})[identity.ownProfile.presenceStatus]}</p><p className="profile-bio">{identity.ownProfile.namecardBio}</p><div className="profile-shortcuts"><button className="primary-action" onClick={() => setEditing(true)}>Edit Profile</button><Link href="/friends">Friends</Link><Link href="/settings">Settings</Link></div></> : undefined}
        />
        <Link href="/" className="landing-footer-link profile-landing-link">View landing page</Link>
      </section>
      {editing && identity ? <OwnProfileEditor identity={identity} onClose={() => setEditing(false)} /> : null}
    </ProductChrome>
  );
}

export function ProductSurface({
  surface,
  mode = "demo",
  activity = [],
  activityState = "ready",
}: {
  surface: ProductWorkspace;
  mode?: "new" | "demo" | "returning";
  activity?: Awaited<ReturnType<typeof listNotificationsAction>>;
  activityState?: "loading" | "error" | "ready";
}) {
  if (surface === "profile") return <Profile />;
  if (surface === "explore") return <Explore />;
  if (surface === "marketplace") return <Explore />;
  if (surface === "studio") return <Explore studio />;
  if (surface === "settings") return <Settings />;
  if (surface === "notifications") return <Notifications empty={mode === "new"} persistent={activity} state={activityState} />;
  return <Help />;
}
