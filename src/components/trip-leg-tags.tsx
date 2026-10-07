"use client";
import { useEffect } from "react";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import { roadDistance, roadDuration, type RoadGeometry, type RoadPoint } from "@/lib/maps/road-contract";
import { legMidpoint } from "@/lib/maps/leg-labels";
import styles from "./room-map-workspace.module.css";

const NO_HIDDEN:string[]=[];
export function TripLegTags({map,road,points,color,selectedId,privateLeg=false,hiddenIds=NO_HIDDEN}:{map:MapInstance|null;road?:RoadGeometry;points:RoadPoint[];color:string;selectedId:string|null;privateLeg?:boolean;hiddenIds?:string[]}) {
  useEffect(()=>{
    if(!map||!road?.estimate?.legs)return;
    let disposed=false;const markers:Marker[]=[];
    const update=()=>{
      const boxes:DOMRect[]=[];
      const selector=`button.maplibregl-marker,[data-map-inspector],details${privateLeg?', [data-shared-leg-tag]':''}`;
      const obstacles=[...(map.getContainer().parentElement??map.getContainer()).querySelectorAll<HTMLElement>(selector)].filter(e=>e.checkVisibility()).map(e=>e.getBoundingClientRect());
      for(const marker of markers){
        const element=marker.getElement();element.hidden=false;
        const rect=element.getBoundingClientRect(),canvas=map.getContainer().getBoundingClientRect();
        const collides=[...obstacles,...boxes].some(b=>rect.left<b.right+8&&rect.right>b.left-8&&rect.top<b.bottom+8&&rect.bottom>b.top-8);
        element.hidden=collides||rect.left<canvas.left+8||rect.right>canvas.right-8||rect.top<canvas.top+8||rect.bottom>canvas.bottom-30;
        if(!element.hidden)boxes.push(rect);
      }
    };
    void import("maplibre-gl").then(({Marker})=>{
      if(disposed)return;
      road.estimate!.legs!.forEach((leg,i)=>{
        if(leg.fromId!==points[i]?.id||leg.toId!==points[i+1]?.id)return;
        if(hiddenIds.includes(leg.fromId)||hiddenIds.includes(leg.toId))return;
        const point=legMidpoint(road.segments[i]??[]);if(!point)return;
        const element=document.createElement("span");element.className=styles.legTag;element.dataset.routeColor=color;
        if(!privateLeg)element.dataset.sharedLegTag="";
        element.setAttribute("aria-hidden","true"); // Equivalent in accessible route detail; no tiny interactive targets.
        element.textContent=`${privateLeg?"YOUR LEG · ":""}${roadDistance(leg.metres)} · ${roadDuration(leg.seconds)}`;
        element.style.opacity=selectedId&&selectedId!==leg.fromId&&selectedId!==leg.toId?"0.45":"1";
        markers.push(new Marker({element,anchor:"center",offset:[0,-16]}).setLngLat(point).addTo(map));
      });update();map.on("render",update);
    });
    return()=>{disposed=true;map.off("render",update);markers.forEach(m=>m.remove());};
  },[map,road,points,color,selectedId,privateLeg,hiddenIds]);
  return null;
}
