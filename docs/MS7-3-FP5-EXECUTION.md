# MS7.3 FP5 — execution and recovery ledger

## 2026-10-06 09:27 UTC — full FP5 window approved / checkpoint A in progress

Founder explicitly approved the proposed full11–16h scope: “Approve, lets get it.” This supersedes the execution-time STOP below, not the remaining safety/migration/release gates. Start09:27UTC; upper bounded window ends2026-10-07 01:27UTC. Work through A–F and canonical without another generic proceed approval. Checkpoint/report if the bound or a different stop gate is reached.

Recovered local `f47a919`, fetched origin/canonical FP4B `2f516e8`/READY `dpl_6Fiq682EVPvEoWeRhXw5ykMitfYs`. Fresh27hash/catalog and general/Route ownership audits pass;3plans/7routes/16cards/4comments/84receipts, protected founder memberships intact. No applied migration change yet. Existing unrelated WIP remains excluded.

A decision: explicit nullable `sandbox_conversation_id` with an exactly-one-context constraint and unique index; owner-only Sandbox service branch, unchanged strict Personal Chat guards. Add a bounded category/icon field to Route Locations; no new Pin card type or memory backfill. Existing old columns/identities/receipts remain unchanged. Schema rehearsal and UI verification will use an exact-owned isolated namespace before public cutover. Dormant FP4B memory stays reachable through a secondary Saved places entry, not the normal planning tray.

UI skeleton: map-first surface; existing Tosker Night/Ivory/Gold/accent tokens and Mermaid/Montserrat identity; concise contextual popup at selection; one explicit Add to active Route; Location Cards below; compact toolbar/summary; optional existing Chat companion. No new palette, typography system, art, animation library or external service. Saved Pin data does not become a Route automatically.

## 2026-10-06 — checkpoint R / execution-time STOP

All four pages of `/Users/ryanc/Desktop/TOSKER_MS7_3_FP5_GAME_MAP_UX_RESEARCH_BUILD_EXECUTION.pdf` were extracted and read, and all pages rendered/inspected. This is the active FP5 brief. Research/synthesis: [MS7-3-FP5-RESEARCH.md](MS7-3-FP5-RESEARCH.md).

**Gate:** section 00 requires checkpoint and STOP if research exposes an 8+ hour architecture expansion. Realistic remaining work is **11–16 hours through canonical verification**, approximately 8–11 hours implementation/architecture and 3–5 hours integrated acceptance/release. This is an engineering estimate, not a guaranteed elapsed-time commitment. No FP5 implementation starts under the earlier FP4B extension.

Estimate assumes reuse of working FP4A/B routing, reorder/locks, authorization primitives, receipts, geolocation hook and fixture tooling; no new provider, art system, pings, peer live location or destructive migration. Main expansion is genuine private Sandbox Route ownership, plus unified preview/marker popup flow, icon persistence/model audit, private origin and validated per-leg metrics. A default-tab-only change would not implement Sandbox planning safely.

| Work after authorization | Estimate | Gate/evidence |
| --- | --- | --- |
| A: explicit Sandbox ownership/model audit, additive schema decision, authorization and rehearsal | 2–3h | Exact SQL/backup/rehearsal if needed; no Personal Chat guard weakening |
| B: direct-to-Route flow, compact popup, selection/adjacent legs, naming/icons, Sandbox shell | 3.5–4.5h | Full creation and recovery paths, retained controls, keyboard/mobile collisions |
| C/D: private Locate/origin, validated leg DTO/summary, dormant Pin compatibility | 2.5–3.5h | No private-coordinate disclosure, matching provider truth, FP4B lifecycle intact |
| E/F: integrated A/B, responsive/security/regression, cutover/release/live smoke/cleanup | 3–5h | All required gates, exact canonical and saved recovery state |

Rounded total: 11–16h. Provider quotas, migration findings or discovered failures may extend this; checkpoint and report rather than bypass gates. No paid procurement identified; no destructive migration proposed. The architecture/time gate alone is sufficient to stop.

