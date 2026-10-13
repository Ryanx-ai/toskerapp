import { isConversationId } from "./realtime-contract";
import { validWorldPoint } from "./maps/place-projection";

export const LOCATION_TTL = 5 * 60 * 1000;
export const LOCATION_SNAPSHOT = "location.snapshot";
export const LOCATION_RETIRED = "location.retired";
export const LOCATION_RECEIVED = "tosker:location-received";
export const LOCATION_CLEAR = "tosker:location-clear";
export type LocationPrecision = "area" | "precise";
export type LocationLease = { id: string; conversationId: string; userId: string; precision: LocationPrecision; expiresAt: number };
export type LocationSnapshot = LocationLease & { sentAt: number; label: string; source: "ura" | "geoapify"; point?: { latitude: number; longitude: number; accuracy: number } };
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
