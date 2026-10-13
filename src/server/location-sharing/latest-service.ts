import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerTransaction } from "@/server/db/client";
import { inviteRateLimits, locationLatest, locationShares, users } from "@/server/db/schema";
import { authorizedContext, lockPinScope, scopeForConversation } from "@/server/map-pins/scope";
import { lockActorTokens } from "@/server/realtime/access-lock";
import { assertRealtimeSession } from "@/server/realtime/session";
import { isConversationId } from "@/lib/realtime-contract";
import { LOCATION_TTL, LOCATION_VIEW_MS, type LocationLease, type LocationPrecision, type LatestLocationSnapshot, type LocationCurrentView } from "@/lib/shared-location-contract";
import { notifyLocationChanged } from "./notifications";
import { localArea } from "@/server/maps/area";
import { liveRoster } from "@/server/live/roster";
import { assertSyntheticLocationPoint, localLocationWorker, lockHealthyLocationWorker } from "./local-qa";

type Dependencies = { session: typeof assertRealtimeSession; notify: (conversationId: string) => Promise<void> };
export class LocationRevisionConflict extends Error {}
const lease = (r: typeof locationShares.$inferSelect): LocationLease => ({ id: r.id, conversationId: r.conversationId, userId: r.userId, precision: r.precision as LocationPrecision, expiresAt: r.expiresAt.getTime() });
const snapshot = (consent: typeof locationShares.$inferSelect, r: typeof locationLatest.$inferSelect): LatestLocationSnapshot => ({
  ...lease(consent), sentAt: r.acceptedAt.getTime(), revision: r.revision, label: r.label, source: r.source as "ura" | "geoapify",
  ...(r.precision === "precise" ? { point: { latitude: r.latitude!, longitude: r.longitude!, accuracy: r.accuracy! } } : {}),
});
async function context(tx: ToskerTransaction, actor: AuthenticatedActor, id: string) {
  const scope = await scopeForConversation(tx, actor, id);
  if ((await lockPinScope(tx, actor, scope, "share")).sandbox) throw new AuthorizationDeniedError();
}
async function rate(tx: ToskerTransaction, userId: string, operation: string) {
  const [r] = await tx.insert(inviteRateLimits).values({ userId, operation, windowStart: new Date(), attempts: 1 }).onConflictDoUpdate({ target: [inviteRateLimits.userId, inviteRateLimits.operation], set: {
    windowStart: sql`case when ${inviteRateLimits.windowStart}<now()-interval '1 minute' then now() else ${inviteRateLimits.windowStart} end`,
    attempts: sql`case when ${inviteRateLimits.windowStart}<now()-interval '1 minute' then 1 else ${inviteRateLimits.attempts}+1 end`,
  } }).returning({ attempts: inviteRateLimits.attempts });
  if (r.attempts > 6) throw new Error("Sharing refresh paused.");
}

