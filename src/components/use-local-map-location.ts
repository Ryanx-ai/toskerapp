"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { markMapPhase } from "@/lib/maps/performance";
import { acceptLocalFix, validLocalFix, type PrivatePosition } from "@/lib/maps/local-position";

export type { LocalMapLocation } from "@/lib/maps/local-position";
/** One explicit, ephemeral reading. Never persisted, published, or watched. */
export function useLocalMapLocation() {
  const [position, setPosition] = useState<PrivatePosition | null>(null);
  const [status, setStatus] = useState(""), [busy, setBusy] = useState(false);
  const generation = useRef(0), pending = useRef(false);
  useEffect(() => {
    // Activity can suspend a pane while a one-shot reading is outstanding.
    // Retire that callback; returning must not leave the control stuck busy.
    queueMicrotask(() => { if (!pending.current) setBusy(false); });
    // The generation is a cancellation counter, not a DOM ref snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { ++generation.current; pending.current = false; };
  }, []);
  const clear = useCallback(() => { ++generation.current; pending.current = false; setPosition(null); setStatus(""); setBusy(false); }, []);
  const expiresAt = position?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    // A one-shot reading is not live tracking. Expire it rather than route from stale coordinates.
    const expire = () => { if (Date.now() >= expiresAt) { clear(); setStatus("Your location expired. Use Locate for a fresh reading."); } };
    const timer = setTimeout(expire, Math.max(0, expiresAt - Date.now()));
    document.addEventListener("visibilitychange", expire);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", expire); };
  }, [expiresAt, clear]);
  useEffect(() => {
    let active = true, permission: PermissionStatus | undefined;
    const check = () => { if (active && permission?.state === "denied") { clear(); setStatus("Location permission denied. You can allow it in browser settings."); } };
    void navigator.permissions?.query({ name: "geolocation" }).then(result => {
      if (!active) return;
      permission = result; permission.addEventListener("change", check); check();
    }).catch(() => { /* Some browsers do not expose geolocation permission status. */ });
    return () => { active = false; permission?.removeEventListener("change", check); };
  }, [clear]);
  const locate = () => {
    if (pending.current) return;
    if (!navigator.geolocation) { setStatus("Location is unavailable in this browser."); return; }
    const current = ++generation.current;
    markMapPhase("geolocation-start");
    pending.current = true; setBusy(true); setStatus("Requesting your location…");
    navigator.geolocation.getCurrentPosition(position => {
      if (current !== generation.current) return;
      pending.current = false; setBusy(false);
      const { latitude, longitude, accuracy } = position.coords;
      const fix = { latitude, longitude, accuracy };
      if (!validLocalFix(fix)) { setStatus("Location unavailable. Try again."); return; }
      setPosition(previous => acceptLocalFix(previous, fix, Date.now()));
      markMapPhase("geolocation-ready");
      setStatus(`Only on your map · accuracy about ${Math.max(1, Math.round(accuracy))} m`);
    }, error => {
      if (current !== generation.current) return;
      pending.current = false; setBusy(false);
      if (error.code === 1) setPosition(null);
      setStatus(error.code === 1 ? "Location permission denied. You can allow it in browser settings." : error.code === 3 ? "Location timed out. Try again when ready." : "Location unavailable. Try again when ready.");
    }, { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 });
  };
  return { location: position?.current ?? null, origin: position?.origin ?? null, expiresAt, status, busy, locate, clear };
}
