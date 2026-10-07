"use client";
import { LocateFixed, X } from "lucide-react";
import Image from "next/image";
import { roadDistance, roadDuration, type RoadGeometry } from "@/lib/maps/road-contract";
import { localOriginArea } from "@/lib/maps/planning-region";
import type { LocalMapLocation } from "./use-local-map-location";
import styles from "./room-map-workspace.module.css";
export function TripPrivateOrigin({location,avatar,canRoute,consented,road,error,onConsent,onClear,onRetry}:{location:LocalMapLocation;avatar?:string|null;canRoute:boolean;consented:boolean;road?:RoadGeometry;error:string;onConsent():void;onClear():void;onRetry():void}) {
  return <aside className={styles.originChip} aria-label="Your private origin">
    {/* Existing user avatar only; no new external imagery source. */}
    {avatar ? <Image src={avatar} alt="" width={28} height={28} unoptimized referrerPolicy="no-referrer" /> : <LocateFixed size={24} aria-hidden="true"/>}
    <div><strong>You</strong><small>{localOriginArea(location.latitude,location.longitude)}</small>
      {consented ? <small>{road?.estimate ? `YOUR LEG · ${roadDistance(road.estimate.metres)} · ${roadDuration(road.estimate.seconds)}` : error || "YOUR LEG · waiting for route calculation"}</small> : null}
    </div>
    {!consented ? <button className={styles.control} disabled={!canRoute} onClick={onConsent} title="Choose Walk or Drive and a destination first">Route from here</button> : error ? <button className={styles.control} onClick={onRetry}>Retry your leg</button> : null}
    <button className={styles.control} aria-label="Clear my location" title="Clear my location" onClick={onClear}><X size={16} aria-hidden="true"/></button>
  </aside>;
}
