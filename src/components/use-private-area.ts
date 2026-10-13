"use client";
import { useEffect, useRef, useState } from "react";
import { REGION_DATA_PATH, singaporeArea, type RegionData } from "@/lib/maps/area-label";
import type { LocalMapLocation } from "./use-local-map-location";
let dataset:Promise<RegionData>|undefined;
export function usePrivateArea(location:LocalMapLocation,scope:string) {
  const [result,setResult]=useState<{point:LocalMapLocation;label:string|null;source:string}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const request=useRef<AbortController|null>(null);
  useEffect(()=>{
    let active=true;
    // Same public file for everyone. No coordinates in request, URL or headers.
    dataset??=fetch(REGION_DATA_PATH).then(r=>{if(!r.ok)throw new Error();return r.json() as Promise<RegionData>;}).catch(()=>{dataset=undefined;throw new Error();});
    void dataset.then(data=>{if(active)setResult({point:location,label:singaporeArea(data,location.latitude,location.longitude),source:"ura"});}).catch(()=>{});
    return()=>{active=false;request.current?.abort();};
  },[location]);
  const lookup=async()=>{
    request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError("");
    try{
      const response=await fetch(`/api/trips/${encodeURIComponent(scope)}/area`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({consent:"area-lookup-v1",latitude:Number(location.latitude.toFixed(2)),longitude:Number(location.longitude.toFixed(2))}),signal:controller.signal,cache:"no-store"});
      if(!response.ok)throw new Error();const value=await response.json();
      if(!controller.signal.aborted)setResult({point:location,label:typeof value.label==="string"?value.label:null,source:value.source});
    }catch{if(!controller.signal.aborted)setError("Area unavailable. You can keep using your private location.");}
    finally{if(!controller.signal.aborted)setBusy(false);}
  };
  return {label:result?.point===location?result.label:null,source:result?.point===location?result.source:null,busy,error,lookup};
}
