import { announcements, members, messages, planItems } from "@/data/mock-data";

export type RealmSection = "hall" | "chat" | "plan" | "people";

function Header({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="content-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{copy}</p></div><button className="round-button" aria-label="More options">•••</button></header>;
}

function Hall() {
  return <><Header eyebrow="Tokyo 2027 · Notice board" title="The Hall" copy="The things everyone should know, without digging through chat." />
    <div className="announcement-list">{announcements.map((item, index) => <article className="announcement-card" key={item.title}><div className="announcement-icon">{item.icon}</div><div><div className="card-kicker">Announcement {String(index + 1).padStart(2, "0")}</div><h3>{item.title}</h3><p>{item.body}</p><footer><span className="avatar avatar-gold">{item.author.slice(0, 2).toUpperCase()}</span><span>{item.author}</span><span>·</span><time>{item.time}</time></footer></div></article>)}</div>
    <aside className="arrival-note"><span aria-hidden="true">☀</span><div><strong>38 days to go</strong><p>Next up: settle the first-night dinner poll.</p></div></aside>
  </>;
}

function Chat() {
  return <div className="chat-page"><Header eyebrow="Tokyo 2027 · Conversation" title="Chat" copy="The trip is already taking shape." /><div className="chat-date"><span>Today</span></div>
    <div className="message-list">{messages.map((message) => <div className={`message ${message.mine ? "mine" : ""}`} key={`${message.author}-${message.time}`}><span className={`avatar avatar-${message.color}`}>{message.initials}</span><div><div className="message-meta"><strong>{message.author}</strong><time>{message.time}</time></div><p>{message.body}</p></div></div>)}</div>
    <div className="chat-composer"><button aria-label="Add attachment">＋</button><span>Message Tokyo 2027…</span><button className="send-button" aria-label="Send message">↑</button></div>
  </div>;
}

function Plan() {
  return <><Header eyebrow="Tokyo 2027 · Shared things" title="The plan, so far" copy="Shared things that help this trip happen." /><div className="plan-grid">
    {planItems.map((item) => <article className={`plan-card plan-${item.accent}`} key={item.title}><div className="plan-visual"><span>{item.label === "Itinerary" ? "07" : item.label === "Shared map" ? "⌖" : "▥"}</span></div><div className="card-kicker">{item.label}</div><h3>{item.title}</h3><p>{item.detail}</p><footer><span>{item.meta}</span><span aria-hidden="true">→</span></footer></article>)}
    <button className="plan-card add-plan" disabled><span>＋</span><strong>Add something</strong><small>More shared objects are coming later.</small></button>
  </div></>;
}

function People() {
  return <><Header eyebrow="Tokyo 2027 · Travellers" title="The people inside" copy="Six travellers, one increasingly ambitious plan." /><div className="people-grid">
    {members.map((member) => <article className="member-card" key={member.name}><span className={`avatar avatar-large avatar-${member.color}`}>{member.initials}</span><div><h3>{member.name}</h3><span className="role-pill">{member.role}</span><p>{member.status}</p></div><button aria-label={`More options for ${member.name}`}>•••</button></article>)}
  </div><button className="invite-card" type="button"><span>＋</span><div><strong>Invite someone in</strong><small>There’s room.</small></div><span aria-hidden="true">→</span></button></>;
}

export function RealmContent({ section }: { section: RealmSection }) {
  return <main className={`realm-content realm-content-${section}`}>{section === "hall" ? <Hall /> : section === "chat" ? <Chat /> : section === "plan" ? <Plan /> : <People />}</main>;
}
