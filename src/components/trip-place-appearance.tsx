"use client";
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import type { TripPlace } from "@/lib/trip-contract";
import type { TripChange } from "./trip-route-controls";
import styles from "./room-map-workspace.module.css";

export function TripPlaceAppearance({ place, revision, disabled, change }: { place: TripPlace; revision: number; disabled: boolean; change: TripChange }) {
  const [rename, setRename] = useState<{ title: string; revision: number } | null>(null);
  const edit = useRef<HTMLButtonElement>(null);
  const close = () => { setRename(null); edit.current?.focus(); };
  return <div className={styles.placeAppearance}>
    <div className={styles.checkpointHeading}><h2 title={place.title}>{place.title}</h2>{place.source === "pin" && !place.providerId && !place.archived && <button ref={edit} className={styles.inspectorClose} aria-label="Rename checkpoint" title="Rename checkpoint" aria-expanded={!!rename} disabled={disabled} onClick={() => rename ? close() : setRename({ title: place.title, revision })}><Pencil size={16} aria-hidden="true" /></button>}</div>
    {rename && <form className={styles.editor} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }} onSubmit={async event => { event.preventDefault(); if (await change({ type: "rename-checkpoint", placeId: place.id, title: rename.title }, rename.revision)) close(); }}>
      <label>Checkpoint name<input autoFocus required maxLength={120} value={rename.title} onChange={event => setRename({ ...rename, title: event.target.value })} /></label>
      <small>Default: {place.defaultTitle ?? "Not available — refresh the trip"}</small>
      {rename.revision !== revision && <p role="alert">This route changed. Cancel and rename from its latest state.</p>}
      <div className={styles.actions}><button className={styles.primary} disabled={disabled || !rename.title.trim() || rename.revision !== revision}>Save name</button><button type="button" className={styles.control} onClick={close}>Cancel</button><button type="button" className={styles.control} disabled={disabled || !place.defaultTitle || place.title === place.defaultTitle || rename.revision !== revision} onClick={async () => { if (await change({ type: "reset-checkpoint-name", placeId: place.id }, rename.revision)) close(); }}>Revert to default</button></div>
    </form>}
  </div>;
}
