import "server-only";
import { createHash } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { tripPlans, tripPlaces, tripRoutes, tripMutationReceipts, tripComments, profiles } from "@/server/db/schema";
import { contextualName, conversationRoomId } from "@/server/profiles/context-name";
import { lockTripScope, tripScopeWhere } from "./scope";
import { TRIP_COLORS, TRIP_LIMITS, PLACE_ICONS, nextCheckpointName, isCoordinatePinTitle, type PlaceIcon, type PlaceCandidate, type TripColor, type TripFailureCode, type TripMutation, type TripSnapshot } from "@/lib/trip-contract";
import { isConversationId } from "@/lib/realtime-contract";

export class TripError extends Error {
  constructor(readonly code: TripFailureCode, message: string) { super(message); }
}
function invalid(): never { throw new TripError("invalid", "Check the place or route details and try again."); }
function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== "string") return invalid();
  const normalized = value.trim();
  if ((!normalized && !empty) || normalized.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(normalized)) return invalid();
  return normalized;
}
function uuid(value: unknown): string { if (!isConversationId(value)) return invalid(); return value; }
function flag(value: unknown): boolean { if (typeof value !== "boolean") return invalid(); return value; }
function color(value: unknown): TripColor { if (!TRIP_COLORS.includes(value as TripColor)) return invalid(); return value as TripColor; }
export function validateCandidate(value: PlaceCandidate): PlaceCandidate {
  if (!value || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180 || !["search", "pin"].includes(value.source)) return invalid();
  return { title: text(value.title, 120), latitude: value.latitude, longitude: value.longitude, source: value.source,
    provider: value.provider === null ? null : text(value.provider, 40), providerId: value.providerId === null ? null : text(value.providerId, 1024),
    address: text(value.address, 400, true), attribution: text(value.attribution, 500, true), license: text(value.license, 120, true) };
}
function normalize(input: TripMutation): TripMutation {
  if (!input || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 || !input.command) return invalid();
  const base = { roomSlug: text(input.roomSlug, 150), requestId: uuid(input.requestId), expectedRevision: input.expectedRevision };
  const c = input.command;
  switch (c.type) {
    case "add": return { ...base, command: { type: c.type, candidate: validateCandidate(c.candidate), routeId: c.routeId === null ? null : uuid(c.routeId) } };
    case "edit-place": return { ...base, command: { type: c.type, placeId: uuid(c.placeId), title: text(c.title, 120), note: text(c.note, 1000, true) } };
    case "rename-checkpoint": return { ...base, command: { type: c.type, placeId: uuid(c.placeId), title: text(c.title, 120) } };
    case "place-icon": {
      if (!PLACE_ICONS.includes(c.icon)) return invalid();
      return { ...base, command: { type: c.type, placeId: uuid(c.placeId), icon: c.icon } };
    }
    case "comment": return { ...base, command: { type: c.type, placeId: uuid(c.placeId), body: text(c.body, 1000) } };
    case "archive-place": return { ...base, command: { type: c.type, placeId: uuid(c.placeId), archived: flag(c.archived) } };
    case "star-place": return { ...base, command: { type: c.type, placeId: uuid(c.placeId), starred: flag(c.starred) } };
    case "skip-place": return { ...base, command: { type: c.type, placeId: uuid(c.placeId), skipped: flag(c.skipped) } };
    case "lock-position": {
      if (!Number.isSafeInteger(c.position) || c.position < 0 || c.position >= TRIP_LIMITS.places) return invalid();
      return { ...base, command: { type: c.type, routeId: uuid(c.routeId), position: c.position, locked: flag(c.locked) } };
    }
    case "move-checkpoint": {
      if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude) || Math.abs(c.latitude) > 90 || Math.abs(c.longitude) > 180) return invalid();
      return { ...base, command: { type: c.type, placeId: uuid(c.placeId), latitude: c.latitude, longitude: c.longitude } };
    }
    case "nuke-place": return { ...base, command: { type: c.type, placeId: uuid(c.placeId) } };
    case "order-routes": {
      if (!Array.isArray(c.routeIds) || c.routeIds.length > TRIP_LIMITS.routes || new Set(c.routeIds).size !== c.routeIds.length) return invalid();
      return { ...base, command: { type: c.type, routeIds: c.routeIds.map(uuid) } };
    }
    case "create-route": return { ...base, command: { type: c.type, name: text(c.name, 60), color: color(c.color) } };
    case "edit-route": return { ...base, command: { type: c.type, routeId: uuid(c.routeId), name: text(c.name, 60), color: color(c.color) } };
    case "archive-route": return { ...base, command: { type: c.type, routeId: uuid(c.routeId), archived: flag(c.archived) } };
    case "nuke-route": return { ...base, command: { type: c.type, routeId: uuid(c.routeId) } };
    case "membership": return { ...base, command: { type: c.type, routeId: uuid(c.routeId), placeId: uuid(c.placeId), included: flag(c.included) } };
    case "stop": return { ...base, command: { type: c.type, routeId: uuid(c.routeId), placeId: uuid(c.placeId), isStop: flag(c.isStop) } };
    case "order": {
      if (!Array.isArray(c.placeIds) || c.placeIds.length > TRIP_LIMITS.places || new Set(c.placeIds).size !== c.placeIds.length) return invalid();
      return { ...base, command: { type: c.type, routeId: uuid(c.routeId), placeIds: c.placeIds.map(uuid) } };
    }
    default: return invalid();
  }
}

