# MS7.3 FP3 execution / recovery ledger

## Machine-restart recovery checkpoint — 2026-10-02

Read the complete founder restart/final-release directive. Recovered HEAD `ffe8a1456f7c95c3fdbda782ec03280da15d4822`; fetched origin remains `51df11d5a919b7aefb6ef9c685b2fadfc58bf4fa`, 0 remote-only / 3 local commits. Canonical remains FP2 READY `dpl_H1eeHbTU8VgPvBLCDrr8Jg3EY3Tz`, Production, exact canonical alias. No push/redeploy yet. All committed FP3 implementation and intended uncommitted additions survived: migration-progress ledger, post-cutover invariant audit, browser acceptance cases and 12px guidance inset. Unrelated Design/Art/Web WIP remains excluded.

Read-only recovery passed all 25 historical hashes, full schema catalog, zero route/card orphans, zero mirror mismatches/duplicate positions, all seven cutover triggers enabled, unique founder resolution and both protected Room memberships. Integrity baseline: 8 users/profiles/Sandboxes, 7 Rooms/14 memberships, 114 messages, 12 Board notes/2 pins; no listed violations. Backup and mapping remain mode 0600; backup SHA256 matches the recorded value. DO NOT reapply migration or restore/backfill.

Only current disposable FP3 browser fixture survives: `ms73-qa-e3f706b3`, exact receipt verified, cleanup dry-run safe, founder included. Its second route was already Nuked; first route has three safe synthetic cards and 80 search messages. Actual lifecycle fixture was already cleaned; no partial extra QA accounts/Rooms remain. Protected Founder Review and founder-content Room remain untouched. No local Next/agent-browser processes survived; temporary screenshots were cleared. These are runtime losses, not application failures.

Bounded TypeScript/integrity checks pass. Previously evidenced migration/lifecycle/race/Drive/Walk/guidance/Nuke tests remain valid because their implementation is unchanged. Search resilience stopped before restart at Escape focus after clicking Retry (test expected compact-trigger restoration); investigate/fix only that bounded issue. Remaining: fresh authenticated A/B runtime, search resilience/history, explicit search Add and Pin confirmation, six widths/reduced motion, final integrated build/lint/type/catalog/invariants/secret scan, exact cleanup review, scoped commit/normal push, canonical exact SHA/READY/alias/HTTP200 and bounded live smoke, cleanup/final docs/STOP. No FP4/Share/MS7.4/palette work.

## Active execution — migration committed, release acceptance underway

Local implementation checkpoint `ffe8a14`. Migration 0024 committed atomically on 2026-10-01 after rollback-only rehearsals and pre-cutover gates. All 25 migration hashes and catalog match: 32 tables / 220 columns / 108 constraints / 15 enums. Verified backup: `.git/fp3-recovery/before-74280326-248f-4608-8c52-97809b3d4d48.json`, SHA256 `d665154cd61520bc0895ddc677f6a0425bbd9ecd358470bb569b3e37db7d4568`; mapping alongside it. These contain retained data, mode 0600, ignored and never to be committed/uploaded. No old migration replay. Old FP2 Map writes now fail closed pending FP3 canonical.

Actual concurrent lifecycle suite passed and its exact-owned Room `ms73-qa-629f9586` was deleted with QA-only contents. Founder profile unchanged. Retained Founder Review/protected founder-content Rooms and memberships verified. Post-cutover inventory has zero shared/unassigned cards; existing fields/comments preserved. Disposable browser fixture `ms73-qa-e3f706b3` now has independent test routes; A/B browser Route Nuke cancel/confirm, peer realtime, route fallback, reload and preservation of surviving route cards passed. Real Drive/Walk, estimates, named roads, current-order geometry, Fit trip and controlled outage passed. Search mobile overlay fixed and verified all six widths; compact/companion history search passes Map/Board/Live without remounting canvas. Screenshots showed one guidance inset mismatch, corrected before final build.

