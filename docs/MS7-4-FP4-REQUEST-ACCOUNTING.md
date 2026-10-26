# FP4 server-authoritative request accounting

27 October2026 Singapore. Founder final execution authorization read in full from attachment`b23642bc-8a4a-4b78-a6ac-4501d420384b`. Recovered`8084aadc3133a882d3b615b089371813134a9d45`. This document is the R/A/B accounting ledger, not release acceptance.

## R — recovered baseline

Read-only receipt`.git/ms74-fp4/recovery-1793031737632.json` PASS: retained33migration hashes/timestamps; isolated34; exact founder resolves; protected rows match the original26October FP4 fingerprints under their original exclusions; zero isolated payloads/active shares/workers. No old baseline rewritten. Unrelated Art/Design/Web WIP preserved. Canonical remains FP3`a166934`, and has not been deployed by this wave.

## Contract to implement and verify

- Reuse existing PostgreSQL `map_provider_usage` and `location_cleanup_budget`; no paid service or schema migration for accounting.
- Charge each authenticated logical latest-state read once at the shared service entrypoint, before validation/session/worker/context failures can return. Retry, reconnect, separate tabs/users/workers are new requests. Do not trust client-generated IDs to waive charges.
- Local isolated review enforces800reads/day and20consent attempts/day, below the unchanged hosted2000reads/day and100consents/day. Use databaseUTC day, not device/host locale. Preserve existing rows; normal UTC rollover is not an operator reset.
- Charge consent admission attempts independently of the later transactional cleanup work, so failures do not refund capacity. Existing cleanup reservation remains separately authorized and must not charge the same consent twice.
- Session validation reservations remain bounded30/10seconds across workers. Stop/deletion remains available under exhausted admission quotas; these safety paths never expose peer coordinates.
- Fail closed before peer reads on missing/unavailable/exhausted accounting. Counter output contains no identity, context, coordinates or credentials.
- The unknown26October isolated period must remain held, not initialized as zero or reconstructed from651lower-bound receipts. Verify a later databaseUTC day and counters before live QA. Keep original receipts/hold as historical evidence.
- Verify in uniquely owned isolated shadow tables with actual concurrent SQL and mocked deterministic clock only inside that shadow. Public counters and retained data must be byte-identical before/after. Mocked tests are not hosted capacity/cleanup acceptance.

At R, implementation had not started. Canonical and historical evidence remain unchanged.

## A / B — implementation and deterministic verification

Application/test checkpoint **`db3018e0a87bd9bdb5aac6b87d5d761dbe0101b8`**, following R `89583a6abc52eddc6fbbd89b67bbd6b3a3b50a66`.

Both local latest-state and hosted durable services now reserve one read at service entry and one consent attempt at begin entry, using root-DB autocommit outside later request transactions. They share the existing anonymous counters; no new schema, provider or second rolling-deployment allowance. Hosted caps remain2000reads/100consents per UTC day; isolated review800/20. Session validation reserves its actual external checks at30/10seconds. Stop remains authenticated but exempt from admission quotas; expiry/deletion paths are unchanged.

Accounting applies after the API's existing actor/session/origin/envelope/deployment gates admit the operation. Unauthorized or malformed API envelopes that never enter sharing service work do not acquire a sharing reservation. Every admitted `current` call—including polling, background refresh, retries, reconnect, separate tabs/users/workers and service failures—uses the same entrypoint. UUIDs do not waive charges. `send` is an existing per-actor-rate-limited mutation of an admitted consent, not another latest-state read or consent; its external session check is metered. No new polling exists. Missing accounting availability fails before a peer view can be returned. Generic no-store API errors remain unchanged. Existing client failure-removal behavior still needs integrated timing acceptance with the new server path.

