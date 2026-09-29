# MS7.3 continuation — shared trip / founder review

## Superseding integrated checkpoint — 2026-09-30

Map/core A/B and post-Map Search acceptance are complete, canonical application `fab1a7b` is READY and live A/B smoke passed. See [release ledger](MS7-3-RELEASE.md) for evidence, approved canonical environment configuration, retained Founder Review Room and six deleted disposables. Earlier pending statuses below are historical. STOP FOR FOUNDER WALK; MS7.3 is not locked.

## Authority and recovery — 2026-09-29

Founder continuation resumes `f24f8b5` through integrated canonical release and live acceptance, then STOP for Founder Walk. MS7.1/MS7.2 remain locked; MS7.3 is not locked; MS7.4 and Live location are not started. The latest Founder QA Identity Addendum applies to every newly created collaborative fixture, including service/security test Rooms.

Recovered `main`: `f24f8b5`, origin `bf791df`, 0 behind / 2 ahead after fetch. Canonical still READY `dpl_35pSmVjb6xUsQWQNmpy5JtQqt3nM` with `toskerapp.vercel.app` alias. No deployment in this continuation yet. All 20 prior migration hashes and 25-table catalog match; read-only baseline remains 8 users/profiles/Sandboxes, 4 Rooms, 5 memberships, 5 Personal conversations, 29 messages, 9 Board notes, 2 pins, 3 capabilities, 6 connections, 32 notifications; integrity violations zero. Unrelated handoff/inheritance and Design/Art/Web/research/experiments WIP remains untouched.

Server-side exact lookup of `users.tid = '8V3X7P1'` returned exactly one existing account. No assumed founder UUID, duplicate account, profile edit, or unrelated membership change. QA A/B resolve from the exact retained QA usernames, not founder data. No provider evaluation is restarted; Geoapify is still Development-only and replaceable behind MapLibre/provider boundaries.

## Fixture contract

All new collaborative fixtures use `scripts/lib/ms73-fixtures.ts`. Exact founder resolution occurs inside the creation transaction before any insert; zero/multiple results abort. A, B and founder receive Room membership and existing primary Chat participation together. No backfill into existing Rooms. Membership-loss tests act on isolated B, never founder.

Ownership receipts include exact Room UUID/slug/name/owner/creation timestamp, conversation ID, run ID, purpose and retention flag. Cleanup requires a dry run and exact ownership validation; it rejects unexpected members/non-QA authored Chat or Board content. Founder membership is never removed separately. A `ms73-founder-review-*` Room cannot be automatically deleted by this helper, even if its retention flag is altered. Final review Room will be kept for Founder Walk.

Retained fixture inventory: **MS7.3 Founder Review — Singapore Trip**, slug `ms73-founder-review-904a9dea`, Room `53bc3b0c-2895-4dca-b873-1400833b93ad`, primary Chat `235ecc73-4084-4720-a107-162e7e46d671`. Exact creation receipt is in `MS7-3-QA-FIXTURES.json`. A/B/founder are members; founder was freshly resolved inside creation. This is the ONE retained Founder Walk Room; no scheduled cleanup. Created empty for upcoming browser acceptance; content/release validation still in progress. Do not create a duplicate. Disposable fixtures must also include founder throughout their lifetime and may be removed only as whole exact-owned Rooms.

## Slice B — pre-application schema review

New forward-only `0020_ms73_trip_plan` adds five tables only. Historical migration files are unchanged. The schema adds no new membership authority, no user/profile changes and no pre-populated trip state.

- `trip_plans`: unique parent Room FK, nonnegative revision; cascade only when that Room is deleted.
- `trip_places`: canonical coordinate/name/address/provenance subset, user note, reversible archive. Finite coordinate ranges (also excluding PostgreSQL NaN/infinity), bounded text and source checks. Provider identity unique within a plan. No raw provider responses or media.
- `trip_routes`: bounded names, controlled colors and reversible archive.
- `trip_route_places`: route-specific order/Stop state; composite plan+route and plan+place FKs reject cross-plan association; canonical place data is not copied per route. Archive retains membership.
- `trip_mutation_receipts`: plan+actor+request identity, payload hash and committed result/revision, no content payload. Authorization precedes replay; Room deletion cascades receipts.

Generated SQL inspection found composite foreign keys preceding their referenced unique indexes. Before application, the **new unapplied** migration was corrected to create those two indexes before its FK statements; snapshot definitions remain equivalent. No historical checksum was edited. DDL and lifecycle tests are still pending until recorded below.

Service lock order is parent Room → current membership → receipt/revision → mutation, matching existing membership withdrawal. Reads take a shared Room lock for a consistent bounded snapshot and never create a plan. Mutations create lazily only on explicit action, reject stale revisions and changed-payload retries, and retain canonical IDs on duplicate confirmation. Realtime signaling belongs after commit in the action boundary, never provider payloads.

