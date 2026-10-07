"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { Map as MapIcon, RotateCcw, Maximize } from "lucide-react";
import type { Map as MapInstance, Marker, GeoJSONSource } from "maplibre-gl";
import type { PlaceCandidate, TripPlace, TripRoute } from "@/lib/trip-contract";
import { routeBounds, roadDistance, roadDuration, type RoadGeometry, type RoadMode } from "@/lib/maps/road-contract";
import { routeLegPresentation } from "@/lib/maps/route-presentation";
import { getBrowserMapProvider, SINGAPORE_CENTER } from "@/lib/maps/browser-provider";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./room-map-workspace.module.css";
import type { LocalMapLocation } from "./use-local-map-location";
import { pinState, type MapPin } from "@/lib/map-pin-contract";
import { PLACE_SYMBOL_PATHS } from "@/lib/maps/place-symbols";
import { roadKey } from "@/lib/maps/road-contract";
import { PRIVATE_ORIGIN_ID } from "@/lib/maps/private-origin";
import { TripLegTags } from "./trip-leg-tags";
import { TripMapPings } from "./trip-map-pings";
import { PING_KINDS, type MapPing as EphemeralPing, type PingKind } from "@/lib/maps/ping-contract";

type Status = "loading" | "ready" | "unavailable" | "failed";
type PlanningRoute = TripRoute & { ghost: boolean; places: (TripPlace & { isStop: boolean })[] };