Founder decision required: authorize a larger bounded FP5 window for the full brief, or explicitly reduce/stage the scope. Recommended: authorize the full 11–16h plan with A–F checkpoints; do not silently omit Sandbox or regression to claim a shorter complete release. Until then, only this research/save-state work is authorized by the reached gate.

## Fresh recovery evidence

- Real repository `/Users/ryanc/Developer/toskerapp` (not the older Desktop location).
- Starting local HEAD `35c447529625a78f609d60c32ef80ab3d6b80d26`, FP4B local closeout documentation.
- Fetched `origin/main` and exact canonical source `2f516e8fa0093ca357d1995d876016d22eaffced`; no application-source or migration difference from starting local HEAD.
- Vercel READY Production `dpl_6Fiq682EVPvEoWeRhXw5ykMitfYs`, URL `tosker-ni8cjw4t2-pangea6.vercel.app`, canonical alias `toskerapp.vercel.app`, no alias error. Canonical unauthenticated root returns 307; following redirect yields HTTP200. Do not confuse that expected redirect with outage or claim an authenticated FP5 smoke.
- All **27** migration hashes and schema catalogue verified: **35 tables / 250 columns / 125 constraints / 15 enums**. Migration0026 already applied. Never replay/drop it or restore its historical backup onto newer data.
- Ownership audit: 3plans / 7routes / 16cards / 16route memberships / 4comments / 84Trip receipts. No orphan/mirror/duplicate-position issues; seven cutover triggers enabled; Route ownership intact.
- General read-only audit: 8users / 8profiles / 8Sandboxes / 6Rooms / 11memberships / 5Personal conversations / 34messages / 12Board notes / 2Board pins / 3capabilities / 6accepted connections / 48notifications. Invalid Sandbox owners, duplicate TIDs/memberships/Personal pairs and orphan Board pins all zero.
- Founder TID `8V3X7P1` uniquely resolved server-side; retained protected memberships verified. No assumed user UUID and no profile/account edits.

### Protected data / cleanup

- `ms73-founder-review-904a9dea`: MS7.3 Founder Review — Singapore Trip. Room `53bc3b0c-2895-4dca-b873-1400833b93ad`, conversation `235ecc73-4084-4720-a107-162e7e46d671`. Remains available for founder/Jenn. Pin `009e5547-5a05-4ae7-a511-11f46c7599b0` (Marina Bay Sands) is currently **saved**. Earlier FP4B closeout recorded want_to_go: this newer state is authoritative and must not be reset. Source actor of that change was not inferred.
- `ms73-qa-bfff9475`: protected founder-authored content; preserve.
- Old disposable `ms73-qa-6896cd50` was deleted at FP4B closeout. Do not replay its fixture/smoke/cleanup receipts.
- No FP5 Room, Pin, Route, card, migration or shadow schema created. Nothing newly scheduled for cleanup. No cleanup performed this turn.

### Provider / secret recovery

Read-only Vercel metadata confirms separate Development and Production assignments for `NEXT_PUBLIC_GEOAPIFY_MAP_KEY` (encrypted browser variable) and `GEOAPIFY_SEARCH_KEY` (sensitive server variable). No values decrypted, printed, pulled, rotated or changed. This confirms assignment metadata, not a fresh origin/API-restriction dashboard audit or connectivity smoke. Existing Free-plan/canonical-review authorization remains bounded; no permanent production-provider commitment.

Read-only app counters for UTC2026-10-06: geocoding5/120 and road reservations12/60. These are Tosker server budget counters, not the provider's complete account usage, and exclude browser map tiles. Founder-approved account cap remains3000/day; no dashboard quota/plan change or live provider request made during FP5 research. Recheck counters and actual account allowance before bounded live routing acceptance. An initial read-only counter query hit a reserved-column syntax error; corrected quoted-column SELECT passed without mutation.

### Worktree and skill boundaries

