"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { conversations, hallNotices, type Conversation, type Message } from "@/data/messaging-data";

type View = "personal" | "rooms";
function conversationHref(item: Conversation) { return item.kind === "room" ? `/room/${item.slug}` : `/personal/${item.slug}`; }
function Avatar({ item, large = false }: { item: Pick<Conversation, "initials" | "color">; large?: boolean }) { return <span className={`avatar avatar-${item.color} ${large ? "avatar-large" : ""}`}>{item.initials}</span>; }

function ConversationList({ selected, view }: { selected?: Conversation; view: View }) {
  const shown = conversations.filter((item) => view === "rooms" ? item.kind === "room" : item.kind !== "room");
  return <div className="conversation-list">{shown.map((item) => <Link key={item.slug} href={conversationHref(item)} data-tooltip={item.name} className={`conversation-row tooltip-item ${selected?.slug === item.slug ? "active" : ""}`}><Avatar item={item} /><span className="conversation-copy"><span className="conversation-name">{item.name}{item.kind === "my-room" ? <small>Private</small> : null}</span><span className="conversation-preview">{item.preview}</span></span><span className="conversation-trailing"><time>{item.time}</time>{item.unread ? <b>{item.unread}</b> : null}</span></Link>)}</div>;
}

const productNavigation = [
  { label: "Home", icon: "⌂", href: "/", available: true },
  { label: "Explore", icon: "⌕", available: false },
  { label: "Marketplace", icon: "◇", available: false },
  { label: "Studio", icon: "✦", available: false },
] as const;

function ProductNavigation() {
  return <nav className="product-nav" aria-label="Tosker"><p className="sidebar-section-label">Tosker</p>{productNavigation.map((item) => item.available ? <Link key={item.label} href={item.href} className="product-nav-item active tooltip-item" data-tooltip={item.label}><span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong></Link> : <button key={item.label} type="button" className="product-nav-item tooltip-item" data-tooltip={`${item.label} · Coming later`} title={`${item.label} is coming later`}><span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong><small>Soon</small></button>)}</nav>;
}

function AppSidebar({ selected, initialView, collapsed, onToggle }: { selected?: Conversation; initialView: View; collapsed: boolean; onToggle: () => void }) {
  const [view, setView] = useState<View>(initialView);
  return <aside className={`messenger-sidebar ${collapsed ? "collapsed" : ""}`}><div className="sidebar-brand"><Link href="/" aria-label="Tosker conversations"><Image className="full-logo" src="/brand/toskerlogo-full-white.svg" alt="Tosker" width={150} height={72} priority /><Image className="mark-logo" src="/brand/toskerlogo-icon-main.svg" alt="" width={44} height={44} priority /></Link><button className="collapse-button tooltip-item" data-tooltip={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? "→" : "←"}</button></div><ProductNavigation /><section className="conversation-section"><div className="sidebar-heading"><div><p className="eyebrow">Conversations</p><h1>Talk, plan, keep things.</h1></div><Link href="/create" className="new-room-button tooltip-item" data-tooltip="Create a Room" aria-label="Create a Room">＋</Link></div><div className="view-switch" aria-label="Conversation type"><button className={view === "personal" ? "active" : ""} onClick={() => setView("personal")}><span>Personal</span><i>P</i></button><button className={view === "rooms" ? "active" : ""} onClick={() => setView("rooms")}><span>Rooms</span><i>R</i></button></div><ConversationList selected={selected} view={view} /></section><div className="sidebar-bottom"><div className="utility-nav"><button className="tooltip-item" data-tooltip="Settings · Coming later" title="Settings are coming later"><span>⚙</span><strong>Settings</strong></button><button className="tooltip-item" data-tooltip="Help & Feedback · Coming later" title="Help & Feedback is coming later"><span>?</span><strong>Help &amp; Feedback</strong></button></div><button className="profile-row tooltip-item" data-tooltip="Ryan · Profile"><span className="avatar avatar-gold">RY</span><span><strong>Ryan</strong><small>Founder preview</small></span><b>•••</b></button></div></aside>;
}

function MessageBubble({ message, translated, onTranslate }: { message: Message; translated: boolean; onTranslate: () => void }) {
  return <article className={`message-row ${message.mine ? "mine" : ""}`} data-message-id={message.id}><span className={`avatar avatar-${message.color}`}>{message.initials}</span><div className="message-column"><div className="message-author"><strong>{message.author}</strong><time>{message.time}</time></div><div className="message-bubble"><p>{message.body}</p>{message.translation ? <button className="translate-button" onClick={onTranslate}>{translated ? "Hide translation" : "Translate"}</button> : null}{translated && message.translation ? <div className="translation"><p>{message.translation}</p><span>Translated from {message.language}</span></div> : null}</div></div></article>;
}

