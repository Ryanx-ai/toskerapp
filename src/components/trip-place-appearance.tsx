"use client";
import { useState } from "react";
import type { PlaceIcon, TripPlace } from "@/lib/trip-contract";
import type { TripChange } from "./trip-route-controls";
import { TripPlaceIconOptions } from "./trip-place-symbol";
import styles from "./room-map-workspace.module.css";

export function TripPlaceAppearance({ place, revision, disabled, change }: { place: TripPlace; revision: number; disabled: boolean; change: TripChange }) {
  const [rename, setRename] = useState<{ title: string; revision: number } | null>(null);
  return <div className={styles.placeAppearance}>
    <label>Place icon<select aria-label={`Icon for ${place.title}`} value={place.icon ?? "destination"} disabled={disabled || place.archived} onChange={event => void change({ type: "place-icon", placeId: place.id, icon: event.target.value as PlaceIcon }, revision)}><TripPlaceIconOptions /></select></label>
    {place.source === "pin" && !place.providerId && !place.archived && (rename ? <form className={styles.editor} onSubmit={async event => { event.preventDefault(); if (await change({ type: "rename-checkpoint", placeId: place.id, title: rename.title }, rename.revision)) setRename(null); }}>
      <label>Checkpoint name<input autoFocus required maxLength={120} value={rename.title} onChange={event => setRename({ ...rename, title: event.target.value })} /></label>
      {rename.revision !== revision && <p role="alert">This route changed. Cancel and rename from its latest state.</p>}
      <div className={styles.actions}><button className={styles.primary} disabled={disabled || !rename.title.trim() || rename.revision !== revision}>Save name</button><button type="button" className={styles.control} onClick={() => setRename(null)}>Cancel</button></div>
    </form> : <button className={styles.control} disabled={disabled} onClick={() => setRename({ title: place.title, revision })}>Rename checkpoint</button>)}
  </div>;
}
