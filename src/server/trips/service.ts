import "server-only";
import { createHash } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { tripPlans, tripPlaces, tripRoutes, tripRoutePlaces, tripMutationReceipts } from "@/server/db/schema";
import { lockTripScope, tripScopeWhere } from "./scope";
import { TRIP_COLORS, TRIP_LIMITS, type PlaceCandidate, type TripColor, type TripFailureCode, type TripMutation, type TripSnapshot } from "@/lib/trip-contract";
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
    case "archive-place": return { ...base, command: { type: c.type, placeId: uuid(c.placeId), archived: flag(c.archived) } };
    case "star-place": return { ...base, command: { type: c.type, placeId: uuid(c.placeId), starred: flag(c.starred) } };
    case "nuke-place": return { ...base, command: { type: c.type, placeId: uuid(c.placeId) } };
    case "order-routes": {
      if (!Array.isArray(c.routeIds) || c.routeIds.length > TRIP_LIMITS.routes || new Set(c.routeIds).size !== c.routeIds.length) return invalid();
      return { ...base, command: { type: c.type, routeIds: c.routeIds.map(uuid) } };
    }
    case "create-route": return { ...base, command: { type: c.type, name: text(c.name, 60), color: color(c.color) } };
    case "edit-route": return { ...base, command: { type: c.type, routeId: uuid(c.routeId), name: text(c.name, 60), color: color(c.color) } };
    case "archive-route": return { ...base, command: { type: c.type, routeId: uuid(c.routeId), archived: flag(c.archived) } };
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
    const memberships = await tx.select({ routeId: tripRoutePlaces.routeId, placeId: tripRoutePlaces.placeId, position: tripRoutePlaces.position, isStop: tripRoutePlaces.isStop }).from(tripRoutePlaces).where(eq(tripRoutePlaces.planId, plan.id)).limit(TRIP_LIMITS.places * TRIP_LIMITS.routes);
    return { revision: plan.revision,
      places: places.map(p => ({ id: p.id, title: p.title, note: p.note, starred: p.starred, latitude: p.latitude, longitude: p.longitude, source: p.source as "search" | "pin", provider: p.provider, providerId: p.providerId, address: p.address, attribution: p.attribution, license: p.license, archived: !!p.archivedAt })),
      routes: routes.map(r => ({ id: r.id, name: r.name, color: r.color as TripColor, archived: !!r.archivedAt })), memberships };
  });
}

