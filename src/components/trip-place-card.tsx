"use client";
import { useState } from "react";
import { Archive, MoreHorizontal, Eye, EyeOff, Star, Info, Copy, X, MapPin, Trash2, ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import type { TripPlace, TripSnapshot } from "@/lib/trip-contract";
import type { TripChange } from "./trip-route-controls";
import { InteractionPopover } from "./interaction-popover";
import { ModalLayer } from "./modal-layer";
import { RevealName } from "./reveal-name";
import styles from "./room-map-workspace.module.css";

type Props = { place: TripPlace; plan: TripSnapshot; routeId: string | null; index: number; total: number; selected: boolean; hidden: boolean; disabled: boolean; comments(id: string): void; toggleHidden(id: string): void; select(id: string): void; move(id: string, offset: number): void; drop(id: string, target: string, revision: number): void; change: TripChange };
export default function TripPlaceCard({ place, plan, routeId, index, total, selected, hidden, disabled, comments, toggleHidden, select, move, drop, change }: Props) {
  const [edit, setEdit] = useState<{ title: string; note: string; revision: number } | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<"info" | "nuke" | null>(null), [confirmRevision, setConfirmRevision] = useState(0), [copyState, setCopyState] = useState("");
  const color = plan.routes.find(r => r.id === routeId)?.color ?? "gold";
  const canDrag = !disabled && !place.archived && !!routeId && total > 1;
  return <article role="listitem" data-place-id={place.id} data-route-color={color} data-starred={!!place.starred} data-hidden={hidden} className={`${styles.placeCard} ${selected ? styles.selectedCard : ""}`} draggable={canDrag}
    onDragStart={e => { if (!canDrag) return; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("application/x-tosker-place", JSON.stringify({ id: place.id, revision: plan.revision, routeId })); }}
    onDragOver={e => { if (canDrag && e.dataTransfer.types.includes("application/x-tosker-place")) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
    onDrop={e => { e.preventDefault(); if (!canDrag) return; try { const data = JSON.parse(e.dataTransfer.getData("application/x-tosker-place")); if (data.routeId === routeId && typeof data.id === "string" && Number.isSafeInteger(data.revision)) drop(data.id, place.id, data.revision); } catch { /* Unrelated drag payload. */ } }}>
    <button className={styles.cardSelect} aria-pressed={selected} aria-label={`Select place ${index+1}: ${place.title}`} onClick={() => select(place.id)}>
      <span className={styles.cardVisual} aria-hidden="true"><MapPin size={30} strokeWidth={1.25} /></span>
      <span className={styles.cardInfo}><span className={styles.cardTitle}><span className={styles.ordinal}>{place.archived ? <Archive size={13} aria-hidden="true" /> : index+1}</span><strong><RevealName>{place.title}</RevealName></strong></span><span className={styles.cardAddress}>{place.address || "Manually selected pin"}</span></span>
    </button>
    <div className={styles.cardActions}><button aria-label={`Comments on ${place.title}, ${place.commentCount ?? 0}`} onClick={() => comments(place.id)}><MessageCircle size={14} aria-hidden="true" /><span>{place.commentCount ?? 0}</span></button><button aria-label={hidden ? `Show ${place.title} on my map` : `Hide ${place.title} from my map`} aria-pressed={!hidden} onClick={() => toggleHidden(place.id)}>{hidden ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}</button></div>
    <div className={styles.cardIndicators}>{place.starred && <span aria-label="Starred place"><Star size={14} fill="currentColor" aria-hidden="true" /></span>}{hidden && <span aria-label="Hidden from your map"><EyeOff size={14} aria-hidden="true" /></span>}</div>
    <button className={styles.cardMore} aria-label={`Place actions for ${place.title}`} aria-haspopup="dialog" aria-expanded={!!anchor} onClick={e => setAnchor(e.currentTarget)}><MoreHorizontal size={18} aria-hidden="true" /></button>
    {anchor && <InteractionPopover anchor={anchor} onClose={() => { setAnchor(null); setEdit(null); }} label={`Place actions for ${place.title}`}>
      {!edit ? <div className={styles.cardMenu}>
        <button onClick={() => { setAnchor(null); setCopyState(""); setDialog("info"); }}><Info size={16} aria-hidden="true" />Get info</button>
        {!place.archived && <>
          <button aria-pressed={!hidden} onClick={() => toggleHidden(place.id)}>{hidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{hidden ? "Show on my map" : "Hide from my map"}</button>
          <button disabled={disabled} aria-pressed={!!place.starred} onClick={() => void change({ type: "star-place", placeId: place.id, starred: !place.starred })}><Star size={16} aria-hidden="true" />{place.starred ? "Unstar" : "Star"}</button>
          <button disabled={disabled} onClick={() => setEdit({ title: place.title, note: place.note, revision: plan.revision })}>Edit note</button>
          <button disabled={disabled || !routeId || index === 0} onClick={() => move(place.id,-1)}><ArrowLeft size={16} aria-hidden="true" />Move earlier</button><button disabled={disabled || !routeId || index === total-1} onClick={() => move(place.id,1)}><ArrowRight size={16} aria-hidden="true" />Move later</button>
        </>}
        <button disabled={disabled} onClick={() => void change({ type: "archive-place", placeId: place.id, archived: !place.archived })}><Archive size={16} aria-hidden="true" />{place.archived ? "Restore" : "Archive"}</button>
        <button disabled={disabled} onClick={() => { setAnchor(null); setConfirmRevision(plan.revision); setDialog("nuke"); }}><Trash2 size={16} aria-hidden="true" />Nuke</button>
      </div> : <form className={styles.editor} aria-label={`Edit ${place.title}`} onSubmit={async e => { e.preventDefault(); if (await change({ type: "edit-place", placeId: place.id, title: edit.title, note: edit.note }, edit.revision)) { setEdit(null); setAnchor(null); } }}>
        <p>{place.title}</p><label>Shared note<textarea autoFocus maxLength={1000} value={edit.note} onChange={e => setEdit({ ...edit, note: e.target.value })} /></label>
        {edit.revision !== plan.revision && <p role="alert">The trip changed. Cancel and reopen to review the latest details.</p>}
        <button className={styles.primary} disabled={disabled || edit.revision !== plan.revision}>Save</button><button className={styles.control} type="button" onClick={() => setEdit(null)}>Cancel</button>
      </form>}
    </InteractionPopover>}
    {dialog && <ModalLayer onClose={() => { if (!disabled) setDialog(null); }}><section className={`creation-panel ${styles.placeDialog}`} aria-labelledby={`place-info-${place.id}`}>
      <button className="overlay-close" disabled={disabled} aria-label="Close place details" onClick={() => setDialog(null)}><X size={18} /></button>
      <h2 id={`place-info-${place.id}`}>{dialog === "nuke" ? "Nuke this place?" : place.title}</h2>
      {dialog === "info" ? <><p>{place.address || "Manually selected pin"}</p><p>{place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}</p>{place.note && <p>{place.note}</p>}<p className={styles.cardDetails}>{place.attribution || "Manually selected coordinates"}{place.license ? ` · ${place.license}` : ""}</p><button className="quiet-action" onClick={async () => { try { await navigator.clipboard.writeText(place.address || `${place.latitude}, ${place.longitude}`); setCopyState("Copied"); } catch { setCopyState("Copy unavailable. Select the address above to copy it."); } }}><Copy size={16} aria-hidden="true" />Copy address</button><p role="status">{copyState}</p></> : <><p><strong>{place.title}</strong> and its comments will be permanently removed from this route for everyone. Locations in other routes stay unchanged. This cannot be undone.</p>{confirmRevision !== plan.revision && <p role="alert">The trip changed. Close and reopen to review before removing.</p>}<div className={styles.actions}><button className="primary-action" disabled={disabled || confirmRevision !== plan.revision} onClick={() => void change({ type: "nuke-place", placeId: place.id }, confirmRevision)}>Nuke place</button><button className="quiet-action" disabled={disabled} onClick={() => setDialog(null)}>Cancel</button></div></>}
    </section></ModalLayer>}
  </article>;
}
