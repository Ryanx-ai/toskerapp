"use client";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { MapPin, Search, List, Map as MapIcon, LocateFixed, ChevronDown, ChevronUp } from "lucide-react";
import { readTripAction, mutateTripAction } from "@/server/trips/actions";
import { ACTIVITY_REFRESH, CONVERSATION_ACCESS_LOST, TRIP_REFRESH } from "@/lib/realtime-contract";
import { orderedRoutePlaces, routingPlaces, nextCheckpointName, isCoordinatePinTitle, mergeVisibleOrder, recoverActiveRoute, type PlaceCandidate, type TripSnapshot } from "@/lib/trip-contract";
import { ModalLayer } from "./modal-layer";
import { type RoadMode } from "@/lib/maps/road-contract";
import { canSearchPlaces, contextPlaceSuggestions, normalizedPlaceQuery } from "@/lib/maps/place-search";
import { inPlanningRegion } from "@/lib/maps/planning-region";
import { PRIVATE_ORIGIN_ID } from "@/lib/maps/private-origin";
import { markMapPhase } from "@/lib/maps/performance";
import { usePrivateOriginRoute } from "./use-private-origin-route";
import { TripPrivateOrigin } from "./trip-private-origin";
import { useMapPings } from "./use-map-pings";
import { useTripRoadPreview } from "./use-trip-road-preview";
import TripMapCanvas from "./trip-map-canvas";
import TripRouteControls from "./trip-route-controls";
import TripPlaceCard from "./trip-place-card";
import { TripComments } from "./trip-comments";
import { useLocalMapLocation } from "./use-local-map-location";
import { useToskerIdentity } from "./tosker-identity";
import { TripCopyPlace } from "./trip-copy-place";
import TripPointInspector from "./trip-point-inspector";
import styles from "./room-map-workspace.module.css";

