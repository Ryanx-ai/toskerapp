"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, List, Map as MapIcon } from "lucide-react";
import { readTripAction, mutateTripAction } from "@/server/trips/actions";
import { ACTIVITY_REFRESH, CONVERSATION_ACCESS_LOST, TRIP_REFRESH } from "@/lib/realtime-contract";
import { orderedRoutePlaces, type PlaceCandidate, type TripSnapshot } from "@/lib/trip-contract";
import TripMapCanvas from "./trip-map-canvas";
import TripRouteControls, { mergeVisibleOrder, type TripChange } from "./trip-route-controls";
import TripPlaceCard from "./trip-place-card";
import { useToskerIdentity } from "./tosker-identity";
import styles from "./room-map-workspace.module.css";

type Preview = { candidate: PlaceCandidate; token: string };
type Pending = Parameters<typeof mutateTripAction>[0];
export default function TripWorkspace({ roomSlug, conversationId }: { roomSlug: string; conversationId: string }) {
  const [plan, setPlan] = useState<TripSnapshot | null>(null), [error, setError] = useState("");
  const [query, setQuery] = useState(""), [results, setResults] = useState<Preview[]>([]), [searching, setSearching] = useState(false), [searched, setSearched] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null), [notice, setNotice] = useState("");
  const [pinMode, setPinMode] = useState(false), [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [pending, setPending] = useState<Pending | null>(null);
  const [archived, setArchived] = useState(false), [view, setView] = useState<"map" | "places">("map");
  const [library, setLibrary] = useState(false);
  const [preferences, setPreferences] = useState<{ activeId: string | null; ghosts: string[] }>({ activeId: null, ghosts: [] });
  const identity = useToskerIdentity();
  const preferenceKey = `tosker:trip-view:${identity?.userId ?? "anonymous"}:${roomSlug}`;
  const alive = useRef(true), reading = useRef(false), queued = useRef(false), writing = useRef(false);
  const request = useRef<AbortController | null>(null), cards = useRef<HTMLDivElement>(null);
  const deny = useCallback(() => {
    request.current?.abort(); setPlan(null); setPreview(null); setResults([]); setSelectedId(null); setPending(null);
    try { sessionStorage.removeItem(preferenceKey); } catch { /* No retained plan data is stored locally. */ }
    setError("Your Room access is no longer available.");
    window.dispatchEvent(new CustomEvent(CONVERSATION_ACCESS_LOST, { detail: conversationId }));
  }, [conversationId, preferenceKey]);
  useEffect(() => {
    try { const stored = JSON.parse(sessionStorage.getItem(preferenceKey) ?? "null"); if (stored && (typeof stored.activeId === "string" || stored.activeId === null) && Array.isArray(stored.ghosts) && stored.ghosts.length <= 12 && stored.ghosts.every((id: unknown) => typeof id === "string")) queueMicrotask(() => setPreferences(stored)); } catch { /* Private preferences are optional. */ }
  }, [preferenceKey]);
  const prefer = (value: typeof preferences) => { setPreferences(value); try { sessionStorage.setItem(preferenceKey, JSON.stringify(value)); } catch { /* Still usable without storage. */ } };
  const load = useCallback(async function readLatest() {
    if (reading.current) { queued.current = true; return; }
    reading.current = true;
    try {
      const result = await readTripAction(roomSlug);
      if (!alive.current) return;
      if (result.ok) setPlan(previous => !previous || result.value.revision >= previous.revision ? result.value : previous);
      else if (result.code === "denied") deny(); else setError(result.message);
    } catch { if (alive.current) setError("Saved places could not be refreshed. Check your connection and retry."); }
    finally { reading.current = false; if (queued.current && alive.current) { queued.current = false; void readLatest(); } }
  }, [roomSlug, deny]);
  useEffect(() => {
    alive.current = true; queueMicrotask(() => { if (alive.current) void load(); });
    const refresh = () => { if (!document.hidden) void load(); };
    window.addEventListener(TRIP_REFRESH, refresh); window.addEventListener(ACTIVITY_REFRESH, refresh);
    window.addEventListener("online", refresh); document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 30000); // Canonical data, never provider polling.
    return () => { alive.current = false; request.current?.abort(); clearInterval(timer); window.removeEventListener(TRIP_REFRESH, refresh); window.removeEventListener(ACTIVITY_REFRESH, refresh); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  useEffect(() => {
    if (query.trim().length < 3) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    const timer = setTimeout(async () => {
      setSearching(true); setSearched(false);
      try {
        const response = await fetch(`/api/trips/${encodeURIComponent(roomSlug)}/places`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "search", query: query.trim() }), signal: controller.signal, cache: "no-store" });
        const data = await response.json(); if (controller.signal.aborted || !alive.current) return;
        if (response.status === 403) { deny(); return; }
        if (!response.ok) { setError(data.error || "Place lookup unavailable."); return; }
        setResults(data.candidates); setSearched(true); setError("");
      } catch { if (!controller.signal.aborted && alive.current) setError("Place lookup could not finish. Change the search or try again."); }
      finally { if (!controller.signal.aborted && alive.current) setSearching(false); }
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, roomSlug, deny]);
  const select = useCallback((id: string) => {
    setSelectedId(id); setPreview(null);
    requestAnimationFrame(() => cards.current?.querySelector<HTMLElement>(`[data-place-id="${id}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }));
  }, []);
  const pin = async (latitude: number, longitude: number) => {
    if (writing.current) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setQuery(""); setResults([]); setSearched(false); setSearching(true); setError(""); setPinMode(false); setSelectedId(null);
    setPreview({ token: "", candidate: { title: `Pin ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, latitude, longitude, source: "pin", provider: null, providerId: null, address: "", attribution: "", license: "" } });
    setNotice("Checking nearby address context. Nothing is saved.");
    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(roomSlug)}/places`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "pin", latitude, longitude }), signal: controller.signal, cache: "no-store" });
      const data = await response.json(); if (!alive.current || controller.signal.aborted) return;
      if (response.status === 403) { deny(); return; }
      if (!response.ok) { setError(data.error || "Pin preview unavailable."); return; }
      setPreview(data.candidates[0]); setNotice(data.notice); setPinMode(false);
    } catch { if (!controller.signal.aborted && alive.current) setError("Pin preview could not finish. Nothing was saved. Try placing it again."); }
    finally { if (!controller.signal.aborted && alive.current) setSearching(false); }
  };
  const write = async (input: Pending) => {
    if (writing.current) return;
    writing.current = true; setBusy(true); setError(""); setPending(input);
    try {
      const result = await mutateTripAction(input); if (!alive.current) return;
      if (!result.ok) {
        if (result.code === "denied") deny();
        else { setError(result.message); if (result.code !== "unavailable") setPending(null); await load(); }
        return;
      }
      setPending(null); await load();
      if (input.command.type === "add") { setPreview(null); setResults([]); setQuery(""); setSearched(false); setSelectedId(result.value.resultId); setNotice("Added to trip. Shared with this Room."); }
      else setNotice("Trip updated.");
      return result.value;
    } catch { if (alive.current) setError("Save acknowledgement was lost. Retry the same change to confirm it safely."); }
    finally { writing.current = false; if (alive.current) setBusy(false); }
  };
  const change = async (command: Pending["command"], revision = plan?.revision) => { if (plan && revision !== undefined) return write({ roomSlug, expectedRevision: revision, requestId: crypto.randomUUID(), command }); };
  const route = plan?.routes.find(route => route.id === preferences.activeId && !route.archived) ?? plan?.routes.find(route => !route.archived);
  const places = useMemo(() => plan ? route && !library ? orderedRoutePlaces(plan, route.id) : plan.places.filter(place => !place.archived) : [], [plan, route, library]);
  const mapRoutes = useMemo(() => plan ? plan.routes.filter(r => !r.archived && (r.id === route?.id || preferences.ghosts.includes(r.id))).map(r => ({ ...r, ghost: r.id !== route?.id, places: orderedRoutePlaces(plan, r.id) })) : [], [plan, route, preferences.ghosts]);
  const shown = archived ? plan?.places.filter(place => place.archived) ?? [] : places;
  const disabled = busy || !!pending || !plan;
  const reorder = (id: string, target: string, revision = plan?.revision) => {
    if (!plan || !route || library || archived || disabled) return;
    const ids = places.map(p => p.id), from = ids.indexOf(id), to = ids.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(from,1); ids.splice(to,0,id);
    void change({ type: "order", routeId: route.id, placeIds: mergeVisibleOrder(plan, route.id, ids) }, revision);
  };
  return <section className={styles.workspace} aria-label="Room Map" data-trip-revision={plan?.revision}>
    <div className={styles.mobileViews} aria-label="Map view"><button aria-pressed={view === "map"} onClick={() => setView("map")}><MapIcon size={16} aria-hidden="true" />Map</button><button aria-pressed={view === "places"} onClick={() => setView("places")}><List size={16} aria-hidden="true" />Places ({plan?.places.filter(p => !p.archived).length ?? 0})</button></div>
    {error && <div className={styles.feedback} role="alert"><p>{error}</p>{pending ? <button disabled={busy} onClick={() => void write(pending)}>Retry same change</button> : <button onClick={() => void load()}>Refresh saved places</button>}</div>}
    <div className={`${styles.mapPlane} ${view === "places" ? styles.mobileMapHidden : ""}`}>
      <div className={styles.state}><span className={styles.stateDot} aria-hidden="true" />Singapore planning · Shared with this Room</div>
      <TripMapCanvas places={places} routes={mapRoutes} candidate={preview?.candidate ?? null} selectedId={selectedId} onSelect={select} onSelectGhost={(routeId, id) => { prefer({ ...preferences, activeId: routeId }); setLibrary(false); setArchived(false); select(id); }} pinMode={pinMode && !disabled} onPin={(lat, lon) => void pin(lat, lon)} />
      {mapRoutes.length > 0 && <div className={styles.legend} aria-label="Planning line legend"><span>Planning order · straight lines between Stops, not directions or ETA</span>{mapRoutes.map(r => <span key={r.id} data-route-color={r.color}><i className={styles.swatch} aria-hidden="true" />{r.name} · {r.ghost ? "Ghost / dashed" : "Active / solid"}</span>)}</div>}
    </div>
    <div className={styles.searchPanel}>
      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={18} aria-hidden="true" /><span className={styles.srOnly}>Search Singapore places</span><input aria-label="Search places" placeholder="Search Singapore places" maxLength={160} disabled={disabled} value={query} onChange={event => { request.current?.abort(); setSearching(false); setQuery(event.target.value); setResults([]); setSearched(false); setPinMode(false); setPreview(null); setNotice(""); }} /></label>
        <button className={styles.control} aria-pressed={pinMode} disabled={disabled} onClick={() => { request.current?.abort(); setSearching(false); setQuery(""); setResults([]); setSearched(false); setPreview(null); setView("map"); setPinMode(value => !value); }}><MapPin size={16} aria-hidden="true" />{pinMode ? "Cancel pin mode" : "Drop a pin"}</button>
      </div>
      <p className={styles.helper} role="status">{searching ? "Looking up this place…" : pinMode ? "Click the map to preview a pin. Nothing is saved until you confirm." : searched && !results.length ? "No results found. Try a fuller address or drop a pin." : "Choose a result, preview it, then add it to your trip."}</p>
      {results.length > 0 && !preview && <ul className={styles.results} aria-label="Place search results">{results.map((result, index) => <li key={result.token}><button disabled={disabled} onClick={() => { setPreview(result); setSelectedId(null); setNotice("Check the name and position before adding. Search results can be approximate."); }}><span>{index + 1}. {result.candidate.title}</span><small>{result.candidate.address}</small></button></li>)}</ul>}
      {preview && <section className={styles.preview} aria-label="Place preview">
        <div><span className={styles.previewLabel}>Not saved yet</span><h2>{preview.candidate.title}</h2><p>{preview.candidate.address || "Manually selected point"}</p><p>{preview.candidate.latitude.toFixed(5)}, {preview.candidate.longitude.toFixed(5)}</p><p>{notice}</p>{preview.candidate.attribution && <small>{preview.candidate.attribution} · {preview.candidate.license}</small>}</div>
        <div className={styles.actions}><button className={styles.primary} disabled={disabled || !preview.token} onClick={() => change({ type: "add", token: preview.token, routeId: route?.id ?? null })}>{busy ? "Saving…" : preview.candidate.source === "pin" ? "Confirm pin" : "Add to trip"}</button><button className={styles.control} disabled={busy || !!pending} onClick={() => { request.current?.abort(); setSearching(false); setPreview(null); setNotice(""); }}>Cancel</button></div>
      </section>}
      {!preview && notice && <p className={styles.helper} role="status">{notice}</p>}
      <p className={styles.attribution}><a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Search by Geoapify</a> · Review approximate results before saving.</p>
    </div>
    <section className={styles.cards} aria-labelledby="location-cards-heading">
      <header><div><h2 id="location-cards-heading">{archived ? "Archived places" : "Location Cards"}</h2><span>{library ? "All saved places" : route?.name ?? "Your shared trip"}</span></div><div className={styles.actions}><button className={styles.control} aria-pressed={library} onClick={() => { setLibrary(value => !value); setArchived(false); }}>{library ? "Show active route" : "All saved places"}</button><button className={styles.control} aria-pressed={archived} onClick={() => setArchived(value => !value)}>{archived ? "Show trip" : "Archived places"}</button></div></header>
      {plan && <TripRouteControls plan={plan} activeId={route?.id ?? null} ghosts={preferences.ghosts} disabled={disabled} activate={id => { prefer({ ...preferences, activeId: id }); setArchived(false); setLibrary(false); setSelectedId(null); }} ghost={id => prefer({ ...preferences, ghosts: preferences.ghosts.includes(id) ? preferences.ghosts.filter(g => g !== id) : [...preferences.ghosts,id] })} change={change as TripChange} />}
      {!plan ? <p className={styles.helper} role="status">Loading saved places…</p> : shown.length === 0 ? <div className={styles.cardsEmpty}><MapPin size={20} aria-hidden="true" /><p>{archived ? "No archived places." : "Search for a place, preview a pin, or reuse one from All saved places."}</p></div> : <><div className={styles.stripControls}><span>Scroll cards, drag their handles or use Move controls in Place actions.</span><button className={styles.control} aria-label="Scroll cards earlier" onClick={() => cards.current?.scrollBy({ left: -240, behavior: "instant" })}>Earlier</button><button className={styles.control} aria-label="Scroll cards later" onClick={() => cards.current?.scrollBy({ left: 240, behavior: "instant" })}>Later</button></div><div className={styles.cardStrip} ref={cards} role="list" aria-label="Saved trip places" tabIndex={0}>{shown.map((place, index) => <TripPlaceCard key={place.id} place={place} plan={plan} routeId={!library && !archived ? route?.id ?? null : null} index={index} total={shown.length} selected={selectedId === place.id} disabled={disabled} select={select} move={(id, offset) => { const target = places[places.findIndex(p => p.id === id)+offset]; if (target) reorder(id,target.id); }} drop={reorder} change={change as TripChange} />)}</div></>}
    </section>
  </section>;
}
