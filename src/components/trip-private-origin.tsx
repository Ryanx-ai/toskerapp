"use client";
import { LocateFixed, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import { roadDistance, roadDuration, type RoadGeometry } from "@/lib/maps/road-contract";
import { localOriginArea } from "@/lib/maps/planning-region";
import type { LocalMapLocation } from "./use-local-map-location";
import styles from "./room-map-workspace.module.css";
import { useState } from "react";
import { usePrivateArea } from "./use-private-area";
import { ModalLayer } from "./modal-layer";
import { REGION_LICENSE, REGION_SOURCE } from "@/lib/maps/area-label";
export function TripPrivateOrigin({location,scope,avatar,consented,road,error,busy,onClear,onRetry,onRefresh}:{location:LocalMapLocation;scope:string;avatar?:string|null;consented:boolean;road?:RoadGeometry;error:string;busy:boolean;onClear():void;onRetry():void;onRefresh():void}) {
  const areaResult=usePrivateArea(location,scope),[question,setQuestion]=useState(false);
  const area=areaResult.label??localOriginArea();
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
    {areaResult.label ? <small className={styles.helper}>{areaResult.source==="ura"?<><a href={REGION_SOURCE} title="URA MP2019 indicative regions" target="_blank" rel="noopener noreferrer">URA regions</a> · <a href={REGION_LICENSE} target="_blank" rel="noopener noreferrer">licence</a></>:<><a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Area by Geoapify</a> · approximate</>}</small> : <button className="quiet-action" disabled={areaResult.busy} onClick={()=>setQuestion(true)}>{areaResult.busy?"Finding area…":"Find broad area"}</button>}
    {areaResult.error&&<small role="status">{areaResult.error}</small>}
    {question&&<ModalLayer onClose={()=>setQuestion(false)}><section className="creation-panel" aria-label="Private area lookup consent"><h2>Find your broad area?</h2><p>Send an approximate position, rounded to two decimal places, through Tosker to Geoapify to find a city label. The result is approximate, especially near boundaries.</p><p>This does not share your location with people. Tosker does not save this lookup. Geoapify processes it under its <a href="https://www.geoapify.com/privacy-policy/" target="_blank" rel="noopener noreferrer">privacy policy</a>, including request retention.</p><div className={styles.actions}><button className={styles.primary} onClick={()=>{setQuestion(false);void areaResult.lookup();}}>Allow this area lookup</button><button className={styles.control} onClick={()=>setQuestion(false)}>Keep location local</button></div></section></ModalLayer>}
  </aside>;
}
