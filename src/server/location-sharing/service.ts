import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerTransaction } from "@/server/db/client";
import { inviteRateLimits, locationShares, users } from "@/server/db/schema";
import { authorizedContext, lockPinScope, scopeForConversation } from "@/server/map-pins/scope";
import { lockActorTokens } from "@/server/realtime/access-lock";
import { assertRealtimeSession } from "@/server/realtime/session";
import { getSnapshotTransport } from "./transport";
import { isConversationId, userChannel } from "@/lib/realtime-contract";
import { LOCATION_SNAPSHOT, LOCATION_TTL, type LocationLease, type LocationPrecision, type LocationSnapshot, validSnapshotPoint } from "@/lib/shared-location-contract";
import { localArea } from "@/server/maps/area";
import { getPlaceProvider, reservePlaceRequest } from "@/server/maps/provider";
import { retireLocationLease, publishLocationRetirement } from "./lifecycle";

type Dependencies = {
  session: typeof assertRealtimeSession;
  publish: (recipientId: string, snapshot: LocationSnapshot) => Promise<void>;
  area: (point: NonNullable<LocationSnapshot["point"]>, actorId: string, signal: AbortSignal) => Promise<{ label: string; source: LocationSnapshot["source"] }>;
  retire: typeof retireLocationLease;
  retirement: typeof publishLocationRetirement;
};
export function locationService(db: ToskerDatabase, overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    session: assertRealtimeSession,
    publish: async (recipientId, snapshot) => {
      const accepted = await getSnapshotTransport().channels.get(userChannel(recipientId)).publish({ name: LOCATION_SNAPSHOT, data: snapshot, extras: { ephemeral: true } });
      // Incident diagnostics: aggregate acknowledgement shape only. Never log
      // identity, channel, consent ID, coordinates, labels, keys or SDK errors.
      console.info("[location-dispatch]", { stage: "provider-ack", appDigest:createHash("sha256").update(process.env.ABLY_API_KEY!.split(".")[0]).digest("hex").slice(0,12), channelDigest:createHash("sha256").update(userChannel(recipientId)).digest("hex").slice(0,12), serialCount: accepted?.serials?.length ?? 0, discarded: accepted?.serials?.filter(value => value === null).length ?? 0 });
    },
    area: async (point, actorId, signal) => {
      const local = await localArea(point.latitude, point.longitude);
      if (local) return { label: local, source: "ura" };
      await reservePlaceRequest(db, actorId);
      const label = await getPlaceProvider().area(point.latitude, point.longitude, signal);
      if (!label) throw new Error("Broad area unavailable; no snapshot sent.");
      return { label, source: "geoapify" };
    },
    retire: retireLocationLease,
    retirement: publishLocationRetirement,
    ...overrides,
  };
  const lease = (row: typeof locationShares.$inferSelect): LocationLease => ({ id: row.id, conversationId: row.conversationId, userId: row.userId, precision: row.precision as LocationPrecision, expiresAt: row.expiresAt.getTime() });
  async function context(tx: ToskerTransaction, actor: AuthenticatedActor, id: string) {
    const scope = await scopeForConversation(tx, actor, id);
    const result = await lockPinScope(tx, actor, scope, "share");
    if (result.sandbox) throw new AuthorizationDeniedError();
  }
  async function current(tx: ToskerTransaction, actor: AuthenticatedActor, sessionId: string, id: string) {
    await lockActorTokens(tx, actor.userId);
    await deps.session(actor, sessionId);
    const [row] = await tx.select().from(locationShares).where(and(eq(locationShares.userId, actor.userId), eq(locationShares.id, id)));
    if (!row || row.sessionId !== sessionId || row.expiresAt.getTime() <= Date.now()) throw new AuthorizationDeniedError();
    await context(tx, actor, row.conversationId);
    return row;
  }
  async function audience(tx: ToskerTransaction, conversationId: string) {
    const result = await tx.execute(sql`select u.id from conversations c cross join users u where c.id=${conversationId}::uuid and ${authorizedContext(sql`u.id`)} order by u.id limit 51`);
    if (!result.rows.length || result.rows.length > 50) throw new AuthorizationDeniedError("Snapshot audience unavailable.");
    return result.rows.map(r => String(r.id));
  }
  return {
    async begin(actor: AuthenticatedActor, sessionId: string, conversationId: string, precision: LocationPrecision): Promise<LocationLease & { audienceCount: number }> {
      if (!isConversationId(conversationId) || !["area", "precise"].includes(precision)) throw new TypeError("Invalid consent.");
      return db.transaction(async tx => {
        await lockActorTokens(tx, actor.userId); await deps.session(actor, sessionId);
        await context(tx, actor, conversationId);
        const [rate] = await tx.insert(inviteRateLimits).values({userId:actor.userId,operation:"location-consent",windowStart:new Date(),attempts:1}).onConflictDoUpdate({target:[inviteRateLimits.userId,inviteRateLimits.operation],set:{
          windowStart:sql`case when ${inviteRateLimits.windowStart} < now() - interval '1 minute' then now() else ${inviteRateLimits.windowStart} end`,
          attempts:sql`case when ${inviteRateLimits.windowStart} < now() - interval '1 minute' then 1 else ${inviteRateLimits.attempts} + 1 end`,
        }}).returning({attempts:inviteRateLimits.attempts});
        if(rate.attempts>6)throw new Error("Consent changes paused.");
        const recipients = await audience(tx, conversationId);
        await deps.retire(tx, actor.userId);
        const now = new Date();
        const [row] = await tx.insert(locationShares).values({ userId: actor.userId, conversationId, sessionId, precision, createdAt: now, expiresAt: new Date(now.getTime() + LOCATION_TTL) }).returning();
        return { ...lease(row), audienceCount: recipients.filter(id => id !== actor.userId).length };
      });
    },
    async send(actor: AuthenticatedActor, sessionId: string, id: string, point: unknown, signal: AbortSignal) {
      if (!isConversationId(id) || !validSnapshotPoint(point)) throw new TypeError("Invalid snapshot.");
      // No external I/O for an unconsented or unauthorized location.
      await db.transaction(async tx => {
        await current(tx, actor, sessionId, id);
        const [rate] = await tx.insert(inviteRateLimits).values({ userId: actor.userId, operation: "location-snapshot", windowStart: new Date(), attempts: 1 }).onConflictDoUpdate({ target: [inviteRateLimits.userId, inviteRateLimits.operation], set: {
          windowStart: sql`case when ${inviteRateLimits.windowStart} < now() - interval '1 minute' then now() else ${inviteRateLimits.windowStart} end`,
          attempts: sql`case when ${inviteRateLimits.windowStart} < now() - interval '1 minute' then 1 else ${inviteRateLimits.attempts} + 1 end`,
        } }).returning({ attempts: inviteRateLimits.attempts });
        if (rate.attempts > 6) throw new Error("Snapshot refresh paused.");
      });
      const area = await deps.area(point, actor.userId, signal);
      if (signal.aborted) throw new Error("Snapshot cancelled.");
      return db.transaction(async tx => {
        const row = await current(tx, actor, sessionId, id);
        const recipients = await audience(tx, row.conversationId);
        const snapshot: LocationSnapshot = { ...lease(row), sentAt: Date.now(), ...area, ...(row.precision === "precise" ? { point } : {}) };
        // Room/relationship locks remain held through delivery. No retained
        // coordinates, retries in durable queues, analytics or payload logging.
        // Bounded audience and frequency above. Parallel delivery prevents a
        // slow recipient multiplying the provider timeout while Stop waits.
        const delivery=await Promise.allSettled(recipients.filter(recipient=>recipient!==actor.userId).map(recipient=>deps.publish(recipient,snapshot)));
        console.info("[location-dispatch]", { stage: "fanout", recipients: delivery.length, accepted: delivery.filter(result=>result.status==="fulfilled").length, failed: delivery.filter(result=>result.status==="rejected").length });
        if(delivery.some(result=>result.status==="rejected"))throw new Error("Snapshot delivery could not be confirmed.");
        return snapshot;
      });
    },
    async stop(actor: AuthenticatedActor, sessionId: string, id: string) {
      if (!isConversationId(id)) throw new TypeError("Invalid consent.");
      const retired = await db.transaction(async tx => {
        await lockActorTokens(tx, actor.userId); await deps.session(actor, sessionId);
        const [row] = await tx.select().from(locationShares).where(and(eq(locationShares.userId, actor.userId), eq(locationShares.id, id)));
        // Old tabs may retire their own lease after losing source access, never
        // someone else's lease or a newer consent created in another session.
        if (row && row.sessionId === sessionId) {
          await tx.delete(locationShares).where(and(eq(locationShares.userId,actor.userId),eq(locationShares.id,id)));
          return {id:row.id,conversationId:row.conversationId,userId:row.userId};
        }
      });
      // Commit invalidation before the fallible clear signal. Even if Ably is
      // down, future sends/validation are denied; report unconfirmed peer clear.
      if(retired)await deps.retirement(retired);
    },
    async validate(actor: AuthenticatedActor, sessionId: string, id: string, conversationId: string): Promise<LocationLease> {
      if (!isConversationId(id) || !isConversationId(conversationId)) throw new TypeError("Invalid consent.");
      return db.transaction(async tx => {
        await deps.session(actor, sessionId);
        await context(tx, actor, conversationId);
        const [row] = await tx.select().from(locationShares).where(and(eq(locationShares.id, id), eq(locationShares.conversationId, conversationId)));
        if (!row || row.expiresAt.getTime() <= Date.now()) throw new AuthorizationDeniedError();
        const [sender] = await tx.select().from(users).where(eq(users.id, row.userId));
        if (!sender) throw new AuthorizationDeniedError();
        const sourceActor = { userId: sender.id, authProvider: sender.authProvider, authSubject: sender.authSubject };
        await context(tx, sourceActor, conversationId); await deps.session(sourceActor, row.sessionId);
        return lease(row);
      });
    },
  };
}