export async function readTrip(db: ToskerDatabase, actor: AuthenticatedActor, slug: string): Promise<TripSnapshot> {
  text(slug, 150);
  return db.transaction(async tx => {
    const scope = await lockTripScope(tx, actor, slug, "share");
    const [plan] = await tx.select().from(tripPlans).where(tripScopeWhere(scope));
    if (!plan) return { revision: 0, places: [], routes: [], memberships: [] };
    const places = await tx.select().from(tripPlaces).where(eq(tripPlaces.planId, plan.id)).orderBy(asc(tripPlaces.createdAt), asc(tripPlaces.id)).limit(TRIP_LIMITS.places);
    const routes = await tx.select().from(tripRoutes).where(eq(tripRoutes.planId, plan.id)).orderBy(asc(tripRoutes.position), asc(tripRoutes.createdAt), asc(tripRoutes.id)).limit(TRIP_LIMITS.routes);
    const memberships = places.map(p => ({ routeId:p.routeId,placeId:p.id,position:p.position,isStop:p.isStop }));
    const counts = await tx.select({ id: tripComments.placeId, n: count() }).from(tripComments).where(eq(tripComments.planId, plan.id)).groupBy(tripComments.placeId);
    const commentCounts = new Map(counts.map(row => [row.id, row.n]));
    return { revision: plan.revision,
      places: places.map(p => ({ id: p.id, title: p.title, icon: p.icon as PlaceIcon, note: p.note, starred: p.starred, skipped: p.skipped, commentCount: commentCounts.get(p.id) ?? 0, latitude: p.latitude, longitude: p.longitude, source: p.source as "search" | "pin", provider: p.provider, providerId: p.providerId, address: p.address, attribution: p.attribution, license: p.license, archived: !!p.archivedAt })),
      routes: routes.map(r => ({ id: r.id, name: r.name, color: r.color as TripColor, archived: !!r.archivedAt, lockedPositions: r.lockedPositions })), memberships };
  });
}

