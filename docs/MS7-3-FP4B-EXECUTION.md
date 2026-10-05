# MS7.3 FP4B — Map Pins / social place memory

## B0 — recovered start, 2026-10-05 14:19 UTC

Eight-hour target ends approximately22:19UTC. Mandatory safety gates are not timebox casualties. Optional Pings deferred. Founder authorization: attachment84770389-66dd-4cfd-8b9d-3a4abad68ec1, read fully. No MS7.3 lock, MS7.4, MS8, Share Route, email, GPS tracking, paid resources or permanent provider decision.

Canonical FP4A `eadc1cf84f117c1f74f079cdc20c1591244039a6`, READY Production `dpl_566jmRSFkQxHmfW5Q9QDmjQyqEp2`, canonical alias/app200, normal live A/B mutations,26migration hashes/catalog, trip invariants, runtime and secret scans passed. Final local save `2315fa2` differs only in documentation/verification scripts. Exact-owned disposable Room and scratch schema deleted; protected Founder Review `ms73-founder-review-904a9dea` and founder-content Room `ms73-qa-bfff9475` preserved. Retained baseline:3plans/7routes/16cards/4comments/84receipts;6Rooms/11memberships/34messages. No FP4B fixtures yet. Never replay old FP4A fixture receipts or migrations0024/0025.

## Architecture / privacy contract before schema

- Existing conversations already identify Sandbox, exact-pair Personal, primary Room and Subroom. Canonical Pin belongs to conversation, not trip plan/Route. Conversation deletion cascades Pins; no Pin FK from Route Cards and no Route FK from Pins.
- One canonical Pin, four explicit states, independent revision. Store only the existing licensed candidate subset; provider abstraction/attribution unchanged. No provider calls to render persistence. No automatic Been here inference.
- Sandbox social memory is a live authorized query, not copied Pin rows. Current Room members; Subroom authorization additionally requires current parent membership and permitted visibility/grant; Personal requires exact two participants/directKey plus accepted connection; Sandbox requires exact owner. Pending invites confer no rights. Reads and writes use server actor, never supplied viewer identity.
- Batched authorization/provenance query, bounded pagination. Never query participant/profile once per Pin. Provenance lists only current authorized source participants. Source access loss removes the whole view, including title/people/place; no detached memory. Reconcile activity/reconnect/foreground and clear selected/draft data on invalidation before fetching fresh data.
- A per-Pin/per-viewer suppression row durably hides only that user's shared Sandbox view. It is not source deletion. Shared source remains visible when visited. Suppression requires current source authorization, expected Pin revision and expected preference revision. Source deletion cascades suppression; state edits do not reset it.
- All authorized source members may create/change state/Nuke source Pins, matching collaborative Route editing. Explicit destructive confirmation. Separate private Hide language. No author-only lock invented.
- Same-context canonical place identity deduplicates by provider+providerId (hashed) or rounded manual coordinate identity; different contexts remain distinct. State choice on duplicate never silently overwrites existing state. Per-context count and receipt limits bound abuse.
- Context-scoped actor/request receipts make retries idempotent, including Nuke tombstones; no place payload in receipt. Expected revisions reject stale state/hide operations. Authentication/authorization precedes replay.
- Add to Route copies a currently authorized source Pin's licensed candidate into a target authorized Route in one transaction. It never links Route lifecycle to Pin lifecycle. Existing Route-local duplicate behavior surfaces the existing card in that same Route; adding into another Route creates a new ID. No global geographic dedupe.
- Reuse content-light Ably source invalidation and user activity for authorized audiences. Existing membership withdrawal revokes actor tokens under the issuance lock; new Pin reads independently reauthorize. Audit Personal/Subroom revocation paths and stale UI explicitly, not just CRUD happy paths.
- Sandbox receives a Map surface without pretending it has a Route plan. Source Maps retain current Route UX; Pins work with zero Routes. Map marker state icons and compact detail surface, no new global management page. SDK stays lazy, rendering stays MapLibre.

## Checkpoints / gates

### B1 — schema generated/rehearsed; public unchanged

Starting HEAD2315fa2. Generated0026 adds only map_pins/map_pin_preferences/map_pin_receipts,6FKs, no existing table alteration and no Route dependency. Reviewed every SQL statement. Rollback-only public transaction rehearsal passed retained32-table data comparison; three new tables verified absent afterward,26migration history remains. Private0600backup `.git/fp4b-recovery/before-rehearse-68340b54-6b78-422e-81bc-946cc7523025.json`, SHA256`c48a21ab4c3e3da0802a07ab1b4031cd384621d079f0a39dae7f739d32d0083f`. No QA fixtures created. No provider calls. Initial safety check incorrectly rejected FK ON DELETE clauses; corrected before any transaction and rehearsal passed.

Pending B2/B3 service/auth/lifecycle, B4 copy independence, UI/A-B and full release. Restart: recover this checkpoint, re-read authorization; do not apply0026 until rollback-only service/auth/lifecycle tests and checkpoint are green. Existing FP4A canonical remains compatible and unchanged. Authorization/service drafts are local unaccepted work, not part of B1 acceptance.

### B2 — source CRUD/auth service checkpoint

Starting HEAD4a93bd0. Real service tests in one rollback-only schema/fixture transaction passed: founder exactTID inclusion, A/B state change/revision, provider identity duplicate returns existing without overwriting state, Checkpoint naming, idempotent create/Nuke, mismatched retry/stale revision/forged ID rejection, reload and peer reads. All temporary schema/fixture changes rolled back; public26migrations, no retained fixture or provider call. Typecheck passed before latest tests; full checks remain at B6. Source authorization uses parent/context locks and exact Personal accepted relationship. Sandbox query/preference code exists but broader lifecycle acceptance remains B3. Restart: run `verify-ms73-fp4b.ts --lifecycle` under explicit Development environment; no public migration yet.

B1 schema + rollback rehearsal; B2 source CRUD/auth; B3 projections/lifecycle; B4 Add to Route/independence; B5 integrated UI/A-B; B6 release candidate. Each save records HEAD, migration status, exact fixtures, evidence/pending and restart. Migration: additive forward only, backup, generated SQL review, rollback rehearsal, existing-data preservation, authorization/lifecycle tests, checkpoint, then cutover. No public schema mutation yet.

Release requires typecheck/lint/build, all hash/catalog checks, retained invariants, four-context authorization/adversarial IDs/revisions, revocation, Pin/Route independence, A/B/reconnect,320/390/430/768/1440/1728+short landscape, keyboard/reduced motion, secret/client scan and diff review. Scoped commit/push; exact canonical SHA/ID/READY/Production/alias/app200/runtime/env/secrets; bounded live A/B; exact-owned cleanup; retain Founder Review Pins; STOP awaiting founder+Jenn.

Provider budget: GeoapifyFree3000/day unchanged. Existing app road budget60/day exhaustedOct5; do not reset/increase. Pin tests do not require road calls. Development and Production separate browser/server credentials unchanged; server credential never exposed.
