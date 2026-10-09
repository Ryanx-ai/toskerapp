"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import type { Map as MapInstance } from "maplibre-gl";
import { prepareRouteTrace } from "@/lib/maps/route-trace";
import type { RoadGeometry, RoadMode, RoadPoint } from "@/lib/maps/road-contract";
import styles from "./room-map-workspace.module.css";

export function TripRouteReplay({ map, road, points, mode, routeId, hiddenIds }: { map: MapInstance | null; road?: RoadGeometry; points: RoadPoint[]; mode: RoadMode; routeId?: string; hiddenIds: string[] }) {
  const frame = useRef(0), stop = useRef<() => void>(() => {});
  const clearOverlay = useRef<() => void>(() => {});
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
    const clear = () => {
      cancelAnimationFrame(frame.current);
      clearOverlay.current(); clearOverlay.current = () => {};
    };
    stop.current = () => { clear(); setPlaying(false); };
    const hidden = () => { if (document.hidden) stop.current(); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clear(); document.removeEventListener("visibilitychange", hidden);
    };
  }, [map]);
  useEffect(() => { stop.current(); }, [fingerprint, road]);
  return <button type="button" className={styles.resetMap} disabled={!map || !trace || reduced} aria-label={playing ? "Stop route replay" : "Replay route direction"} title={reduced ? "Reduced motion · follow numbered stops from start to end" : trace ? "Replay route direction · no new lookup" : "Choose Walk or Drive for road replay"} onClick={() => {
    if (playing) { stop.current(); return; }
    if (!map || !trace || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stop.current();
    // A transient projected overlay avoids forcing a full WebGL basemap render
    // for each tracer frame. MapLibre still owns projection, camera and roads.
    // Each path is one exact provider leg: never join a provider gap.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add(styles.routeReplay); svg.setAttribute("aria-hidden", "true"); svg.dataset.routeReplay = "true";
    const paths = trace.legs.map(() => {
      const path = document.createElementNS(svg.namespaceURI, "path") as SVGPathElement;
      path.setAttribute("pathLength", "1"); path.style.strokeDasharray = "1"; path.style.strokeDashoffset = "1";
      svg.append(path); return path;
    });
    map.getCanvas().after(svg); // Above the basemap, below existing and future numbered markers.
    let projectionDirty = true;
    const invalidateProjection = () => { projectionDirty = true; };
    map.on("move", invalidateProjection); map.on("resize", invalidateProjection);
    clearOverlay.current = () => { map.off("move", invalidateProjection); map.off("resize", invalidateProjection); svg.remove(); };
    setPlaying(true);
    const started = performance.now(), previous = trace.legs.map(() => 0); let last = -Infinity;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 4000);
      if (now - last >= 32) {
        if (projectionDirty) {
          const container = map.getContainer(); svg.setAttribute("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`);
          trace.legs.forEach((leg,index) => paths[index].setAttribute("d", leg.coordinates.map((coordinate,i) => {
            const point = map.project([coordinate[0],coordinate[1]]); return `${i ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
          }).join(" ")));
          projectionDirty = false;
        }
        trace.legs.forEach((leg,index) => {
          const local = Math.min(1,Math.max(0,(progress*trace.length-leg.start)/leg.length));
          if (local === previous[index]) return;
          paths[index].style.strokeDashoffset = String(1-local);
          previous[index] = local;
        });
        last = now;
      }
      if (progress >= 1) { stop.current(); return; }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }}>{playing ? <Square size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</button>;
}
