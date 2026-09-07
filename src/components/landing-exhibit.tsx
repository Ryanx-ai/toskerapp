"use client";

import Image from "next/image";
import { useState } from "react";
import { Expand, X } from "lucide-react";
import { ModalLayer } from "@/components/modal-layer";
import styles from "@/app/landing.module.css";

export function LandingExhibit({ surface, caption, description }: { surface: "Chat" | "Hall"; caption: string; description: string }) {
  const [expanded, setExpanded] = useState(false);
  const src = `/landing/tokyo-${surface.toLowerCase()}.webp`;
  return <figure className={styles.figure}>
    <div className={styles.exhibit}>
      <div className={styles.toolbar}>
        <span>Tokyo 2027 <span aria-hidden="true"> / </span> {surface}</span>
        <button onClick={() => setExpanded(true)} aria-label={`View ${surface} screenshot larger`}>View larger <Expand size={14} aria-hidden="true" /></button>
      </div>
      <div className={styles.captureScroll} tabIndex={0} role="region" aria-label={`${surface} screenshot; scroll horizontally to inspect on small screens`}>
        <Image className={styles.capture} src={src} alt={description} width={1150} height={680} sizes="(max-width: 800px) 800px, (max-width: 1280px) 90vw, 1150px" />
      </div>
      <p className={styles.scrollHint}>Scroll across to explore · or view larger</p>
    </div>
    <figcaption className={styles.caption}><span>{caption}</span><span>Real Tosker · Demo content</span></figcaption>
    {expanded ? <ModalLayer onClose={() => setExpanded(false)}>
      <section className={styles.viewer} aria-labelledby={`landing-${surface}-title`}>
        <header><h2 id={`landing-${surface}-title`}>Tokyo 2027 · {surface}</h2><button onClick={() => setExpanded(false)} aria-label="Close screenshot"><X size={20} /></button></header>
        <p>Actual product capture with demo content. Scroll to inspect at full size.</p>
        <div className={styles.viewerScroll} tabIndex={0} role="region" aria-label={`${surface} full-size screenshot`}>
          <Image src={src} alt={description} width={1150} height={680} unoptimized />
        </div>
      </section>
    </ModalLayer> : null}
  </figure>;
}