Production environment metadata confirms existing separate `NEXT_PUBLIC_GEOAPIFY_MAP_KEY` Config and `GEOAPIFY_SEARCH_KEY` Secret. No settings, restrictions, billing or plan changed. Development keys remain in separate ignored `.env.development.local`, loaded via the existing dotenv workflow for build/server and scans. A first candidate-test invocation without that file correctly reported missing configuration; credential-loaded candidate tests passed. A scan overlapping an active rebuild hit a removed build artifact and was rerun after completion: PASS 522 source/owned files +40 bundles, including exact server Geoapify secret. No credential values printed.

Continue remaining browser resilience/explicit candidate and pin/six-width tests, final gates, commit/push and exact canonical/live acceptance. Canonical has NOT yet been claimed. FP4 deferred; MS7.3 unlocked.

## Active execution — checkpoint B/C, 2026-10-01

This section supersedes historical STOP/pending statements below. Founder directs complete FP3 through canonical, without further proceed approvals. FP4 remains ledger-only.

Implemented route-owned card storage/service/UI and Route Nuke; forward migration 0024 has NOT yet been applied to public at this checkpoint. Two rollback-only rehearsals on isolated schema copies passed. Exact backfill: 12 places / 15 memberships become 15 independent cards; 2 shared comments become 4 copies preserving authors/text/timestamps. All 78 mutation receipts and route metadata remain unchanged; plan revisions advance once. Every copied field is verified. Expanded lifecycle rehearsal passed independent notes/Star/archive/comments/Card Nuke, Route Nuke/cascade/replay/stale denial, outsider/revoked membership denial, selected Subroom and isolated Personal authorization, last-route empty state and explicit recreation. Rehearsal schemas and fixtures rolled back completely.

Cutover: `scripts/migrate-ms73-fp3.ts --apply` locks the six trip tables, writes a mode-0600 recoverable backup and deterministic mapping under ignored `.git/fp3-recovery`, verifies round-trip, applies only migration 0024 and records its exact hash in one transaction. It aborts on unassigned legacy places or post-split capacity overflow. Old FP2 Map writes fail closed after commit; Chat and non-Map services are unaffected. The legacy membership table remains a read-only compatibility projection. Do not roll back to an old writable binary or replay old backfills. New mutations require protocol 3 plus existing server-side scope authorization. Keep cutover bounded and publish validated FP3 promptly.

Routing now projects provider distance/time and at most four named major roads/paths, explicitly estimates without live traffic. Exact current route geometry participates in Fit trip and explicit calculation fit; peer changes do not automatically recenter. Mode changes clear old geometry/guidance. Geoapify remains server-only behind replaceable provider interfaces; MapLibre remains renderer.

Provider evidence: two bounded Singapore searches reproduced ambiguity. Marina Bay Sands returned Bayfront candidates at 1.2836965,103.8607226 and 1.2856255,103.8610678. East Coast Park returned several candidates, including western points near Marina East; no coordinates were silently corrected. Selection → preview → explicit confirmation remains mandatory. Two real public synthetic three-point road calls returned Drive 26,110 m / 1,430 s / 632 points and Walk 22,418 m / 21,179 s / 962 points, with provider road names. Test route coordinates were labelled synthetic, not falsely represented as selected search results. Calls reserved 10 API credits total (2 searches + 8 routing); map tile traffic is separate. Official reference: https://apidocs.geoapify.com/docs/routing/ (`details=route_details`, metric distance, seconds, default free-flow estimate; two credits per leg budgeted).

Validation so far: expanded rehearsal, TypeScript, full lint (one pre-existing unused-import warning in cleanup-fp4-qa), optimized build; pure routing projection/bounds and candidate/security tests underway. Corrected a mobile search result overlay that covered the focused input; six-width recheck underway. Public schema, Git remote and canonical are still FP2 at this checkpoint. Remaining: apply/verify migration, actual concurrent lifecycle, browser A/B/roads/search/resilience/six-width checks, secret/environment gates, release commit/push, exact canonical and live smoke, fixture inventory/cleanup. Never claim release completed until those gates finish.

## Active execution — checkpoint A, 2026-10-01

Founder approved the documented migration proposal with “proceed”, then explicitly directed full FP3 execution through canonical deployment without further proceed approvals. This supersedes the historical STOP below. The lossless shared-card/comment copy policy in the ownership proposal is accepted; FP4 remains documentation only.

