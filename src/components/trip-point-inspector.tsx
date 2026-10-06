"use client";
import { useState } from "react";
import { Info, MessageCircle, Pencil, X } from "lucide-react";
import type { PlaceCandidate, TripPlace } from "@/lib/trip-contract";
import type { TripChange } from "./trip-route-controls";
import { TripPlaceAppearance } from "./trip-place-appearance";
import { TripPlaceSymbol } from "./trip-place-symbol";
import styles from "./room-map-workspace.module.css";

type Props = { candidate?: PlaceCandidate; place?: TripPlace; title: string; routeName?: string; revision: number; disabled: boolean; ready: boolean; busy: boolean; close(): void; add(): void; showCard(): void; comments(): void; createRoute(): void; change: TripChange };
export default function TripPointInspector({ candidate, place, title, routeName, revision, disabled, ready, busy, close, add, showCard, comments, createRoute, change }: Props) {
  const point = candidate ?? place;
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  if (!point) return null;
  return <section className={styles.pointInspector} aria-label={candidate ? "Place preview" : `Selected place: ${title}`}>
    <header><TripPlaceSymbol icon={place?.icon ?? (point.source === "pin" ? "checkpoint" : "destination")} /><h2>{title}</h2><button className={styles.inspectorClose} aria-label="Close place preview" disabled={busy} onClick={close}><X size={18} aria-hidden="true" /></button></header>
    <p>{point.address || "Manually selected point"}</p>
    {candidate ? <>
      <p className={styles.previewTarget}>{routeName ? `Add to ${routeName}` : "Choose a route for this place."}</p>
      <div className={styles.actions}>{routeName ? <button className={styles.primary} disabled={disabled || !ready} onClick={add}>{busy ? "Saving…" : "Add to Route"}</button> : <button className={styles.primary} disabled={disabled} onClick={createRoute}>Choose a route</button>}<button className={styles.control} disabled={busy} onClick={close}>Cancel</button></div>
      <small>{candidate.source === "pin" ? "Nearby address context only. Check your map position before adding." : "Check the name and map position before adding. Search results may be approximate."}</small>
    </> : place && <>
      <div className={styles.actions}><button className={styles.control} onClick={showCard}>Location Card</button><button className={styles.control} aria-label={`Comments on ${place.title}, ${place.commentCount ?? 0}`} onClick={comments}><MessageCircle size={16} aria-hidden="true" />{place.commentCount ?? 0}</button><button className={styles.control} aria-label="Edit place appearance" aria-expanded={appearanceOpen} onClick={() => setAppearanceOpen(value => !value)}><Pencil size={16} aria-hidden="true" /></button></div>
      {appearanceOpen && <TripPlaceAppearance place={place} revision={revision} disabled={disabled} change={change} />}
    </>}
    <details className={styles.pointInfo}><summary><Info size={15} aria-hidden="true" />Info</summary><p>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</p>{place?.note && <p>{place.note}</p>}<small>{point.attribution || "Manually selected coordinates"}{point.license ? ` · ${point.license}` : ""}</small></details>
  </section>;
}
