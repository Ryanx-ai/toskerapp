import { isConversationId } from "@/lib/realtime-contract";
export const MAP_PING = "map.ping";
export const MAP_PING_RECEIVED = "tosker:map-ping";
export const MAP_PING_CLEAR = "tosker:map-ping-clear";
export const PING_TTL = 8000;
export const PING_KINDS = { attention: { symbol: "!", label: "Attention" }, question: { symbol: "?", label: "Question" }, pulse: { symbol: "♡", label: "Here / activity" } } as const;
export type PingKind = keyof typeof PING_KINDS;
export type MapPing = { id:string; kind:PingKind; latitude:number; longitude:number; senderId:string; senderName:string; expiresAt:number };
export function pingPlacement(value:unknown): value is Pick<MapPing,"id"|"kind"|"latitude"|"longitude"> {
  if(!value||typeof value!=="object")return false;
  const p=value as MapPing;
  return isConversationId(p.id)&&Object.hasOwn(PING_KINDS,p.kind)&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=85&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180;
}
export function validPing(value:unknown,now=Date.now()):value is MapPing {
  if(!pingPlacement(value))return false;
  const p=value as MapPing;
  return isConversationId(p.senderId)&&typeof p.senderName==="string"&&p.senderName.length>0&&p.senderName.length<=80&&Number.isFinite(p.expiresAt)&&p.expiresAt>now&&p.expiresAt<=now+PING_TTL+1000;
}