Search is now owned by the mounted Chat surface: full field above desktop companion, compact expanding control in singular Chat. Existing authorized search, request cancellation, IME and canonical history-jump controller retained. No header duplicate or generic modal.

Passed: TypeScript, targeted component lint, optimized build; real browser compact expansion, Escape/Clear collapse, old-message jump with surrounding history; Map/Board/Live companion search preserves its planning surface and renderer; 320/390/430/768/1440/1728 search bounds and zero page overflow. Screenshots inspected at 320 and 1440. More resilience/A/B/security regression remains in final gates.

Created exact-owned disposable `ms73-qa-e3f706b3` with A/B and server-resolved founder TID 8V3X7P1; receipt `MS7-3-FP3-FIXTURE.json`. Eighty safe QA messages support historical search. Retained Founder Review and founder-content Rooms remain untouched. No DDL, provider configuration, push or deployment yet.

Restart: recover this local checkpoint, continue B (bounded route quality/guidance/camera), C (approved ownership migration and lifecycle), D (full release gates), then normal push/canonical/live acceptance. Do not stop for another proceed approval. Do not claim canonical until exact release evidence is recorded. Historical recovery follows for audit.

## Current state — 2026-10-01 (Asia/Singapore)

**STOP at the ownership-migration gate. No FP3 application implementation, migration, push or deployment.**

Authority: all six pages of `TOSKER_MS7_3_FP3_LIGHT_TOUCH_EXECUTION.pdf` were read, including rendered reference pages. Founder then authorized execution with mandatory save states. The later **Route Ownership Semantics Correction** supersedes ONLY the earlier plan-level-preservation Nuke semantics. The approved FP4 Map Pin prime is future work after founder playtest, not permission to implement during FP3.

Recovery HEAD/fetched `origin/main`: `51df11d5a919b7aefb6ef9c685b2fadfc58bf4fa`. Canonical verified READY: `dpl_H1eeHbTU8VgPvBLCDrr8Jg3EY3Tz`, exact same SHA, alias `toskerapp.vercel.app`. Local recovery checkpoint subject: `docs(ms73-fp3): save ownership migration gate and FP4 prime`; resolve its current SHA from Git (this document belongs to that checkpoint). No half-validated application changes have been pushed.

MS7.1 LOCKED; MS7.2 LOCKED; MS7.3 UNLOCKED; MS7.4 NOT STARTED. FP2 remains live. FP3 canonical release is NOT complete.

## Completed / verified

- Recovered local Git, fetched origin and canonical deployment; all match the expected FP2 baseline.
- Read-only DB integrity audit: 8 users/profiles/Sandboxes, 6 Rooms/11 memberships, 5 Personal conversations, 34 messages, 12 Board notes, 2 Board pins, 6 accepted connections, 48 notifications. Zero listed integrity violations.
- All 24 historical migration hashes and latest full catalog match: 32 tables, 217 columns, 106 constraints, 15 enums. `db:verify` also passed. No historical migration/backfill replayed.
- Audited current schema, add/deduplication, membership, card Nuke, comments and route-menu paths. Confirmed material ownership mismatch; see [migration gate](MS7-3-FP3-OWNERSHIP-GATE.md).
- New read-only ownership audit runs inside a PostgreSQL READ ONLY transaction. Founder TID `8V3X7P1` resolves uniquely. Primary review receipt (ID/slug/name/owner/creation time) and both protected Room memberships match.
- Actual inventory: 3 plans, 7 routes, 12 places, 15 route memberships, 2 comments, 78 mutation receipts. 9 places have one route; **3 places are shared by multiple routes; both comments belong to shared places**. Zero unassigned places at audit time. No private coordinates, queries, messages or provider response data logged.
- TypeScript and targeted lint for the audit script passed. No runtime source changed.

Reproduce read-only evidence:

```sh
npm run db:audit-ms5
npx dotenv -e .env.local -- node scripts/verify-migration-history.mjs
npm run db:verify
NODE_OPTIONS=--conditions=react-server npx dotenv -e .env.local -- tsx scripts/audit-ms73-fp3-ownership.ts
```

## Pending / not claimed

