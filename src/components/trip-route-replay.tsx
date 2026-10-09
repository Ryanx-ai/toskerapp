"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import type { Map as MapInstance, GeoJSONSource } from "maplibre-gl";
import { prepareRouteTrace, traceAt } from "@/lib/maps/route-trace";
import type { RoadGeometry, RoadMode, RoadPoint } from "@/lib/maps/road-contract";
import styles from "./room-map-workspace.module.css";

const sourceId = "tosker-route-replay";
const empty: GeoJSON.FeatureCollection<GeoJSON.MultiLineString> = { type: "FeatureCollection", features: [] };
export function TripRouteReplay({ map, road, points, mode, routeId, hiddenIds }: { map: MapInstance | null; road?: RoadGeometry; points: RoadPoint[]; mode: RoadMode; routeId?: string; hiddenIds: string[] }) {
  const frame = useRef(0), stop = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false), [reduced, setReduced] = useState(false);
  const trace = prepareRouteTrace(road, points, mode, hiddenIds);
  const fingerprint = JSON.stringify([routeId, road?.key, mode, points.map(p => [p.id, p.latitude, p.longitude]), hiddenIds]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => { setReduced(media.matches); if (media.matches) stop.current(); };
    changed(); media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!map) return;
    map.addSource(sourceId, { type: "geojson", data: empty });
    map.addLayer({ id: sourceId, type: "line", source: sourceId, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": getComputedStyle(map.getContainer()).getPropertyValue("--text-primary").trim() || "#F4EFE6", "line-width": 5, "line-opacity": .85 } });
    stop.current = () => { cancelAnimationFrame(frame.current); (map.getSource(sourceId) as GeoJSONSource | undefined)?.setData(empty); setPlaying(false); };
    const hidden = () => { if (document.hidden) stop.current(); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(frame.current); document.removeEventListener("visibilitychange", hidden);
      if (map.getLayer(sourceId)) map.removeLayer(sourceId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map]);
  useEffect(() => { stop.current(); }, [fingerprint, road]);
  return <button type="button" className={styles.resetMap} disabled={!map || !trace || reduced} aria-label={playing ? "Stop route replay" : "Replay route direction"} title={reduced ? "Reduced motion · follow numbered stops from start to end" : trace ? "Replay route direction · no new lookup" : "Choose Walk or Drive for road replay"} onClick={() => {
    if (playing) { stop.current(); return; }
    if (!map || !trace || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPlaying(true);
    const started = performance.now(); let last = -Infinity;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 4000);
      if (now - last >= 32) {
        const coordinates = traceAt(trace, progress);
        (map.getSource(sourceId) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: coordinates.length ? [{ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates } }] : [] });
        last = now;
      }
      if (progress >= 1) { stop.current(); return; }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }}>{playing ? <Square size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</button>;
}
