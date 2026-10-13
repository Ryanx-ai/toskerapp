"use client";
import { createContext, useContext, useEffect } from "react";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import type { SharedLocationPeer } from "./use-shared-location";
import { mapCoordinate } from "@/lib/maps/world-geometry";
import styles from "./room-map-workspace.module.css";
export const SharedLocationPeers = createContext<SharedLocationPeer[]>([]);
export function SharedLocationMarkers({ map }: { map: MapInstance | null }) {
  const peers = useContext(SharedLocationPeers);
  useEffect(() => {
    if (!map) return;
    let disposed = false; const markers: Marker[] = [];
    void import("maplibre-gl").then(({ Marker }) => {
      if (disposed) return;
      for (const { snapshot, identity } of peers) {
        if (snapshot.precision !== "precise" || !snapshot.point || snapshot.expiresAt <= Date.now()) continue;
        const element = document.createElement("span"); element.className = styles.peerLocation;
        element.textContent = identity.displayName;
        element.setAttribute("role", "img"); element.setAttribute("aria-label", `${identity.displayName} shared a temporary position, accuracy about ${Math.round(snapshot.point.accuracy)} metres. Not live tracking.`);
        markers.push(new Marker({ element, anchor: "bottom" }).setLngLat(mapCoordinate(snapshot.point.longitude, snapshot.point.latitude)).addTo(map));
      }
    });
    return () => { disposed = true; markers.forEach(marker => marker.remove()); };
  }, [map, peers]);
  return null;
}