export async function mutateTrip(db: ToskerDatabase, actor: AuthenticatedActor, raw: TripMutation) {
  const input = normalize(raw);
  const payloadHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return db.transaction(async tx => {
    // Cutover compatibility marker, never an authorization substitute. Scope is still locked below.
    await tx.execute(sql`select set_config('tosker.trip_protocol','4',true)`);
    const scope = await lockTripScope(tx, actor, input.roomSlug, "update");
    let [plan] = await tx.select().from(tripPlans).where(tripScopeWhere(scope));
    if (!plan) {
      if (input.expectedRevision !== 0) throw new TripError("conflict", "The trip changed. Review its latest state before trying again.");
      [plan] = await tx.insert(tripPlans).values({ roomId: scope.roomId, subroomId: scope.subroomId, personalConversationId: scope.personalConversationId, sandboxConversationId: scope.sandboxConversationId }).returning();
    }
    const [receipt] = await tx.select().from(tripMutationReceipts).where(and(eq(tripMutationReceipts.planId, plan.id), eq(tripMutationReceipts.actorId, actor.userId), eq(tripMutationReceipts.requestId, input.requestId)));
    if (receipt) {
      if (receipt.payloadHash !== payloadHash) throw new TripError("retry-mismatch", "This retry differs from the original request. Review the trip first.");
      return { revision: receipt.revision, resultId: receipt.resultId, replayed: true };
    }
    if (plan.revision !== input.expectedRevision) throw new TripError("conflict", "Someone changed this trip. Your change was not applied. Review the latest state and try again.");
    const [{ n }] = await tx.select({ n: count() }).from(tripMutationReceipts).where(eq(tripMutationReceipts.planId, plan.id));
    if (n >= TRIP_LIMITS.receipts) throw new TripError("limit", "This Development trip reached its change limit.");
    const c = input.command;
    let resultId: string | null = null;
    const placeScope = (id: string) => and(eq(tripPlaces.planId, plan.id), eq(tripPlaces.id, id));
    const routeScope = (id: string) => and(eq(tripRoutes.planId, plan.id), eq(tripRoutes.id, id));
    const requirePlace = async (id: string) => { const [p] = await tx.select().from(tripPlaces).where(placeScope(id)); if (!p) return invalid(); return p; };
    const requireRoute = async (id: string, allowArchived = false) => { const [r] = await tx.select().from(tripRoutes).where(routeScope(id)); if (!r || (!allowArchived && r.archivedAt)) return invalid(); return r; };
    const makeRoute = async (name: string, routeColor: TripColor) => {
      const [{ n }] = await tx.select({ n: count() }).from(tripRoutes).where(eq(tripRoutes.planId, plan.id));
      if (n >= TRIP_LIMITS.routes) throw new TripError("limit", "Up to 12 routes, including archived routes, fit in this Development trip.");
      const [r] = await tx.insert(tripRoutes).values({ planId: plan.id, name, color: routeColor, position: n }).returning(); return r;
    };
    const members = (routeId: string) => tx.select().from(tripPlaces).where(and(eq(tripPlaces.planId, plan.id), eq(tripPlaces.routeId, routeId))).orderBy(asc(tripPlaces.position), asc(tripPlaces.id));
    const orderCards = async (routeId:string,ids:string[]) => {
      if(ids.length)await tx.update(tripPlaces).set({position:sql`case ${sql.join(ids.map((id,index)=>sql`when ${tripPlaces.id} = ${id}::uuid then ${index}::int`),sql` `)} end`}).where(and(eq(tripPlaces.planId,plan.id),eq(tripPlaces.routeId,routeId)));
    };
    if (c.type === "add") {
      const p = c.candidate;
      if(!c.routeId)throw new TripError("invalid","Create or select a route before adding a location.");
      await requireRoute(c.routeId);
      const all = await tx.select().from(tripPlaces).where(eq(tripPlaces.planId, plan.id)).limit(TRIP_LIMITS.places);
      const routeCards=all.filter(existing=>existing.routeId===c.routeId);
      const duplicate = routeCards.find(existing => (p.providerId && p.provider && existing.providerId === p.providerId && existing.provider === p.provider) || (Math.abs(existing.latitude - p.latitude) < 0.000001 && Math.abs(existing.longitude - p.longitude) < 0.000001));
      if (duplicate?.archivedAt) throw new TripError("invalid", "This location is archived in this route. Restore it from Archived locations.");
      if (duplicate) resultId = duplicate.id;
      else {
        if (all.length >= TRIP_LIMITS.places) throw new TripError("limit", "Up to 200 places, including archived places, fit in this Development trip.");
        const title = p.source === "pin" && isCoordinatePinTitle(p.title) ? nextCheckpointName(routeCards) : p.title;
        const [created] = await tx.insert(tripPlaces).values({ planId: plan.id, routeId:c.routeId, position:routeCards.length, ...p, title, icon: p.source === "pin" && !p.providerId ? "checkpoint" : "destination" }).returning({ id: tripPlaces.id }); resultId = created.id;
      }
    } else if (c.type === "rename-checkpoint" || c.type === "place-icon") {
      const p = await requirePlace(c.placeId); if (p.archivedAt) return invalid();
      await requireRoute(p.routeId);
      if (c.type === "rename-checkpoint" && (p.source !== "pin" || p.providerId)) throw new TripError("invalid", "Only manual checkpoints can be renamed.");
      await tx.update(tripPlaces).set(c.type === "rename-checkpoint" ? { title: c.title, updatedAt: new Date() } : { icon: c.icon, updatedAt: new Date() }).where(placeScope(p.id));
      resultId = p.id;
    } else if (c.type === "comment") {
      const p = await requirePlace(c.placeId); if (p.archivedAt) return invalid();
      const [{ n }] = await tx.select({ n: count() }).from(tripComments).where(eq(tripComments.placeId, p.id));
      if (n >= 200) throw new TripError("limit", "This place reached its 200-comment Development limit.");
      const [created] = await tx.insert(tripComments).values({ planId: plan.id, placeId: p.id, authorId: actor.userId, body: c.body }).returning({ id: tripComments.id });
      resultId = created.id;
    } else if (c.type === "edit-place" || c.type === "archive-place") {
      const p = await requirePlace(c.placeId);
      if (c.type === "edit-place" && c.title !== p.title) throw new TripError("invalid", "Place names stay canonical. Add your context in a note or comment.");
      await tx.update(tripPlaces).set(c.type === "edit-place" ? { note: c.note, updatedAt: new Date() } : { archivedAt: c.archived ? new Date() : null, updatedAt: new Date() }).where(placeScope(c.placeId)); resultId = c.placeId;
    } else if (c.type === "star-place") {
      await requirePlace(c.placeId);
      await tx.update(tripPlaces).set({ starred: c.starred, updatedAt: new Date() }).where(placeScope(c.placeId)); resultId = c.placeId;
    } else if (c.type === "skip-place") {
      const p = await requirePlace(c.placeId); if (p.archivedAt) return invalid();
      await requireRoute(p.routeId);
      await tx.update(tripPlaces).set({ skipped: c.skipped, updatedAt: new Date() }).where(placeScope(p.id)); resultId=p.id;
    } else if (c.type === "move-checkpoint") {
      const p = await requirePlace(c.placeId); if (p.archivedAt || p.source !== "pin" || p.providerId) return invalid();
      await requireRoute(p.routeId);
      const peers = await members(p.routeId);
      if (peers.some(q => q.id !== p.id && Math.abs(q.latitude-c.latitude)<0.000001 && Math.abs(q.longitude-c.longitude)<0.000001)) throw new TripError("invalid", "Another location already occupies this point in the route.");
      // Address belonged to the old coordinate. Never carry it across a manual move.
      await tx.update(tripPlaces).set({ latitude:c.latitude, longitude:c.longitude, address:"", updatedAt:new Date() }).where(placeScope(p.id)); resultId=p.id;
    } else if (c.type === "lock-position") {
      const r = await requireRoute(c.routeId), cards = await members(r.id);
      if (!cards.some(p => p.position === c.position)) return invalid();
      const locks = new Set(r.lockedPositions); if(c.locked) locks.add(c.position); else locks.delete(c.position);
      await tx.update(tripRoutes).set({ lockedPositions:[...locks].sort((a,b)=>a-b), updatedAt:new Date() }).where(routeScope(r.id)); resultId=r.id;
    } else if (c.type === "nuke-place") {
      const place=await requirePlace(c.placeId);
      await tx.delete(tripPlaces).where(placeScope(c.placeId));
      const remaining = await members(place.routeId), r = await requireRoute(place.routeId,true);
      await orderCards(place.routeId,remaining.map(p=>p.id));
      await tx.update(tripRoutes).set({lockedPositions:r.lockedPositions.filter(i=>i<remaining.length)}).where(routeScope(r.id));
      resultId = c.placeId;
    } else if(c.type === "nuke-route") {
      await requireRoute(c.routeId,true);
      // Route -> owned cards -> comments. Same-provider cards in other routes are independent.
      await tx.delete(tripRoutes).where(routeScope(c.routeId));
      const survivors=await tx.select().from(tripRoutes).where(eq(tripRoutes.planId,plan.id)).orderBy(asc(tripRoutes.position),asc(tripRoutes.createdAt),asc(tripRoutes.id));
      if(survivors.length)await tx.update(tripRoutes).set({position:sql`case ${sql.join(survivors.map((r,i)=>sql`when ${tripRoutes.id} = ${r.id}::uuid then ${i}::int`),sql` `)} end`}).where(eq(tripRoutes.planId,plan.id));
      resultId=c.routeId;
    } else if (c.type === "order-routes") {
      const rows = await tx.select({ id: tripRoutes.id }).from(tripRoutes).where(eq(tripRoutes.planId, plan.id));
      if (rows.length !== c.routeIds.length || rows.some(r => !c.routeIds.includes(r.id))) return invalid();
      if (rows.length) await tx.update(tripRoutes).set({ position: sql`case ${sql.join(c.routeIds.map((id,index) => sql`when ${tripRoutes.id} = ${id}::uuid then ${index}::int`), sql` `)} end`, updatedAt: new Date() }).where(eq(tripRoutes.planId, plan.id));
    } else if (c.type === "create-route") {
      resultId = (await makeRoute(c.name, c.color)).id;
    } else if (c.type === "edit-route" || c.type === "archive-route") {
      await requireRoute(c.routeId, true);
      await tx.update(tripRoutes).set(c.type === "edit-route" ? { name: c.name, color: c.color, updatedAt: new Date() } : { archivedAt: c.archived ? new Date() : null, updatedAt: new Date() }).where(routeScope(c.routeId)); resultId = c.routeId;
    } else {
      const r = await requireRoute(c.routeId);
      if (c.type === "order") {
        const rows = await members(c.routeId);
        // Include archived memberships too: archive/restore never silently discards order.
        if (rows.length !== c.placeIds.length || rows.some(r => !c.placeIds.includes(r.id))) return invalid();
        if (rows.some(p => r.lockedPositions.includes(p.position) && c.placeIds[p.position] !== p.id)) throw new TripError("invalid", "Unlock the affected positions before moving these locations.");
        // One bounded UPDATE, not N round trips per drag.
        await orderCards(c.routeId,c.placeIds);
      } else {
        const p = await requirePlace(c.placeId); if (p.archivedAt || p.routeId!==c.routeId) return invalid();
        if (c.type === "membership") {
          // Legacy exact receipts replay above; new many-to-many writes are not supported.
          return invalid();
        } else {
          await tx.update(tripPlaces).set({ isStop:c.isStop }).where(placeScope(c.placeId));
        }
      }
      resultId = c.routeId;
    }
    const revision = plan.revision + 1;
    await tx.update(tripPlans).set({ revision, updatedAt: new Date() }).where(eq(tripPlans.id, plan.id));
    await tx.insert(tripMutationReceipts).values({ planId: plan.id, actorId: actor.userId, requestId: input.requestId, payloadHash, revision, resultId });
    return { revision, resultId, replayed: false };
  });
}

