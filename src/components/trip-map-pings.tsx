"use client";
import { useEffect } from "react";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import { PING_KINDS, type MapPing } from "@/lib/maps/ping-contract";
import styles from "./room-map-workspace.module.css";

export function TripMapPings({map,pings}:{map:MapInstance|null;pings:MapPing[]}) {
  useEffect(()=>{
    if(!map)return;
    let disposed=false;const markers:Marker[]=[];
    void import("maplibre-gl").then(({Marker})=>{
      if(disposed)return;
      for(const ping of pings){
        if(ping.expiresAt<=Date.now())continue;
        const element=document.createElement("span"),label=`${ping.senderName}: ${PING_KINDS[ping.kind].label} ping. Selected point, not live location.`;
        element.className=styles.mapPing;element.textContent=PING_KINDS[ping.kind].symbol;element.title=label;element.setAttribute("role","img");element.setAttribute("aria-label",label);
        markers.push(new Marker({element}).setLngLat([ping.longitude,ping.latitude]).addTo(map));
      }
    });
    return()=>{disposed=true;markers.forEach(m=>m.remove());};
  },[map,pings]);
  return <div className={styles.srOnly} role="status">{pings.map(p=>`${p.senderName}: ${PING_KINDS[p.kind].label} ping.`).join(" ")}</div>;
}
