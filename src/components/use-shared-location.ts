"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@clerk/nextjs";
import { CONVERSATION_ACCESS_LOST } from "@/lib/realtime-contract";
import { REALTIME_SIGNOUT } from "@/lib/live-contract";
import { LOCATION_CLEAR, LOCATION_REFRESH, LOCATION_HEALTH, LOCATION_HEALTH_REQUEST, validLocationLease, type LocationLease, type LocationPrecision, type LocationCurrentView } from "@/lib/shared-location-contract";
import { LocationView } from "@/lib/location-view";
import type { LocalMapLocation } from "./use-local-map-location";
export type SharedLocationPeer = LocationCurrentView["peers"][number];

/** Sharing intent is manual. Peer reads never sample geolocation or publish. */
export function useSharedLocation(conversationId: string, point: LocalMapLocation | null, enabled: boolean) {
  const { session } = useSession(), sessionId = session?.id;
  const [lease, setLease] = useState<LocationLease | null>(null), [peers, setPeers] = useState<SharedLocationPeer[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [stopping, setStopping] = useState(false);
  const [connected, setConnected] = useState(false);
  const owned = useRef<LocationLease | null>(null), pendingStop = useRef<LocationLease | null>(null);
  const generation = useRef(0), mounted = useRef(false), working = useRef(false), revision = useRef(0), ready = useRef(false);
  const call = useCallback(async (body: unknown, signal = AbortSignal.timeout(12000)) => {
    const token = await session?.getToken();
    if (!token || signal.aborted) throw new Error("Session unavailable.");
    const response = await fetch("/api/location-sharing", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal });
    if (!response.ok) throw new Error(response.status === 409 ? "A newer snapshot exists. Turn Locate off before sharing again." : "Sharing could not be confirmed. Stop or wait for expiry; no automatic retry.");
    return response.json();
  }, [session]);
  const retire = useCallback((value: LocationLease) => fetch("/api/location-sharing", {
    method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop", id: value.id }), signal: AbortSignal.timeout(12000),
  }).then(response => { if (!response.ok) throw new Error(); }), []);
  const stop = useCallback(async () => {
    const epoch = ++generation.current, value = owned.current ?? pendingStop.current;
    owned.current = null; pendingStop.current = value; working.current = false;
    if (mounted.current) { setStopping(!!value); setBusy(false); }
    try {
      if (value) await retire(value);
      if (epoch === generation.current) { pendingStop.current = null; if (mounted.current) { setLease(null); setError(""); } }
    } catch {
      if (mounted.current && epoch === generation.current) {
        if (value && value.expiresAt <= Date.now()) { pendingStop.current = null; setLease(null); }
        setError("Stopped on this device. Server deletion is unconfirmed. Retry Stop; expiry remains automatic. Sharing will not restart by itself.");
      }
    } finally { if (mounted.current && epoch === generation.current) setStopping(false); }
  }, [retire]);
  useEffect(() => {
    let active = true, revoked = false;
    const lifecycleGeneration = generation;
    mounted.current = true; ready.current = false;
    const view = new LocationView(conversationId, signal => call({ action: "current", conversationId }, signal), next => { if (active) setPeers(next); });
    const suspend = () => { ready.current = false; setConnected(false); view.clear(); void stop(); };
    const health = (event: Event) => {
      const value = (event as CustomEvent).detail;
      if (value?.conversationId !== conversationId) return;
      const available = enabled && !revoked && !!value.ready && !document.hidden;
      ready.current = available; setConnected(available); view.setReady(available);
      if (!available) void stop();
    };
    const refresh = (event: Event) => { if ((event as CustomEvent).detail === conversationId) view.refresh(); };
    const clear = () => suspend();
    const lost = (event: Event) => { if ((event as CustomEvent).detail === conversationId) { revoked = true; suspend(); } };
    const hidden = () => { if (document.hidden) suspend(); else window.dispatchEvent(new Event(LOCATION_HEALTH_REQUEST)); };
    const signout = () => { revoked = true; suspend(); };
    window.addEventListener(LOCATION_HEALTH, health); window.addEventListener(LOCATION_REFRESH, refresh); window.addEventListener(LOCATION_CLEAR, clear);
    window.addEventListener(CONVERSATION_ACCESS_LOST, lost); window.addEventListener(REALTIME_SIGNOUT, signout);
    window.addEventListener("pagehide", clear); document.addEventListener("visibilitychange", hidden);
    queueMicrotask(() => { if (active) { setPeers([]); setLease(null); setBusy(false); window.dispatchEvent(new Event(LOCATION_HEALTH_REQUEST)); } });
    return () => {
      active = false; mounted.current = false; ready.current = false; ++lifecycleGeneration.current; working.current = false; view.clear();
      setPeers([]); setLease(null); setBusy(false); setStopping(false); setError(""); setConnected(false);
      const value = owned.current ?? pendingStop.current; owned.current = null; pendingStop.current = null;
      if (value) void retire(value).catch(() => undefined);
      window.removeEventListener(LOCATION_HEALTH, health); window.removeEventListener(LOCATION_REFRESH, refresh); window.removeEventListener(LOCATION_CLEAR, clear);
      window.removeEventListener(CONVERSATION_ACCESS_LOST, lost); window.removeEventListener(REALTIME_SIGNOUT, signout);
      window.removeEventListener("pagehide", clear); document.removeEventListener("visibilitychange", hidden);
    };
  }, [conversationId, sessionId, enabled, call, stop, retire]);
  useEffect(() => {
    if (!lease) return;
    const timer = setTimeout(() => void stop(), Math.max(0, lease.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [lease, stop]);
  useEffect(() => { let active = true; if (!point) queueMicrotask(() => { if (active) void stop(); }); return () => { active = false; }; }, [point, stop]);
  const send = async (precision?: LocationPrecision) => {
    if (!point || !enabled || !ready.current || working.current || pendingStop.current || !mounted.current) return;
    working.current = true; setBusy(true); setError("");
    const epoch = generation.current;
    let current = owned.current;
    try {
      if (precision) {
        current = await call({ action: "begin", conversationId, precision, consent: precision === "precise" ? "precise-latest-v2" : "area-latest-v2" });
        if (!validLocationLease(current)) throw new Error("Sharing consent unavailable.");
        if (epoch !== generation.current || !mounted.current || document.hidden) { await retire(current); return; }
        owned.current = current; revision.current = 0; setLease(current);
      }
      if (!current || current.expiresAt <= Date.now()) throw new Error("Sharing expired. Turn Locate off and on to choose sharing again.");
      const result = await call({ action: "send", id: current.id, point, expectedRevision: revision.current, requestId: crypto.randomUUID() });
      if (mounted.current && epoch === generation.current) {
        if (result.id !== current.id || result.revision !== revision.current + 1) throw new Error("Snapshot could not be confirmed. Stop before sharing again.");
        revision.current = result.revision;
      }
    } catch (failure) {
      if (mounted.current && epoch === generation.current) setError(failure instanceof Error ? failure.message : "Sharing unavailable.");
    } finally { if (epoch === generation.current) { working.current = false; if (mounted.current) setBusy(false); } }
  };
  return { lease, peers, busy, stopping, error, connected, stop, start: (precision: LocationPrecision) => send(precision), refresh: () => send() };
}
