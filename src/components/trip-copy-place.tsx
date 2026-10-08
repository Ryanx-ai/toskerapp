"use client";
import { useState } from "react";
import type { TripSnapshot } from "@/lib/trip-contract";
import type { TripChange } from "./trip-route-controls";
import { ModalLayer } from "./modal-layer";
import styles from "./room-map-workspace.module.css";

export function TripCopyPlace({plan,placeId,revision,disabled,busy,error,retry,change,close}:{plan:TripSnapshot;placeId:string;revision:number;disabled:boolean;busy:boolean;error:string;retry?:()=>Promise<unknown>;change:TripChange;close():void}) {
  const [destination,setDestination]=useState("");
  const source=plan.places.find(p=>p.id===placeId&&!p.archived);
  const sourceRoute=plan.memberships.find(p=>p.placeId===placeId)?.routeId;
  const routes=plan.routes.filter(r=>!r.archived&&r.id!==sourceRoute);
  const changed=revision!==plan.revision;
  return <ModalLayer onClose={()=>{if(!disabled)close();}}><form className={`creation-panel ${styles.placeDialog} ${styles.editor}`} aria-label="Copy to route" onSubmit={async e=>{e.preventDefault();if(await change({type:"copy-place",placeId,routeId:destination},revision))close();}}>
    <h2>Copy to route</h2><p>{source?.title ?? "This place is no longer available."}</p>
    <p>The source stays unchanged. The destination gets its own place, shared note and tags, without comments or private state. If already there, its existing card is selected.</p>
    {routes.length ? <label>Destination route<select aria-label="Destination route" autoFocus required value={destination} onChange={e=>setDestination(e.target.value)} disabled={disabled}><option value="">Choose a route</option>{routes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label> : <p>Create another route in this context first.</p>}
    {changed&&<p role="alert">The trip changed. Close and reopen to review the latest places.</p>}
    {error&&<p role="alert">{error}</p>}
    <div className={styles.actions}>{retry?<button className={styles.primary} type="button" disabled={busy} onClick={async()=>{if(await retry())close();}}>Retry same copy</button>:<button className={styles.primary} disabled={disabled||changed||!source||!routes.some(r=>r.id===destination)}>Copy to route</button>}<button className={styles.control} type="button" disabled={disabled} onClick={close}>Cancel</button></div>
  </form></ModalLayer>;
}
