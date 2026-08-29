import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { WorkspaceBanner } from "@/components/workspace-banner";
import {
  Bell,
  CircleUserRound,
  Languages,
  LockKeyhole,
  MessageCircleReply,
  Palette,
  Pin,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";

export type ProductWorkspace =
  "explore" | "marketplace" | "studio" | "settings" | "help" | "notifications";
const exploreCards = [
  ["◒", "Quick Poll", "Popular now", "Ask the Room."],
  ["▦", "Kanban Board", "Popular now", "Organise lightly."],
  ["⌖", "Shared Map", "Popular now", "Plan together."],
  ["▧", "Photo Wall", "Popular now", "Collect it here."],
  ["▤", "Itinerary", "For trips", "Plan each day."],
  ["▣", "Packing List", "For trips", "Don’t forget it."],
  ["$", "Budget Tracker", "For trips", "Split the useful bits."],
  ["☁", "Weather", "For trips", "Check the forecast."],
  ["?", "Trivia Quiz", "For fun", "Test your knowledge."],
  ["◉", "Spin the Wheel", "For fun", "Make the decision."],
  ["♟", "Mini Games", "For fun", "Play together."],
  ["♫", "Music Player", "For fun", "Listen in sync."],
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

function Explore() {
  return (
    <ProductChrome current="explore">
      <WorkspaceBanner
        eyebrow="Explore"
        title="Make your Room more than chat."
        body="Find useful, social, and wonderfully specific things to add."
        intensity="hero"
        action={<button disabled>Browse all</button>}
      />
      <div className="filter-pills">
        <button className="active">Featured</button>
        <button>Popular this week</button>
        <button>For trips</button>
        <button>For friends</button>
        <button>For work</button>
        <button>For fun</button>
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
          {exploreCards.map(([icon, title, category, body], index) => (
            <article key={title} className={`explore-card card-${index + 1}`}>
              <span>{icon}</span>
              <div>
                <small>{category}</small>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </ProductChrome>
  );
}
function Marketplace() {
  return (
    <ProductChrome current="marketplace">
      <WorkspaceBanner
        eyebrow="Marketplace"
        title="Made for Rooms, by people with ideas"
        body="A first look at the things creators could make for Tosker."
      />
      <section className="surface-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Fresh finds</p>
            <h2>From the future community</h2>
          </div>
          <div className="market-tabs">
            <button className="active">All</button>
            <button>Skins</button>
            <button>Apps</button>
            <button>Games</button>
            <button>Templates</button>
          </div>
        </div>
        <div className="market-grid">
          {marketCards.map(([style, title, kind, creator, price]) => (
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
        <p className="prototype-strip">
          Visual marketplace prototype · Nothing here can be purchased yet
        </p>
      </section>
    </ProductChrome>
  );
}
function Studio() {
  return (
    <ProductChrome current="studio">
      <WorkspaceBanner
        eyebrow="Studio"
        title="Make something people want in a Room"
        body="For designers, developers, tinkerers, and people with one very specific idea."
        action={
          <button className="button button-primary" disabled>
            Create something <span>＋</span>
          </button>
        }
      />
      <section className="surface-section studio-work">
        <div className="section-title">
          <div>
            <p className="eyebrow">My creations</p>
            <h2>Things taking shape</h2>
          </div>
          <span>Prototype data</span>
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
    </ProductChrome>
  );
}
function Settings() {
  return (
    <ProductChrome current="settings">
      <WorkspaceBanner
        eyebrow="Settings"
        title="Make Tosker yours."
        body="The controls are taking shape. These are visual settings only for now."
        intensity="quiet"
      />
      <div className="settings-list">
        {[
          ["Account", "Name, profile, and the basics."],
          ["Appearance", "Roomy, compact, dark — eventually."],
          ["Language", "Preferred language: English"],
          ["Notifications", "Decide what earns your attention."],
          ["Privacy", "Clear choices, without a law degree."],
        ].map(([title, body], i) => (
          <button key={title} disabled>
            <span>
              {
                [
                  <CircleUserRound key="account" />,
                  <Palette key="appearance" />,
                  <Languages key="language" />,
                  <Bell key="notifications" />,
                  <LockKeyhole key="privacy" />,
                ][i]
              }
            </span>
            <div>
              <strong>{title}</strong>
              <small>{body}</small>
            </div>
            <i>→</i>
          </button>
        ))}
      </div>
      <p className="prototype-strip">
        Prototype shell · Preferences do not save yet.
      </p>
    </ProductChrome>
  );
}
function Help() {
  return (
    <ProductChrome current="help">
      <WorkspaceBanner
        eyebrow="Help & Feedback"
        title="Tell us what feels odd."
        body="Or delightful. Especially delightful."
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
            <i>Prototype</i>
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
        </div>
      </aside>
    </ProductChrome>
  );
}

const notificationItems = [
  {
    type: "Mentions",
    icon: MessageCircleReply,
    title: "Mika replied to you",
    context: "Personal · That listening bar looks perfect.",
    time: "4m",
    href: "/personal/mika-tan",
  },
  {
    type: "Rooms",
    icon: Sparkles,
    title: "You were mentioned in Tokyo 2027",
    context: "Theo asked about Thursday's plan.",
    time: "18m",
    href: "/room/tokyo-2027",
  },
  {
    type: "Activity",
    icon: Pin,
    title: "A Hall note was pinned",
    context: "Flight details updated · Tokyo 2027",
    time: "1h",
    href: "/room/tokyo-2027/hall",
  },
  {
    type: "Rooms",
    icon: UserPlus,
    title: "Someone joined Design Hack Night",
    context: "Anika is now in the Room.",
    time: "2h",
    href: "/room/design-hack-night",
  },
  {
    type: "Activity",
    icon: UsersRound,
    title: "A Room invite was accepted",
    context: "Jordan joined Friday Pokémon.",
    time: "Yesterday",
    href: "/room/friday-pokemon",
  },
  {
    type: "Activity",
    icon: Bell,
    title: "A reaction was added to your message",
    context: "Mika reacted ❤️ in Tokyo 2027.",
    time: "Yesterday",
    href: "/room/tokyo-2027",
  },
];

function Notifications() {
  const [filter, setFilter] = useState("All");
  const shown =
    filter === "All"
      ? notificationItems
      : notificationItems.filter((item) => item.type === filter);
  return (
    <ProductChrome current="notifications">
      <WorkspaceBanner
        eyebrow="Notifications"
        title="What needs your attention"
        body="Replies, Rooms, and recent activity — together."
        intensity="quiet"
      />
      <section className="notifications-workspace">
        <nav aria-label="Notification filters">
          {["All", "Mentions", "Rooms", "Activity"].map((item) => (
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
              <article key={item.title}>
                <span className="notification-symbol">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.context}</p>
                </div>
                <time>{item.time}</time>
                <Link href={item.href}>Open</Link>
              </article>
            );
          })}
        </div>
        {shown.length === 0 ? (
          <div className="two-line-empty">
            <h2>Nothing here</h2>
            <p>You’re caught up.</p>
          </div>
        ) : null}
        <p className="prototype-strip">
          Prototype activity · Stored nowhere beyond this preview.
        </p>
      </section>
    </ProductChrome>
  );
}

export function ProductSurface({ surface }: { surface: ProductWorkspace }) {
  if (surface === "explore") return <Explore />;
  if (surface === "marketplace") return <Marketplace />;
  if (surface === "studio") return <Studio />;
  if (surface === "settings") return <Settings />;
  if (surface === "notifications") return <Notifications />;
  return <Help />;
}
