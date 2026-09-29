"use client";

import { MapPin, Search } from "lucide-react";
import TripMapCanvas from "./trip-map-canvas";
import styles from "./room-map-workspace.module.css";

/** Provider slice. Saving/search stay unavailable until the shared plan service is ready. */
export default function RoomMapWorkspace() {
  return <section className={styles.workspace} aria-label="Room Map">
    <div className={styles.mapPlane}>
      <div className={styles.state}><span className={styles.stateDot} aria-hidden="true" />Singapore · Development preview</div>
      <TripMapCanvas />
      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={18} aria-hidden="true" /><input aria-label="Search places" placeholder="Search places" disabled aria-describedby="map-setup-help" /></label>
        <p id="map-setup-help">Search and saving places are being prepared.</p>
      </div>
    </div>
    <section className={styles.cards} aria-labelledby="location-cards-heading">
      <header><h2 id="location-cards-heading">Location Cards</h2><span>Shared with this Room</span></header>
      <div className={styles.cardsEmpty}><MapPin size={20} aria-hidden="true" /><p>Places you add will appear here, linked to their pins on the Map.</p></div>
    </section>
  </section>;
}
