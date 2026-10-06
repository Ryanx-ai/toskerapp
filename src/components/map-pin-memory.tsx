"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MAP_PIN_STATES, pinState, type MapPin, type MapPinState } from "@/lib/map-pin-contract";
import { addPinToRouteAction, pinRouteChoicesAction } from "@/server/map-pins/actions";
import type { useMapPins } from "./use-map-pins";
import { ModalLayer } from "./modal-layer";
import styles from "./room-map-workspace.module.css";

export function PinStatePicker({value,onChange,disabled=false}:{value:MapPinState;onChange(value:MapPinState):void;disabled?:boolean}) {
  return <label className={styles.pinStatePicker}>Pin state<select aria-label="Pin state" className={styles.control} disabled={disabled} value={value} onChange={e=>onChange(e.target.value as MapPinState)}>{MAP_PIN_STATES.map(s=><option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}</select></label>;
}
type Memory = ReturnType<typeof useMapPins>;
export default function MapPinMemory({memory,sandbox,currentRouteId,onRouteAdded}:{memory:Memory;sandbox:boolean;currentRouteId?:string;onRouteAdded():void}) {
  return <section className={styles.pinMemory} aria-label={sandbox?"Your Map Pins":"Map Pins"}>
    <details open={sandbox || undefined}><summary>Map Pins ({memory.pins.length}{memory.next?"+":""})</summary>
      <p className={styles.helper}>{sandbox?"Your private places and places pinned together. Shared places keep their source.":"Places that matter to this group, independent of Routes."}</p>
      {memory.error && <div role="alert" className={styles.feedback}><p>{memory.error}</p><button disabled={memory.busy} onClick={()=>void(memory.pending?memory.retry():memory.refresh())}>{memory.pending?"Retry same Pin change":"Refresh Pins"}</button></div>}
      {!memory.ready?<p className={styles.helper}>Refreshing authorized Pins…</p>:!memory.pins.length?<p className={styles.helper}>No saved Map Pins here. New trip places are added directly to your selected Route.</p>:<ul className={styles.pinList}>{memory.pins.map(pin=><li key={pin.id}><button className={styles.pinChip} aria-label={`Open ${pinState(pin.state).label} Pin: ${pin.title}`} onClick={()=>memory.select(pin.id)}><span aria-hidden="true">{pinState(pin.state).icon}</span><span><strong>{pin.title}</strong><small>{pinState(pin.state).label}{sandbox?` · ${pin.contextName}`:""}</small></span></button></li>)}</ul>}
      <div className={styles.actions}>{memory.paged&&<button className={styles.control} onClick={()=>void memory.refresh()}>Latest Pins</button>}{memory.next && <button className={styles.control} onClick={()=>void memory.refresh(memory.next!)}>Next Pins</button>}</div>
    </details>
    {memory.selected && <PinDetail key={`${memory.selected.id}:${memory.selected.revision}:${memory.selected.preferenceRevision}`} pin={memory.selected} memory={memory} sandbox={sandbox} currentRouteId={currentRouteId} onRouteAdded={onRouteAdded}/>}
  </section>;
}
function PinDetail({pin,memory,sandbox,currentRouteId,onRouteAdded}:{pin:MapPin;memory:Memory;sandbox:boolean;currentRouteId?:string;onRouteAdded():void}) {
  const [state,setState]=useState(pin.state),[nuking,setNuking]=useState(false),[adding,setAdding]=useState(false);
  const [choices,setChoices]=useState<{id:string;name:string;revision:number;contextName:string;scope:string}[]>([]),[target,setTarget]=useState("");
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[pending,setPending]=useState<Parameters<typeof addPinToRouteAction>[0]|null>(null);
  useEffect(()=>{
    if(!adding)return;let active=true;
    void pinRouteChoicesAction().then(result=>{if(!active)return;if(result.ok){setChoices(result.value);setTarget(result.value.some(r=>r.id===currentRouteId)?currentRouteId!:result.value[0]?.id??"");}else setError(result.message);}).catch(()=>{if(active)setError("Routes could not be refreshed.");});
    return()=>{active=false;};
  },[adding,currentRouteId]);
  const copy=async(input:Parameters<typeof addPinToRouteAction>[0])=>{
    setBusy(true);setPending(input);setError("");
    try{const result=await addPinToRouteAction(input);if(result.ok){setPending(null);onRouteAdded();memory.select(null);}else{setError(result.message);if(result.code!=="unavailable")setPending(null);if(result.code==="denied"){memory.select(null);void memory.refresh();}}}catch{setError("The Route copy could not be confirmed. Retry the same copy.");}finally{setBusy(false);}
  };
  const disabled=memory.busy||!!memory.pending||busy||!!pending;
  return <ModalLayer onClose={()=>{if(!disabled)memory.select(null);}}><section className={`creation-panel ${styles.placeDialog} ${styles.pinDialog}`} aria-label="Map Pin details">
    <button className="overlay-close" aria-label="Close Pin details" disabled={disabled} onClick={()=>memory.select(null)}><X size={18}/></button>
    <h2><span aria-hidden="true">{pinState(pin.state).icon}</span> {pin.title}</h2>
    <p>{pin.address||"Manually selected Checkpoint"}</p><p>{pinState(pin.state).label}</p>
    <div className={styles.pinProvenance}><p>From {pin.contextName}</p>{pin.people.length>0&&<p>Pinned with {pin.people.join(", ")}</p>}</div>
    <PinStatePicker value={state} onChange={setState} disabled={disabled}/>
    <div className={styles.actions}><button className={styles.control} disabled={disabled||state===pin.state} onClick={()=>void memory.change({type:"state",pinId:pin.id,expectedRevision:pin.revision,state},pin.scope)}>Save state</button><button className={styles.primary} disabled={disabled} onClick={()=>{setAdding(true);setNuking(false);}}>Add to Route</button></div>
    {adding&&<div className={styles.pinRouteTarget}><label>Choose Route<select className={styles.control} aria-label="Target Route" disabled={disabled} value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choose an available Route</option>{choices.map(r=><option key={r.id} value={r.id}>{r.name} · {r.contextName}</option>)}</select></label><p>Creates an independent Location Card. This Map Pin stays saved.</p><button className={styles.primary} disabled={disabled||!target} onClick={()=>{const r=choices.find(r=>r.id===target);if(r)void copy({sourceScope:pin.scope,targetScope:r.scope,pinId:pin.id,expectedPinRevision:pin.revision,routeId:r.id,expectedTripRevision:r.revision,requestId:crypto.randomUUID()});}}>Confirm Add to Route</button>{!choices.length&&<p>Create a Route in an authorized Room or Personal Map first.</p>}</div>}
    {(error||memory.error)&&<div role="alert"><p>{error||memory.error}</p>{pending&&<button className={styles.control} disabled={busy} onClick={()=>void copy(pending)}>Retry same Route copy</button>}{memory.pending&&<button className={styles.control} disabled={memory.busy} onClick={()=>void memory.retry()}>Retry same Pin change</button>}</div>}
    <details className={styles.cardDetails}><summary>Get info</summary><p>{pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</p><p>{pin.attribution} {pin.license}</p><p>Pinned {new Date(pin.createdAt).toLocaleDateString()}</p></details>
    <div className={styles.actions}>{pin.contextKind!=="sandbox"&&<button className={styles.control} disabled={disabled} onClick={()=>void memory.change({type:"hide",pinId:pin.id,expectedRevision:pin.revision,expectedPreferenceRevision:pin.preferenceRevision,hidden:!pin.hidden},pin.scope)}>{pin.hidden?"Show in my Sandbox":sandbox?"Remove from my Sandbox":"Hide from my Sandbox"}</button>}<button className={styles.control} disabled={disabled} onClick={()=>{setNuking(true);setAdding(false);}}>Nuke Pin</button></div>
    {nuking&&<div role="alert"><p>Remove this Pin from {pin.contextName}{pin.contextKind!=="sandbox"?" and everyone’s Sandbox views":""}? Existing Route Location Cards stay unchanged.</p><div className={styles.actions}><button className={styles.primary} disabled={disabled} onClick={()=>void memory.change({type:"nuke",pinId:pin.id,expectedRevision:pin.revision},pin.scope)}>Confirm Nuke Pin</button><button className={styles.control} disabled={disabled} onClick={()=>setNuking(false)}>Keep Pin</button></div></div>}
  </section></ModalLayer>;
}