export async function mutateTrip(db: ToskerDatabase, actor: AuthenticatedActor, raw: TripMutation) {
  const input = normalize(raw);
  const payloadHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return db.transaction(async tx => {
    const scope = await lockTripScope(tx, actor, input.roomSlug, "update");
    let [plan] = await tx.select().from(tripPlans).where(tripScopeWhere(scope));
    if (!plan) {
      if (input.expectedRevision !== 0) throw new TripError("conflict", "The trip changed. Review its latest state before trying again.");
      [plan] = await tx.insert(tripPlans).values({ roomId: scope.roomId, subroomId: scope.subroomId }).returning();
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
    const members = (routeId: string) => tx.select().from(tripRoutePlaces).where(and(eq(tripRoutePlaces.planId, plan.id), eq(tripRoutePlaces.routeId, routeId))).orderBy(asc(tripRoutePlaces.position), asc(tripRoutePlaces.placeId));
    const include = async (routeId: string, placeId: string) => {
      const rows = await members(routeId);
      if (rows.some(r => r.placeId === placeId)) return;
      if (rows.length >= TRIP_LIMITS.places) throw new TripError("limit", "This route is full.");
      await tx.insert(tripRoutePlaces).values({ planId: plan.id, routeId, placeId, position: rows.length });
    };
    if (c.type === "add") {
      const p = c.candidate;
      const all = await tx.select().from(tripPlaces).where(eq(tripPlaces.planId, plan.id)).limit(TRIP_LIMITS.places);
      const duplicate = all.find(existing => (p.providerId && p.provider && existing.providerId === p.providerId && existing.provider === p.provider) || (Math.abs(existing.latitude - p.latitude) < 0.000001 && Math.abs(existing.longitude - p.longitude) < 0.000001));
      if (duplicate?.archivedAt) throw new TripError("invalid", "This place is already archived in the trip. Restore it from Archived places.");
      if (duplicate) resultId = duplicate.id;
      else {
        if (all.length >= TRIP_LIMITS.places) throw new TripError("limit", "Up to 200 places, including archived places, fit in this Development trip.");
        const [created] = await tx.insert(tripPlaces).values({ planId: plan.id, ...p }).returning({ id: tripPlaces.id }); resultId = created.id;
      }
      let routeId = c.routeId;
      if (routeId) await requireRoute(routeId);
      else {
        const existing = await tx.select().from(tripRoutes).where(eq(tripRoutes.planId, plan.id)).orderBy(asc(tripRoutes.createdAt)).limit(TRIP_LIMITS.routes);
        routeId = existing.find(r => !r.archivedAt)?.id ?? (await makeRoute("Day 1", "gold")).id;
      }
      await include(routeId, resultId);
    } else if (c.type === "edit-place" || c.type === "archive-place") {
      await requirePlace(c.placeId);
      await tx.update(tripPlaces).set(c.type === "edit-place" ? { title: c.title, note: c.note, updatedAt: new Date() } : { archivedAt: c.archived ? new Date() : null, updatedAt: new Date() }).where(placeScope(c.placeId)); resultId = c.placeId;
    } else if (c.type === "star-place") {
      await requirePlace(c.placeId);
      await tx.update(tripPlaces).set({ starred: c.starred, updatedAt: new Date() }).where(placeScope(c.placeId)); resultId = c.placeId;
    } else if (c.type === "nuke-place") {
      await requirePlace(c.placeId);
      const affected = await tx.select({ routeId: tripRoutePlaces.routeId }).from(tripRoutePlaces).where(and(eq(tripRoutePlaces.planId, plan.id), eq(tripRoutePlaces.placeId, c.placeId)));
      // Composite FKs remove every membership atomically; receipts contain no place content.
      await tx.delete(tripPlaces).where(placeScope(c.placeId));
      for (const { routeId } of affected) {
        const rows = await members(routeId);
        if (rows.length) await tx.update(tripRoutePlaces).set({ position: sql`case ${sql.join(rows.map((row,index) => sql`when ${tripRoutePlaces.placeId} = ${row.placeId}::uuid then ${index}::int`), sql` `)} end` }).where(and(eq(tripRoutePlaces.planId, plan.id), eq(tripRoutePlaces.routeId, routeId)));
      }
      resultId = c.placeId;
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
      await requireRoute(c.routeId);
      if (c.type === "order") {
        const rows = await members(c.routeId);
        // Include archived memberships too: archive/restore never silently discards order.
        if (rows.length !== c.placeIds.length || rows.some(r => !c.placeIds.includes(r.placeId))) return invalid();
        // One bounded UPDATE, not N round trips per drag.
        if (rows.length) await tx.update(tripRoutePlaces).set({ position: sql`case ${sql.join(c.placeIds.map((id, index) => sql`when ${tripRoutePlaces.placeId} = ${id}::uuid then ${index}::int`), sql` `)} end` }).where(and(eq(tripRoutePlaces.planId, plan.id), eq(tripRoutePlaces.routeId, c.routeId)));
      } else {
        const p = await requirePlace(c.placeId); if (p.archivedAt) return invalid();
        const where = and(eq(tripRoutePlaces.planId, plan.id), eq(tripRoutePlaces.routeId, c.routeId), eq(tripRoutePlaces.placeId, c.placeId));
        if (c.type === "membership") {
          if (c.included) await include(c.routeId, c.placeId);
          else {
            await tx.delete(tripRoutePlaces).where(where);
            const rows = await members(c.routeId);
            if (rows.length) await tx.update(tripRoutePlaces).set({ position: sql`case ${sql.join(rows.map((row, index) => sql`when ${tripRoutePlaces.placeId} = ${row.placeId}::uuid then ${index}::int`), sql` `)} end` }).where(and(eq(tripRoutePlaces.planId, plan.id), eq(tripRoutePlaces.routeId, c.routeId)));
          }
        } else {
          const updated = await tx.update(tripRoutePlaces).set({ isStop: c.isStop }).where(where).returning(); if (!updated.length) return invalid();
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
