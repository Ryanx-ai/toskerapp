"use client";
import { useLayoutEffect, type RefObject } from "react";

/** Presentation geometry only. No camera commands, sharing state or credentials. */
export function useMapOverlayLayout(root: RefObject<HTMLDivElement | null>, enabled: boolean, companion: boolean) {
  useLayoutEffect(() => {
    const element=root.current, shell=element?.closest<HTMLElement>(".messaging-app");
    if(!enabled || !element || !shell)return;
    let frame=0;
    const visibleRect=(selector:string)=>{
      const node=shell.querySelector<HTMLElement>(selector);
      return node?.checkVisibility() ? node.getBoundingClientRect() : null;
    };
    const update=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const bounds=element.getBoundingClientRect();
        const sidebar=visibleRect(":scope > .messenger-sidebar");
        const header=visibleRect(".working-surface > .conversation-header");
        const panel=companion?visibleRect(".workspace-pane.is-companion"):null;
        const tray=visibleRect('[data-map-overlay="tray"]');
        const toolbar=visibleRect('[data-map-overlay="search"]');
        const values={
          "--map-overlay-left":sidebar?Math.max(8,sidebar.right-bounds.left+12):8,
          "--map-overlay-top":header?Math.max(8,header.bottom-bounds.top+12):8,
          "--map-overlay-right":panel?Math.max(8,bounds.right-panel.left+12):8,
          "--map-tray-height":tray?.height??0,
          "--map-overlay-bottom":toolbar?Math.max(40,bounds.bottom-toolbar.top+12):40,
        };
        let changed=false;
        for(const [key,value] of Object.entries(values)){
          const next=`${Math.ceil(value)}px`;
          if(element.style.getPropertyValue(key)!==next){element.style.setProperty(key,next);changed=true;}
        }
        if(changed)element.dispatchEvent(new Event("tosker:map-overlay-layout"));
      });
    };
    const observer=new ResizeObserver(update);
    const observe=()=>{
      observer.disconnect();observer.observe(element);
      for(const node of shell.querySelectorAll<HTMLElement>(":scope > .messenger-sidebar, .conversation-header, .workspace-pane.is-companion, [data-map-overlay]"))observer.observe(node);
      update();
    };
    observe();
    // Async Map/Route loading may add the measured overlays after first render.
    const children=new MutationObserver(observe);children.observe(element,{childList:true,subtree:true});
    window.addEventListener("resize",update);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();children.disconnect();window.removeEventListener("resize",update);};
  },[root,enabled,companion]);
}
