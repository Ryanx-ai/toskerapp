"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type LocalMapLocation = { latitude: number; longitude: number; accuracy: number };
/** One explicit, ephemeral reading. Never persisted, published, or watched. */
export function useLocalMapLocation() {
  const [location, setLocation] = useState<LocalMapLocation | null>(null);
  const [status, setStatus] = useState(""), [busy, setBusy] = useState(false);
  const generation = useRef(0), pending = useRef(false);
  useEffect(() => () => { ++generation.current; }, []);
  const clear = useCallback(() => { ++generation.current; pending.current = false; setLocation(null); setStatus(""); setBusy(false); }, []);
  useEffect(() => {
    if (!location) return;
    // A one-shot reading is not live tracking. Expire it rather than route from stale coordinates.
    const expires = Date.now() + 5 * 60 * 1000;
    const expire = () => { if (Date.now() >= expires) { clear(); setStatus("Your location expired. Use Locate for a fresh reading."); } };
    const timer = setTimeout(expire, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", expire);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", expire); };
  }, [location, clear]);
  const locate = () => {
    if (pending.current) return;
    if (!navigator.geolocation) { setStatus("Location is unavailable in this browser."); return; }
    const current = ++generation.current;
    pending.current = true; setBusy(true); setStatus("Requesting your location…");
    navigator.geolocation.getCurrentPosition(position => {
      if (current !== generation.current) return;
      pending.current = false; setBusy(false);
      const { latitude, longitude, accuracy } = position.coords;
      if (![latitude, longitude, accuracy].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) { setStatus("Location unavailable. Try again."); return; }
      setLocation({ latitude, longitude, accuracy });
      setStatus(`Only on your map · accuracy about ${Math.max(1, Math.round(accuracy))} m`);
    }, error => {
      if (current !== generation.current) return;
      pending.current = false; setBusy(false);
      setStatus(error.code === 1 ? "Location permission denied. You can allow it in browser settings." : error.code === 3 ? "Location timed out. Try again when ready." : "Location unavailable. Try again when ready.");
    }, { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 });
  };
  return { location, status, busy, locate, clear };
}