Viewer camera, selected card, active route and ghost visibility remain private client preferences, scoped to user and Room; none are shared route columns. Server remains authoritative for places/routes/order/archive/Stop state. No automatic save on result selection.

Status: implementation in progress; no browser multiplayer acceptance, push, deployment or milestone lock claimed.

### Current continuation checkpoint (supersedes status above)

Both forward migrations applied; all22 hashes and31-table/207-column/99-constraint/15-enum catalog checks passed. Actual A/B browser gate passed: real MBS search does not choose/save automatically; explicit result selection is private; confirmation creates one canonical UUID visible to B within15sec; both reload; card↔pin selection is private; peer archive/restore keeps the UUID. A test initially clicked a pin outside the clipped Singapore camera; corrected to native keyboard pan before hit-tested click. Earlier unexpected browser navigation was not reproduced in the successful run and is not claimed fixed as an application defect.

Direct pin preview/cancel creates no durable data; explicit confirmation shares one exact-coordinate pin. B receives shared name/note edits. The review Room now has Marina Bay Sands plus a clearly labelled synthetic QA waterfront point, both available for manual inspection. No founder-authored data or founder membership modified.

Route browser gate passed: Day2 creation shared; canonical places reused without duplication; A/B active route and ghost preferences differ privately; Day1 reorder does not change Day2; Quick order remains unsaved until Apply; Apply and guarded Undo propagate to B. Shared planning lines connect Stops only, with active solid/ghost dashed legend; no routing calls. Color/name/archive, edit forms, move buttons and HTML drag are implemented, but complete drag/conflict/responsive acceptance still pending. Menus subsequently moved to the existing top-layer popover to prevent expanded cards from creating excessive vertical space; this refinement awaits browser regression.

Existing ChatSurface is now reused as an optional >=1100px parent-Room Map/Board companion, with a single existing realtime subscription and original draft store. Mobile remains single-surface. Companion behavior is implemented/build-green but not yet browser-accepted. No new conversation model.

Service suite rerun passed including unrelated actor and pending-invite denial, with founder/retained Room preservation. Exact disposable fixtures9aacd278/dc29faba removed after dry-run; earlier07148c6b/5f5557a1 likewise deleted. One separate disposable200-place fixture is active: see `MS7-3-STRESS-FIXTURE.json`; it includes A/B/founder. Canonical200-place read/reorder/cap checks passed using zero provider requests, browser stress/revocation and cleanup still pending. Never auto-clean the Founder Review Room.

Typecheck/lint/build pass (only historical unused eq warning in cleanup-fp4-qa.ts). Candidate/founder failure-case tests pass. Server-secret scan passed458source/owned files and39client/generated bundles before the companion refinement; rerun before release. Geoapify dashboard freshly filtered Sep29UTC showed17requests/14credits (12geocoding,5tile requests), below internal500/day; dashboard may lag and is not a per-request budget meter. No paid plan, billing or Production/Preview credential change.

Still required before canonical: updated browser suite, six-width/full workflow/200-place/failure/revocation checks, companion+Chat+Board regression, final catalog/invariants/secrets, exact scoped Git push, canonical environment review/deployment and bounded live A/B. This checkpoint is NOT a release or milestone lock.

### Slice B service evidence

`0020` applied successfully. All 21 hashes and 30-table/203-column/98-constraint catalog checks pass. The catalog verifier was extended for equivalent PostgreSQL CHECK deparsing (owning-table qualifiers, negative double literals, BETWEEN expansion and IN→ANY arrays); names, types and expressions remain compared, not skipped.

`verify-ms73-trips.ts` passed actual Neon A/B/Founder snapshots, same-payload receipt replay, changed retry rejection, coordinate duplicate confirmation, simultaneous add and reorder conflict, route-specific order isolation, note edit, Stop state, archive/restore preserving both route references, cross-Room service injection and direct composite FK rejection, failed-write rollback, deterministic Quick order, actual Ably-backed withdrawal/replay denial and withdrawal-vs-write. Founder profile/identity and all retained Room records were unchanged. Exact-owned disposable Rooms `ms73-qa-07148c6b` and `ms73-qa-5f5557a1` included founder throughout; both removed after dry run with Map/Chat cascade proof. These fixtures are deleted, not Founder Walk Rooms; no application undo is claimed.

### Provider budget migration review

New `0021_ms73_provider_budget` contains only a four-column counter table (scope/window/used/last_at), no lookup text, coordinates, payloads or credentials. It supports transactional cross-instance geocoding limits: global 120/day, per-actor 12/minute, at least 1.1 seconds between accepted global requests, no automatic retry. This is a search/reverse sub-budget, **not** an account-wide tile meter; the founder dashboard and overall internal500/day evaluation ceiling still apply. Counter application/testing pending below.
