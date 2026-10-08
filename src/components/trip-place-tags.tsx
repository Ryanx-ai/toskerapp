"use client";
import { Home, Briefcase, Heart, Star } from "lucide-react";
import type { TripPlace } from "@/lib/trip-contract";
import type { TripChange } from "./trip-route-controls";
import styles from "./room-map-workspace.module.css";

const tags = [{ icon: "home", label: "Home", Symbol: Home }, { icon: "work", label: "Work", Symbol: Briefcase }, { icon: "favourite", label: "Favourite", Symbol: Heart }] as const;
export function TripPlaceTags({ place, revision, disabled, change }: { place: TripPlace; revision: number; disabled: boolean; change: TripChange }) {
  const fallback = place.source === "pin" && !place.providerId ? "checkpoint" : "destination";
  return <div className={styles.placeTags} role="group" aria-label={`Tags for ${place.title}`}>
    {tags.map(({ icon, label, Symbol }) => <button key={icon} className={styles.control} title={label} aria-label={label} aria-pressed={place.icon === icon} disabled={disabled || place.archived} onClick={() => void change({ type: "place-icon", placeId: place.id, icon: place.icon === icon ? fallback : icon }, revision)}><Symbol size={18} aria-hidden="true" /><span>{label}</span></button>)}
    <button className={styles.control} title={place.starred ? "Unstar" : "Star"} aria-label="Star" aria-pressed={!!place.starred} disabled={disabled || place.archived} onClick={() => void change({ type: "star-place", placeId: place.id, starred: !place.starred }, revision)}><Star size={18} fill={place.starred ? "currentColor" : "none"} aria-hidden="true" /><span>Star</span></button>
  </div>;
}
