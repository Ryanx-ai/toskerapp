"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CircleDot, Heart, Radio } from "lucide-react";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import { MAP_PING_CLEAR } from "@/lib/maps/ping-contract";
import { CONVERSATION_ACCESS_LOST } from "@/lib/realtime-contract";
import type { LocalMapLocation } from "./use-local-map-location";
import styles from "./room-map-workspace.module.css";

const choices = [
  { kind: "heart", symbol: "♥", label: "Heart" },
  { kind: "attention", symbol: "!", label: "Attention" },
  { kind: "question", symbol: "?", label: "Question" },
  { kind: "pulse", symbol: "◉", label: "Here / Pulse" },
] as const;
type Kind = typeof choices[number]["kind"];
const lifetime = 4000;

/** Local-only by construction: Locate/provider consent is NOT peer-sharing consent.
 * No fetch, realtime publish, persistent storage or provider operation belongs here. */
export function TripLocalPing({ map, location, enabled }: { map: MapInstance | null; location: LocalMapLocation | null; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [ping, setPing] = useState<{ kind: Kind; at: number; location: LocalMapLocation } | null>(null);
  const control = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const optionsId = useId();
  const available = enabled && !!map && !!location;
  const active = available && ping?.location === location ? ping : null;
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!control.current?.contains(event.target as Node)) setOpen(false); };
    const clear = () => { setOpen(false); setPing(null); };
    document.addEventListener("pointerdown", close);
    window.addEventListener("offline", clear);
    window.addEventListener(MAP_PING_CLEAR, clear);
    window.addEventListener(CONVERSATION_ACCESS_LOST, clear);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("offline", clear);
      window.removeEventListener(MAP_PING_CLEAR, clear);
      window.removeEventListener(CONVERSATION_ACCESS_LOST, clear);
    };
  }, []);
  useEffect(() => {
    if (!available) queueMicrotask(() => { setOpen(false); setPing(null); });
  }, [available]);
  useEffect(() => {
    if (!map || !active) return;
    let disposed = false, marker: Marker | undefined;
    const timer = setTimeout(() => setPing(previous => previous === active ? null : previous), Math.max(0, active.at + lifetime - Date.now()));
    void import("maplibre-gl").then(({ Marker }) => {
      if (disposed || Date.now() >= active.at + lifetime) return;
      const choice = choices.find(choice => choice.kind === active.kind)!;
      const element = document.createElement("span"), icon = document.createElement("span");
      element.className = styles.localPingMarker;
      element.setAttribute("role", "img");
      element.setAttribute("aria-label", `${choice.label} above your location. Only you can see this ping.`);
      icon.className = styles.localPingIcon;
      icon.dataset.kind = active.kind;
      icon.textContent = choice.symbol;
      element.append(icon);
      marker = new Marker({ element, anchor: "bottom", offset: [0, -30] }).setLngLat([active.location.longitude, active.location.latitude]).addTo(map);
    });
    return () => { disposed = true; clearTimeout(timer); marker?.remove(); };
  }, [map, active]);
  return <div ref={control} className={styles.localPingControl} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    {open && available && <div id={optionsId} className={styles.localPingOptions} role="group" aria-label="Private location ping choices">
      {choices.map(choice => <button key={choice.kind} type="button" className={styles.resetMap} aria-label={`${choice.label} ping · only you`} title={`${choice.label} · only you`} onClick={() => {
        if (!location) return;
        setPing({ kind: choice.kind, at: Date.now(), location }); setOpen(false); trigger.current?.focus();
      }}>{choice.kind === "heart" ? <Heart size={19} aria-hidden="true" /> : choice.kind === "pulse" ? <CircleDot size={19} aria-hidden="true" /> : <span aria-hidden="true">{choice.symbol}</span>}</button>)}
    </div>}
    <button ref={trigger} type="button" className={styles.resetMap} disabled={!available} aria-label="Ping your location" aria-expanded={open && available} aria-controls={open && available ? optionsId : undefined} title={available ? "Ping your location · only you" : "Turn Locate on to ping your location"} onClick={() => setOpen(value => !value)}><Radio size={19} aria-hidden="true" /></button>
    <span className={styles.srOnly} role="status">{active ? `${choices.find(choice => choice.kind === active.kind)!.label} ping. Only you can see it; disappears after four seconds.` : ""}</span>
  </div>;
}
