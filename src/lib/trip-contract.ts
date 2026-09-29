export const TRIP_COLORS = ["gold", "rose", "sage", "sky", "iris"] as const;
export type TripColor = typeof TRIP_COLORS[number];
export const TRIP_LIMITS = { places: 200, routes: 12, receipts: 10000 } as const;
export type PlaceCandidate = {
  title: string; latitude: number; longitude: number; source: "search" | "pin";
  provider: string | null; providerId: string | null; address: string; attribution: string; license: string;
};
export type TripPlace = PlaceCandidate & { id: string; note: string; archived: boolean };
export type TripRoute = { id: string; name: string; color: TripColor; archived: boolean };
export type TripMembership = { routeId: string; placeId: string; position: number; isStop: boolean };
export type TripSnapshot = { revision: number; places: TripPlace[]; routes: TripRoute[]; memberships: TripMembership[] };
export type TripCommand =
  | { type: "add"; candidate: PlaceCandidate; routeId: string | null }
  | { type: "edit-place"; placeId: string; title: string; note: string }
  | { type: "archive-place"; placeId: string; archived: boolean }
  | { type: "create-route"; name: string; color: TripColor }
  | { type: "edit-route"; routeId: string; name: string; color: TripColor }
  | { type: "archive-route"; routeId: string; archived: boolean }
  | { type: "membership"; routeId: string; placeId: string; included: boolean }
  | { type: "stop"; routeId: string; placeId: string; isStop: boolean }
  | { type: "order"; routeId: string; placeIds: string[] };
export type TripMutation = { roomSlug: string; requestId: string; expectedRevision: number; command: TripCommand };
export type TripFailureCode = "denied" | "conflict" | "invalid" | "limit" | "retry-mismatch" | "unavailable";
export type TripResult<T> = { ok: true; value: T } | { ok: false; code: TripFailureCode; message: string };

export function orderedRoutePlaces(snapshot: TripSnapshot, routeId: string) {
  const places = new Map(snapshot.places.filter(p => !p.archived).map(p => [p.id, p]));
  return snapshot.memberships.filter(m => m.routeId === routeId && places.has(m.placeId))
    .sort((a, b) => a.position - b.position || a.placeId.localeCompare(b.placeId))
    .map(m => ({ ...places.get(m.placeId)!, isStop: m.isStop }));
}

/** Deterministic nearest-neighbour suggestion only. Not road routing/optimization. */
export function quickOrder(places: Pick<TripPlace, "id" | "latitude" | "longitude">[], startId: string) {
  const start = places.find(p => p.id === startId);
  if (!start) return [];
  const remaining = places.filter(p => p.id !== startId), order = [start.id];
  let current = start;
  const distance = (p: typeof start) => {
    const rad = Math.PI / 180;
    const a = Math.sin((p.latitude - current.latitude) * rad / 2) ** 2 + Math.cos(current.latitude * rad) * Math.cos(p.latitude * rad) * Math.sin((p.longitude - current.longitude) * rad / 2) ** 2;
    return a; // Monotonic with great-circle distance; no paid routing call.
  };
  while (remaining.length) {
    remaining.sort((a, b) => distance(a) - distance(b) || a.id.localeCompare(b.id));
    current = remaining.shift()!; order.push(current.id);
  }
  return order;
}