Checkpoint A: Chat-owned search placement/compact expansion and actual history-jump validation. Intended bounded design: one existing authorized search controller inside the visible Chat surface; full field above desktop companion, compact icon expands in place in singular Chat; preserve Map/Board/Live and conversation history, restore keyboard focus on collapse. No duplicate controller or generic modal. Current source remains unchanged.

Checkpoint B: reproduce Singapore accuracy report through candidate/stored/request/geometry/render/fit chain, then root-cause fixes only; real Walk/Drive stale/outage handling; provider-supported bounded estimate/guidance and camera fit. **No Geoapify request made in this FP3 recovery.** Neither geography defect nor provider ambiguity has yet been reproduced. No road-name/ETA claims invented.

Checkpoint C: route ownership migration + Route/Card Nuke semantics, selection recovery, A/B/retry/auth/lifecycle. **Gated:** requires explicit founder review of forward migration/backfill/cutover, not a cosmetic menu-only change. No Saved Places UI removal until its retained data has a safe replacement path.

Checkpoint D: full type/lint/build/catalog/invariants, authorization/search/Personal/Subroom/comments/Nuke regression, real modes/stale/outage, six widths/keyboard/reduced motion, exact server-secret/client-bundle scan, diff check, origin recheck, coherent push/canonical/live A/B acceptance. None claimed for an FP3 application build.

Provider: existing FP2 approval remains Geoapify Free, separate browser/server credentials, bounded canonical founder review, replaceable MapLibre/provider boundary. This recovery did not alter or freshly re-audit provider environment assignments/restrictions/account credits; repeat metadata/secret/privacy/usage checks before future provider calls and release. No billing, key, plan, origin, quota or environment changes.

## Fixtures / preservation

No new QA fixtures or accounts created; no cleanup performed.

| Retained Room | Purpose | Disposition |
|---|---|---|
| `ms73-founder-review-904a9dea` | MS7.3 Founder Review — Singapore Trip | Founder TID verified; preserve for manual inspection; NEVER auto-clean |
| `ms73-qa-bfff9475` | Prior QA now containing founder content | Founder TID verified; preserve; not disposable |

Historical deleted fixture receipts are evidence, not permission to recreate/delete by stale ID. Future collaborative QA must resolve exact founder TID server-side, include founder, and use new exact-owned receipts. Do not alter founder profile/Sandbox/Personal/history/Board/settings to facilitate testing.

Preserved unrelated WIP: historical CODEX-HANDOFF design/website hunks; CROSS-PROJECT-INHERITANCE; untracked DEV-DESIGN-SKILLS, Art/Web/Design reports, docs/design-hub, docs/research, experiments and toskerArt. Stage only this run's new handoff hunk, FP3/FP4 ledgers and read-only audit.

## Debt / forward marker

- App darkness/palette is MS8 Design debt only; no recolor or typography work.
- Existing plan-wide card Nuke is NOT compliant with the newly clarified route-instance model. Avoid destructive founder testing of shared cards until migration is implemented and verified.
- Share Route stays deferred; future sharing treats a Route + its owned ordered cards + metadata as one aggregate, not a global place pool. Live/snapshot, import/duplication, access/revocation, comments, provider rights and source-Nuke behavior require their own approved contract.
- [FP4 Map Pins](MS7-3-FP4-NEXT-DEPLOYMENT.md) approved for after founder playtest, not implemented or included in current release.

## Exact restart instruction

Read this ledger and `MS7-3-FP3-OWNERSHIP-GATE.md`, then the latest founder response. Recover `git status`, current local checkpoint, fetched origin and exact canonical SHA without resetting unrelated WIP. Re-run the read-only ownership inventory because founder may add content. **Do not apply a migration or add Route Nuke under the superseded semantics.** Obtain the explicit migration/backfill/cutover decision at this gate, or explicit direction to ship only independent search/routing fixes while ownership remains deferred. After resolution, resume A → B → C → D with validated local checkpoints; do not push until full approved release gates pass. Stop after verified canonical/live acceptance. Never auto-lock MS7.3, start FP4/MS7.4/MS8, or silently convert legacy places into future Map Pins.
