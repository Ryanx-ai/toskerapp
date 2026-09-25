import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingActions } from "@/components/landing-actions";
import { LandingExhibit } from "@/components/landing-exhibit";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: { absolute: "Tosker — A little room for your people" },
  description: "Tosker starts with shared chat, then takes shape around what you do together. Keep your people, conversations, and important things in one Room.",
  alternates: { canonical: "https://toskerapp.vercel.app/" },
};

export default function LandingPage() {
  return <div className={styles.landing}>
    <a className={styles.skip} href="#landing-content">Skip to content</a>
    <header className={`${styles.wrap} ${styles.nav}`}>
      <Link href="/" aria-label="Tosker landing page" className={styles.brand}><Image src="/brand/toskerlogo-full-white.svg" alt="Tosker" width={148} height={70} /></Link>
      <nav aria-label="Get started"><LandingActions /></nav>
    </header>
    <main id="landing-content">
      <section className={`${styles.wrap} ${styles.hero}`} aria-labelledby="belong-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>A place to be together</p>
          <h1 id="belong-title">A little room<br />for your people.</h1>
          <p className={styles.intro}>Tosker starts with shared chat, then takes<br className={styles.desktopBreak} /> shape around what you do together.</p>
          <LandingActions />
        </div>
        <Image className={styles.heroArt} src="/landing/hero-room-concept.webp" alt="" width={1280} height={853} sizes="(max-width: 760px) 110vw, (max-width: 1280px) 60vw, 790px" preload />
        <p className={styles.heroFoot}><span aria-hidden="true" />A Room begins with the people inside it.</p>
      </section>
      <section className={`${styles.wrap} ${styles.talk}`} aria-labelledby="talk-title">
        <div className={styles.chapterHead}><p className={styles.eyebrow}>The conversation comes first</p><h2 id="talk-title">It starts with<br />a conversation.</h2></div>
        <LandingExhibit surface="Chat" caption="One Room. Your people. The conversation." description="Tokyo 2027 Chat: friends sharing travel plans, replies, and an itinerary link in a shared Room." />
      </section>
      <section className={`${styles.wrap} ${styles.shape}`} aria-labelledby="shape-title">
        <div className={styles.shapeHead}><div><p className={styles.eyebrow}>Same people. More possibilities.</p><h2 id="shape-title">Make room for<br />what you’re doing.</h2></div><p>Keep the useful things close.<br />Hall holds the notes, plans, and<br />decisions worth keeping.</p></div>
        <LandingExhibit surface="Hall" caption="Hall keeps the important things in view." description="Tokyo 2027 Hall bulletin board: flight details, a dinner decision, passport reminder, itinerary link, and a recorded poll result." />
        <aside className={styles.gizmo}><Image src="/landing/map-concept.svg" alt="" width={121} height={94} /><div><p className={styles.eyebrow}>Future Gizmo concept</p><p>A shared map for the next trip.</p><small>One idea for what this Room could become. Not available yet.</small></div></aside>
      </section>
      <section className={`${styles.wrap} ${styles.community}`} aria-labelledby="community-title">
        <div><p className={styles.eyebrow}>Made useful. Shared further.</p><h2 id="community-title">Imagine what<br />Rooms can become.</h2><p>Something you make could help another Room.<br />A future for building and sharing together.</p><small>Community vision · contribution tools are not available yet.</small></div>
        <figure><Image src="/landing/contribution-concept.svg" alt="A maker shares a small creation with another Room: a future community concept." width={600} height={380} sizes="(max-width: 760px) 90vw, 500px" /><figcaption>One useful idea. Another Room.</figcaption></figure>
      </section>
      <section className={styles.begin} aria-labelledby="begin-title">
        <div className={`${styles.wrap} ${styles.beginCopy}`}><p className={styles.eyebrow}>There’s room for you</p><h2 id="begin-title">Bring your people.</h2><p>Start together, in your browser.</p><LandingActions /></div>
        <Image className={styles.endingArt} src="/landing/ending-world-concept.webp" alt="" width={1440} height={720} sizes="100vw" />
        <p className={styles.signature}>Different people.<br />Brighter places.</p>
      </section>
    </main>
    <footer className={`${styles.wrap} ${styles.footer}`}><span>Tosker · A little room for your people.</span><a href="#landing-content">Back to top ↑</a></footer>
  </div>;
}
