export const TRIP_COLORS = ["gold", "rose", "sage", "sky", "iris"] as const;
export type TripColor = typeof TRIP_COLORS[number];
export const PLACE_ICONS = ["destination", "checkpoint", "home", "work", "food", "stay", "activity", "favourite", "meetup"] as const;
export type PlaceIcon = typeof PLACE_ICONS[number];
export const PLACE_ICON_LABELS: Record<PlaceIcon, string> = { destination: "Destination", checkpoint: "Checkpoint", home: "Home", work: "Work", food: "Food", stay: "Stay", activity: "Activity", favourite: "Favourite", meetup: "Meetup" };
export const TRIP_LIMITS = { places: 200, routes: 12, receipts: 10000 } as const;
export type PlaceCandidate = {
  title: string; latitude: number; longitude: number; source: "search" | "pin";
  provider: string | null; providerId: string | null; address: string; attribution: string; license: string;
};
export type TripPlace = PlaceCandidate & { id: string; note: string; archived: boolean; icon?: PlaceIcon; starred?: boolean; skipped?: boolean; commentCount?: number };
export type TripComment = { id: string; body: string; authorId: string; author: string; createdAt: string };
export type TripCommentPage = { comments: TripComment[]; hasMore: boolean };
export type TripRoute = { id: string; name: string; color: TripColor; archived: boolean; lockedPositions?: number[] };
export type TripMembership = { routeId: string; placeId: string; position: number; isStop: boolean };
export type TripSnapshot = { revision: number; places: TripPlace[]; routes: TripRoute[]; memberships: TripMembership[] };
export type TripCommand =
  | { type: "add"; candidate: PlaceCandidate; routeId: string | null }
  | { type: "copy-place"; placeId: string; routeId: string }
  | { type: "copy-route"; sourceScope: string; sourceRevision: number; routeId: string }
  | { type: "edit-place"; placeId: string; title: string; note: string }
  | { type: "rename-checkpoint"; placeId: string; title: string }
  | { type: "place-icon"; placeId: string; icon: PlaceIcon }
  | { type: "comment"; placeId: string; body: string }
  | { type: "archive-place"; placeId: string; archived: boolean }
  | { type: "star-place"; placeId: string; starred: boolean }
  | { type: "skip-place"; placeId: string; skipped: boolean }
  | { type: "lock-position"; routeId: string; position: number; locked: boolean }
  | { type: "move-checkpoint"; placeId: string; latitude: number; longitude: number }
  | { type: "nuke-place"; placeId: string }
  | { type: "order-routes"; routeIds: string[] }
  | { type: "create-route"; name: string; color: TripColor }
  | { type: "edit-route"; routeId: string; name: string; color: TripColor }
  | { type: "archive-route"; routeId: string; archived: boolean }
  | { type: "nuke-route"; routeId: string }
  | { type: "membership"; routeId: string; placeId: string; included: boolean }
  | { type: "stop"; routeId: string; placeId: string; isStop: boolean }
  | { type: "order"; routeId: string; placeIds: string[] };
export type TripMutation = { roomSlug: string; requestId: string; expectedRevision: number; command: TripCommand };
export type TripFailureCode = "denied" | "conflict" | "invalid" | "limit" | "retry-mismatch" | "unavailable";
export type TripResult<T> = { ok: true; value: T } | { ok: false; code: TripFailureCode; message: string };

export function recoverActiveRoute(previous:TripRoute[],current:TripRoute[],activeId:string|null) {
  const visible=current.filter(r=>!r.archived);
  if(visible.some(r=>r.id===activeId))return activeId;
  const index=previous.findIndex(r=>r.id===activeId),ids=new Set(visible.map(r=>r.id));
  return (index<0?undefined:previous.slice(index+1).find(r=>ids.has(r.id))?.id) ?? (index<0?undefined:previous.slice(0,index).reverse().find(r=>ids.has(r.id))?.id) ?? visible[0]?.id ?? null;
}

export function orderedRoutePlaces(snapshot: TripSnapshot, routeId: string) {
  const places = new Map(snapshot.places.filter(p => !p.archived).map(p => [p.id, p]));
  return snapshot.memberships.filter(m => m.routeId === routeId && places.has(m.placeId))
    .sort((a, b) => a.position - b.position || a.placeId.localeCompare(b.placeId))
    .map(m => ({ ...places.get(m.placeId)!, isStop: m.isStop }));
}

/** Shared planning eligibility. Viewer-private Eye preferences never enter this list. */
export function routingPlaces(snapshot: TripSnapshot, routeId: string) {
  return orderedRoutePlaces(snapshot, routeId).filter(p => !p.skipped);
}

/** Immutable full-route slots, including archived cards. Locks are positions, not card flags. */
export function lockedQuickOrder(snapshot: TripSnapshot, routeId: string) {
  const route = snapshot.routes.find(r => r.id === routeId);
  const cards = new Map(snapshot.places.map(p => [p.id, p]));
  const ordered = snapshot.memberships.filter(m => m.routeId === routeId).sort((a,b) => a.position-b.position);
  const locks = new Set(route?.lockedPositions ?? [0]);
  const free = ordered.filter(m => !locks.has(m.position) && !cards.get(m.placeId)?.archived && !cards.get(m.placeId)?.skipped).map(m => cards.get(m.placeId)!);
  let previous: TripPlace | undefined;
  return ordered.map(m => {
    const current = cards.get(m.placeId)!;
    if (locks.has(m.position) || current.archived || current.skipped) {
      if (!current.archived && !current.skipped) previous = current;
      return current.id;
    }
    if (previous) free.sort((a,b) => squaredDistance(previous!, a) - squaredDistance(previous!, b) || a.id.localeCompare(b.id));
    const next = free.shift()!; previous = next; return next.id;
  });
}

function squaredDistance(a: Pick<TripPlace,"latitude"|"longitude">, b: Pick<TripPlace,"latitude"|"longitude">) {
  const rad = Math.PI / 180;
  return Math.sin((b.latitude-a.latitude)*rad/2)**2 + Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin((b.longitude-a.longitude)*rad/2)**2;
}

export function nextCheckpointName(places: Pick<TripPlace,"title">[]) {
  return `Checkpoint ${places.reduce((n,p) => Math.max(n, Number(/^Checkpoint (\d+)$/.exec(p.title)?.[1] ?? 0)), 0) + 1}`;
}

export function isCoordinatePinTitle(title: string) {
  return /^Pin\s+-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(title) || title === "Checkpoint";
}

/** Reorder visible places while retaining archived route references in their slots. */
export function mergeVisibleOrder(plan: TripSnapshot, routeId: string, visibleIds: string[]) {
  const ids = new Set(visibleIds); let next = 0;
  return plan.memberships.filter(m => m.routeId === routeId).sort((a,b) => a.position-b.position || a.placeId.localeCompare(b.placeId)).map(m => ids.has(m.placeId) ? visibleIds[next++] : m.placeId);
}

/** Deterministic nearest-neighbour suggestion only. Not road routing/optimization. */
export function quickOrder(places: Pick<TripPlace, "id" | "latitude" | "longitude">[], startId = places[0]?.id, endId = places.at(-1)?.id) {
  const start = places.find(p => p.id === startId);
  if (!start) return [];
  const remaining = places.filter(p => p.id !== startId && p.id !== endId), order = [start.id];
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
  if (endId && endId !== startId && places.some(p => p.id === endId)) order.push(endId);
  return order;
}
