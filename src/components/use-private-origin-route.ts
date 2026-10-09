"use client";
import { useEffect, useRef, useState, useEffectEvent } from "react";
import { roadKey, supportedRoadPoints, type RoadGeometry, type RoadMode, type RoadPoint } from "@/lib/maps/road-contract";
import { ORIGIN_CONSENT } from "@/lib/maps/private-origin";
import { markMapPhase } from "@/lib/maps/performance";

/** In-memory, private leg only. No persisted response/cache/telemetry. */
export function usePrivateOriginRoute(scope:string,routeId:string|null,points:RoadPoint[],mode:RoadMode,enabled:boolean,sharedBusy:boolean,nextPrivateSlotAt:number,onDenied:()=>void) {
  const [road,setRoad]=useState<RoadGeometry|null>(null),[failure,setFailure]=useState<{key:string;message:string}|null>(null),[attempt,setAttempt]=useState(0);
  const generation=useRef(0),lastAttempt=useRef(0),settled=useRef(""),denied=useEffectEvent(onDenied);
  const key=roadKey(points,mode),eligible=enabled&&!!routeId&&supportedRoadPoints(points);
  useEffect(()=>{
    const epoch=++generation.current,controller=new AbortController();
    const stamp=`${scope}:${routeId}:${key}:${attempt}`;
    if(!eligible){settled.current="";queueMicrotask(()=>{if(generation.current===epoch){setRoad(null);setFailure(null);}});return;}
    // A later shared-leg recalculation must not repeat the unchanged private request.
    if(sharedBusy||!routeId||settled.current===stamp)return;
    queueMicrotask(()=>{if(generation.current===epoch){setRoad(null);setFailure(null);}});
    // Shared calculation gets the first slot. Wait only for its remaining
    // cooldown, not another unconditional six seconds after an idle consent.
    const timer=setTimeout(async()=>{
      lastAttempt.current=Date.now();
      try{
        const point=JSON.parse(key)[1];
        markMapPhase("origin-dispatch");
        const response=await fetch(`/api/trips/${encodeURIComponent(scope)}/roads`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({routeId,mode,origin:{latitude:point[1],longitude:point[2],consent:ORIGIN_CONSENT}}),signal:controller.signal,cache:"no-store"});
        const data=await response.json();if(controller.signal.aborted||generation.current!==epoch)return;
        markMapPhase("origin-response");
        if(response.status===403){denied();return;}
        if(!response.ok)throw new Error(data.error||"Your origin leg is unavailable.");
        if(data.geometry?.key!==key||data.geometry?.mode!==mode)throw new Error("Your destination changed. Confirm the origin leg again.");
        setRoad(data.geometry);
        settled.current=stamp;
      }catch(error){if(!controller.signal.aborted&&generation.current===epoch){settled.current=stamp;setFailure({key,message:error instanceof Error&&error.name!=="TypeError"?error.message:"Your origin leg could not be calculated."});}}
    },Math.max(650,nextPrivateSlotAt-Date.now(),lastAttempt.current+21000-Date.now()));
    return()=>{clearTimeout(timer);controller.abort();};
  },[scope,routeId,key,mode,eligible,sharedBusy,nextPrivateSlotAt,attempt]);
  return {road:eligible&&!sharedBusy&&road?.key===key?road:undefined,error:eligible&&failure?.key===key?failure.message:"",retry:()=>setAttempt(v=>v+1)};
}
