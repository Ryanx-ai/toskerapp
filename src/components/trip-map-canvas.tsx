"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Map as MapIcon, RotateCcw } from "lucide-react";
import type { Map as MapInstance, Marker, GeoJSONSource } from "maplibre-gl";
import type { PlaceCandidate, TripPlace, TripRoute } from "@/lib/trip-contract";
import { getBrowserMapProvider, SINGAPORE_CENTER } from "@/lib/maps/browser-provider";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./room-map-workspace.module.css";

type Status = "loading" | "ready" | "unavailable" | "failed";
type PlanningRoute = TripRoute & { ghost: boolean; places: (TripPlace & { isStop: boolean })[] };

export default function TripMapCanvas({ places, routes, snapshotReady, candidate, selectedId, onSelect, onSelectGhost, pinMode, onPin }: { places: TripPlace[]; routes: PlanningRoute[]; snapshotReady: boolean; candidate: PlaceCandidate | null; selectedId: string | null; onSelect(id: string): void; onSelectGhost(routeId: string, id: string): void; pinMode: boolean; onPin(latitude: number, longitude: number): void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const initialCamera = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const selected = useEffectEvent((id: string) => onSelect(id));
  const selectedGhost = useEffectEvent((routeId: string, id: string) => onSelectGhost(routeId, id));
  const clicked = useEffectEvent((latitude: number, longitude: number) => { if (pinMode) onPin(latitude, longitude); });
  const fitTrip = () => {
    if (!places.length || !mapRef.current) return;
    const lons = places.map(p => p.longitude), lats = places.map(p => p.latitude);
    mapRef.current.fitBounds([[Math.min(...lons),Math.min(...lats)],[Math.max(...lons),Math.max(...lats)]], { padding: 64, maxZoom: 14, duration: 0 });
  };
  const fitInitialTrip = useEffectEvent(fitTrip);
  useEffect(() => {
    if (!snapshotReady || status !== "ready" || initialCamera.current) return;
    initialCamera.current = true; fitInitialTrip();
    // Fit only the initial authorized snapshot; peer changes never drive this camera.
  }, [snapshotReady, status]);

  useEffect(() => {
    let disposed = false;
    initialCamera.current = false;
    let instance: MapInstance | undefined;
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const disposeMap = () => {
      clearTimeout(timer);
      observer?.disconnect();
      mapRef.current = null;
      const current = instance;
      instance = undefined;
      current?.remove();
    };
    const fail = () => {
      if (disposed) return;
      setStatus("failed");
      // Never log SDK errors: they can include credential-bearing request URLs.
      // Tear down on failure; no provider retry loop in the background.
      queueMicrotask(() => { if (!disposed) disposeMap(); });
    };
    void (async () => {
      const provider = getBrowserMapProvider();
      if (!provider) { if (!disposed) setStatus("unavailable"); return; }
      try {
        const { Map, NavigationControl, setWorkerUrl, getVersion } = await import("maplibre-gl");
        if (disposed || !container.current) return;
        setWorkerUrl(`/maplibre/${getVersion()}/maplibre-gl-worker.mjs`);
        instance = new Map({
          container: container.current,
          style: provider.styleUrl,
          center: SINGAPORE_CENTER,
          zoom: 11,
          minZoom: 9,
          maxZoom: 18,
          renderWorldCopies: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          cooperativeGestures: true,
          maxTileCacheSize: 80,
          refreshExpiredTiles: false,
          fadeDuration: 0,
          // The selected style supplies all provider/source credits. Keep them
          // expanded; do not duplicate its credit line with customAttribution.
          attributionControl: { compact: false },
        });
        mapRef.current = instance;
        instance.on("click", event => { if (!(event.originalEvent.target as Element)?.closest("button")) clicked(event.lngLat.lat, event.lngLat.lng); });
        instance.on("error", fail);
        instance.on("webglcontextlost", fail);
        instance.once("load", () => {
          if (disposed || !instance) return;
          clearTimeout(timer);
          const tokens = getComputedStyle(container.current!);
          for (const layer of instance.getStyle().layers) {
            if (layer.type !== "symbol" || !layer.layout?.["text-field"]) continue;
            instance.setPaintProperty(layer.id, "text-color", tokens.getPropertyValue("--text-secondary").trim());
            instance.setPaintProperty(layer.id, "text-halo-color", tokens.getPropertyValue("--shell-plane").trim());
          }
          setStatus("ready");
        });
        instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
        instance.getCanvas().setAttribute("aria-label", "Singapore planning map. Arrow keys pan; plus and minus zoom. No live location is shared.");
        observer = new ResizeObserver(() => instance?.resize());
        observer.observe(container.current);
        timer = setTimeout(fail, 20000);
      } catch { fail(); }
    })();
    return () => { disposed = true; disposeMap(); };
  }, [attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    let disposed = false;
    const markers: Marker[] = [];
    void import("maplibre-gl").then(({ Marker }) => {
      if (disposed) return;
      const activeColor = routes.find(r => !r.ghost)?.color ?? "gold";
      const activeIds = new Set(places.map(p => p.id));
      routes.filter(r => r.ghost).forEach(route => route.places.forEach((place,index) => {
        if (activeIds.has(place.id)) return;
        const button = document.createElement("button"); button.type = "button";
        button.className = `${styles.pin} ${styles.ghostPin}`; button.dataset.routeColor = route.color;
        button.textContent = String(index+1); button.setAttribute("aria-label", `Ghost ${route.name}, place ${index+1}: ${place.title}. Make route active`);
        button.addEventListener("click", e => { e.stopPropagation(); selectedGhost(route.id, place.id); });
        markers.push(new Marker({ element: button, anchor: "center" }).setLngLat([place.longitude,place.latitude]).addTo(map));
      }));
      places.forEach((place, index) => {
        const button = document.createElement("button"); button.type = "button";
        button.className = `${styles.pin} ${place.id === selectedId ? styles.selectedPin : ""}`;
        button.dataset.routeColor = activeColor;
        button.textContent = String(index + 1);
        button.setAttribute("aria-label", `Select place ${index + 1}: ${place.title}`);
        button.setAttribute("aria-pressed", String(place.id === selectedId));
        button.addEventListener("click", event => { event.stopPropagation(); selected(place.id); });
        markers.push(new Marker({ element: button, anchor: "center" }).setLngLat([place.longitude, place.latitude]).addTo(map));
      });
      if (candidate) {
        const element = document.createElement("span"); element.className = `${styles.pin} ${styles.candidatePin}`;
        element.textContent = "+"; element.setAttribute("aria-label", "Unsaved preview pin");
        markers.push(new Marker({ element, anchor: "center" }).setLngLat([candidate.longitude, candidate.latitude]).addTo(map));
      }
    });
    return () => { disposed = true; markers.forEach(marker => marker.remove()); };
  }, [status, places, routes, candidate, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !container.current) return;
    const tokens = getComputedStyle(container.current);
    const data: GeoJSON.FeatureCollection<GeoJSON.LineString> = { type: "FeatureCollection", features: routes.flatMap(route => {
      const stops = route.places.filter(p => p.isStop);
      return stops.length < 2 ? [] : [{ type: "Feature" as const, properties: { name: route.name, ghost: route.ghost, color: tokens.getPropertyValue(`--trip-${route.color}`).trim() }, geometry: { type: "LineString" as const, coordinates: stops.map(p => [p.longitude,p.latitude]) } }];
    }) };
    const source = map.getSource("tosker-planning") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      map.addSource("tosker-planning", { type: "geojson", data });
      map.addLayer({ id: "tosker-planning-ghost", type: "line", source: "tosker-planning", filter: ["==",["get","ghost"],true], paint: { "line-color": ["get","color"], "line-width": 3, "line-opacity": .6, "line-dasharray": [2,3] } });
      map.addLayer({ id: "tosker-planning-active", type: "line", source: "tosker-planning", filter: ["==",["get","ghost"],false], paint: { "line-color": ["get","color"], "line-width": 3, "line-opacity": .9 } });
    }
  }, [status, routes]);

  useEffect(() => {
    if (status !== "ready") return;
    const point = candidate ?? places.find(place => place.id === selectedId);
    if (point) mapRef.current?.jumpTo({ center: [point.longitude, point.latitude], zoom: Math.max(14, mapRef.current.getZoom()) });
    // Camera reacts only to this viewer's selection, never a peer's snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, selectedId, status]);
  useEffect(() => { const canvas = mapRef.current?.getCanvas(); if (canvas) canvas.style.cursor = pinMode ? "crosshair" : ""; }, [pinMode, status]);

  return <div className={styles.canvasRegion} data-map-state={status}>
    <div ref={container} className={styles.canvas} />
    {status === "ready" && <div className={styles.cameraControls}><button type="button" className={styles.resetMap} onClick={() => mapRef.current?.jumpTo({ center: SINGAPORE_CENTER, zoom: 11, bearing: 0, pitch: 0 })}><RotateCcw size={16} aria-hidden="true" />Singapore</button>{places.length > 0 && <button type="button" className={styles.resetMap} onClick={fitTrip}>Fit trip</button>}</div>}
    <p className={styles.mapStatus} role="status">{status === "ready" ? "Map ready. No live location is shared." : status === "loading" ? "Loading Singapore map…" : ""}</p>
    {status !== "ready" && <div className={styles.emptyMap}>
      <MapIcon size={36} strokeWidth={1.25} aria-hidden="true" />
      <h1>{status === "loading" ? "Finding our bearings." : "Map unavailable"}</h1>
      <p>{status === "loading" ? "Loading the Singapore basemap." : status === "unavailable" ? "Map access has not been configured for this environment." : "The map could not load. Check your connection and try again. Nothing has been saved or changed."}</p>
      {status === "failed" && (attempt < 2 ? <button type="button" className={styles.retryMap} onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Try loading map again</button> : <p>Retries paused. Return later when your connection or map access is restored.</p>)}
    </div>}
  </div>;
}
