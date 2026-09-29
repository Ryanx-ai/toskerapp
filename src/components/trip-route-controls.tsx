"use client";
import { useState } from "react";
import { TRIP_COLORS, orderedRoutePlaces, quickOrder, type TripColor, type TripCommand, type TripSnapshot } from "@/lib/trip-contract";
import styles from "./room-map-workspace.module.css";

export type TripChange = (command: Exclude<TripCommand, { type: "add" }>, revision?: number) => Promise<{ revision: number; resultId: string | null } | undefined>;
type Props = { plan: TripSnapshot; activeId: string | null; ghosts: string[]; disabled: boolean; activate(id: string): void; ghost(id: string): void; change: TripChange };
/** Reorders visible places while retaining archived memberships in their slots. */
export function mergeVisibleOrder(plan: TripSnapshot, routeId: string, visibleIds: string[]) {
  const ids = new Set(visibleIds); let next = 0;
  return plan.memberships.filter(m => m.routeId === routeId).sort((a,b) => a.position-b.position || a.placeId.localeCompare(b.placeId)).map(m => ids.has(m.placeId) ? visibleIds[next++] : m.placeId);
}
export default function TripRouteControls({ plan, activeId, ghosts, disabled, activate, ghost, change }: Props) {
  const [editing, setEditing] = useState<{ id: string | null; name: string; color: TripColor; revision: number } | null>(null);
  const [proposal, setProposal] = useState<{ routeId: string; revision: number; before: string[]; after: string[] } | null>(null);
  const [undo, setUndo] = useState<{ routeId: string; revision: number; ids: string[] } | null>(null);
  const [start, setStart] = useState("");
  const route = plan.routes.find(r => r.id === activeId && !r.archived);
  const places = route ? orderedRoutePlaces(plan, route.id) : [];
  const fullOrder = route ? plan.memberships.filter(m => m.routeId === route.id).sort((a,b) => a.position-b.position).map(m => m.placeId) : [];
  return <section className={styles.routes} aria-label="Trip routes">
    <div className={styles.routeStrip} aria-label="Choose active route">{plan.routes.filter(r => !r.archived).map(r => <button key={r.id} className={styles.control} data-route-color={r.color} aria-pressed={r.id === activeId} onClick={() => { activate(r.id); setProposal(null); setEditing(null); }}><span className={styles.swatch} aria-hidden="true" />{r.name}{r.id === activeId ? " · Active" : ""}</button>)}<button className={styles.control} disabled={disabled || plan.routes.length >= 12} onClick={() => setEditing({ id: null, name: `Day ${plan.routes.length+1}`, color: TRIP_COLORS[plan.routes.length % TRIP_COLORS.length], revision: plan.revision })}>New route</button></div>
    <div className={styles.routeTools}>
      {route && <button className={styles.control} disabled={disabled} onClick={() => setEditing({ id: route.id, name: route.name, color: route.color, revision: plan.revision })}>Edit route</button>}
      <details className={styles.routeDetails}><summary>Route visibility & archive</summary><p>Active is solid. Ghost routes are dashed and labelled. Visibility is just for you.</p>{plan.routes.map(r => <div key={r.id} className={styles.routeRow}>
        <span>{r.name}{r.archived ? " · Archived" : r.id === activeId ? " · Active" : ""}</span>
        {!r.archived && r.id !== activeId && <label><input type="checkbox" checked={ghosts.includes(r.id)} onChange={() => ghost(r.id)} />Ghost</label>}
        <button className={styles.control} disabled={disabled} onClick={() => void change({ type: "archive-route", routeId: r.id, archived: !r.archived })}>{r.archived ? `Restore ${r.name}` : `Archive ${r.name}`}</button>
      </div>)}</details>
      {places.length > 1 && <><label className={styles.inlineField}>Start at<select value={places.some(p => p.id === start) ? start : places[0].id} onChange={e => setStart(e.target.value)}>{places.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><button className={styles.control} disabled={disabled} onClick={() => { if (route) setProposal({ routeId: route.id, revision: plan.revision, before: fullOrder, after: mergeVisibleOrder(plan, route.id, quickOrder(places, places.some(p => p.id === start) ? start : places[0].id)) }); }}>Quick order</button></>}
    </div>
    {editing && <form className={styles.editor} aria-label="Route editor" onSubmit={async e => { e.preventDefault(); const result = await change(editing.id ? { type: "edit-route", routeId: editing.id, name: editing.name, color: editing.color } : { type: "create-route", name: editing.name, color: editing.color }, editing.revision); if (result) { if (result.resultId) activate(result.resultId); setEditing(null); } }}>
      <label>Route name<input required maxLength={60} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></label>
      <label>Route color<select value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value as TripColor })}>{TRIP_COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      {editing.revision !== plan.revision && <p role="status">The trip changed while editing. Cancel and reopen to review the latest route.</p>}
      <div className={styles.actions}><button className={styles.primary} disabled={disabled || editing.revision !== plan.revision}>Save route</button><button type="button" className={styles.control} onClick={() => setEditing(null)}>Cancel route edit</button></div>
    </form>}
    {proposal && <section className={styles.proposal} aria-label="Quick order preview"><h3>Suggested planning order</h3><p>Straight-line nearest-neighbour suggestion. Not road directions, an optimal route or an ETA. Only Stops are connected on the map.</p><ol>{proposal.after.filter(id => plan.places.some(p => p.id === id && !p.archived)).map(id => <li key={id}>{plan.places.find(p => p.id === id)?.title}</li>)}</ol>
      {proposal.revision !== plan.revision && <p role="alert">The trip changed. Dismiss this preview and calculate again; nothing was applied.</p>}
      <div className={styles.actions}><button className={styles.primary} disabled={disabled || proposal.revision !== plan.revision} onClick={async () => { const result = await change({ type: "order", routeId: proposal.routeId, placeIds: proposal.after }, proposal.revision); if (result) { setUndo({ routeId: proposal.routeId, revision: result.revision, ids: proposal.before }); setProposal(null); } }}>Apply suggested order</button><button className={styles.control} onClick={() => setProposal(null)}>Dismiss preview</button></div>
    </section>}
    {undo && <div className={styles.routeTools}><button className={styles.control} disabled={disabled || plan.revision !== undo.revision} onClick={async () => { if (await change({ type: "order", routeId: undo.routeId, placeIds: undo.ids }, undo.revision)) setUndo(null); }}>Undo Quick order</button>{plan.revision !== undo.revision && <span>Trip changed since this suggestion; undo is no longer safe.</span>}</div>}
  </section>;
}