type Preview = { candidate: PlaceCandidate; token: string; nearby?: Preview[] };
type Pending = Parameters<typeof mutateTripAction>[0];
export default function TripWorkspace({ roomSlug, conversationId }: { roomSlug: string; conversationId: string }) {
  const sandbox=roomSlug.startsWith("sandbox--");
  const [copyPlace,setCopyPlace]=useState<{id:string;revision:number}|null>(null);
  const [plan, setPlan] = useState<TripSnapshot | null>(null), [error, setError] = useState("");
  const [query, setQuery] = useState(""), [results, setResults] = useState<Preview[]>([]), [searching, setSearching] = useState(false), [searched, setSearched] = useState(false), [searchAttempt, setSearchAttempt] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null), [notice, setNotice] = useState("");
  const [pinMode, setPinMode] = useState(false), [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [pending, setPending] = useState<Pending | null>(null);
  const [archived, setArchived] = useState(false), [view, setView] = useState<"map" | "places">("map");
  const [commentId, setCommentId] = useState<string | null>(null);
  const localLocation = useLocalMapLocation();
  const clearLocalLocation = localLocation.clear;
  const [originConsent,setOriginConsent]=useState<string|null>(null),[originQuestion,setOriginQuestion]=useState<string|null>(null);
  const [roadEnabled, setRoadEnabled] = useState(false);
  const [roadMode, setRoadMode] = useState<RoadMode>("walk");
  const [collapsed,setCollapsed]=useState(false);
  const [moving,setMoving]=useState<{id:string;latitude:number;longitude:number;revision:number}|null>(null);
  const [preferences, setPreferences] = useState<{ activeId: string | null; ghosts: string[]; hidden: string[]; hiddenRoutes: string[] }>({ activeId: null, ghosts: [], hidden: [], hiddenRoutes: [] });
  const identity = useToskerIdentity();
  const preferenceKey = `tosker:trip-view:${identity?.userId ?? "anonymous"}:${roomSlug}`;
  const accessDenied = useRef(false);
  const alive = useRef(true), reading = useRef(false), queued = useRef(false), writing = useRef(false);
  const request = useRef<AbortController | null>(null), cards = useRef<HTMLDivElement>(null);
  const searchCache = useRef(new Map<string, { at: number; results: Preview[] }>());
  const lastSearchAt = useRef(0);
  const localSuggestions = useMemo(() => contextPlaceSuggestions(plan?.places ?? [], query), [plan, query]);
  const alias = normalizedPlaceQuery(query) !== query.trim() ? normalizedPlaceQuery(query) : "";
  const deny = useCallback(() => {
    clearLocalLocation();
    setOriginConsent(null); setOriginQuestion(null);
    setCopyPlace(null);
    searchCache.current.clear();
    accessDenied.current = true; request.current?.abort(); setPlan(null); setPreview(null); setResults([]); setSelectedId(null); setPending(null); setCommentId(null); setMoving(null);
    try { sessionStorage.removeItem(preferenceKey); } catch { /* No retained plan data is stored locally. */ }
    setError("Your access to this trip is no longer available.");
    window.dispatchEvent(new CustomEvent(CONVERSATION_ACCESS_LOST, { detail: conversationId }));
  }, [conversationId, preferenceKey, clearLocalLocation]);
  const pings=useMapPings(roomSlug,conversationId,!!localLocation.location,identity?{id:identity.userId,name:identity.displayName}:null,deny);
  useEffect(() => {
    try { const stored = JSON.parse(sessionStorage.getItem(preferenceKey) ?? "null"); if (stored && (typeof stored.activeId === "string" || stored.activeId === null) && Array.isArray(stored.ghosts) && stored.ghosts.length <= 12 && stored.ghosts.every((id: unknown) => typeof id === "string")) queueMicrotask(() => setPreferences({ activeId: stored.activeId, ghosts: stored.ghosts, hidden: Array.isArray(stored.hidden) ? stored.hidden.filter((id: unknown) => typeof id === "string").slice(0,200) : [], hiddenRoutes: Array.isArray(stored.hiddenRoutes) ? stored.hiddenRoutes.filter((id: unknown) => typeof id === "string").slice(0,12) : [] })); } catch { /* Private preferences are optional. */ }
  }, [preferenceKey]);
  const prefer = (value: typeof preferences) => { setPreferences(value); try { sessionStorage.setItem(preferenceKey, JSON.stringify(value)); } catch { /* Still usable without storage. */ } };
  const previousPlan=useRef<TripSnapshot|null>(null);
  const reconcile=useEffectEvent((next:TripSnapshot) => {
    const routeIds=new Set(next.routes.map(r=>r.id)),placeIds=new Set(next.places.map(p=>p.id));
    prefer({...preferences,activeId:recoverActiveRoute(previousPlan.current?.routes??[],next.routes,preferences.activeId),ghosts:preferences.ghosts.filter(id=>routeIds.has(id)),hiddenRoutes:preferences.hiddenRoutes.filter(id=>routeIds.has(id)),hidden:preferences.hidden.filter(id=>placeIds.has(id))});
    setSelectedId(id=>id&&placeIds.has(id)?id:null);setCommentId(id=>id&&placeIds.has(id)?id:null);
    previousPlan.current=next;
  });
  useEffect(()=>{if(plan)reconcile(plan);},[plan]);
  const load = useCallback(async function readLatest() {
    if (accessDenied.current) return;
    if (reading.current) { queued.current = true; return; }
    reading.current = true;
    try {
      const result = await readTripAction(roomSlug);
      if (!alive.current || accessDenied.current) return;
      if (result.ok) setPlan(previous => !previous || result.value.revision >= previous.revision ? result.value : previous);
      else if (result.code === "denied") deny(); else setError(result.message);
    } catch { if (alive.current) setError("Locations could not be refreshed. Check your connection and retry."); }
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
    if (!canSearchPlaces(query)) return;
    if (accessDenied.current) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    const cacheKey = normalizedPlaceQuery(query).toLocaleLowerCase();
    const cached = searchCache.current.get(cacheKey);
    if (cached && Date.now() - cached.at < 5 * 60 * 1000 && searchAttempt === 0) {
      queueMicrotask(() => { if (!controller.signal.aborted) { setResults(cached.results); setSearched(true); } });
      return () => controller.abort();
    }
    const timer = setTimeout(async () => {
      if (controller.signal.aborted || !alive.current || accessDenied.current) return;
      lastSearchAt.current = Date.now();
      setSearching(true); setSearched(false);
      try {
        const response = await fetch(`/api/trips/${encodeURIComponent(roomSlug)}/places`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "search", query: query.trim() }), signal: controller.signal, cache: "no-store" });
        const data = await response.json(); if (controller.signal.aborted || !alive.current || accessDenied.current) return;
        if (response.status === 403) { deny(); return; }
        if (!response.ok) { setError(data.error || "Place lookup unavailable."); return; }
        setResults(data.candidates); setSearched(true); setError("");
        if (searchCache.current.size >= 12) searchCache.current.delete(searchCache.current.keys().next().value!);
        searchCache.current.set(cacheKey, { at: Date.now(), results: data.candidates });
      } catch { if (!controller.signal.aborted && alive.current) setError("Place lookup could not finish. Change the search or try again."); }
      finally { if (!controller.signal.aborted && alive.current) setSearching(false); }
    }, Math.max(450, lastSearchAt.current + 1200 - Date.now()));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, roomSlug, deny, searchAttempt]);
  const chooseContextPlace = async (placeId: string) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setSearching(true); setError("");
    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(roomSlug)}/places`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "context", placeId }), signal: controller.signal, cache: "no-store" });
      const data = await response.json();
      if (controller.signal.aborted || !alive.current || accessDenied.current) return;
      if (response.status === 403) { deny(); return; }
      if (!response.ok) { setError(data.error || "This place is no longer available."); return; }
      setPreview(data.candidates[0]); setSelectedId(null);
    } catch { if (!controller.signal.aborted && alive.current) setError("Place preview could not finish. Try again."); }
    finally { if (!controller.signal.aborted && alive.current) setSearching(false); }
  };
  const select = useCallback((id: string) => {
    setSelectedId(id); setPreview(null); setView("map");
    requestAnimationFrame(() => {
      const strip = cards.current, card = strip?.querySelector<HTMLElement>(`[data-place-id="${id}"]`);
      if (!strip || !card) return;
      const row = strip.getBoundingClientRect(), item = card.getBoundingClientRect();
      // Reveal horizontally without dragging the Map offscreen on a short viewport.
      if (item.left < row.left) strip.scrollLeft += item.left - row.left;
      else if (item.right > row.right) strip.scrollLeft += item.right - row.right;
    });
  }, []);
  const pin = async (latitude: number, longitude: number) => {
    if (writing.current) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setQuery(""); setResults([]); setSearched(false); setSearching(true); setError(""); setPinMode(false); setSelectedId(null);
    setPreview({ token: "", candidate: { title: "Checkpoint", latitude, longitude, source: "pin", provider: null, providerId: null, address: "", attribution: "", license: "" } });
    setNotice("Checking nearby address context. Nothing is saved.");
    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(roomSlug)}/places`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "pin", latitude, longitude }), signal: controller.signal, cache: "no-store" });
      const data = await response.json(); if (!alive.current || controller.signal.aborted) return;
      if (response.status === 403) { deny(); return; }
      if (!response.ok) { setError(data.error || "Pin preview unavailable."); return; }
      setPreview({ ...data.candidates[0], nearby: data.nearby ?? [] }); setNotice(data.notice); setPinMode(false);
    } catch { if (!controller.signal.aborted && alive.current) setError("Pin preview could not finish. Nothing was saved. Try placing it again."); }
    finally { if (!controller.signal.aborted && alive.current) setSearching(false); }
  };
  const write = async (input: Pending) => {
    if (writing.current || accessDenied.current) return;
    writing.current = true; setBusy(true); setError(""); setPending(input);
    try {
      const result = await mutateTripAction(input); if (!alive.current) return;
      if (!result.ok) {
        if (result.code === "denied") deny();
        else { setError(result.message); if (result.code !== "unavailable") setPending(null); await load(); }
        return;
      }
      // A background read may already be in flight. Await our own post-write
      // snapshot before re-enabling revision-bound editors, not just a queued read.
      const refreshed = await readTripAction(roomSlug);
      if (!alive.current || accessDenied.current) return;
      if (refreshed.ok) setPlan(previous => !previous || refreshed.value.revision >= previous.revision ? refreshed.value : previous);
      else if (refreshed.code === "denied") { deny(); return; }
      else { setError(refreshed.message); return; }
      setPending(null);
      if (input.command.type === "add") { setPreview(null); setResults([]); setQuery(""); setSearched(false); setSelectedId(result.value.resultId); setNotice(sandbox ? "Added to your route." : "Added to this route."); }
      else if(input.command.type==="copy-place") { prefer({...preferences,activeId:input.command.routeId});setArchived(false);setSelectedId(result.value.resultId);setNotice("Destination card selected. The source is unchanged."); }
      else { setNotice(["place-icon","star-place"].includes(input.command.type)?"Tag saved.":["rename-checkpoint","reset-checkpoint-name"].includes(input.command.type)?"Checkpoint name saved.":""); if (input.command.type === "nuke-place") setSelectedId(null); }
      return result.value;
    } catch { if (alive.current) setError("Save acknowledgement was lost. Retry the same change to confirm it safely."); }
    finally { writing.current = false; if (alive.current) setBusy(false); }
  };
  const change = async (command: Pending["command"], revision = plan?.revision) => { if (plan && revision !== undefined) return write({ protocol:4, roomSlug, expectedRevision: revision, requestId: crypto.randomUUID(), command }); };
  useEffect(() => { if (!notice || preview) return; const timer = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(timer); }, [notice, preview]);
  const route = plan?.routes.find(route => route.id === preferences.activeId && !route.archived) ?? plan?.routes.find(route => !route.archived);
  // Never silently retarget an open confirmation after a peer archives/nukes a Route.
  const previousRoute = useRef<string | undefined>(undefined);
  useEffect(() => { if (previousRoute.current !== route?.id) { request.current?.abort(); setQuery(""); setResults([]); setSearched(false); setPreview(null); setSearching(false); setSelectedId(id => plan?.memberships.some(m => m.routeId === route?.id && m.placeId === id) ? id : null); setPinMode(false); } previousRoute.current = route?.id; }, [route?.id, plan]);
  const places = useMemo(() => plan && route ? orderedRoutePlaces(plan, route.id) : [], [plan, route]);
  const mapRoutes = useMemo(() => plan ? plan.routes.filter(r => !r.archived && !preferences.hiddenRoutes.includes(r.id) && (r.id === route?.id || preferences.ghosts.includes(r.id))).map(r => ({ ...r, ghost: r.id !== route?.id, places: orderedRoutePlaces(plan, r.id) })) : [], [plan, route, preferences.ghosts, preferences.hiddenRoutes]);
  const ownedIds=new Set(plan?.memberships.filter(m=>m.routeId===route?.id).map(m=>m.placeId));
  const shown = archived ? plan?.places.filter(place => place.archived&&ownedIds.has(place.id)) ?? [] : places;
  const routePlaces = plan && route ? routingPlaces(plan,route.id) : [];
  const roadPreview=useTripRoadPreview(roomSlug,route?.id??null,routePlaces,roadMode,roadEnabled&&!!plan,deny);
  const {roads,fit:roadFit,current:road,busy:roadBusy,error:roadError}=roadPreview;
  const originPoints = localLocation.location && routePlaces[0] ? [{id:PRIVATE_ORIGIN_ID,latitude:localLocation.location.latitude,longitude:localLocation.location.longitude},routePlaces[0]] : [];
  const originKey = originPoints.length ? JSON.stringify([roomSlug,route?.id,...originPoints.map(p=>[p.id,p.latitude,p.longitude])]) : "";
  const consented = !!originKey && originConsent===originKey;
  const clearOrigin = () => { localLocation.clear(); setOriginConsent(null); setOriginQuestion(null); };
  const privateRoute = usePrivateOriginRoute(roomSlug,route?.id??null,originPoints,roadMode,consented&&roadEnabled&&!!plan,roadBusy,deny);
  useEffect(()=>{if(originConsent&&originConsent!==originKey)queueMicrotask(()=>setOriginConsent(null));},[originConsent,originKey]);
  const previewTitle = preview?.candidate.source==="pin" && isCoordinatePinTitle(preview.candidate.title) ? nextCheckpointName(plan?.places.filter(p=>ownedIds.has(p.id))??[]) : preview?.candidate.title;
  const disabled = busy || !!pending || !plan;
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector('[role="dialog"], [aria-modal="true"]') || (event.target as Element)?.closest('input, textarea, select, [contenteditable="true"]')) return;
      request.current?.abort(); setSearching(false); setNotice(""); setSelectedId(null); setPinMode(false); setPreview(null);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  const reorder = (id: string, target: string, revision = plan?.revision) => {
    if (!plan || !route || archived || disabled) return;
    const ids = places.map(p => p.id), from = ids.indexOf(id), to = ids.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(from,1); ids.splice(to,0,id);
    const full=mergeVisibleOrder(plan,route.id,ids);
    if(plan.memberships.some(m=>m.routeId===route.id&&(route.lockedPositions??[0]).includes(m.position)&&full[m.position]!==m.placeId)){setNotice("Unlock the affected positions before moving these locations.");return;}
    void change({ type: "order", routeId: route.id, placeIds: full }, revision);
  };
  const commentPlace = plan?.places.find(p => p.id === commentId && !p.archived);
  const selectedPlace = places.find(p => p.id === selectedId && !p.archived);
  const closeInspector = () => { if (busy) return; request.current?.abort(); setSearching(false); setPreview(null); setSelectedId(null); setNotice(""); };
  const inspector = (preview || selectedPlace) && <TripPointInspector key={preview ? `preview:${preview.candidate.latitude}:${preview.candidate.longitude}:${route?.id}` : selectedPlace?.id} candidate={preview?.candidate} nearby={preview?.nearby?.map(p=>p.candidate)} chooseNearby={index=>{const choice=preview?.nearby?.[index];if(choice){setPreview(choice);setNotice("Review this known place at its own position. Nothing is saved until Add to Route.");}}} place={selectedPlace} title={previewTitle ?? selectedPlace?.title ?? "Place"} routeName={route?.name} revision={plan?.revision ?? 0} disabled={disabled} ready={!!preview?.token} busy={busy} close={closeInspector} add={() => { if (preview?.token) void change({ type:"add", token:preview.token, routeId:route?.id ?? null }); }} comments={() => { if(selectedPlace)setCommentId(selectedPlace.id); }} change={change} />;
  return <section className={styles.workspace} data-tray-collapsed={collapsed} aria-label="Trip Map" data-trip-revision={plan?.revision} onClick={event => { if (!(event.target as Element).closest('button, a, input, textarea, select, summary, [role="dialog"], [data-place-id], [data-map-inspector], .maplibregl-map')) setSelectedId(null); }}>
    <div className={styles.mobileViews} aria-label="Map view"><button aria-pressed={view === "map"} onClick={() => setView("map")}><MapIcon size={16} aria-hidden="true" />Map</button><button aria-pressed={view === "places"} onClick={() => setView("places")}><List size={16} aria-hidden="true" />Places ({places.length})</button></div>
    {error && <div className={styles.feedback} role="alert"><p>{error}</p>{pending ? <button disabled={busy} onClick={() => void write(pending)}>Retry same change</button> : <div className={styles.actions}><button onClick={() => void load()}>Refresh locations</button>{query.trim().length >= 3 && <button disabled={searching} onClick={() => setSearchAttempt(value => value+1)}>Retry search</button>}</div>}</div>}
    <div className={`${styles.mapPlane} ${view === "places" ? styles.mobileMapHidden : ""}`}>
      <TripMapCanvas pings={pings.pings} privateRoad={privateRoute.road} viewerAvatarUrl={identity?.avatarUrl} inspector={inspector} mapPins={[]} selectedPinId={null} onSelectPin={()=>{}} places={places} canMove={!disabled&&!moving&&!preview} onMove={(id,latitude,longitude)=>{if(plan)setMoving({id,latitude,longitude,revision:plan.revision});}} estimate={road?.estimate?road:undefined} roadFit={roadFit?.routeId === route?.id && roadFit?.key === road?.key ? roadFit?.sequence ?? 0 : 0} hiddenIds={preferences.hidden} activeVisible={!route || !preferences.hiddenRoutes.includes(route.id)} routes={mapRoutes} roads={roads} roadMode={roadMode} roadEnabled={roadEnabled} localLocation={plan ? localLocation.location : null} onDeselect={closeInspector} snapshotReady={!!plan} candidate={preview?.candidate ?? null} selectedId={selectedId} onSelect={select} onSelectGhost={(routeId, id) => { prefer({ ...preferences, activeId: routeId }); setArchived(false); select(id); }} pinMode={pinMode && !disabled} onPin={(lat, lon) => void pin(lat, lon)} />
    <div className={styles.searchPanel}>
      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={18} aria-hidden="true" /><span className={styles.srOnly}>Search Singapore and southern Johor places</span><input aria-label="Search places" placeholder="Search Singapore / JB" maxLength={160} disabled={disabled} value={query} onChange={event => { request.current?.abort(); setSearching(false); setQuery(event.target.value); setResults([]); setSearched(false); setPinMode(false); setPreview(null); setNotice(""); }} /></label>
        <select aria-label="Travel mode" className={styles.control} value={roadEnabled ? roadMode : "planning"} onChange={e => { setRoadEnabled(e.target.value !== "planning"); if (e.target.value !== "planning") setRoadMode(e.target.value as RoadMode); }}><option value="planning">Order</option><option value="walk">Walk</option><option value="drive">Drive</option></select>
        <button className={styles.control} aria-label="Locate me" aria-pressed={!!localLocation.location || localLocation.busy} title="Locate · only on your map" disabled={disabled} onClick={() => { closeInspector(); if (localLocation.location || localLocation.busy) clearOrigin(); else localLocation.locate(); }}><LocateFixed size={17} aria-hidden="true" /><span className={styles.locationLabel}>Locate{localLocation.location ? " on" : ""}</span></button>
        <button className={styles.control} aria-pressed={pinMode} disabled={disabled} onClick={() => { request.current?.abort(); setSearching(false); setQuery(""); setResults([]); setSearched(false); setPreview(null); setView("map"); setPinMode(value => !value); }}><MapPin size={16} aria-hidden="true" />{pinMode ? "Cancel" : "Pin"}</button>
      </div>
      {pings.error&&<p className={styles.helper} role="alert">{pings.error}</p>}
      {roadEnabled && <p className={styles.helper} role="status">{roadError || (roadBusy ? "Calculating route…" : road ? "" : "Choose 2–8 Singapore / southern Johor stops, or route privately from here to your first stop.")}{roadError && <button className="quiet-action" onClick={roadPreview.retry}>Retry route</button>}</p>}
      {localLocation.status && plan && <p className={styles.helper} role="status">{localLocation.status}</p>}
      {(searching || pinMode || (searched && !results.length)) && <p className={styles.helper} role="status">{searching ? "Looking up this place…" : pinMode ? "Click the map to preview a pin. Nothing is saved until you confirm." : "No results found. Try a fuller address or drop a pin."}</p>}
      {!!(results.length || localSuggestions.length || alias) && !preview && <ul className={styles.results} aria-label="Place search results">
        {alias && <li className={styles.searchHint}>Searching for {alias} · select a result to preview</li>}
        {localSuggestions.map(place => <li key={place.id}><button disabled={disabled} onClick={() => void chooseContextPlace(place.id)}><span>{place.title}</span><small>In this context · {place.address || "Manual checkpoint"}</small></button></li>)}
        {results.filter(result => !localSuggestions.some(place => place.latitude === result.candidate.latitude && place.longitude === result.candidate.longitude)).map(result => <li key={result.token}><button disabled={disabled} onClick={() => { request.current?.abort(); setSearching(false); setPreview(result); setSelectedId(null); setNotice("Check the name and position before adding. Search results can be approximate."); }}><span>{result.candidate.title}</span><small>{result.candidate.address}</small></button></li>)}
      </ul>}
      {!preview && notice && <p className={styles.helper} role="status">{notice}</p>}
      <p className={styles.attribution}><a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Search by Geoapify</a></p>
    </div>
    </div>
    <section className={`${styles.cards} ${view === "map" ? styles.mobileMapHidden : ""}`} aria-label="Trip places">
      <button className={styles.trayToggle} aria-label={collapsed?"Expand locations":"Collapse locations"} title={collapsed?"Expand locations":"Collapse locations"} aria-expanded={!collapsed} onClick={()=>setCollapsed(value=>!value)}>{collapsed?<ChevronUp size={18} aria-hidden="true"/>:<ChevronDown size={18} aria-hidden="true"/>}</button>
      {archived && <div className={styles.libraryState}><span>Archived locations in {route?.name}</span><button className={styles.control} onClick={() => { setArchived(false); }}>Back to route</button></div>}
      {plan && <TripRouteControls scope={roomSlug} plan={plan} activeId={route?.id ?? null} ghosts={preferences.ghosts} hiddenRoutes={preferences.hiddenRoutes} showArchive={() => { setArchived(true); }} disabled={disabled} activate={id => { prefer({ ...preferences, activeId: id }); setArchived(false); setSelectedId(null); }} ghost={id => prefer(id === route?.id ? { ...preferences, hiddenRoutes: preferences.hiddenRoutes.includes(id) ? preferences.hiddenRoutes.filter(r => r !== id) : [...preferences.hiddenRoutes,id] } : { ...preferences, ghosts: preferences.ghosts.includes(id) ? preferences.ghosts.filter(g => g !== id) : [...preferences.ghosts,id], hiddenRoutes: preferences.hiddenRoutes.filter(r => r !== id) })} change={change} />}
      {!plan ? <p className={styles.helper} role="status">Loading routes…</p> : <>
        <p className={styles.srOnly} id="trip-card-help">Your private origin comes before shared destination 1. Scroll or drag destination cards; Earlier and Later are available in Place actions.</p>
        <div className={styles.cardStrip} ref={cards} role="list" aria-label="Route locations" aria-describedby="trip-card-help" tabIndex={0}>
          {!archived && localLocation.location && <TripPrivateOrigin location={localLocation.location} avatar={identity?.avatarUrl} canRoute={roadEnabled&&!!routePlaces[0]&&inPlanningRegion(localLocation.location.latitude,localLocation.location.longitude)} consented={consented&&roadEnabled} road={privateRoute.road} error={privateRoute.error} onConsent={()=>setOriginQuestion(originKey)} onClear={clearOrigin} onRefresh={()=>{clearOrigin();localLocation.locate();}} onRetry={privateRoute.retry}/>}
          {shown.map((place, index) => <TripPlaceCard key={place.id} place={place} plan={plan} routeId={route?.id ?? null} index={index} total={shown.length} selected={selectedId === place.id} hidden={preferences.hidden.includes(place.id)} toggleHidden={id => prefer({ ...preferences, hidden: preferences.hidden.includes(id) ? preferences.hidden.filter(p => p !== id) : [...preferences.hidden,id] })} disabled={disabled} select={select} copy={id=>setCopyPlace({id,revision:plan.revision})} comments={id => setCommentId(id)} move={(id, offset) => { const target = places[places.findIndex(p => p.id === id)+offset]; if (target) reorder(id,target.id); }} drop={reorder} change={change} />)}
        </div>
        {shown.length===0 && <div className={styles.cardsEmpty}><MapPin size={20} aria-hidden="true" /><p>{archived ? "No archived locations in this route." : !route ? "Search or pin a place. Your first add creates Route 1." : "Search or pin a place to add it to this route."}</p></div>}
      </>}
    </section>
    {copyPlace && plan && <TripCopyPlace plan={plan} placeId={copyPlace.id} revision={copyPlace.revision} disabled={disabled} busy={busy} error={error} retry={pending?.command.type==="copy-place"?()=>write(pending):undefined} change={change} close={()=>setCopyPlace(null)}/>}
    {originQuestion && <ModalLayer onClose={()=>setOriginQuestion(null)}><section className={`creation-panel ${styles.placeDialog}`} aria-label="Route from your location consent"><h2>Route from your location?</h2><p>Send your precise current coordinates and first destination through Tosker to Geoapify to calculate your private Walk or Drive leg.</p><p>Only you see this leg. Tosker does not save or broadcast your origin. Geoapify processes requests under its <a href="https://www.geoapify.com/privacy-policy/" target="_blank" rel="noopener noreferrer">privacy policy</a>, which includes request retention.</p><p>This allows recalculation for this origin and first destination while Locate stays on. Turning Locate off, reloading or changing context/first destination clears consent. This is not live tracking.</p><div className={styles.actions}><button className={styles.primary} disabled={originQuestion!==originKey||!roadEnabled} onClick={()=>{markMapPhase("origin-consent");setOriginConsent(originKey);setOriginQuestion(null);}}>Allow private route</button><button className={styles.control} onClick={()=>setOriginQuestion(null)}>Keep location local</button></div></section></ModalLayer>}
    {commentPlace && plan && <TripComments key={commentPlace.id} scope={roomSlug} placeId={commentPlace.id} title={commentPlace.title} revision={plan.revision} disabled={disabled} change={change} deny={deny} close={() => setCommentId(null)} saveError={error} retry={pending?.command.type === "comment" && pending.command.placeId === commentPlace.id && !busy ? () => write(pending) : undefined} />}
    {moving && <ModalLayer onClose={()=>{if(!disabled)setMoving(null);}}><section className={`creation-panel ${styles.placeDialog}`} aria-label="Move checkpoint preview"><h2>Move checkpoint?</h2><p>{plan?.places.find(p=>p.id===moving.id)?.title}</p><p>{moving.latitude.toFixed(5)}, {moving.longitude.toFixed(5)}</p><p>Its comments, star and route position stay unchanged. The previous address will be cleared.</p>{moving.revision!==plan?.revision&&<p role="alert">The trip changed. Cancel and move it again from the latest state.</p>}<div className={styles.actions}><button className={styles.primary} disabled={disabled||moving.revision!==plan?.revision} onClick={async()=>{if(await change({type:"move-checkpoint",placeId:moving.id,latitude:moving.latitude,longitude:moving.longitude},moving.revision))setMoving(null);}}>Save position</button><button className={styles.control} disabled={disabled} onClick={()=>setMoving(null)}>Cancel</button></div></section></ModalLayer>}
  </section>;
}