/** Paginated content is fetched only for the open, currently authorized place. */
export async function readTripComments(db: ToskerDatabase, actor: AuthenticatedActor, scopeKey: string, placeId: string, before?: string) {
  uuid(placeId); if (before) uuid(before);
  return db.transaction(async tx => {
    const scope = await lockTripScope(tx, actor, scopeKey, "share");
    const [plan] = await tx.select({ id: tripPlans.id }).from(tripPlans).where(tripScopeWhere(scope));
    if (!plan) return invalid();
    const [place] = await tx.select({ id: tripPlaces.id }).from(tripPlaces).where(and(eq(tripPlaces.planId, plan.id), eq(tripPlaces.id, placeId)));
    if (!place) throw new TripError("invalid", "This place is no longer available.");
    const rows = await tx.select({ id: tripComments.id, body: tripComments.body, authorId: tripComments.authorId, author: contextualName(actor.userId, conversationRoomId(scope.conversationId), sql`${profiles.userId}`, sql`${profiles.displayName}`), createdAt: tripComments.createdAt })
      .from(tripComments).innerJoin(profiles, eq(profiles.userId, tripComments.authorId))
      .where(and(eq(tripComments.planId, plan.id), eq(tripComments.placeId, placeId), before ? sql`(${tripComments.createdAt}, ${tripComments.id}) < (select created_at, id from trip_comments where id = ${before}::uuid and place_id = ${placeId}::uuid)` : undefined))
      .orderBy(sql`${tripComments.createdAt} desc`, sql`${tripComments.id} desc`).limit(31);
    return { hasMore: rows.length > 30, comments: rows.slice(0, 30).reverse().map(row => ({ ...row, createdAt: row.createdAt.toISOString() })) };
  });
}