Source trace: the only runtime constructors are in `src/app/api/location-sharing/route.ts`; its only `current` branch invokes the selected service's charged `read`. The old ephemeral `locationService` has no runtime caller. The sole `reserveCleanup` caller follows charged consent entry; cleanup does not debit a second consent. The older FP3 capacity-verifier entrypoint now routes to safe shadow verification instead of manipulating public counter rows inside a rollback.

Private final receipt **`.git/ms74-fp4/accounting-1793032455589.json` PASS** (earlier narrower pass retained at`accounting-1793032307856.json`). Real PostgreSQL atomic operations in uniquely owned isolated shadow tables; deterministic clock applies only to those tables. Verified:

- Unknown26October window remains denied without invented counts.
- One charge per read; two QA actors, local/hosted paths, invalid and failed calls, retries persist.
- Later transaction rollback cannot refund the separate reservation.
- Twelve concurrent calls through three independent pools claim exactly two remaining review slots; no overrun.
- A restarted pool still sees exhaustion; rejected reads return no view.
- Concurrent review consent attempts stop at20; actual session reservations stop at30/10seconds.
- UTC rollover admits a new window; previous consent rows remain; backwards clock cannot reset reads.
- Cleanup reservation does not charge twice; rollback removes its shadow obligation without refunding admission.
- Hosted SQL selection in the same shadow verifies exactly2000reads and100consents under concurrency. This is not hosted browser/deployment acceptance.

Both test schemas were deleted after the runs; real public budget tables were byte-identical before/after. No location payload or Clerk/Ably/Geoapify request occurred. No founder/Room/content mutation. TypeScript, scoped ESLint, guarded isolated production build and configured-server-secret/client-asset scan PASS (855source/owned files,43assets). Main33/review34 migration and protected-data evidence remains the read-only R audit; this change adds no migration.

## Hard stop — actual UTC capacity, not routine approval

Read-only receipt **`.git/ms74-fp4/budget-audit-1793032578641.json`**: database time`2026-10-26T16:36:18.566Z` (27October00:36SGT), day`2026-10-26`, no public read/consent counter row, zero payloads/active shares/workers. Missing rows do **not** prove zero historical usage. The9consents/651reads remain a lower bound with unknown background traffic; remaining allowance is **UNVERIFIABLE**. No counter reset, quota change or hold deletion. No live QA/server/worker started.

Canonical independently rechecked: alias`toskerapp.vercel.app` → READY`dpl_9NhdBjGXUkTpFzVyhhjJqe9NKP23`, exact FP3`a166934b6d348dd84ab9c78f35a73e9ce6f661b1`, existing project/team. No push, deployment, environment or infrastructure mutation. No claim of FP4 release or full acceptance.

Next safe command: `git status --short`, then `node scripts/audit-ms74-fp4-budget.mjs`. Do not start a live harness merely because Singapore midnight passed. At/after **27October08:00SGT**, independently verify databaseUTC day, authoritative usage and unchanged fixed approval expiry2November20:05SGT. Preserve the historical hold file. Before live QA, update old harness/worker blanket-hold checks to consume a verified later-window server-accounting preflight, retain diagnostic browser counts, and reserve enough remaining budget and worker lifetime for only outstanding tests. No waiver or historical reconstruction. Current authorization already covers this work; a hard safety gate, not generic approval, is stopping this execution.

Open C–F: end-to-end sender/peer expiry and consent renewal; browser member/context/multitab/restart cases; Board/Chat and responsive/accessibility regression; bounded provider routing/search gaps; migration backup/rehearsal and founder reconciliation; hosted cleanup/capacity/privacy acceptance; exact canonical deployment/live A/B/security and final closeout. Preserve prior qualified evidence rather than repeat whole suites.

Recovery rollback: canonical is unchanged and needs no rollback. If local accounting rollback is necessary, use a separate worktree at`89583a6`; never reset unrelated WIP or reset counters. No database rollback required. Retain Founder Review Rooms and all old/failed receipts. MS7.4 remains UNLOCKED.
