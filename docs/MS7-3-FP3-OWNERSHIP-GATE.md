# FP3 route ownership — material migration gate

2026-10-01. **Proposal only. No DDL/backfill/application mutation executed.** Founder correction overrides the previous instruction to preserve plan-level cards on Route Nuke.

## Proven current model

`src/server/db/schema.ts`:

- `trip_places` belongs to `trip_plans`, not a Route. Unique `(plan_id, provider, provider_id)` prevents separate same-provider card rows in one plan.
- `trip_route_places` joins `(plan_id, route_id)` to `(plan_id, place_id)`, with `(route_id, place_id)` primary key and per-route position/Stop. Many routes may reference one place. Both FKs cascade only the join records.
- `trip_comments` attaches to `(plan_id, place_id)`, with cascade when that shared place is deleted.
- Routes can already be absent; no schema minimum-one-route invariant. Current `add` implicitly creates/falls back to a route when `routeId` is null.

`src/server/trips/service.ts`:

- `add` deduplicates across the WHOLE plan by provider identity **or** near-exact coordinates, then links the same row to the target route.
- `membership` adds/removes references to that shared row. Notes/Star/archive/comments belong to the shared place.
- `nuke-place` deletes the shared row, all route references and comments, then reconciles every affected route's order.
- Route Nuke is not implemented. Existing route archive preserves its cards/references.

Actual read-only inventory: 12 place rows / 15 route memberships; 3 multi-route place rows; 2 comments on shared rows; no unassigned rows at this checkpoint. The mismatch already exists in retained data, not just an unused theoretical relation.

## Why a UI-only or join-only patch is unsafe

Deleting a Route alone would leave its place rows in a global pool. Deleting all referenced place rows would destroy other Routes' cards/comments. Cloning rows in only the Nuke handler cannot establish correct independent card identity for add/edit/archive/Star/comment/retry flows. Plan-wide uniqueness and deduplication must change together with ownership. This exceeds a small destructive-menu patch and triggers the founder's migration STOP condition.

## Smallest proposed forward model

Keep `trip_places` as the storage name to avoid a broad rename, but redefine each row as a **route-owned Location Card**:

```text
trip_routes(plan_id, id)
  owns, cascade on Route Nuke
trip_places(plan_id, route_id NOT NULL, id, position, is_stop, ...existing fields)
  references provider identity as ordinary metadata, not a shared card ID
  owns trip_comments(plan_id, place_id, ...), cascade on Card Nuke
```

Proposed forward-only DDL shape (NOT runnable migration authorization): add nullable `route_id`, `position`, `is_stop`; after verified backfill enforce composite `(plan_id, route_id)` FK to routes with ON DELETE CASCADE and non-null/range constraints; replace plan-level provider uniqueness with route-level uniqueness if duplicate-in-one-route policy is approved; preserve `(plan_id,id)` for comment FK; retire the many-to-many table only after application cutover proves no readers/writers depend on it. No independent Map Pin repository in this migration.

Distinct cards in different Routes may have identical provider IDs/coordinates. Keep retry idempotency through request receipts; do not use global deduplication as retry protection. Within one Route, recommend preserving current duplicate-add UX by returning that route's existing card, subject to explicit confirmation of product policy. Coordinate-only pins need a documented within-route duplicate rule, not a global constraint.

## Backfill and protected-data decisions

1. Inventory in a consistent read-only snapshot; classify single-route, multi-route, unassigned, archived cards/routes, comments, notes, stars and old receipts. No private data in console logs. Record exact pre-migration counts/fingerprints privately, with a recoverable database backup before approved mutation.
2. Use a deterministic `(legacy place ID, route ID) → new card ID` mapping. Single-route cards can retain their IDs. Multi-route cards must split into separate instances; retain original ID for one deterministic route and clone fields to new IDs for others, keeping each membership's original order/Stop.
3. **Founder decision needed for legacy shared comments:** they currently have no originating-route field. Proposed lossless default is copying the existing discussion to each resulting card with original author/time/body and fresh comment IDs; preserve the provenance mapping in migration evidence, never impersonate a new message. After cutover, discussions diverge per card. Do not silently choose a route or discard founder-authored discussion. Notes/Star/archive need the same reviewed copy policy.
4. No unassigned places exist now, but recheck immediately before mutation. If any appear, STOP for explicit disposition; do not delete them, invent a visible recovery Route, or convert them to unapproved FP4 Map Pins.
5. Preserve immutable old idempotency receipts and old IDs' replay interpretation; reject old protocol writes after cutover. An acknowledged old request must not recreate a removed route/card or target an unrelated clone. Define compatibility for old add/membership/nuke requests before executing.
6. Verify all route orders/counts, fields, author/time/body preservation and unaffected contexts. Only then enforce required constraints and retire joins through a reviewed forward migration. Never rewrite migration history.

## Deployment / concurrency hazard

Current canonical FP2 and local code share the configured database. A destructive schema change before a compatible release can break live writes; old code would still global-deduplicate or globally Nuke. An additive nullable column alone does NOT make the ownership transition safe.

Require a reviewed compatibility/cutover plan: an expand migration plus compatible guarded application version, then bounded write freeze/drain or equivalent server-enforced old-protocol rejection during backfill, followed by validated new ownership reads/writes and later contract cleanup. Existing browser tabs must reload/reconcile; no silent loss of in-flight commands. Do not deploy a half-migrated model under pressure. Backup/restore and roll-forward failure procedure must be defined before mutation; any paid resource or broadened infrastructure needs separate authority.

## Affected lifecycle / required tests

- Search/pin preview→explicit Add creates a card in the selected Route. No Route: clear create-route state; no implicit hidden repository or surprise route creation.
- Card edit/note/Star/Hide/archive/comment/Nuke isolated to its route-owned instance. Hide remains viewer presentation, never deletion.
- Route Nuke atomically deletes that Route/cards/comments; other Routes, same-provider cards and their comments unchanged. Confirmation: “This removes the route and all its locations for everyone.”
- Active route selects next visual survivor, otherwise previous, otherwise valid empty route state. Clear removed route geometry, selections, ghosts and Quick order state; do not fabricate a replacement route.
- Remove Saved Places/All Saved Places repository UI in the same coherent ownership cutover. Recovery of archived cards remains scoped to the owning Route; preserve archived-route recovery intentionally.
- A/B NUS→MBS→Jewel versus SIM→NUS→Jewel: distinct instances, shared provider metadata; Nuke Route2 and Card2 independently; Route1 and comments survive; deleted route/card comments cascade.
- Last route removal, archived/mixed routes, route/color/order recovery, selected/ghost/geometry state, reload/reconnect, lost-ack replay, payload mismatch, stale commands, concurrent add/comment versus Nuke, unrelated actor/context denial, Personal/Subroom authorization, founder membership stable.
- Migration tests for shared comments, zero/one/many membership, archived data, orphan stop, foreign-key isolation, old receipt replay, interruption/restart without duplicate clones, constraints and count/fingerprint reconciliation. Full existing release gate still required.

## Future architecture (not implemented)

Share Route is **Route as aggregate**: its own ordered cards and metadata travel together. Snapshot/live reference/import, source mutation/Nuke, destination authorization, comments, provider rights and duplication ownership remain deferred.

FP4 Map Pins are separate independent bookmarks. Pin→Add to Route creates a NEW route-owned card. Route deletion must not delete its source bookmark; bookmark removal must not delete derived cards. Do not use this prime to preserve the old shared-card pool under a new label.
