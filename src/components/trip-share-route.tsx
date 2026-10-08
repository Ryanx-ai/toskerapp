"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mutateTripAction, readTripAction, tripCopyDestinationsAction } from "@/server/trips/actions";
import { ModalLayer } from "./modal-layer";
import { useToskerIdentity } from "./tosker-identity";
import styles from "./room-map-workspace.module.css";

type Destination={scope:string;label:string;href:string};
type Pending=Parameters<typeof mutateTripAction>[0];
export function TripShareRoute({source,routeId,name,revision,currentRevision,close}:{source:string;routeId:string;name:string;revision:number;currentRevision:number;close():void}) {
  const identity=useToskerIdentity();
  const [destinations,setDestinations]=useState<Destination[]>([]),[destination,setDestination]=useState("");
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [pending,setPending]=useState<Pending|null>(null),[done,setDone]=useState<{id:string;target:Destination}|null>(null);
  const writing=useRef(false);
  useEffect(()=>{let alive=true;void tripCopyDestinationsAction(source).then(result=>{if(!alive)return;if(result.ok)setDestinations(result.value);else setError(result.message);}).catch(()=>{if(alive)setError("Destinations could not load. Close and reopen Share to retry.");}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[source]);
  const submit=async()=>{
    if(writing.current)return;
    const target=destinations.find(d=>d.scope===(pending?.roomSlug??destination));if(!target)return;
    writing.current=true;setBusy(true);setError("");
    try {
      let input=pending;
      if(!input){
        const snapshot=await readTripAction(target.scope);
        if(!snapshot.ok){setError(snapshot.message);return;}
        input={protocol:4,roomSlug:target.scope,expectedRevision:snapshot.value.revision,requestId:crypto.randomUUID(),command:{type:"copy-route",sourceScope:source,sourceRevision:revision,routeId}};
        setPending(input);
      }
      const result=await mutateTripAction(input);
      if(!result.ok){setError(result.message);if(result.code!=="unavailable")setPending(null);return;}
      if(result.value.resultId)setDone({id:result.value.resultId,target});
      setPending(null);
    } catch {setError("The acknowledgement was lost. Retry the same copy to confirm it safely.");}
    finally{writing.current=false;setBusy(false);}
  };
  const changed=revision!==currentRevision;
  return <ModalLayer onClose={()=>{if(!busy&&!pending)close();}}><section className={`creation-panel ${styles.placeDialog} ${styles.editor}`} aria-label="Share route">
    <h2>Share {name}</h2>
    {done ? <><p role="status">Copied to {done.target.label}. The destination owns its copy; future edits and deletion stay independent.</p><Link className={styles.primary} href={done.target.href} onClick={()=>{
      try{const key=`tosker:trip-view:${identity?.userId??"anonymous"}:${done.target.scope}`,old=JSON.parse(sessionStorage.getItem(key)??"null");sessionStorage.setItem(key,JSON.stringify({...old,activeId:done.id,ghosts:old?.ghosts??[],hidden:old?.hidden??[],hiddenRoutes:old?.hiddenRoutes??[]}));}catch{/* Destination still opens without private preferences. */}
    }}>Open copied route</Link><button className={styles.control} onClick={close}>Done</button></> : <>
      <p>Create an independent copy in another context. Its members can edit or delete their copy without changing this route.</p>
      <p>Copies active places, order, shared notes and tags. No comments, archived places, private state, pings or travel estimates. Routing recalculates in the destination.</p>
      {loading ? <p role="status">Loading authorized destinations…</p> : destinations.length ? <label>Destination<select aria-label="Destination" autoFocus value={destination} disabled={busy||!!pending} onChange={e=>setDestination(e.target.value)}><option value="">Choose a context</option>{destinations.map(d=><option key={d.scope} value={d.scope}>{d.label}</option>)}</select></label> : <p>No other authorized contexts are available.</p>}
      {changed&&!pending&&<p role="alert">The source changed. Close and reopen Share to review its latest state.</p>}
      {error&&<p role="alert">{error}</p>}
      <div className={styles.actions}><button className={styles.primary} disabled={busy||loading||(!pending&&(changed||!destination))} onClick={()=>void submit()}>{busy?"Copying…":pending?"Retry same copy":"Create route copy"}</button><button className={styles.control} disabled={busy||!!pending} onClick={close}>Cancel</button></div>
    </>}
  </section></ModalLayer>;
}
