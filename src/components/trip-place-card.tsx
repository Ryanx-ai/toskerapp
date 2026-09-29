"use client";
import { useState } from "react";
import { Archive, GripVertical, MoreHorizontal } from "lucide-react";
import type { TripPlace, TripSnapshot } from "@/lib/trip-contract";
import type { TripChange } from "./trip-route-controls";
import { InteractionPopover } from "./interaction-popover";
import styles from "./room-map-workspace.module.css";

type Props = { place: TripPlace; plan: TripSnapshot; routeId: string | null; index: number; total: number; selected: boolean; disabled: boolean; select(id: string): void; move(id: string, offset: number): void; drop(id: string, target: string, revision: number): void; change: TripChange };
export default function TripPlaceCard({ place, plan, routeId, index, total, selected, disabled, select, move, drop, change }: Props) {
  const [edit, setEdit] = useState<{ title: string; note: string; revision: number } | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const member = plan.memberships.find(m => m.placeId === place.id && m.routeId === routeId);
  return <article role="listitem" data-place-id={place.id} className={`${styles.placeCard} ${selected ? styles.selectedCard : ""}`} onDragOver={e => { if (!disabled && !place.archived && e.dataTransfer.types.includes("application/x-tosker-place")) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }} onDrop={e => { e.preventDefault(); if (disabled || place.archived) return; try { const data = JSON.parse(e.dataTransfer.getData("application/x-tosker-place")); if (data.routeId === routeId && typeof data.id === "string" && Number.isSafeInteger(data.revision)) drop(data.id, place.id, data.revision); } catch { /* Ignore unrelated drag payloads. */ } }}>
    <button className={styles.cardSelect} aria-pressed={selected} onClick={() => select(place.id)}><span className={styles.ordinal}>{place.archived ? <Archive size={16} aria-hidden="true" /> : index+1}</span><strong>{place.title}</strong><span>{place.address || `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`}</span>{place.note && <span>{place.note}</span>}</button>
    <div className={styles.cardFooter}>
      {!place.archived && routeId && <label className={styles.stopToggle}><input type="checkbox" checked={!!member?.isStop} disabled={disabled} onChange={e => void change({ type: "stop", routeId, placeId: place.id, isStop: e.target.checked })} />Stop</label>}
      {!place.archived && routeId && total > 1 && <button className={styles.dragHandle} aria-label={`Drag to reorder ${place.title}; Move controls in Place actions`} disabled={disabled} draggable={!disabled} onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("application/x-tosker-place", JSON.stringify({ id: place.id, revision: plan.revision, routeId })); }}><GripVertical size={16} aria-hidden="true" /></button>}
      <button className={styles.dragHandle} aria-label={`Place actions for ${place.title}`} aria-haspopup="dialog" aria-expanded={!!anchor} onClick={e => setAnchor(e.currentTarget)}><MoreHorizontal size={18} aria-hidden="true" /></button>
    </div>
    {anchor && <InteractionPopover anchor={anchor} onClose={() => { setAnchor(null); setEdit(null); }} label={`Place actions for ${place.title}`}>
      {!edit ? <div className={styles.cardMenu}>
        {!place.archived && <><button className={styles.control} disabled={disabled} onClick={() => setEdit({ title: place.title, note: place.note, revision: plan.revision })}>Edit place</button>
          <button className={styles.control} disabled={disabled || !routeId || index === 0} onClick={() => move(place.id,-1)}>Move earlier</button><button className={styles.control} disabled={disabled || !routeId || index === total-1} onClick={() => move(place.id,1)}>Move later</button>
          <fieldset disabled={disabled}><legend>Include in routes</legend>{plan.routes.filter(r => !r.archived).map(r => <label key={r.id}><input type="checkbox" checked={plan.memberships.some(m => m.routeId === r.id && m.placeId === place.id)} onChange={e => void change({ type: "membership", routeId: r.id, placeId: place.id, included: e.target.checked })} />{r.name}</label>)}</fieldset>
        </>}
        <button className={styles.control} disabled={disabled} onClick={() => void change({ type: "archive-place", placeId: place.id, archived: !place.archived })}><Archive size={15} aria-hidden="true" />{place.archived ? "Restore" : "Archive"}</button>
        <p>{place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}</p><p>{place.attribution || "Manually selected coordinates"}{place.license ? ` · ${place.license}` : ""}</p>
      </div> : <form className={styles.editor} aria-label={`Edit ${place.title}`} onSubmit={async e => { e.preventDefault(); if (await change({ type: "edit-place", placeId: place.id, title: edit.title, note: edit.note }, edit.revision)) { setEdit(null); setAnchor(null); } }}>
      <label>Place name<input autoFocus required maxLength={120} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></label><label>Shared note<textarea maxLength={1000} value={edit.note} onChange={e => setEdit({ ...edit, note: e.target.value })} /></label>
      {edit.revision !== plan.revision && <p role="alert">The trip changed. Cancel and reopen to review the latest details.</p>}
      <button className={styles.primary} disabled={disabled || edit.revision !== plan.revision}>Save place</button><button className={styles.control} type="button" onClick={() => setEdit(null)}>Cancel edit</button>
    </form>}
    </InteractionPopover>}
  </article>;
}