/** Local synthetic-QA candidate. No payload enters Ably, a queue or a log. */
export function latestLocationService(db: ToskerDatabase, overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = { session: assertRealtimeSession, notify: notifyLocationChanged, ...overrides };
  const notify = async (contexts: string[]) => { await Promise.allSettled([...new Set(contexts)].map(id => deps.notify(id))); };
  async function current(tx: ToskerTransaction, actor: AuthenticatedActor, sessionId: string, id: string) {
    await lockActorTokens(tx, actor.userId); await deps.session(actor, sessionId);
    const [row] = await tx.select().from(locationShares).where(and(eq(locationShares.id, id), eq(locationShares.userId, actor.userId)));
    if (!row || row.sessionId !== sessionId || row.expiresAt.getTime() <= Date.now()) throw new AuthorizationDeniedError();
    await localLocationWorker(actor.userId, row.conversationId);
    await context(tx, actor, row.conversationId);
    return row;
  }
  return {
    async begin(actor: AuthenticatedActor, sessionId: string, conversationId: string, precision: LocationPrecision) {
      if (!isConversationId(conversationId) || !["area", "precise"].includes(precision)) throw new TypeError();
      const config = await localLocationWorker(actor.userId, conversationId);
      const result = await db.transaction(async tx => {
        await lockHealthyLocationWorker(tx, config, LOCATION_TTL);
        await lockActorTokens(tx, actor.userId); await deps.session(actor, sessionId);
        await context(tx, actor, conversationId);
        const audience = (await tx.execute(sql`select u.id from conversations c cross join users u where c.id=${conversationId}::uuid and ${authorizedContext(sql`u.id`)} limit 51`)).rows;
        if (!audience.length || audience.length > 50) throw new AuthorizationDeniedError();
        await rate(tx, actor.userId, "location-consent");
        const old = await tx.delete(locationShares).where(eq(locationShares.userId, actor.userId)).returning();
        const now = new Date();
        const [row] = await tx.insert(locationShares).values({ userId: actor.userId, sessionId, conversationId, precision, createdAt: now, expiresAt: new Date(now.getTime() + LOCATION_TTL) }).returning();
        await lockHealthyLocationWorker(tx, config, LOCATION_TTL);
        return { value: { ...lease(row), audienceCount: audience.length - 1 }, contexts: old.map(r => r.conversationId) };
      });
      await notify(result.contexts); return result.value;
    },
    async send(actor: AuthenticatedActor, sessionId: string, id: string, point: unknown, expectedRevision: number, requestId: string, signal: AbortSignal) {
      if (!isConversationId(id) || !isConversationId(requestId) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new TypeError();
      assertSyntheticLocationPoint(point);
      const fix = point as { latitude: number; longitude: number; accuracy: number };
      const config = await localLocationWorker(actor.userId);
      const previous = await db.transaction(async tx => {
        await lockHealthyLocationWorker(tx, config);
        const consent = await current(tx, actor, sessionId, id);
        const [row] = await tx.select().from(locationLatest).where(eq(locationLatest.leaseId, id));
        if (row?.requestId === requestId && row.revision === expectedRevision + 1) return snapshot(consent, row);
        if ((row?.revision ?? 0) !== expectedRevision) throw new LocationRevisionConflict();
        await rate(tx, actor.userId, "location-snapshot");
      });
      if (previous) return previous;
      // Synthetic Singapore fixtures use the existing local area dataset only.
      const label = await localArea(fix.latitude, fix.longitude);
      if (!label || signal.aborted) throw new Error("Area unavailable or request cancelled.");
      const result = await db.transaction(async tx => {
        await lockHealthyLocationWorker(tx, config);
        const consent = await current(tx, actor, sessionId, id);
        const [old] = await tx.select().from(locationLatest).where(eq(locationLatest.leaseId, id));
        if (old?.requestId === requestId && old.revision === expectedRevision + 1) return snapshot(consent, old);
        if ((old?.revision ?? 0) !== expectedRevision) throw new LocationRevisionConflict();
        if (signal.aborted) throw new Error("Cancelled");
        const data = { workerRunId: config.runId, precision: consent.precision, expiresAt: consent.expiresAt, acceptedAt: new Date(), revision: expectedRevision + 1, requestId, label, source: "ura",
          latitude: consent.precision === "precise" ? fix.latitude : null, longitude: consent.precision === "precise" ? fix.longitude : null, accuracy: consent.precision === "precise" ? fix.accuracy : null };
        const [row] = old ? await tx.update(locationLatest).set(data).where(and(eq(locationLatest.leaseId, id), eq(locationLatest.revision, expectedRevision))).returning()
          : await tx.insert(locationLatest).values({ leaseId: id, ...data }).returning();
        if (!row) throw new LocationRevisionConflict();
        await lockHealthyLocationWorker(tx, config);
        return snapshot(consent, row);
      });
      // Committed truth survives notification failure. Revalidation recovers it.
      await notify([result.conversationId]); return result;
    },
    async stop(actor: AuthenticatedActor, sessionId: string, id: string) {
      if (!isConversationId(id)) throw new TypeError();
      // Stop must work even if the cleanup worker is unhealthy/missing.
      const retired = await db.transaction(async tx => {
        await lockActorTokens(tx, actor.userId); await deps.session(actor, sessionId);
        return tx.delete(locationShares).where(and(eq(locationShares.id, id), eq(locationShares.userId, actor.userId), eq(locationShares.sessionId, sessionId))).returning({ conversationId: locationShares.conversationId });
      });
      await notify(retired.map(r => r.conversationId));
    },
    async read(actor: AuthenticatedActor, sessionId: string, conversationId: string): Promise<LocationCurrentView> {
      if (!isConversationId(conversationId)) throw new TypeError();
      const config = await localLocationWorker(actor.userId, conversationId);
      return db.transaction(async tx => {
        await tx.execute(sql`set local statement_timeout='4s'`);
        await lockHealthyLocationWorker(tx, config);
        // Capture only metadata before locks. New leases wait for a later read.
        // Sorted actor locks precede context locks, matching removal/session paths.
        const candidates = await tx.select({ id: locationShares.id, userId: locationShares.userId }).from(locationShares).where(and(eq(locationShares.conversationId, conversationId), sql`${locationShares.expiresAt}>clock_timestamp()`)).limit(51);
        if (candidates.length > 50) throw new AuthorizationDeniedError();
        for (const id of [...new Set([actor.userId, ...candidates.map(r => r.userId)])].sort()) await lockActorTokens(tx, id);
        await deps.session(actor, sessionId); await context(tx, actor, conversationId);
        const rows = candidates.length ? await tx.select({ consent: locationShares, payload: locationLatest, user: users }).from(locationShares)
          .innerJoin(locationLatest, eq(locationLatest.leaseId, locationShares.id)).innerJoin(users, eq(users.id, locationShares.userId))
          .where(and(inArray(locationShares.id, candidates.map(r => r.id)), eq(locationShares.conversationId, conversationId), eq(locationLatest.workerRunId, config.runId), sql`${locationShares.expiresAt}>clock_timestamp()`,
            // The viewer's context lock already fences membership/relationship
            // changes for this exact context. Recheck each source in this query,
            // rather than resolving and reacquiring the same locks per source.
            sql`exists(select 1 from conversations c where c.id=${locationShares.conversationId} and ${authorizedContext(sql`${locationShares.userId}`)})`)) : [];
        const permitted: typeof rows = [];
        for (const row of rows) {
          if (row.consent.userId === actor.userId) continue;
          try {
            await deps.session({ userId: row.user.id, authProvider: row.user.authProvider, authSubject: row.user.authSubject }, row.consent.sessionId);
            if (row.consent.expiresAt.getTime() > Date.now()) permitted.push(row);
          } catch { /* A revoked/unverifiable source is omitted, never cached. */ }
        }
        const identities = await liveRoster(tx, actor, { conversationId, userIds: permitted.map(r => r.consent.userId) });
        await lockHealthyLocationWorker(tx, config);
        const serverNow = Date.now();
        const peers = permitted.filter(r => r.consent.expiresAt.getTime() > serverNow).flatMap(r => {
          const identity = identities.find(p => p.userId === r.consent.userId);
          return identity ? [{ snapshot: snapshot(r.consent, r.payload), identity }] : [];
        });
        return { serverNow, validForMs: Math.max(0, Math.min(LOCATION_VIEW_MS, ...peers.map(p => p.snapshot.expiresAt - serverNow))), peers };
      });
    },
  };
}
