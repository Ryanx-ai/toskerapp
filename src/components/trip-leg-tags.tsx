"use client";
import { useEffect } from "react";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import { roadDistance, roadDuration, type RoadGeometry, type RoadPoint } from "@/lib/maps/road-contract";
import { legMidpoint } from "@/lib/maps/leg-labels";
import styles from "./room-map-workspace.module.css";

const NO_HIDDEN:string[]=[];
export function TripLegTags({map,road,points,color,selectedId,privateLeg=false,hiddenIds=NO_HIDDEN,pointNumbers}:{map:MapInstance|null;road?:RoadGeometry;points:RoadPoint[];color:string;selectedId:string|null;privateLeg?:boolean;hiddenIds?:string[];pointNumbers?:number[]}) {
  useEffect(()=>{
    if(!map||!road?.estimate?.legs)return;
    let disposed=false,frame=0;const markers:Marker[]=[];
    const update=()=>{
      const boxes:DOMRect[]=[];
      const selector=`button.maplibregl-marker,[data-map-inspector],[data-map-controls],.${styles.cameraControls},.maplibregl-ctrl,details${privateLeg?', [data-shared-leg-tag]':''}`;
      const obstacles=[...(map.getContainer().parentElement??map.getContainer()).querySelectorAll<HTMLElement>(selector)].filter(e=>e.checkVisibility()).map(e=>e.getBoundingClientRect());
      const canvas=map.getContainer().getBoundingClientRect();
      for(const marker of markers){
        const element=marker.getElement();element.hidden=false;
        const size=element.getBoundingClientRect(),point=map.project(marker.getLngLat());
        // Bounded optical offsets retain the exact leg anchor; ordinal labels make
        // association explicit even when a nearby waypoint requires displacement.
        let placed=false;
        for(const [x,y] of [[0,-18],[0,22],[-size.width/2-16,0],[size.width/2+16,0],[0,-48],[0,48]]){
          const rect=new DOMRect(canvas.left+point.x-size.width/2+x,canvas.top+point.y-size.height/2+y,size.width,size.height);
          const collides=[...obstacles,...boxes].some(b=>rect.left<b.right+8&&rect.right>b.left-8&&rect.top<b.bottom+8&&rect.bottom>b.top-8);
          if(collides||rect.left<canvas.left+8||rect.right>canvas.right-8||rect.top<canvas.top+8||rect.bottom>canvas.bottom-30)continue;
          marker.setOffset([x,y]);boxes.push(rect);placed=true;break;
        }
        element.hidden=!placed;
      }
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(!disposed)update();});};
    const observer=new ResizeObserver(schedule);
    void import("maplibre-gl").then(({Marker})=>{
      if(disposed)return;
      road.estimate!.legs!.forEach((leg,i)=>{
        if(leg.fromId!==points[i]?.id||leg.toId!==points[i+1]?.id)return;
        if(hiddenIds.includes(leg.fromId)||hiddenIds.includes(leg.toId))return;
        if(!privateLeg&&selectedId&&points.some(p=>p.id===selectedId)&&selectedId!==leg.fromId&&selectedId!==leg.toId)return;
        const point=legMidpoint(road.segments[i]??[]);if(!point)return;
        const element=document.createElement("span");element.className=styles.legTag;element.dataset.routeColor=color;
        if(!privateLeg)element.dataset.sharedLegTag="";
        element.setAttribute("aria-hidden","true"); // Equivalent in accessible route detail; no tiny interactive targets.
        element.textContent=`${privateLeg?"YOUR LEG":`${pointNumbers?.[i]??i+1} → ${pointNumbers?.[i+1]??i+2}`} · ${roadDistance(leg.metres)} · ${roadDuration(leg.seconds)}`;
        // Marker owns opacity and refreshes it during rendering; setting the DOM style is overwritten.
        const opacity=selectedId&&selectedId!==leg.fromId&&selectedId!==leg.toId?0.45:1;
        markers.push(new Marker({element,anchor:"center",offset:[0,-16],opacity}).setLngLat(point).addTo(map));
      });update();map.on("move",schedule);map.on("resize",schedule);
      const root=map.getContainer().parentElement??map.getContainer();observer.observe(root);root.querySelectorAll(`[data-map-inspector],[data-map-controls],.${styles.cameraControls},details`).forEach(e=>observer.observe(e));
      root.addEventListener("toggle",schedule,true);schedule();
    });
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();map.off("move",schedule);map.off("resize",schedule);(map.getContainer().parentElement??map.getContainer()).removeEventListener("toggle",schedule,true);markers.forEach(m=>m.remove());};
  },[map,road,points,color,selectedId,privateLeg,hiddenIds,pointNumbers]);
  return null;
}
