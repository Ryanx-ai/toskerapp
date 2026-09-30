"use client";
import { useCallback, useSyncExternalStore } from "react";
const eventName="tosker:chat-companion-preference";
const fallback = new Map<string, boolean>();
const subscribe=(notify:()=>void)=>{window.addEventListener(eventName,notify);return()=>window.removeEventListener(eventName,notify);};
const server=()=>true;
/** One viewer preference per conversation, independent of primary-surface navigation. */
export function useChatCompanion(userId?:string,conversationId?:string){
  const key=`tosker:companion:${userId??"anonymous"}:${conversationId??"none"}`;
  const snapshot=useCallback(()=>{try{return sessionStorage.getItem(key)!=="closed";}catch{return fallback.get(key) ?? true;}},[key]);
  const enabled=useSyncExternalStore(subscribe,snapshot,server);
  const toggle=()=>{fallback.set(key,!enabled);try{sessionStorage.setItem(key,enabled?"closed":"open");}catch{/* Keep the viewer control usable without storage. */}window.dispatchEvent(new Event(eventName));};
  return [enabled,toggle] as const;
}
