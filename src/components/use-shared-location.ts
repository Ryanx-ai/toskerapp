"use client";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useSession } from "@clerk/nextjs";
import { CONVERSATION_ACCESS_LOST } from "@/lib/realtime-contract";
import { REALTIME_SIGNOUT, type LiveParticipant } from "@/lib/live-contract";
import { LOCATION_CLEAR, LOCATION_RECEIVED, validLocationLease, validLocationSnapshot, type LocationLease, type LocationPrecision, type LocationSnapshot } from "@/lib/shared-location-contract";
import type { LocalMapLocation } from "./use-local-map-location";
export type SharedLocationPeer = { snapshot: LocationSnapshot; identity: LiveParticipant };

/** Ephemeral in-memory view. Map suspension, disconnect or context loss retires
 * own intent; returning/reconnecting never resumes sharing automatically. */
export function useSharedLocation(conversationId: string, point: LocalMapLocation | null, enabled: boolean) {
  const { session } = useSession(), sessionId = session?.id;
  const [lease, setLease] = useState<LocationLease | null>(null), [peers, setPeers] = useState<SharedLocationPeer[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [stopping,setStopping]=useState(false);
  const owned = useRef<LocationLease | null>(null), generation = useRef(0), mounted = useRef(false), working = useRef(false);
  const tombstones = useRef(new Set<string>());
  const call = useCallback(async (body: unknown) => {
    const token = await session?.getToken();
    if (!token) throw new Error("Session unavailable.");
    const response = await fetch("/api/location-sharing", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("Sharing could not be confirmed. Stop or wait for expiry; no automatic retry.");
    return response.json();
  }, [session]);
  const retire = useCallback((value: LocationLease) => fetch("/api/location-sharing", {
    method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop", id: value.id }),
  }).then(response => { if (!response.ok) throw new Error(); }), []);
  const stop = useCallback(async () => {
    const epoch=++generation.current;
    const value = owned.current; owned.current = null;
    if (mounted.current) { setStopping(!!value); setBusy(false); }
    working.current = false;
    if (value) try { await retire(value); if (mounted.current&&epoch===generation.current) {setError("");setLease(null);} }
    catch { if (mounted.current&&epoch===generation.current) {if(value.expiresAt>Date.now()){owned.current=value;setLease(value);}else setLease(null);setError("Stopped on this device. Peer removal could not be confirmed. Retry Stop if still available; expiry remains automatic.");} }
    else if(mounted.current)setLease(null);
    if(mounted.current&&epoch===generation.current)setStopping(false);
  }, [retire]);
  const receive = useEffectEvent(async (snapshot: LocationSnapshot, epoch: number) => {
    try {
      const metadata = await call({ action: "validate", id: snapshot.id, conversationId });
      if (!mounted.current || epoch !== generation.current || document.hidden || tombstones.current.has(snapshot.id)) return;
      if (!validLocationLease(metadata) || ["id", "conversationId", "userId", "precision", "expiresAt"].some(key => metadata[key as keyof LocationLease] !== snapshot[key as keyof LocationLease])) return;
      const token = await session?.getToken();
      const response = await fetch("/api/live/roster", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ conversationId, userIds: [snapshot.userId] }), signal: AbortSignal.timeout(10000) });
      if (!response.ok) return;
      const identity = (await response.json()).participants?.find((p: LiveParticipant) => p.userId === snapshot.userId) as LiveParticipant | undefined;
      if (!identity || !mounted.current || epoch !== generation.current || document.hidden || tombstones.current.has(snapshot.id) || !validLocationSnapshot(snapshot)) return;
      setPeers(previous => previous.some(p=>p.snapshot.userId===snapshot.userId&&p.snapshot.sentAt>=snapshot.sentAt)?previous:[...previous.filter(p => p.snapshot.userId !== snapshot.userId && p.snapshot.expiresAt > Date.now()), { snapshot, identity }].slice(-50));
    } catch { /* Missing current authorization never renders cached coordinates. */ }
  });
  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => { if (mounted.current) { setPeers([]); setLease(null); setBusy(false); } });
    const incoming = (event: Event) => {
      const snapshot = (event as CustomEvent).detail;
      if (enabled && validLocationSnapshot(snapshot) && snapshot.conversationId === conversationId && !tombstones.current.has(snapshot.id)) void receive(snapshot, generation.current);
    };
    const clear = (event: Event) => {
      const value = (event as CustomEvent).detail;
      if (value?.id && value.conversationId === conversationId) {
        tombstones.current.add(value.id);
        if (tombstones.current.size > 200) tombstones.current.delete(tombstones.current.values().next().value!);
        setPeers(previous => previous.filter(p => p.snapshot.id !== value.id));
        if (owned.current?.id === value.id) { owned.current = null; setLease(null); }
      } else if (!value) { setPeers([]); void stop(); }
    };
    const lost = (event: Event) => { if ((event as CustomEvent).detail === conversationId) { setPeers([]); void stop(); } };
    const hidden = () => { if (document.hidden) { setPeers([]); void stop(); } };
    const signout = () => { setPeers([]); void stop(); };
    window.addEventListener(LOCATION_RECEIVED, incoming); window.addEventListener(LOCATION_CLEAR, clear);
    window.addEventListener(CONVERSATION_ACCESS_LOST, lost); window.addEventListener(REALTIME_SIGNOUT, signout);
    window.addEventListener("pagehide", signout); document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false; ++generation.current; working.current = false;
      // Activity preserves React state while hidden; explicitly discard peer
      // coordinates now, not on a later Map visit. No hidden snapshot cache.
      setPeers([]);setLease(null);setBusy(false);setStopping(false);setError("");
      const value = owned.current; owned.current = null; if (value) void retire(value).catch(() => undefined);
      window.removeEventListener(LOCATION_RECEIVED, incoming); window.removeEventListener(LOCATION_CLEAR, clear);
      window.removeEventListener(CONVERSATION_ACCESS_LOST, lost); window.removeEventListener(REALTIME_SIGNOUT, signout);
      window.removeEventListener("pagehide", signout); document.removeEventListener("visibilitychange", hidden);
    };
  }, [conversationId, sessionId, enabled, stop, retire]);
  const nextExpiry = Math.min(lease?.expiresAt ?? Infinity, ...peers.map(p => p.snapshot.expiresAt));
  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return;
    const timer = setTimeout(() => {
      setPeers(previous => previous.filter(p => p.snapshot.expiresAt > Date.now()));
      if (owned.current && owned.current.expiresAt <= Date.now()) void stop();
    }, Math.max(0, nextExpiry - Date.now()));
    return () => clearTimeout(timer);
  }, [nextExpiry, stop]);
  useEffect(() => { let active=true;if (!point) queueMicrotask(()=>{if(active)void stop();});return()=>{active=false;}; }, [point, stop]);
  const send = async (precision?: LocationPrecision) => {
    if (!point || !enabled || working.current || !mounted.current) return;
    working.current = true; setBusy(true); setError("");
    const epoch = generation.current;
    let current = owned.current;
    try {
      if (precision) {
        current = await call({ action: "begin", conversationId, precision, consent: precision === "precise" ? "precise-snapshot-v1" : "area-snapshot-v1" });
        if (!validLocationLease(current)) throw new Error("Sharing consent unavailable.");
        if (epoch !== generation.current || !mounted.current || document.hidden) { await retire(current); return; }
        owned.current = current; setLease(current);
      }
      if (!current || current.expiresAt <= Date.now()) throw new Error("Sharing expired. Choose Share location again.");
      await call({ action: "send", id: current.id, point });
    } catch (failure) {
      if (mounted.current && epoch === generation.current) setError(failure instanceof Error ? failure.message : "Sharing unavailable.");
    } finally { if (epoch === generation.current) { working.current = false; if (mounted.current) setBusy(false); } }
  };
  return { lease, peers, busy, stopping, error, stop, start: (precision: LocationPrecision) => send(precision), refresh: () => send() };
}
