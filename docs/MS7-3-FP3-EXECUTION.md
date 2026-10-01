# MS7.3 FP3 execution / recovery ledger

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
