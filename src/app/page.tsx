import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RealmCard } from "@/components/realm-card";
import { realms } from "@/data/mock-data";

export default function Home() {
  return <AppShell><main className="home-main">
    <section className="welcome-block"><div><p className="eyebrow">Your corner of Tosker</p><h1>Good evening, Ryan.</h1><p className="lede">What are we doing together?</p></div><Link className="button button-primary" href="/create"><span aria-hidden="true">＋</span> Create a Tosker</Link></section>
    <section aria-labelledby="your-toskers"><div className="section-heading"><div><p className="eyebrow">Shared rooms</p><h2 id="your-toskers">Your Toskers</h2></div><span className="section-count">3 places</span></div><div className="realm-grid">{realms.map((realm, index) => <RealmCard key={realm.slug} realm={realm} index={index} />)}</div></section>
    <section className="world-note"><span className="spark" aria-hidden="true">✦</span><div><p className="eyebrow">One place for the whole thing</p><h2>Every event deserves a Tosker.</h2><p>Conversation, plans, people, and the little things that make gathering work—all in one shared room.</p></div></section>
  </main></AppShell>;
}
