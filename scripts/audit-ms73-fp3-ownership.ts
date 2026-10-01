/** Read-only ownership inventory. No coordinates, queries, message bodies or secrets are logged. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, roomMemberships, users } from "../src/server/db/schema";

const db = getDatabase();
async function main() {
  await db.transaction(async tx => {
    await tx.execute(sql`set transaction read only`);
    const founder = await tx.select({ id: users.id }).from(users).where(eq(users.tid, "8V3X7P1")).limit(2);
    assert.equal(founder.length, 1, "STOP: founder TID must resolve uniquely");
    const receipt = JSON.parse(readFileSync("docs/MS7-3-QA-FIXTURES.json", "utf8")).retained[0];
    const [review] = await tx.select().from(rooms).where(eq(rooms.id, receipt.id));
    assert(review && receipt.retained && review.slug === receipt.slug && review.name === receipt.name && review.ownerId === receipt.ownerId && review.createdAt.toISOString() === receipt.createdAt, "STOP: retained review receipt mismatch");
    const retained = [];
    for (const slug of [receipt.slug, "ms73-qa-bfff9475"]) {
      const rows = await tx.select({ slug: rooms.slug }).from(rooms).innerJoin(roomMemberships, eq(roomMemberships.roomId, rooms.id)).where(and(eq(rooms.slug, slug), eq(roomMemberships.userId, founder[0].id)));
      assert.equal(rows.length, 1, "STOP: protected Room/founder membership missing");
      retained.push(slug);
    }
    const inventory = await tx.execute(sql`
      with ownership as (
        select p.id, count(r.route_id)::int as route_count
        from trip_places p left join trip_route_places r on r.place_id=p.id and r.plan_id=p.plan_id group by p.id
      ) select
        (select count(*)::int from trip_plans) as plans,
        (select count(*)::int from trip_routes) as routes,
        (select count(*)::int from trip_places) as places,
        (select count(*)::int from trip_route_places) as route_memberships,
        (select count(*)::int from trip_comments) as comments,
        (select count(*)::int from ownership where route_count=0) as unassigned_places,
        (select count(*)::int from ownership where route_count=1) as single_route_places,
        (select count(*)::int from ownership where route_count>1) as shared_places,
        (select count(*)::int from trip_comments c join ownership o on o.id=c.place_id where o.route_count>1) as shared_place_comments,
        (select count(*)::int from trip_comments c join ownership o on o.id=c.place_id where o.route_count=0) as unassigned_place_comments,
        (select count(*)::int from trip_mutation_receipts) as mutation_receipts
    `);
    console.log(JSON.stringify({ readOnly: true, founderUnique: true, retained, inventory: inventory.rows[0] }));
  });
}
main().catch(() => { console.error("Ownership audit failed; sensitive details suppressed. Inspect the read-only assertions."); process.exitCode = 1; }).finally(() => db.$client.end());
