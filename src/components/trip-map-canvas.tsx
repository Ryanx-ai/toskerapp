"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, RotateCcw } from "lucide-react";
import type { Map as MapInstance } from "maplibre-gl";
import { getBrowserMapProvider, SINGAPORE_CENTER } from "@/lib/maps/browser-provider";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./room-map-workspace.module.css";

type Status = "loading" | "ready" | "unavailable" | "failed";

export default function TripMapCanvas() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
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

  return <div className={styles.canvasRegion} data-map-state={status}>
    <div ref={container} className={styles.canvas} />
    {status === "ready" && <button type="button" className={styles.resetMap} onClick={() => mapRef.current?.jumpTo({ center: SINGAPORE_CENTER, zoom: 11, bearing: 0, pitch: 0 })}><RotateCcw size={16} aria-hidden="true" />Singapore</button>}
    <p className={styles.mapStatus} role="status">{status === "ready" ? "Map ready. No live location is shared." : status === "loading" ? "Loading Singapore map…" : ""}</p>
    {status !== "ready" && <div className={styles.emptyMap}>
      <MapIcon size={36} strokeWidth={1.25} aria-hidden="true" />
      <h1>{status === "loading" ? "Finding our bearings." : "Map unavailable"}</h1>
      <p>{status === "loading" ? "Loading the Singapore basemap." : status === "unavailable" ? "Map access has not been configured for this environment." : "The map could not load. Check your connection and try again. Nothing has been saved or changed."}</p>
      {status === "failed" && (attempt < 2 ? <button type="button" className={styles.retryMap} onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Try loading map again</button> : <p>Retries paused. Return later when your connection or map access is restored.</p>)}
    </div>}
  </div>;
}
