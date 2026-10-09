"use client";
import { LocateFixed, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import { roadDistance, roadDuration, type RoadGeometry } from "@/lib/maps/road-contract";
import { localOriginArea } from "@/lib/maps/planning-region";
import type { LocalMapLocation } from "./use-local-map-location";
import styles from "./room-map-workspace.module.css";
export function TripPrivateOrigin({location,avatar,canRoute,consented,road,error,onConsent,onClear,onRetry,onRefresh}:{location:LocalMapLocation;avatar?:string|null;canRoute:boolean;consented:boolean;road?:RoadGeometry;error:string;onConsent():void;onClear():void;onRetry():void;onRefresh():void}) {
  const area=localOriginArea(location.latitude,location.longitude);
  return <aside role="listitem" className={styles.originCard} aria-label="You · private current location" data-private-origin>
    <header>
    {/* Existing user avatar only; no new external imagery source. */}
    {avatar ? <Image src={avatar} alt="" width={28} height={28} unoptimized referrerPolicy="no-referrer" /> : <LocateFixed size={24} aria-hidden="true"/>}
    <div><strong>You</strong>{!area.startsWith("Current location")&&<small>{area}</small>}<small>Current location · only you</small>
      {consented ? <small>{road?.estimate ? `YOUR LEG · ${roadDistance(road.estimate.metres)} · ${roadDuration(road.estimate.seconds)}` : error || "YOUR LEG · waiting for route calculation"}</small> : null}
    </div>
    </header><footer>
    {!consented ? <button className={styles.control} disabled={!canRoute} onClick={onConsent} title="Choose Walk or Drive and a destination first">Route from here</button> : error ? <button className={styles.control} onClick={onRetry}>Retry your leg</button> : null}
    <button className={styles.control} aria-label="Clear my location" title="Clear my location" onClick={onClear}><X size={16} aria-hidden="true"/></button>
    <button className={styles.control} aria-label="Refresh my location" title="Refresh one-shot location" onClick={onRefresh}><RefreshCw size={16} aria-hidden="true"/></button>
    </footer>
  </aside>;
}
