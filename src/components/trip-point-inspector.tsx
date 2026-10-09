"use client";
import { Info, MessageCircle, X } from "lucide-react";
import type { PlaceCandidate, TripPlace } from "@/lib/trip-contract";
import type { TripChange } from "./trip-route-controls";
import { TripPlaceAppearance } from "./trip-place-appearance";
import { TripPlaceTags } from "./trip-place-tags";
import { TripPlaceSymbol } from "./trip-place-symbol";
import styles from "./room-map-workspace.module.css";

type Props = { candidate?: PlaceCandidate; nearby?: PlaceCandidate[]; chooseNearby?(index: number): void; place?: TripPlace; title: string; routeName?: string; revision: number; disabled: boolean; ready: boolean; busy: boolean; close(): void; add(): void; comments(): void; change: TripChange };
export default function TripPointInspector({ candidate, nearby, chooseNearby, place, title, routeName, revision, disabled, ready, busy, close, add, comments, change }: Props) {
  const point = candidate ?? place;
  if (!point) return null;
  return <section className={styles.pointInspector} aria-label={candidate ? "Place preview" : `Selected place: ${title}`}>
    <header><TripPlaceSymbol icon={place?.icon ?? (point.source === "pin" ? "checkpoint" : "destination")} />{place && !candidate ? <TripPlaceAppearance key={place.id} place={place} revision={revision} disabled={disabled} change={change} /> : <h2>{title}</h2>}<button className={styles.inspectorClose} aria-label="Close place preview" disabled={busy} onClick={close}><X size={18} aria-hidden="true" /></button></header>
    <p>{point.address || "Manually selected point"}</p>
    {candidate ? <>
      <p className={styles.previewTarget}>{routeName ? `Add to ${routeName}` : "Route 1 will be created when you add."}</p>
      <div className={styles.actions}><button className={styles.primary} disabled={disabled || !ready} onClick={add}>{busy ? "Saving…" : "Add to Route"}</button><button className={styles.control} disabled={busy} onClick={close}>Cancel</button></div>
      <small>{candidate.source === "pin" ? "Nearby address context only. Check your map position before adding." : "Check the name and map position before adding. Search results may be approximate."}</small>
      {candidate.source === "pin" && !!nearby?.length && <div className={styles.nearbyChoices} role="group" aria-label="Nearby places within 20 metres"><small>Or preview a nearby place at its own position:</small>{nearby.map((point,index)=><button key={point.providerId ?? index} className={styles.control} disabled={disabled} onClick={()=>chooseNearby?.(index)}>Preview {point.title}</button>)}</div>}
    </> : place && <>
      <TripPlaceTags place={place} revision={revision} disabled={disabled} change={change} />
      <div className={styles.actions}><button className={styles.control} aria-label={`Comments on ${place.title}, ${place.commentCount ?? 0}`} onClick={comments}><MessageCircle size={16} aria-hidden="true" />Comments · {place.commentCount ?? 0}</button></div>
    </>}
    <details className={styles.pointInfo}><summary><Info size={15} aria-hidden="true" />Info</summary><p>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</p>{place?.note && <p>{place.note}</p>}<small>{point.attribution || "Manually selected coordinates"}{point.license ? ` · ${point.license}` : ""}</small></details>
  </section>;
}
