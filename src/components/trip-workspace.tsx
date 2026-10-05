"use client";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { MapPin, Search, List, Map as MapIcon, X, LocateFixed, ChevronDown, ChevronUp } from "lucide-react";
import { readTripAction, mutateTripAction } from "@/server/trips/actions";
import { ACTIVITY_REFRESH, CONVERSATION_ACCESS_LOST, TRIP_REFRESH } from "@/lib/realtime-contract";
import { orderedRoutePlaces, routingPlaces, nextCheckpointName, isCoordinatePinTitle, mergeVisibleOrder, recoverActiveRoute, type PlaceCandidate, type TripSnapshot } from "@/lib/trip-contract";
import { ModalLayer } from "./modal-layer";
import { type RoadMode } from "@/lib/maps/road-contract";
import { useTripRoadPreview } from "./use-trip-road-preview";
import TripMapCanvas from "./trip-map-canvas";
import TripRouteControls from "./trip-route-controls";
import TripPlaceCard from "./trip-place-card";
import { TripComments } from "./trip-comments";
import { useLocalMapLocation } from "./use-local-map-location";
import { useToskerIdentity } from "./tosker-identity";
import styles from "./room-map-workspace.module.css";

type Preview = { candidate: PlaceCandidate; token: string };
type Pending = Parameters<typeof mutateTripAction>[0];
export default function TripWorkspace({ roomSlug, conversationId }: { roomSlug: string; conversationId: string }) {
  const [plan, setPlan] = useState<TripSnapshot | null>(null), [error, setError] = useState("");
  const [query, setQuery] = useState(""), [results, setResults] = useState<Preview[]>([]), [searching, setSearching] = useState(false), [searched, setSearched] = useState(false), [searchAttempt, setSearchAttempt] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null), [notice, setNotice] = useState("");
  const [pinMode, setPinMode] = useState(false), [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [pending, setPending] = useState<Pending | null>(null);
  const [archived, setArchived] = useState(false), [view, setView] = useState<"map" | "places">("map");
  const [commentId, setCommentId] = useState<string | null>(null);
  const localLocation = useLocalMapLocation();
  const clearLocalLocation = localLocation.clear;
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
  const deny = useCallback(() => {
    clearLocalLocation();
    accessDenied.current = true; request.current?.abort(); setPlan(null); setPreview(null); setResults([]); setSelectedId(null); setPending(null); setCommentId(null); setMoving(null);
    try { sessionStorage.removeItem(preferenceKey); } catch { /* No retained plan data is stored locally. */ }
    setError("Your access to this trip is no longer available.");
    window.dispatchEvent(new CustomEvent(CONVERSATION_ACCESS_LOST, { detail: conversationId }));
  }, [conversationId, preferenceKey, clearLocalLocation]);
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
    if (query.trim().length < 3) return;
    if (accessDenied.current) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    const timer = setTimeout(async () => {
      setSearching(true); setSearched(false);
      try {
        const response = await fetch(`/api/trips/${encodeURIComponent(roomSlug)}/places`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "search", query: query.trim() }), signal: controller.signal, cache: "no-store" });
        const data = await response.json(); if (controller.signal.aborted || !alive.current || accessDenied.current) return;
        if (response.status === 403) { deny(); return; }
        if (!response.ok) { setError(data.error || "Place lookup unavailable."); return; }
        setResults(data.candidates); setSearched(true); setError("");
      } catch { if (!controller.signal.aborted && alive.current) setError("Place lookup could not finish. Change the search or try again."); }
      finally { if (!controller.signal.aborted && alive.current) setSearching(false); }
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, roomSlug, deny, searchAttempt]);
  const select = useCallback((id: string) => {
    setSelectedId(id); setPreview(null);
    requestAnimationFrame(() => cards.current?.querySelector<HTMLElement>(`[data-place-id="${id}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }));
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
      setPreview(data.candidates[0]); setNotice(data.notice); setPinMode(false);
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
      setPending(null); await load();
      if (input.command.type === "add") { setPreview(null); setResults([]); setQuery(""); setSearched(false); setSelectedId(result.value.resultId); setNotice("Added to this shared trip."); }
      else { setNotice(""); if (input.command.type === "nuke-place") setSelectedId(null); }
      return result.value;
    } catch { if (alive.current) setError("Save acknowledgement was lost. Retry the same change to confirm it safely."); }
    finally { writing.current = false; if (alive.current) setBusy(false); }
  };
  const change = async (command: Pending["command"], revision = plan?.revision) => { if (plan && revision !== undefined) return write({ protocol:4, roomSlug, expectedRevision: revision, requestId: crypto.randomUUID(), command }); };
  useEffect(() => { if (!notice || preview) return; const timer = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(timer); }, [notice, preview]);
  const route = plan?.routes.find(route => route.id === preferences.activeId && !route.archived) ?? plan?.routes.find(route => !route.archived);
  const places = useMemo(() => plan && route ? orderedRoutePlaces(plan, route.id) : [], [plan, route]);
  const mapRoutes = useMemo(() => plan ? plan.routes.filter(r => !r.archived && !preferences.hiddenRoutes.includes(r.id) && (r.id === route?.id || preferences.ghosts.includes(r.id))).map(r => ({ ...r, ghost: r.id !== route?.id, places: orderedRoutePlaces(plan, r.id) })) : [], [plan, route, preferences.ghosts, preferences.hiddenRoutes]);
  const ownedIds=new Set(plan?.memberships.filter(m=>m.routeId===route?.id).map(m=>m.placeId));
  const shown = archived ? plan?.places.filter(place => place.archived&&ownedIds.has(place.id)) ?? [] : places;
  const routePlaces = plan && route ? routingPlaces(plan,route.id) : [];
  const roadPreview=useTripRoadPreview(roomSlug,route?.id??null,routePlaces,roadMode,roadEnabled&&!!plan,deny);
  const {roads,fit:roadFit,current:road,busy:roadBusy,error:roadError}=roadPreview;
  const previewTitle = preview?.candidate.source==="pin" && isCoordinatePinTitle(preview.candidate.title) ? nextCheckpointName(plan?.places.filter(p=>ownedIds.has(p.id))??[]) : preview?.candidate.title;
  const disabled = busy || !!pending || !plan;
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector('[role="dialog"], [aria-modal="true"]') || (event.target as Element)?.closest('input, textarea, select, [contenteditable="true"]')) return;
      setSelectedId(null); setPinMode(false);
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
  return <section className={styles.workspace} data-tray-collapsed={collapsed} aria-label="Trip Map" data-trip-revision={plan?.revision} onClick={event => { if (!(event.target as Element).closest('button, a, input, textarea, select, summary, [role="dialog"], [data-place-id], .maplibregl-map')) setSelectedId(null); }}>
    <div className={styles.mobileViews} aria-label="Map view"><button aria-pressed={view === "map"} onClick={() => setView("map")}><MapIcon size={16} aria-hidden="true" />Map</button><button aria-pressed={view === "places"} onClick={() => setView("places")}><List size={16} aria-hidden="true" />Places ({plan?.places.filter(p => !p.archived).length ?? 0})</button></div>
    {error && <div className={styles.feedback} role="alert"><p>{error}</p>{pending ? <button disabled={busy} onClick={() => void write(pending)}>Retry same change</button> : <div className={styles.actions}><button onClick={() => void load()}>Refresh locations</button>{query.trim().length >= 3 && <button disabled={searching} onClick={() => setSearchAttempt(value => value+1)}>Retry search</button>}</div>}</div>}
    <div className={`${styles.mapPlane} ${view === "places" ? styles.mobileMapHidden : ""}`}>
      <TripMapCanvas places={places} canMove={!disabled&&!moving&&!preview} onMove={(id,latitude,longitude)=>{if(plan)setMoving({id,latitude,longitude,revision:plan.revision});}} estimate={road?.estimate?road:undefined} roadFit={roadFit?.routeId === route?.id && roadFit?.key === road?.key ? roadFit?.sequence ?? 0 : 0} hiddenIds={preferences.hidden} activeVisible={!route || !preferences.hiddenRoutes.includes(route.id)} routes={mapRoutes} roads={roads} roadMode={roadMode} roadEnabled={roadEnabled} localLocation={plan ? localLocation.location : null} onDeselect={() => setSelectedId(null)} snapshotReady={!!plan} candidate={preview?.candidate ?? null} selectedId={selectedId} onSelect={select} onSelectGhost={(routeId, id) => { prefer({ ...preferences, activeId: routeId }); setArchived(false); select(id); }} pinMode={pinMode && !disabled} onPin={(lat, lon) => void pin(lat, lon)} />
    <div className={styles.searchPanel}>
      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={18} aria-hidden="true" /><span className={styles.srOnly}>Search Singapore places</span><input aria-label="Search places" placeholder="Search Singapore places" maxLength={160} disabled={disabled || !route} value={query} onChange={event => { request.current?.abort(); setSearching(false); setQuery(event.target.value); setResults([]); setSearched(false); setPinMode(false); setPreview(null); setNotice(""); }} /></label>
        <select aria-label="Travel mode" className={styles.control} value={roadEnabled ? roadMode : "planning"} onChange={e => { setRoadEnabled(e.target.value !== "planning"); if (e.target.value !== "planning") setRoadMode(e.target.value as RoadMode); }}><option value="planning">Order</option><option value="walk">Walk</option><option value="drive">Drive</option></select>
        <button className={styles.control} aria-label="Locate me" title="Locate · only on your map" disabled={disabled || localLocation.busy} onClick={() => { setSelectedId(null); localLocation.locate(); }}><LocateFixed size={17} aria-hidden="true" /><span className={styles.locationLabel}>Locate</span></button>
        <button className={styles.control} aria-pressed={pinMode} disabled={disabled || !route} onClick={() => { request.current?.abort(); setSearching(false); setQuery(""); setResults([]); setSearched(false); setPreview(null); setView("map"); setPinMode(value => !value); }}><MapPin size={16} aria-hidden="true" />{pinMode ? "Cancel" : "Pin"}</button>
      </div>
      {roadEnabled && <p className={styles.helper} role="status">{roadError || (roadBusy ? "Calculating roads…" : road ? "" : "Road preview needs 2–8 included Singapore locations.")}{roadError && <button className="quiet-action" onClick={roadPreview.retry}>Retry roads</button>}</p>}
      {localLocation.status && plan && <p className={styles.helper} role="status">{localLocation.status} <button className="quiet-action" onClick={localLocation.clear} aria-label="Clear my location">Clear</button></p>}
      {(searching || pinMode || (searched && !results.length)) && <p className={styles.helper} role="status">{searching ? "Looking up this place…" : pinMode ? "Click the map to preview a pin. Nothing is saved until you confirm." : "No results found. Try a fuller address or drop a pin."}</p>}
      {results.length > 0 && !preview && <ul className={styles.results} aria-label="Place search results">{results.map((result, index) => <li key={result.token}><button disabled={disabled} onClick={() => { setPreview(result); setSelectedId(null); setNotice("Check the name and position before adding. Search results can be approximate."); }}><span>{index + 1}. {result.candidate.title}</span><small>{result.candidate.address}</small></button></li>)}</ul>}
      {preview && <ModalLayer onClose={() => { if (!disabled) { request.current?.abort(); setSearching(false); setPreview(null); setNotice(""); } }}><section className={`creation-panel ${styles.preview}`} aria-label="Place preview"><button className="overlay-close" disabled={disabled} aria-label="Close place preview" onClick={() => { request.current?.abort(); setSearching(false); setPreview(null); setNotice(""); }}><X size={18} /></button>
        <div><span className={styles.previewLabel}>Not saved yet</span><h2>{previewTitle}</h2><p>{preview.candidate.address || "Manually selected point"}</p><p>{preview.candidate.latitude.toFixed(5)}, {preview.candidate.longitude.toFixed(5)}</p><p>{notice}</p>{preview.candidate.attribution && <small>{preview.candidate.attribution} · {preview.candidate.license}</small>}</div>
        <div className={styles.actions}><button className={styles.primary} disabled={disabled || !preview.token || !route} onClick={() => change({ type: "add", token: preview.token, routeId: route?.id ?? null })}>{busy ? "Saving…" : preview.candidate.source === "pin" ? "Confirm pin" : "Add to trip"}</button><button className={styles.control} disabled={busy || !!pending} onClick={() => { request.current?.abort(); setSearching(false); setPreview(null); setNotice(""); }}>Cancel</button></div>
      </section></ModalLayer>}
      {!preview && notice && <p className={styles.helper} role="status">{notice}</p>}
      <p className={styles.attribution}><a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Search by Geoapify</a></p>
    </div>
    </div>
    <section className={`${styles.cards} ${view === "map" ? styles.mobileMapHidden : ""}`} aria-label="Trip places">
      <button className={styles.trayToggle} aria-label={collapsed?"Expand Location Cards":"Collapse Location Cards"} aria-expanded={!collapsed} onClick={()=>setCollapsed(value=>!value)}>{collapsed?<ChevronUp size={16}/>:<ChevronDown size={16}/>}<span>{collapsed?"Show places":"Collapse"}</span></button>
      {archived && <div className={styles.libraryState}><span>Archived locations in {route?.name}</span><button className={styles.control} onClick={() => { setArchived(false); }}>Back to route</button></div>}
      {plan && <TripRouteControls plan={plan} activeId={route?.id ?? null} ghosts={preferences.ghosts} hiddenRoutes={preferences.hiddenRoutes} showArchive={() => { setArchived(true); }} disabled={disabled} activate={id => { prefer({ ...preferences, activeId: id }); setArchived(false); setSelectedId(null); }} ghost={id => prefer(id === route?.id ? { ...preferences, hiddenRoutes: preferences.hiddenRoutes.includes(id) ? preferences.hiddenRoutes.filter(r => r !== id) : [...preferences.hiddenRoutes,id] } : { ...preferences, ghosts: preferences.ghosts.includes(id) ? preferences.ghosts.filter(g => g !== id) : [...preferences.ghosts,id], hiddenRoutes: preferences.hiddenRoutes.filter(r => r !== id) })} change={change} />}
      {!plan ? <p className={styles.helper} role="status">Loading routes…</p> : shown.length === 0 ? <div className={styles.cardsEmpty}><MapPin size={20} aria-hidden="true" /><p>{archived ? "No archived locations in this route." : !route ? "Create a route to begin, then search or pin a place." : "Search or pin a place to add it to this route."}</p></div> : <><p className={styles.srOnly} id="trip-card-help">Scroll or drag cards; Move earlier/later is available in Place actions.</p><div className={styles.cardStrip} ref={cards} role="list" aria-label="Route locations" aria-describedby="trip-card-help" tabIndex={0}>{shown.map((place, index) => <TripPlaceCard key={place.id} place={place} plan={plan} routeId={route?.id ?? null} index={index} total={shown.length} selected={selectedId === place.id} hidden={preferences.hidden.includes(place.id)} toggleHidden={id => prefer({ ...preferences, hidden: preferences.hidden.includes(id) ? preferences.hidden.filter(p => p !== id) : [...preferences.hidden,id] })} disabled={disabled} select={select} comments={id => setCommentId(id)} move={(id, offset) => { const target = places[places.findIndex(p => p.id === id)+offset]; if (target) reorder(id,target.id); }} drop={reorder} change={change} />)}</div></>}
    </section>
    {commentPlace && plan && <TripComments key={commentPlace.id} scope={roomSlug} placeId={commentPlace.id} title={commentPlace.title} revision={plan.revision} disabled={disabled} change={change} deny={deny} close={() => setCommentId(null)} saveError={error} retry={pending?.command.type === "comment" && pending.command.placeId === commentPlace.id && !busy ? () => write(pending) : undefined} />}
    {moving && <ModalLayer onClose={()=>{if(!disabled)setMoving(null);}}><section className={`creation-panel ${styles.placeDialog}`} aria-label="Move checkpoint preview"><h2>Move checkpoint?</h2><p>{plan?.places.find(p=>p.id===moving.id)?.title}</p><p>{moving.latitude.toFixed(5)}, {moving.longitude.toFixed(5)}</p><p>Its comments, star and route position stay unchanged. The previous address will be cleared.</p>{moving.revision!==plan?.revision&&<p role="alert">The trip changed. Cancel and move it again from the latest state.</p>}<div className={styles.actions}><button className={styles.primary} disabled={disabled||moving.revision!==plan?.revision} onClick={async()=>{if(await change({type:"move-checkpoint",placeId:moving.id,latitude:moving.latitude,longitude:moving.longitude},moving.revision))setMoving(null);}}>Save position</button><button className={styles.control} disabled={disabled} onClick={()=>setMoving(null)}>Cancel</button></div></section></ModalLayer>}
  </section>;
}
