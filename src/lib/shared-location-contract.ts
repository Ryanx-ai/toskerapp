import { isConversationId } from "./realtime-contract";
import { validWorldPoint } from "./maps/place-projection";

export const LOCATION_TTL = 5 * 60 * 1000;
export const LOCATION_SNAPSHOT = "location.snapshot";
export const LOCATION_RETIRED = "location.retired";
export const LOCATION_RECEIVED = "tosker:location-received";
export const LOCATION_CLEAR = "tosker:location-clear";
export const LOCATION_CHANGED = "location.changed";
export const LOCATION_REFRESH = "tosker:location-refresh";
export const LOCATION_HEALTH_REQUEST = "tosker:location-health-request";
export const LOCATION_HEALTH = "tosker:location-health";
export const LOCATION_VIEW_MS = 5000;
export type LatestLocationSnapshot = LocationSnapshot & { revision: number };
export type LocationCurrentView = { serverNow: number; validForMs: number; peers: { snapshot: LatestLocationSnapshot; identity: { userId: string; displayName: string; avatarUrl: string | null } }[] };
export type LocationPrecision = "area" | "precise";
export type LocationLease = { id: string; conversationId: string; userId: string; precision: LocationPrecision; expiresAt: number };
export type LocationSnapshot = LocationLease & { sentAt: number; label: string; source: "ura" | "geoapify"; point?: { latitude: number; longitude: number; accuracy: number } };
/** Current-state API, not an Ably payload. Validate against the server clock. */
export function validLocationView(value: unknown, conversationId: string): value is LocationCurrentView {
  if (!value || typeof value !== "object") return false;
  const v = value as LocationCurrentView;
  if (!Number.isFinite(v.serverNow) || !Number.isFinite(v.validForMs) || v.validForMs < 0 || v.validForMs > LOCATION_VIEW_MS || !Array.isArray(v.peers) || v.peers.length > 50) return false;
  const users = new Set<string>();
  return v.peers.every(peer => {
    if (!peer || typeof peer !== "object") return false;
    const s = peer.snapshot, i = peer.identity;
    if (!validLocationLease(s, v.serverNow) || s.conversationId !== conversationId || users.has(s.userId)) return false;
    users.add(s.userId);
    if (Object.keys(s).some(k => !["id", "conversationId", "userId", "precision", "expiresAt", "sentAt", "label", "source", "point", "revision"].includes(k))) return false;
    return Number.isSafeInteger(s.revision) && s.revision > 0 && Number.isFinite(s.sentAt) && s.sentAt <= v.serverNow && s.sentAt >= s.expiresAt - LOCATION_TTL
      && v.validForMs <= s.expiresAt - v.serverNow && typeof s.label === "string" && s.label.trim().length > 0 && s.label.length <= 100 && ["ura", "geoapify"].includes(s.source)
      && (s.precision === "area" ? s.point === undefined : validSnapshotPoint(s.point))
      && !!i && i.userId === s.userId && typeof i.displayName === "string" && i.displayName.length > 0 && i.displayName.length <= 200
      && (i.avatarUrl === null || typeof i.avatarUrl === "string");
  });
}
export function validLocationLease(value: unknown, now = Date.now()): value is LocationLease {
  if (!value || typeof value !== "object") return false;
  const v = value as LocationLease;
  return isConversationId(v.id) && isConversationId(v.conversationId) && isConversationId(v.userId)
    && (v.precision === "area" || v.precision === "precise") && Number.isFinite(v.expiresAt)
    && v.expiresAt > now && v.expiresAt <= now + LOCATION_TTL;
}
export function validLocationSnapshot(value: unknown, now = Date.now()): value is LocationSnapshot {
  if (!validLocationLease(value, now)) return false;
  const v = value as LocationSnapshot;
  if (Object.keys(v).some(k => !["id", "conversationId", "userId", "precision", "expiresAt", "sentAt", "label", "source", "point"].includes(k))) return false;
  if (!Number.isFinite(v.sentAt) || v.sentAt > now + 2000 || v.sentAt < now - 15000 || v.sentAt >= v.expiresAt) return false;
  if (typeof v.label !== "string" || !v.label.trim() || v.label.length > 100 || !["ura", "geoapify"].includes(v.source)) return false;
  if (v.precision === "area") return v.point === undefined;
  return validSnapshotPoint(v.point);
}
export function validSnapshotPoint(value: unknown): value is NonNullable<LocationSnapshot["point"]> {
  if (!value || typeof value !== "object") return false;
  const v = value as NonNullable<LocationSnapshot["point"]>;
  return Object.keys(v).length === 3 && validWorldPoint(v.latitude, v.longitude)
    && Number.isFinite(v.accuracy) && v.accuracy >= 0 && v.accuracy <= 100000;
}
