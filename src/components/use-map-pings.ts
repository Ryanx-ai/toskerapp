"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAP_PING_RECEIVED, MAP_PING_CLEAR, PING_TTL, validPing, type MapPing, type PingKind } from "@/lib/maps/ping-contract";
import { CONVERSATION_ACCESS_LOST } from "@/lib/realtime-contract";

export function useMapPings(scope:string,conversationId:string,enabled:boolean,sender:{id:string;name:string}|null,onDenied:()=>void) {
  const [pings,setPings]=useState<MapPing[]>([]),[kind,setKind]=useState<PingKind|null>(null),[error,setError]=useState("");
  const pending=useRef<AbortController|null>(null),last=useRef(0);
  const receive=useCallback((ping:MapPing)=>setPings(old=>[...old.filter(p=>p.id!==ping.id&&p.expiresAt>Date.now()),ping].slice(-8)),[]);
  useEffect(()=>{
    const clear=()=>{pending.current?.abort();setPings([]);setKind(null);};
    const event=(event:Event)=>{const d=(event as CustomEvent).detail;if(d?.conversationId===conversationId&&validPing(d.ping))receive(d.ping);};
    const denied=(event:Event)=>{if((event as CustomEvent).detail===conversationId)clear();};
    const expiry=setInterval(()=>setPings(old=>old.some(p=>p.expiresAt<=Date.now())?old.filter(p=>p.expiresAt>Date.now()):old),250);
    window.addEventListener(MAP_PING_RECEIVED,event);window.addEventListener(MAP_PING_CLEAR,clear);window.addEventListener(CONVERSATION_ACCESS_LOST,denied);window.addEventListener("offline",clear);
    return()=>{pending.current?.abort();clearInterval(expiry);window.removeEventListener(MAP_PING_RECEIVED,event);window.removeEventListener(MAP_PING_CLEAR,clear);window.removeEventListener(CONVERSATION_ACCESS_LOST,denied);window.removeEventListener("offline",clear);};
  },[conversationId,receive]);
  const place=async(latitude:number,longitude:number)=>{
    if(!enabled||!sender||!kind)return;
    if(Date.now()-last.current<3000){setError("Wait a moment before another ping.");return;}
    last.current=Date.now();setKind(null);setError("");
    const ping:MapPing={id:crypto.randomUUID(),kind,latitude,longitude,senderId:sender.id,senderName:sender.name.slice(0,80),expiresAt:Date.now()+PING_TTL};
    receive(ping);
    if(scope.startsWith("sandbox--"))return;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    try{
      const response=await fetch(`/api/trips/${encodeURIComponent(scope)}/pings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...ping,locateEnabled:true}),cache:"no-store",signal:controller.signal});
      const data=await response.json();if(controller.signal.aborted)return;
      if(response.status===403){onDenied();return;}
      if(!response.ok)throw new Error(data.error||"Ping could not be sent.");
      if(validPing(data.ping))receive(data.ping);
    }catch(e){if(!controller.signal.aborted){setPings(old=>old.filter(p=>p.id!==ping.id));setError(e instanceof Error&&e.name!=="TypeError"?e.message:"Ping could not be sent.");}}
  };
  return {pings,kind:enabled?kind:null,setKind,place,error};
}