Unrelated pre-existing dirty work remains excluded: older Design Hub/Web additions in CODEX-HANDOFF, CROSS-PROJECT-INHERITANCE, DEV-DESIGN-SKILLS, art/design/web docs, docs/design-hub, docs/research, experiments, toskerArt. Do not stage the whole worktree or overwrite those hunks. FP5 checkpoint contains only these two ledgers and its new top handoff section.

PDF skill used for complete source review. UX skills and repository design guidance used to keep Tosker identity, local selection, explicit confirmation/recovery, and accessible popup behavior; no replacement visual system. Vercel environment skill used for metadata-only inspection. No UI/application edits, DB writes, provider requests, new dependencies, billing/account changes, push or deployment. Source/build/browser acceptance for FP5 is **not run / not claimed** because implementation has not begun.

## Resume contract

1. Obtain an explicit founder decision at the 8+ hour architecture gate; a prior FP4B extension is not sufficient.
2. Re-read this ledger/research and active brief, recover exact current canonical/Git/DB/quota again. Preserve any newer founder data.
3. Read applicable AGENTS/local Next.js and skill guidance before code. Execute checkpoint A model/skeleton only within newly authorized scope/window. Rehearse and back up any additive migration; never rewrite applied history.
4. Save A→B→C→D→E→F and respect all stop gates. No automatic partial-scope implementation or hidden regression deferral.
5. Only after integrated green: scoped commit/push, exact canonical deployment/live A/B/security verification, exact ownership cleanup, recovery save and STOP for founder + Jenn. Do not automatically lock MS7.3.

MS7.1 LOCKED. MS7.2 LOCKED. MS7.3 UNLOCKED. MS7.4 NOT STARTED. FP4B remains canonical; the research checkpoint above is retained as history, superseded by the approved execution status at the top.

## Checkpoint A — model and component skeleton (2026-10-06)

- Founder approval recovered; fresh canonical deployment remains READY on FP4B. Fresh migration/schema, ownership and general integrity audits passed before changes. No public cutover, push or deployment.
- Explicit Sandbox plan owner scope added; no weakening of Personal Chat or Room authorization. Additive migration0027 adds nullable unique Sandbox ownership plus constrained place-icon field. Protocol4 and old payload receipt hashes remain compatible.
- Manual Rename is a separate validated command; provider names cannot be renamed. Icon commands are whitelisted, revision-bound and receipt-safe. Small shared icon-component skeleton uses the existing Lucide/Tosker vocabulary.
- Full retained-row backup (35 tables) stored with0600 permissions at `.git/fp5-recovery/before-rehearse-39893444-7ea3-4b6f-96e8-00ef236c99f6.json`; SHA256 `fe3c27a237d4afd306e860b1d9d811a2703ebb1c5800de431659d9c83146d06d`. Private backup is not committed or printed.
- `npm run typecheck` PASS. `scripts/migrate-ms73-fp5.ts --rehearse` PASS in transaction-owned isolated namespace, including whole-row preservation, owner-only Sandbox reads/writes, cross-context rejection, exact-founder QA membership, shared A/B/founder read, checkpoint naming/Rename/icons, replay, POI-name protection, duplicates, comments and exact fixture cleanup. Transaction rolled back. Public history still27; no FP5 schema/fixtures retained by this rehearsal.
- Migration SQL is additive except atomically replacing the context CHECK. No destructive data rewrite/backfill; no pin conversion. Public apply remains gated behind integrated acceptance and a fresh backup.
- Normal planning decision: direct preview → explicit Add to current Route. FP4B memory/provenance/lifecycle retained as a secondary Saved places surface, never silently converted into Route Locations.
- Official MapLibre popup API, Geoapify routing API and Wanderlog collaboration references refreshed against the research ledger; no new provider or scope expansion.
- Next: B compact marker/card inspection, direct add, manual Rename/icon controls and genuine private Sandbox planning/default Map; then C/D/E/F. UI/browser/regression acceptance is not yet claimed.
