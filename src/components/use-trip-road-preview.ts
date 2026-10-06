"use client";
import {useEffect,useEffectEvent,useRef,useState} from "react";
import {roadKey,supportedRoadPoints,type RoadGeometry,type RoadMode,type RoadPoint} from "@/lib/maps/road-contract";

/** One coalesced attempt per eligible route key. Failures require deliberate retry, never a provider loop. */
export function useTripRoadPreview(scope:string,routeId:string|null,points:RoadPoint[],mode:RoadMode,enabled:boolean,onDenied:()=>void) {
  const key=roadKey(points,mode),eligible=enabled&&!!routeId&&supportedRoadPoints(points);
  const [roads,setRoads]=useState<Record<string,RoadGeometry>>({});
  const [pendingKey,setPendingKey]=useState<string|null>(null),[failure,setFailure]=useState<{key:string;message:string}|null>(null);
  const [attempt,setAttempt]=useState(0),[fit,setFit]=useState<{routeId:string;key:string;sequence:number}|null>(null);
  const attempts=useRef<number[]>([]),generation=useRef(0),lastChoice=useRef(""),lastCompleted=useRef(0);
  const denied=useEffectEvent(onDenied);
  const requestKey=`${scope}:${routeId}:${key}`;
  useEffect(()=>{
    const epoch=++generation.current,controller=new AbortController();
    const choice=`${scope}:${routeId}:${enabled}:${mode}`,shouldFit=choice!==lastChoice.current;lastChoice.current=choice;
    if(!eligible||!routeId)return;
    // Match the conservative server actor limit: >=5s gap, <=3 attempts per rolling minute.
    const now=Date.now();attempts.current=attempts.current.filter(t=>now-t<60000);
    const delay=Math.max(650,Math.max(attempts.current.at(-1)??0,lastCompleted.current)+5500-now,attempts.current.length>=3?attempts.current[attempts.current.length-3]+61000-now:0);
    const timer=setTimeout(async()=>{
      if(controller.signal.aborted)return;
      attempts.current.push(Date.now());setPendingKey(requestKey);setFailure(null);
      try{
        const response=await fetch(`/api/trips/${encodeURIComponent(scope)}/roads`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({routeId,mode}),signal:controller.signal,cache:"no-store"});
        const data=await response.json();if(controller.signal.aborted||generation.current!==epoch)return;
        if(response.status===403){setRoads({});denied();return;}
        if(!response.ok)throw new Error(typeof data.error==="string"?data.error:"Route calculation unavailable. Retry when ready.");
        if(data.geometry?.key!==key||data.geometry?.mode!==mode)throw new Error("Route changed. Retry for the latest saved order.");
        setRoads(previous=>({...previous,[routeId]:data.geometry}));
        if(shouldFit)setFit(previous=>({routeId,key,sequence:(previous?.sequence??0)+1}));
      }catch(error){if(!controller.signal.aborted&&generation.current===epoch){setRoads(previous=>{const next={...previous};delete next[routeId];return next;});setFailure({key:requestKey,message:error instanceof Error&&error.name!=="TypeError"?error.message:"Route calculation could not finish. Your trip is saved; retry when ready."});}}
      finally{lastCompleted.current=Date.now();if(!controller.signal.aborted&&generation.current===epoch)setPendingKey(null);}
    },delay);
    return()=>{clearTimeout(timer);controller.abort();};
  },[scope,routeId,key,mode,enabled,eligible,requestKey,attempt]);
  const current=routeId?roads[routeId]:undefined;
  const error=failure?.key===requestKey?failure.message:"";
  return {roads,fit,current:eligible&&current?.key===key?current:undefined,busy:eligible&&!error&&(pendingKey===requestKey||current?.key!==key),error,retry:()=>setAttempt(n=>n+1)};
}
