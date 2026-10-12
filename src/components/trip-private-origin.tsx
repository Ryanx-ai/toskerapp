"use client";
import { LocateFixed, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import { roadDistance, roadDuration, type RoadGeometry } from "@/lib/maps/road-contract";
import { localOriginArea } from "@/lib/maps/planning-region";
import type { LocalMapLocation } from "./use-local-map-location";
import styles from "./room-map-workspace.module.css";
export function TripPrivateOrigin({location,avatar,consented,road,error,busy,onClear,onRetry,onRefresh}:{location:LocalMapLocation;avatar?:string|null;consented:boolean;road?:RoadGeometry;error:string;busy:boolean;onClear():void;onRetry():void;onRefresh():void}) {
  const area=localOriginArea(location.latitude,location.longitude);
  return <aside role="listitem" className={`${styles.placeCard} ${styles.originCard}`} aria-label="You · private temporary starting location" data-private-origin>
    <div className={styles.cardVisual}>
    {/* Existing user avatar only; no new external imagery source. */}
    {avatar ? <Image src={avatar} alt="" width={28} height={28} unoptimized referrerPolicy="no-referrer" /> : <LocateFixed size={24} aria-hidden="true"/>}
    </div><div className={styles.cardInfo}><strong>You · starting location</strong><span className={styles.cardAddress} title={`${area} · Fixed until Locate is turned off or expires`}>{area} · only you</span>
      {consented ? <small role="status" title={error || undefined}>{road?.estimate ? `Your leg · ${roadDistance(road.estimate.metres)} · ${roadDuration(road.estimate.seconds)}` : error ? "Your leg unavailable" : "Calculating your leg…"}</small> : null}
    </div>
    <div className={styles.cardActions}>
    {error && consented ? <button onClick={onRetry}>Retry leg</button> : <button aria-label="Clear my location" title="Clear my location" onClick={onClear}><X size={16} aria-hidden="true"/></button>}
    <button disabled={busy} aria-label="Refresh my location marker" title="Refresh marker; starting location stays fixed" onClick={onRefresh}><RefreshCw size={16} aria-hidden="true"/></button>
    </div>
  </aside>;
}
