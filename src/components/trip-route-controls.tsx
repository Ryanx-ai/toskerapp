"use client";
import { useState } from "react";
import { MoreHorizontal, Plus, Eye, EyeOff, Pencil, Palette, Archive, ArrowLeft, ArrowRight, Share2, X, Sparkles, Trash2 } from "lucide-react";
import { TRIP_COLORS, orderedRoutePlaces, quickOrder, mergeVisibleOrder, type TripColor, type TripCommand, type TripSnapshot } from "@/lib/trip-contract";
import { InteractionPopover } from "./interaction-popover";
import { ModalLayer } from "./modal-layer";
import { RevealName } from "./reveal-name";
import styles from "./room-map-workspace.module.css";

export type TripChange = (command: Exclude<TripCommand, { type: "add" }>, revision?: number) => Promise<{ revision: number; resultId: string | null } | undefined>;
type Props = { plan: TripSnapshot; activeId: string | null; ghosts: string[]; hiddenRoutes: string[]; disabled: boolean; activate(id: string): void; ghost(id: string): void; change: TripChange; showArchive(): void };
export default function TripRouteControls({ plan, activeId, ghosts, hiddenRoutes, disabled, activate, ghost, change, showArchive }: Props) {
  const [nuke,setNuke]=useState<{id:string;name:string;revision:number}|null>(null);
  const [editing, setEditing] = useState<{ id: string | null; name: string; color: TripColor; revision: number } | null>(null);
  const [proposal, setProposal] = useState<{ routeId: string; revision: number; before: string[]; after: string[] } | null>(null);
  const [undo, setUndo] = useState<{ routeId: string; revision: number; ids: string[] } | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; id: string | null } | null>(null), [share, setShare] = useState(false);
  const route = plan.routes.find(r => r.id === activeId && !r.archived);
  const visible = plan.routes.filter(r => !r.archived);
  const menuRoute = plan.routes.find(r => r.id === menu?.id);
  const places = route ? orderedRoutePlaces(plan, route.id) : [];
  const fullOrder = route ? plan.memberships.filter(m => m.routeId === route.id).sort((a,b) => a.position-b.position).map(m => m.placeId) : [];
  const move = (id: string, target: string, revision = plan.revision) => {
    const ids = visible.map(r => r.id), from = ids.indexOf(id), to = ids.indexOf(target);
    if (disabled || from < 0 || to < 0 || from === to) return;
    ids.splice(from,1); ids.splice(to,0,id); let next = 0;
    void change({ type: "order-routes", routeIds: plan.routes.map(r => r.archived ? r.id : ids[next++]) }, revision);
  };
  const editRoute = () => { if (menuRoute) setEditing({ id: menuRoute.id, name: menuRoute.name, color: menuRoute.color, revision: plan.revision }); setMenu(null); };
  return <section className={styles.routes} aria-label="Trip routes">
    <div className={styles.routesBar}><div className={styles.routeStrip} aria-label="Choose active route">
      {visible.map(r => <div key={r.id} className={styles.routeTab} data-route-color={r.color} data-active={r.id === activeId} draggable={!disabled}
        onDragStart={e => { e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("application/x-tosker-route",JSON.stringify({ id:r.id, revision:plan.revision })); }}
        onDragOver={e => { if (!disabled && e.dataTransfer.types.includes("application/x-tosker-route")) e.preventDefault(); }}
        onDrop={e => { e.preventDefault(); try { const data=JSON.parse(e.dataTransfer.getData("application/x-tosker-route")); if (typeof data.id==="string" && Number.isSafeInteger(data.revision)) move(data.id,r.id,data.revision); } catch { /* Not our route. */ } }}>
        <button aria-pressed={r.id === activeId} onClick={() => activate(r.id)}><span className={styles.swatch} aria-hidden="true" /><RevealName>{r.name}</RevealName>{r.id !== activeId && ghosts.includes(r.id) && <Eye size={12} aria-label="Ghost visible" />}</button>
        <button aria-label={`Route actions for ${r.name}`} aria-haspopup="dialog" aria-expanded={menu?.id === r.id} onClick={e => setMenu({ anchor:e.currentTarget,id:r.id })}><MoreHorizontal size={16} aria-hidden="true" /></button>
      </div>)}
      <button className={styles.newRoute} disabled={disabled || plan.routes.length >= 12} onClick={() => setEditing({ id:null,name:`Day ${plan.routes.length+1}`,color:TRIP_COLORS[plan.routes.length % TRIP_COLORS.length],revision:plan.revision })}><Plus size={16} aria-hidden="true" />Route</button>
    </div><div className={styles.actions}>
      <button className={styles.control} disabled={disabled || places.length < 3} aria-label="Quick order" title="Quick order · distance suggestion, not AI" onClick={() => { if (route) setProposal({ routeId:route.id,revision:plan.revision,before:fullOrder,after:mergeVisibleOrder(plan,route.id,quickOrder(places)) }); }}><Sparkles size={16} aria-hidden="true" /></button>
      <button className={styles.control} aria-label="Share route" title="Share route · deferred" onClick={() => setShare(true)}><Share2 size={18} aria-hidden="true" /></button>
    </div></div>
    {!visible.length && plan.routes.some(r=>r.archived) && <button className="quiet-action" onClick={e => setMenu({ anchor:e.currentTarget, id:null })}>Archived routes</button>}
    {menu && <InteractionPopover anchor={menu.anchor} onClose={() => setMenu(null)} label={menuRoute ? `Route actions for ${menuRoute.name}` : "Trip options"}><div className={styles.cardMenu}>
      {menuRoute ? <>
        <button disabled={disabled} onClick={editRoute}><Pencil size={16} aria-hidden="true" />Rename</button>
        <button onClick={() => ghost(menuRoute.id)}>{(menuRoute.id === activeId ? !hiddenRoutes.includes(menuRoute.id) : ghosts.includes(menuRoute.id)) ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}{(menuRoute.id === activeId ? !hiddenRoutes.includes(menuRoute.id) : ghosts.includes(menuRoute.id)) ? "Hide" : "Show"}</button>
        <button disabled={disabled} onClick={editRoute}><Palette size={16} aria-hidden="true" />Change color</button>
        <button onClick={() => { activate(menuRoute.id); showArchive(); setMenu(null); }}>Archived locations</button>
        {plan.routes.filter(r=>r.archived).map(r=><button key={r.id} disabled={disabled} onClick={async()=>{if(await change({type:"archive-route",routeId:r.id,archived:false})){activate(r.id);setMenu(null);}}}>Restore {r.name}</button>)}
        <button disabled={disabled || visible[0]?.id === menuRoute.id} onClick={() => { const i=visible.findIndex(r=>r.id===menuRoute.id); if(i>0)move(menuRoute.id,visible[i-1].id); }}><ArrowLeft size={16} aria-hidden="true" />Move earlier</button>
        <button disabled={disabled || visible.at(-1)?.id === menuRoute.id} onClick={() => { const i=visible.findIndex(r=>r.id===menuRoute.id); if(i<visible.length-1)move(menuRoute.id,visible[i+1].id); }}><ArrowRight size={16} aria-hidden="true" />Move later</button>
        <button onClick={() => {setMenu(null);setShare(true);}}><Share2 size={16} aria-hidden="true" />Share · deferred</button>
        <button disabled={disabled} onClick={async () => { if(await change({type:"archive-route",routeId:menuRoute.id,archived:true}))setMenu(null); }}><Archive size={16} aria-hidden="true" />Archive</button>
        <button className="fp3-nuke-action" disabled={disabled} onClick={()=>{setNuke({id:menuRoute.id,name:menuRoute.name,revision:plan.revision});setMenu(null);}}><Trash2 size={16} aria-hidden="true" />Nuke route</button>
      </> : <>{plan.routes.filter(r=>r.archived).map(r=><button key={r.id} disabled={disabled} onClick={async()=>{if(await change({type:"archive-route",routeId:r.id,archived:false})){activate(r.id);setMenu(null);}}}>Restore {r.name}</button>)}</>}
    </div></InteractionPopover>}
    {nuke && <ModalLayer onClose={()=>{if(!disabled)setNuke(null);}}><section className={`creation-panel ${styles.placeDialog}`} aria-label="Nuke route confirmation">
      <h2>Nuke {nuke.name}?</h2><p>This removes the route and all its locations and comments for everyone. This cannot be undone.</p>
      {nuke.revision!==plan.revision && <p role="alert">The trip changed. Cancel and review it before removing.</p>}
      <div className={styles.actions}><button className="quiet-action" disabled={disabled} onClick={()=>setNuke(null)}>Cancel</button><button className="primary-action fp3-nuke-action" disabled={disabled||nuke.revision!==plan.revision} onClick={async()=>{if(await change({type:"nuke-route",routeId:nuke.id},nuke.revision)){setNuke(null);setProposal(null);setUndo(null);}}}>Nuke route</button></div>
    </section></ModalLayer>}
    {(editing || proposal || share) && <ModalLayer onClose={() => {if(!disabled){setEditing(null);setProposal(null);setShare(false);}}}><section className={`creation-panel ${styles.placeDialog}`}>
      <button className="overlay-close" aria-label="Close route dialog" disabled={disabled} onClick={()=>{setEditing(null);setProposal(null);setShare(false);}}><X size={18} /></button>
      {editing && <form className={styles.editor} aria-label="Route editor" onSubmit={async e => { e.preventDefault(); const result=await change(editing.id ? {type:"edit-route",routeId:editing.id,name:editing.name,color:editing.color} : {type:"create-route",name:editing.name,color:editing.color},editing.revision); if(result){if(result.resultId)activate(result.resultId);setEditing(null);} }}>
        <h2>{editing.id ? "Edit route" : "New route"}</h2><label>Route name<input autoFocus required maxLength={60} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
        <label>Route color<select value={editing.color} onChange={e=>setEditing({...editing,color:e.target.value as TripColor})}>{TRIP_COLORS.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        {editing.revision!==plan.revision && <p role="alert">The trip changed. Close and reopen to review the latest route.</p>}
        <button className={styles.primary} disabled={disabled || editing.revision!==plan.revision}>Save route</button>
      </form>}
      {proposal && <section className={styles.proposal} aria-label="Quick order preview"><h2>Quick order</h2><p>First and last stay fixed. Intermediate places use a straight-line nearest-neighbour suggestion, not road optimization or an ETA.</p><ol>{proposal.after.filter(id=>plan.places.some(p=>p.id===id&&!p.archived)).map(id=><li key={id}>{plan.places.find(p=>p.id===id)?.title}</li>)}</ol>
        {proposal.revision!==plan.revision && <p role="alert">The trip changed. Reopen Quick order; nothing was applied.</p>}
        <button className={styles.primary} disabled={disabled || proposal.revision!==plan.revision} onClick={async()=>{const result=await change({type:"order",routeId:proposal.routeId,placeIds:proposal.after},proposal.revision);if(result){setUndo({routeId:proposal.routeId,revision:result.revision,ids:proposal.before});setProposal(null);}}}>Apply suggested order</button>
      </section>}
      {share && <><h2>Share route</h2><p>Deferred. This route is already shared with current members here. External sharing needs scoped access, revocation and a clear live-versus-snapshot contract. No link or message has been created.</p></>}
    </section></ModalLayer>}
    {undo && plan.routes.some(r=>r.id===undo.routeId) && <div className={styles.routeTools}><button className={styles.control} disabled={disabled || plan.revision!==undo.revision} onClick={async()=>{if(await change({type:"order",routeId:undo.routeId,placeIds:undo.ids},undo.revision))setUndo(null);}}>Undo Quick order</button>{plan.revision!==undo.revision && <span>Trip changed; undo is no longer safe.</span>}</div>}
  </section>;
}