export default function TripMapCanvas({ pings, pingKind, onPing, inspector, viewerAvatarUrl, mapPins, selectedPinId, onSelectPin, places, canMove, onMove, estimate, privateRoad, roadFit = 0, hiddenIds, activeVisible, routes, roads, roadMode, roadEnabled, localLocation, onDeselect, snapshotReady, candidate, selectedId, onSelect, onSelectGhost, pinMode, onPin }: { pings:EphemeralPing[];pingKind:PingKind|null;onPing(latitude:number,longitude:number):void;inspector?: ReactNode; viewerAvatarUrl?: string | null; mapPins:MapPin[];selectedPinId:string|null;onSelectPin(id:string):void;places: TripPlace[]; canMove:boolean; onMove(id:string,latitude:number,longitude:number):void; estimate?:RoadGeometry; privateRoad?:RoadGeometry; roadFit?: number; hiddenIds: string[]; activeVisible: boolean; routes: PlanningRoute[]; roads: Record<string,RoadGeometry>; roadMode: RoadMode; roadEnabled: boolean; localLocation: LocalMapLocation | null; onDeselect(): void; snapshotReady: boolean; candidate: PlaceCandidate | null; selectedId: string | null; onSelect(id: string): void; onSelectGhost(routeId: string, id: string): void; pinMode: boolean; onPin(latitude: number, longitude: number): void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [readyMap,setReadyMap]=useState<MapInstance|null>(null);
  const initialCamera = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const pointMarkers = useRef(new Map<string, { marker: Marker; place: TripPlace; routeId: string; ghost: boolean }>());
  const inspectorPoint = candidate ?? places.find(place => place.id === selectedId);
  const inspectorKey = inspector ? (candidate ? `preview:${candidate.latitude}:${candidate.longitude}` : selectedId) : null;
  const activeRoute = routes.find(route => !route.ghost);
  const eligiblePlaces = places.filter(place => !place.skipped);
  const firstStop = activeVisible ? eligiblePlaces[0] : undefined;
  const originTarget = firstStop && !hiddenIds.includes(firstStop.id) ? firstStop : undefined;
  const originPoints = localLocation && firstStop ? [{id:PRIVATE_ORIGIN_ID,...localLocation},firstStop] : [];
  const currentPrivateRoad=roadEnabled&&originTarget&&privateRoad?.key===roadKey(originPoints,roadMode)?privateRoad:undefined;
  const moved=useEffectEvent(onMove);
  const selected = useEffectEvent((id: string) => onSelect(id));
  const selectedMemory = useEffectEvent((id:string)=>onSelectPin(id));
  const selectedGhost = useEffectEvent((routeId: string, id: string) => onSelectGhost(routeId, id));
  const clicked = useEffectEvent((latitude: number, longitude: number) => { if(pingKind&&localLocation)onPing(latitude,longitude);else if (pinMode) onPin(latitude, longitude); else onDeselect(); });
  const fitTrip = () => {
    if ((!places.length && !mapPins.length) || !mapRef.current) return;
    const active=routes.find(r=>!r.ghost),road=active?roads[active.id]:undefined;
    const extras=[...mapPins,...(currentPrivateRoad?currentPrivateRoad.segments.flat().map(p=>({latitude:p[1],longitude:p[0]})):[])];
    const bounds=routeBounds(places.filter(p=>!p.skipped),roadEnabled&&road?.mode===roadMode?road:undefined,extras);
    const side=Math.min(64,Math.max(32,(container.current?.clientWidth??320)/8));
    if(bounds)mapRef.current.fitBounds(bounds, { padding:{top:64,left:side,right:side,bottom:Math.min(120,(container.current?.clientHeight??300)*.4)}, maxZoom: 14, duration: 0 });
  };
  const fitInitialTrip = useEffectEvent(fitTrip);
  useEffect(() => { if(roadFit && status==="ready")fitInitialTrip(); }, [roadFit,status]);
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
      pointMarkers.current.forEach(entry => entry.marker.remove());
      pointMarkers.current.clear();
      const current = instance;
      instance = undefined;
      current?.remove();
    };
    const fail = () => {
      if (disposed) return;
      setStatus("failed");
      setReadyMap(null);
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
        instance.on("click", event => { if (!(event.originalEvent.target as Element)?.closest("button, [data-map-inspector]")) clicked(event.lngLat.lat, event.lngLat.lng); });
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
          setReadyMap(instance);
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
    let previewMarker: Marker | undefined;
    void import("maplibre-gl").then(({ Marker }) => {
      if (disposed) return;
      const activeColor = routes.find(r => !r.ghost)?.color ?? "gold";
      const activeIds = new Set(activeVisible ? places.map(p => p.id) : []);
      const wanted = new Set<string>();
      const reconcileMarker = (place: TripPlace, index: number, routeId: string, color: string, ghost: boolean, routeName: string) => {
        if (hiddenIds.includes(place.id)) return;
        const key = `${routeId}:${place.id}`; wanted.add(key);
        let entry = pointMarkers.current.get(key);
        if (!entry) {
          const button = document.createElement("button"); button.type = "button";
          const marker = new Marker({ element: button, anchor: "center" }).setLngLat([place.longitude, place.latitude]).addTo(map);
          entry = { marker, place, routeId, ghost };
          pointMarkers.current.set(key, entry);
          button.addEventListener("click", event => { event.stopPropagation(); const current = pointMarkers.current.get(key); if (current?.ghost) selectedGhost(current.routeId, current.place.id); else if (current) selected(current.place.id); });
          marker.on("dragend", () => { const current = pointMarkers.current.get(key); if (!current) return; const point = marker.getLngLat(); marker.setLngLat([current.place.longitude, current.place.latitude]); moved(current.place.id, point.lat, point.lng); });
        }
        entry.place = place; entry.ghost = ghost;
        const button = entry.marker.getElement();
        // Keep the renderer's positioning classes when refreshing application state.
        button.classList.add("maplibregl-marker", "maplibregl-marker-anchor-center", styles.pin);
        for (const [name, enabled] of [[styles.ghostPin, ghost], [styles.selectedPin, place.id === selectedId], [styles.starredPin, !!place.starred], [styles.checkpointPin, place.source === "pin"], [styles.skippedPin, !!place.skipped]] as const) button.classList.toggle(name, enabled);
        button.dataset.routeColor = color;
        button.replaceChildren();
        const icon = place.icon ?? "destination";
        if (icon !== "destination") {
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          for (const [name, value] of Object.entries({ viewBox: "0 0 24 24", width: "19", height: "19", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) svg.setAttribute(name, value);
          PLACE_SYMBOL_PATHS[icon].forEach(d => { const path = document.createElementNS(svg.namespaceURI, "path"); path.setAttribute("d", d); svg.append(path); });
          button.append(svg);
        }
        const ordinal = document.createElement("span"); ordinal.textContent = String(index + 1); ordinal.className = icon === "destination" ? "" : styles.markerOrdinal; button.append(ordinal);
        button.setAttribute("aria-label", `${ghost ? `Ghost ${routeName}, ` : "Select "}${place.skipped ? "skipped " : ""}${place.starred ? "starred " : ""}${icon} ${index + 1}: ${place.title}${ghost ? ". Make route active" : ""}`);
        button.setAttribute("aria-pressed", String(place.id === selectedId));
        entry.marker.setDraggable(!ghost && canMove && !pinMode && !pingKind && place.source === "pin" && !place.providerId);
        entry.marker.setLngLat([place.longitude, place.latitude]);
      };
      routes.filter(r => r.ghost).forEach(route => route.places.forEach((place, index) => { if (!activeIds.has(place.id)) reconcileMarker(place, index, route.id, route.color, true, route.name); }));
      const active = routes.find(r => !r.ghost);
      if (activeVisible) places.forEach((place, index) => reconcileMarker(place, index, active?.id ?? "active", activeColor, false, active?.name ?? ""));
      for (const [key, entry] of pointMarkers.current) if (!wanted.has(key)) { entry.marker.remove(); pointMarkers.current.delete(key); }
      if (candidate) {
        const element = document.createElement("span"); element.className = `${styles.pin} ${styles.candidatePin}`;
        element.textContent = "+"; element.setAttribute("aria-label", "Unsaved preview pin");
        previewMarker = new Marker({ element, anchor: "center" }).setLngLat([candidate.longitude, candidate.latitude]).addTo(map);
      }
    });
    return () => { disposed = true; previewMarker?.remove(); };
  }, [status, places, routes, candidate, selectedId, hiddenIds, activeVisible, canMove, pinMode, pingKind]);

  useEffect(()=>{
    const map=mapRef.current;if(status!=="ready"||!map)return;
    let disposed=false;const markers:Marker[]=[];
    void import("maplibre-gl").then(({Marker})=>{
      if(disposed)return;
      for(const pin of mapPins){
        const button=document.createElement("button"),state=pinState(pin.state);button.type="button";
        button.className=`${styles.memoryMarker} ${pin.id===selectedPinId?styles.selectedPin:""}`;
        button.textContent=state.icon;button.setAttribute("aria-label",`${state.label} Map Pin: ${pin.title}`);button.setAttribute("aria-pressed",String(pin.id===selectedPinId));
        button.addEventListener("click",event=>{event.stopPropagation();selectedMemory(pin.id);});
        // Above/right of a co-located numbered Route marker so both remain selectable.
        markers.push(new Marker({element:button,anchor:"bottom-left",offset:[16,-16]}).setLngLat([pin.longitude,pin.latitude]).addTo(map));
      }
    });
    return()=>{disposed=true;markers.forEach(m=>m.remove());};
  },[mapPins,selectedPinId,status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !container.current) return;
    const tokens = getComputedStyle(container.current);
    const data: GeoJSON.FeatureCollection<GeoJSON.LineString> = { type: "FeatureCollection", features: routes.flatMap(route => {
      // Shared Skip removes waypoints; private Eye only suppresses this viewer's visual segments.
      const eligible=route.places.filter(p=>!p.skipped);
      return eligible.slice(1).flatMap((place,index) => {
        const previous = eligible[index];
        const leg = routeLegPresentation(eligible,index,selectedId,route.ghost,roadEnabled,roadMode,roads[route.id]);
        return !leg || hiddenIds.includes(place.id) || hiddenIds.includes(previous.id) ? [] : [{ type: "Feature" as const, properties: { name: route.name, ghost: route.ghost, opacity: leg.opacity, width: leg.width, color: tokens.getPropertyValue(`--trip-${route.color}`).trim() }, geometry: { type: "LineString" as const, coordinates: leg.coordinates } }];
      });
    }) };
    const source = map.getSource("tosker-planning") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      map.addSource("tosker-planning", { type: "geojson", data });
      map.addLayer({ id: "tosker-planning-ghost", type: "line", source: "tosker-planning", filter: ["==",["get","ghost"],true], paint: { "line-color": ["get","color"], "line-width": 2, "line-dasharray": [3,2], "line-opacity": ["get","opacity"] } });
      map.addLayer({ id: "tosker-planning-active", type: "line", source: "tosker-planning", filter: ["==",["get","ghost"],false], paint: { "line-color": ["get","color"], "line-width": ["get","width"], "line-opacity": ["get","opacity"] } });
    }
  }, [status, routes, hiddenIds, roads, roadMode, roadEnabled, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !localLocation) return;
    let disposed = false, marker: Marker | undefined;
    void import("maplibre-gl").then(({ Marker }) => {
      if (disposed) return;
      const element = document.createElement("span"); element.className = styles.localLocation;
      element.setAttribute("role", "img"); element.setAttribute("aria-label", `You, accuracy about ${Math.round(localLocation.accuracy)} metres. Visible only to you.`);
      if (viewerAvatarUrl) { const avatar = document.createElement("img"); avatar.src = viewerAvatarUrl; avatar.alt = ""; avatar.referrerPolicy = "no-referrer"; element.append(avatar); }
      const label = document.createElement("span"); label.textContent = "You"; element.append(label);
      marker = new Marker({ element }).setLngLat([localLocation.longitude, localLocation.latitude]).addTo(map);
      map.jumpTo({ center: [localLocation.longitude, localLocation.latitude], zoom: 14 });
    });
    return () => { disposed = true; marker?.remove(); };
  }, [localLocation, viewerAvatarUrl, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !container.current) return;
    const data: GeoJSON.FeatureCollection<GeoJSON.LineString> = { type: "FeatureCollection", features: localLocation && originTarget ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: currentPrivateRoad?.segments[0] ?? [[localLocation.longitude, localLocation.latitude], [originTarget.longitude, originTarget.latitude]] } }] : [] };
    const source = map.getSource("tosker-local-origin") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      map.addSource("tosker-local-origin", { type: "geojson", data });
      map.addLayer({ id: "tosker-local-origin", type: "line", source: "tosker-local-origin", paint: { "line-color": getComputedStyle(container.current).getPropertyValue("--text-secondary").trim(), "line-width": 2, "line-opacity": .7, "line-dasharray": [1, 3] } });
    }
    map.setPaintProperty("tosker-local-origin","line-dasharray",currentPrivateRoad?[4,2]:[1,3]);
    // Separate private source. Never part of shared geometry/order/totals or realtime.
  }, [localLocation, originTarget, currentPrivateRoad, status]);

  useEffect(() => {
    if (status !== "ready") return;
    const point = candidate ?? places.find(place => place.id === selectedId);
    if (point && mapRef.current) mapRef.current.easeTo({ center: [point.longitude, point.latitude], offset: [(container.current?.clientWidth ?? 320) >= 560 ? -140 : 0, 0], zoom: Math.max(14, mapRef.current.getZoom()), duration: 0 });
    // Camera reacts only to this viewer's selection, never a peer's snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, selectedId, status]);
  useEffect(() => { const canvas = mapRef.current?.getCanvas(); if (canvas) canvas.style.cursor = pinMode||pingKind ? "crosshair" : ""; }, [pinMode, pingKind, status]);

  useEffect(() => {
    const element = inspectorRef.current;
    if (!inspectorKey || !element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const registry = pointMarkers.current;
    element.focus({ preventScroll: true });
    return () => {
      if (!element.contains(document.activeElement) && document.activeElement !== document.body) return;
      // A mobile Card opener is hidden after switching to Map. Return to its
      // stable marker (or canvas for a new preview), never a hidden control.
      const marker = [...registry.values()].find(entry => entry.place.id === inspectorKey)?.marker.getElement();
      const target = previous?.isConnected && previous.checkVisibility() ? previous : marker ?? mapRef.current?.getCanvas();
      target?.focus({ preventScroll: true });
    };
  }, [inspectorKey]);
  useEffect(() => {
    const map = mapRef.current, element = inspectorRef.current;
    if (!element || !inspectorPoint) return;
    const position = () => {
      const canvas = container.current; if (!canvas) return;
      const region=canvas.getBoundingClientRect();
      const visibleTop=Math.max(8,8-region.top),visibleBottom=Math.min(canvas.clientHeight-32,window.innerHeight-region.top-8);
      element.style.maxHeight=`${Math.max(80,visibleBottom-visibleTop)}px`;
      const point = map && status === "ready" ? map.project([inspectorPoint.longitude, inspectorPoint.latitude]) : { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
      const width = element.offsetWidth, height = element.offsetHeight;
      const side = point.x + width + 36 <= canvas.clientWidth ? point.x + 28 : point.x - width - 28 >= 8 ? point.x - width - 28 : point.x - width / 2;
      const x = Math.max(8, Math.min(canvas.clientWidth - width - 8, side));
      const y = Math.max(visibleTop, Math.min(visibleBottom-height, point.y - height / 2));
      element.style.left = `${x}px`; element.style.top = `${y}px`;
    };
    position(); const observer = new ResizeObserver(position); observer.observe(element);
    map?.on("move", position); map?.on("resize", position);
    window.addEventListener("scroll",position,true);window.addEventListener("resize",position);
    return () => { observer.disconnect(); map?.off("move", position); map?.off("resize", position);window.removeEventListener("scroll",position,true);window.removeEventListener("resize",position); };
  }, [inspectorPoint, inspectorKey, status]);

  return <div className={styles.canvasRegion} data-map-state={status}>
    <div ref={container} className={styles.canvas} />
    {status==="ready"&&<TripMapPings map={readyMap} pings={pings}/>}
    {status==="ready"&&pingKind&&localLocation&&<div className={styles.pingPlacement}><span>{PING_KINDS[pingKind].symbol} Click the Map, or pan with arrow keys and</span><button type="button" className={styles.control} onClick={()=>{const center=mapRef.current?.getCenter();if(center)onPing(center.lat,center.lng);}}>Ping map centre</button></div>}
    {inspector && <div key={inspectorKey} ref={inspectorRef} data-map-inspector className={styles.mapInspector} tabIndex={-1} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onDeselect(); } }}>{inspector}</div>}
    {status === "ready" && activeVisible && activeRoute && <details className={styles.routeSummary} aria-label="Route summary"><summary><strong>{activeRoute.name}</strong><span>{eligiblePlaces.length} {eligiblePlaces.length === 1 ? "stop" : "stops"}{roadEnabled && estimate?.estimate ? ` · ${roadDistance(estimate.estimate.metres)} · ${roadDuration(estimate.estimate.seconds)}` : ""}</span></summary><div>
      {roadEnabled&&estimate?.estimate?.legs ? <ol aria-label="Route segments">{estimate.estimate.legs.map(leg => <li key={`${leg.fromId}:${leg.toId}`}><span>{places.find(p => p.id === leg.fromId)?.title} → {places.find(p => p.id === leg.toId)?.title}</span><strong>{roadDistance(leg.metres)} · {roadDuration(leg.seconds)}</strong></li>)}</ol> : <p>{roadEnabled?"Travel estimates unavailable.":"Order only · no travel estimates."}</p>}
      {currentPrivateRoad?.estimate && <p>YOUR LEG · You → {firstStop?.title} · {roadDistance(currentPrivateRoad.estimate.metres)} · {roadDuration(currentPrivateRoad.estimate.seconds)}</p>}
    </div></details>}
    {status==="ready"&&activeVisible&&activeRoute&&roadEnabled&&estimate?.key===roadKey(eligiblePlaces,roadMode)&&<TripLegTags map={readyMap} road={estimate} points={eligiblePlaces} color={activeRoute.color} selectedId={selectedId} hiddenIds={hiddenIds}/>}
    {status==="ready"&&currentPrivateRoad&&<TripLegTags map={readyMap} road={currentPrivateRoad} points={originPoints} color="sky" selectedId={selectedId} privateLeg/>}
    {localLocation && originTarget && !currentPrivateRoad && <p className={styles.srOnly} role="status">Private visual connector from You to {originTarget.title}. No distance or travel time is inferred.</p>}
    {status === "ready" && <div className={styles.cameraControls}><button type="button" className={styles.resetMap} aria-label="Reset map to Singapore" title="Singapore" onClick={() => mapRef.current?.jumpTo({ center: SINGAPORE_CENTER, zoom: 11, bearing: 0, pitch: 0 })}><RotateCcw size={16} aria-hidden="true" /></button>{(places.length > 0 || mapPins.length > 0) && <button type="button" className={styles.resetMap} aria-label={places.length?"Fit trip":"Fit Pins"} title="Fit visible places" onClick={fitTrip}><Maximize size={16} aria-hidden="true" /></button>}</div>}
    <p className={styles.mapStatus} role="status">{status === "ready" ? "Map ready. No live location is shared." : status === "loading" ? "Loading Singapore map…" : ""}</p>
    {status !== "ready" && <div className={styles.emptyMap}>
      <MapIcon size={36} strokeWidth={1.25} aria-hidden="true" />
      <h1>{status === "loading" ? "Finding our bearings." : "Map unavailable"}</h1>
      <p>{status === "loading" ? "Loading the Singapore basemap." : status === "unavailable" ? "Map access has not been configured for this environment." : "The map could not load. Check your connection and try again. Nothing has been saved or changed."}</p>
      {status === "failed" && (attempt < 2 ? <button type="button" className={styles.retryMap} onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Try loading map again</button> : <p>Retries paused. Return later when your connection or map access is restored.</p>)}
    </div>}
  </div>;
}