function Composer({ name, onSend }: { name: string; onSend: (body: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => { const body = value.trim(); if (!body) return; onSend(body); setValue(""); };
  return <div className="composer-wrap"><div className="composer"><button type="button" className="composer-add" aria-label="Add something" disabled>＋</button><textarea aria-label={`Message ${name}`} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} rows={1} placeholder={`Message ${name}…`} /><button type="button" className="send-button" disabled={!value.trim()} onClick={submit} aria-label="Send message">↑</button></div><span className="composer-hint">Enter to send · Shift + Enter for a new line</span></div>;
}

function ConversationSurface({ conversation }: { conversation: Conversation }) {
  const [messages, setMessages] = useState(conversation.messages);
  const [translated, setTranslated] = useState<Set<string>>(() => new Set());
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);
  const send = (body: string) => setMessages((current) => [...current, { id: `local-${Date.now()}`, author: "Ryan", initials: "RY", body, time: "Now", color: "gold", mine: true }]);
  const mockReply = () => setMessages((current) => [...current, { id: `mock-${Date.now()}`, author: conversation.kind === "my-room" ? "Tosker" : "Mika", initials: conversation.kind === "my-room" ? "✦" : "MK", body: conversation.kind === "my-room" ? "Saved here for you." : "Mock reply: that sounds good to me — let’s do it.", time: "Now", color: conversation.kind === "my-room" ? "gold" : "pink" }]);
  const toggleTranslation = (id: string) => setTranslated((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <section className="conversation-surface">{conversation.kind === "my-room" ? <div className="my-room-note"><span>✦</span><div><strong>This is your room.</strong><p>Send yourself something worth keeping.</p></div></div> : null}<div className="message-scroll"><div className="day-marker"><span>Today</span></div>{messages.map((message) => <MessageBubble key={message.id} message={message} translated={translated.has(message.id)} onTranslate={() => toggleTranslation(message.id)} />)}<div ref={endRef} /></div><div className="dev-reply"><span>Walkthrough control</span><button type="button" onClick={mockReply}>Simulate reply</button></div><Composer name={conversation.name} onSend={send} /></section>;
}

function HallSurface() { return <section className="hall-surface"><header><div><p className="eyebrow">The notice wall</p><h2>What everyone needs to know.</h2><p>Important details stay here instead of disappearing in conversation.</p></div><div className="hall-pin-key"><span>⌖</span> Pinned by the group</div></header><div className="notice-list">{hallNotices.map((notice) => <article className={`notice-card notice-${notice.accent} ${notice.pinned ? "pinned" : ""}`} key={notice.id}>{notice.pinned ? <b className="pin" aria-label="Pinned">⌖</b> : null}<span className="notice-icon">{notice.icon}</span><div><small>{notice.category}</small><h3>{notice.title}</h3><p>{notice.body}</p><footer>{notice.author} · {notice.time}</footer></div></article>)}</div><div className="hall-empty"><Image src="/brand/toskerlogo-icon-main.svg" alt="" width={52} height={52} /><div><strong>That’s everything for now.</strong><p>Good news travels fast. Important news stays here.</p></div></div></section>; }

function ConversationHeader({ conversation, surface }: { conversation: Conversation; surface: "chat" | "hall" }) {
  return <header className="conversation-header"><Link href="/" className="mobile-back" aria-label="Back to conversations">←</Link><Avatar item={conversation} large /><div className="active-copy"><h2>{conversation.name}</h2><span>{conversation.context}</span></div>{conversation.kind === "room" ? <nav aria-label={`${conversation.name} capabilities`}><Link className={surface === "chat" ? "active" : ""} href={`/room/${conversation.slug}`}>Chat</Link><Link className={surface === "hall" ? "active" : ""} href={`/room/${conversation.slug}/hall`}>Hall</Link><button title="More Room capabilities are coming later" disabled aria-label="Add something to this Room">＋<small>Later</small></button></nav> : <button className="header-more" aria-label="Conversation options">•••</button>}</header>;
}

export function MessagingApp({ selected, surface = "chat" }: { selected?: Conversation; surface?: "chat" | "hall" }) {
  const view: View = selected?.kind === "room" ? "rooms" : "personal";
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed((current) => !current);
  return <main className={`messaging-app ${collapsed ? "sidebar-collapsed" : ""} ${selected ? "has-selection" : "list-only"}`}><AppSidebar selected={selected} initialView={view} collapsed={collapsed} onToggle={toggleSidebar} /><div className="working-surface">{selected ? <><ConversationHeader conversation={selected} surface={surface} />{surface === "hall" ? <HallSurface /> : <ConversationSurface conversation={selected} />}</> : <div className="desktop-welcome"><Image src="/brand/toskerlogo-icon-main.svg" alt="" width={120} height={120} /><p className="eyebrow">Your Tosker</p><h2>Pick up where you left off.</h2><p>Choose a conversation or Room from the left.</p></div>}</div></main>;
}
