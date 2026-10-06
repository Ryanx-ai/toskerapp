"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { readPinsAction, mutatePinAction } from "@/server/map-pins/actions";
import { ACTIVITY_REFRESH, CONVERSATION_ACCESS_LOST, TRIP_REFRESH } from "@/lib/realtime-contract";
import type { MapPin } from "@/lib/map-pin-contract";

type Pending = Parameters<typeof mutatePinAction>[0];
export function useMapPins(scope:string,conversationId:string) {
  const [pins,setPins] = useState<MapPin[]>([]),[next,setNext] = useState<string|null>(null);
  const [ready,setReady] = useState(false),[busy,setBusy] = useState(false),[error,setError] = useState("");
  const [readError,setReadError] = useState("");
  const [paged,setPaged] = useState(false);
  const [selectedId,setSelectedId] = useState<string|null>(null),[pending,setPending] = useState<Pending|null>(null);
  const alive = useRef(true),generation = useRef(0),writing = useRef(false),selected = useRef<string|null>(null);
  const select = useCallback((id:string|null)=>{selected.current=id;setSelectedId(id);},[]);
  const clear = useCallback(()=>{generation.current++;setPins([]);setNext(null);select(null);setPending(null);setReady(false);},[select]);
  const refresh = useCallback(async(cursor?:string)=>{
    const epoch = ++generation.current;
    try {
      const result = await readPinsAction(scope,cursor);
      if (!alive.current || epoch !== generation.current) return;
      if (!result.ok) {
        clear();setReadError(result.message);
        if (result.code === "denied") window.dispatchEvent(new CustomEvent(CONVERSATION_ACCESS_LOST,{detail:conversationId}));
        return;
      }
      // Replace, never append cached pages that have not been reauthorized.
      setPins(result.value.pins);setPaged(!!cursor);setReadError("");
      setNext(result.value.next);setReady(true);
      if (selected.current && !result.value.pins.some(p=>p.id===selected.current)) select(null);
    } catch { if(alive.current && epoch===generation.current){clear();setReadError("Pins could not be refreshed. Reconnect and try again.");} }
  },[scope,conversationId,clear,select]);
  useEffect(()=>{
    alive.current=true;queueMicrotask(()=>{if(alive.current)void refresh();});
    const update=()=>{if(!document.hidden)void refresh();};
    const visibility=()=>{if(document.hidden)clear();else void refresh();};
    const lost=(event:Event)=>{if((event as CustomEvent).detail===conversationId)clear();};
    window.addEventListener(ACTIVITY_REFRESH,update);window.addEventListener(TRIP_REFRESH,update);window.addEventListener("online",update);window.addEventListener(CONVERSATION_ACCESS_LOST,lost);document.addEventListener("visibilitychange",visibility);
    const timer=setInterval(update,30000);
    return()=>{alive.current=false;clearInterval(timer);window.removeEventListener(ACTIVITY_REFRESH,update);window.removeEventListener(TRIP_REFRESH,update);window.removeEventListener("online",update);window.removeEventListener(CONVERSATION_ACCESS_LOST,lost);document.removeEventListener("visibilitychange",visibility);};
  },[refresh,clear,conversationId]);
  const write=async(input:Pending)=>{
    if(writing.current)return;
    writing.current=true;setBusy(true);setPending(input);setError("");
    try {
      const result=await mutatePinAction(input);if(!alive.current)return;
      if(!result.ok){setError(result.message);if(result.code!=="unavailable")setPending(null);if(result.code==="denied")clear();await refresh();return;}
      setPending(null);await refresh();
      if(input.command.type==="create")select(result.value.resultId);
      if(input.command.type==="nuke" || input.command.type==="hide")select(null);
      return result.value;
    }catch{if(alive.current)setError("Save acknowledgement was lost. Retry the same Pin change safely.");}
    finally{writing.current=false;if(alive.current)setBusy(false);}
  };
  return {pins,next,paged,ready,busy,error:error||readError,selectedId,select,pending,refresh,
    selected:pins.find(p=>p.id===selectedId)??null,
    change:(command:Pending["command"],sourceScope=scope)=>write({scope:sourceScope,requestId:crypto.randomUUID(),command}),
    retry:()=>pending?write(pending):undefined};
}
