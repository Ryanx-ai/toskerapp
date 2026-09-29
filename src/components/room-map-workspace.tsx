"use client";

import { Map, MapPin, Search } from "lucide-react";
import styles from "./room-map-workspace.module.css";

/** Slice A only. Never imply that an unprovisioned provider or unsaved plan is working. */
export default function RoomMapWorkspace() {
  return <section className={styles.workspace} aria-label="Room Map">
    <div className={styles.mapPlane}>
      <div className={styles.state}><span className={styles.stateDot} aria-hidden="true" />Development preview · Provider not connected</div>
      <div className={styles.emptyMap}>
        <Map size={36} strokeWidth={1.25} aria-hidden="true" />
        <h1>A place for your plans.</h1>
        <p>This Room’s shared Map is being prepared. Place search and pinning will be available after map setup.</p>
        <span>No location is being shared.</span>
      </div>
      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={18} aria-hidden="true" /><input aria-label="Search places" placeholder="Search places" disabled aria-describedby="map-setup-help" /></label>
        <p id="map-setup-help">Place search is not connected yet.</p>
      </div>
    </div>
    <section className={styles.cards} aria-labelledby="location-cards-heading">
      <header><h2 id="location-cards-heading">Location Cards</h2><span>Shared with this Room</span></header>
      <div className={styles.cardsEmpty}><MapPin size={20} aria-hidden="true" /><p>Places you add will appear here, linked to their pins on the Map.</p></div>
    </section>
  </section>;
}
