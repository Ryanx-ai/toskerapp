# MS7.4 FP4 — Map-first Beta consolidation

26 October 2026, Singapore. **Founder approved the bounded 30–44-hour existing-role wave. R recovered; local A implementation underway. No deployment.** MS7.4 remains unlocked.

## R.1 — architecture approved / provenance reconciled with limitations

Founder explicitly approved deferring Admin, retaining Owner/Member, exact-owned disposable QA Room deletion only, and server-resolved founder membership without GODMODE. No general Room deletion or new authorization model. The 40–60-hour expanded alternative is not authorized. Capacity assessment is read-only; even unchanged limits require a proposed renewal and separate founder approval before enabling.

Recovered `474da197262042c183decd876bc7326b44aa6ed6`. Fresh alias remains the exact FP3 deployment. A read-only repeatable-read provenance tool (`scripts/audit-ms74-fp4-provenance.mjs`) uses catalog primary keys, not assumed generic IDs. All observed historical differences are additions/updates, no removed rows under original protected-data exclusions. No DB write, test fixture or provider call made by reconciliation.

Evidence at `2026-10-26T10:06:45.891Z`: five invitations authored by founder, in an existing founder-owned Room with current founder membership, created26October09:18:16–18UTC (17:18SG). Four invitation notifications share the transaction timestamps and have existing QA/other retained recipients. Three new trip receipts identify the authenticated founder actor at09:22:15/29/38UTC; the added card is referenced by the09:22:29 receipt at revision55 and has an existing same-plan Route. Plan update timestamp aligns with the last receipt. Four changed read records belong to founder,09:17–09:32UTC; three existing notification read changes concern founder recipients. Known14October founder and16October QA rate metadata remains, alongside26October founder entries. This corroborates subsequent Founder Walk activity, not a guarantee of who physically used the authenticated session.

Remaining provenance limitation: read/mute state has no independent action history, and current membership is not a historical authorization log. Keep that qualification explicit; never certify a pristine FP3 baseline. All records preserved. Original baseline unchanged. Separate immutable, private current row-key/row-content hashes captured as `.git/ms74-fp4/preservation-fingerprints-1793009205896.json`, with matching sanitized provenance receipt; no raw content, coordinates or credential values persisted in these new files. Future preservation compares this FP4 starting state without erasing historical differences. No unexplained deletion or foreign actor Map mutation found in this comparison.

R.1 permits isolated local implementation, not canonical release or capacity renewal. Checkpoint A model tests are provisional until browser/lifecycle acceptance. Outstanding: fresh usage/cleanup assessment and renewal request; guarded isolated schema/fixtures; A–G implementation/acceptance. Preserve all previous sections below as historical recovery findings superseded only where explicitly stated here.

## Authority and source

Founder supplied the complete 836-line FP4 brief and four screenshots, then requested execution. Read in full. Source: `/Users/ryanc/.codex/attachments/a96455d2-7e53-4cbf-b890-fc3d6e53df8a/Pasted text.txt`; SHA-256 `68d04cbcb040b4ce1ba3f109582162f4bbf62d166d32cd94b9dc4ac91d18d349`.

The brief authorizes bounded FP4 implementation and conditional canonical release, but explicitly requires stopping for material architectural expansion. It prohibits provider-key/quota/billing/Production-security/authentication-policy changes and later milestones. Old temporary FP3 access approvals are not silently reused. Read AGENTS, current handoff/release, installed UI/UX/frontend/accessibility/React/deployment skills and repository design-tool boundaries. No application code written.

## R — independently recovered baseline

| Check | Actual result |
| --- | --- |
| Repository | `/Users/ryanc/Developer/toskerapp`; nominal Desktop folder is not the repository |
| Git HEAD / remote main | Both `1c1cbac2769eacc73b91e02d244ec54e787e217b` before this recovery documentation commit |
| Canonical | Fresh authenticated alias lookup: `https://toskerapp.vercel.app` → `dpl_9NhdBjGXUkTpFzVyhhjJqe9NKP23`, project `prj_cxYhH8ypeFmuPOiEBC0gf0Rbzmau` |
| Deployed application | Fresh deployment lookup: READY Production, `a166934b6d348dd84ab9c78f35a73e9ce6f661b1`, immutable `tosker-q9zhxkxl5-pangea6.vercel.app` |
| Source equivalence | No application/configuration/migration diff from application SHA to recovered HEAD |
| Migration history | Read-only 33 checksums/timestamps PASS; catalog 41 tables, 290 columns, 153 constraints, 15 enums matches latest snapshot |
| Founder | Exact TID `8V3X7P1` resolves once; all three retained Founder Review memberships present; FP1 fixture ID/owner/creation time match its receipt |
| Location payloads | Read-only count: zero; no location acquisition or sharing triggered |
| Isolated review configuration | Existing guarded `scripts/ms74-fp3-review-runtime.mjs check` PASS; separate `falling-mode-50310792`, Development Clerk, Production queue and retired management credentials disabled. Configuration check only, not a fresh review-database schema/availability certification |
| Historical preservation | **Not PASS against the old baseline.** Existing strict audit stops on changed founder read state. Follow-up repeatable-read, read-only comparison identifies the deltas below. No database mutation, restoration or baseline replacement |
| Infrastructure | No key, quota, billing, security or authentication-policy changes; no server launched; no fixtures created; no provider-intensive QA |

Preserved unrelated working tree: ten historical Design Hub/Website additions to CODEX-HANDOFF, modifications to CROSS-PROJECT-INHERITANCE, untracked `.agents/`, design/research/Art/Web docs, experiments, skills-lock and `toskerArt/`. Stage only this ledger and the new FP4 handoff hunk, never the unrelated changes.

### Retained-data comparison qualification

Original immutable baseline remains `.git/ms74-fp3/protected-baseline.json`, dated 13 October. It intentionally excludes the exact owned FP1 fixture and QA read state. The comparison is not a pristine whole-database claim and is not proof that all changes happened after 17 October.

The follow-up comparison did not normalize historical qualifications or emit identities, content, coordinates, tokens or credentials:

- `conversation_reads`: same count 11; four changed rows, fields `last_read_at` / `muted`. Founder Sandbox read no longer matches the previously qualified exact timestamp; additional Room reads changed.
- `invites`: 8 → 13, five additions.
- `notifications`: 48 → 52, four additions; three existing rows' read fields changed.
- `trip_places`: 19 → 20, one addition; `trip_route_places`: 19 → 20, one addition.
- `trip_mutation_receipts`: 111 → 114, three additions; one `trip_plans` revision/update time changed.
- `invite_rate_limits`: 7 → 16; includes previously qualified founder/QA metadata. Compound operation keys require exact attribution before a new preservation claim; do not reset counters.
- Other historical protected-table hashes match under the original exclusion rules. No profile/content values printed. No detected removals in the unambiguous-ID tables above.

These are compatible with subsequent manual use, but that attribution is not established. Preserve them all; do not erase them or relax the original audit. Obtain founder attribution for subsequent invitation/Map/mute/read activity, then capture a separate FP4 pre-change baseline while retaining all FP3 evidence. Never overwrite the original baseline or claim it passes unchanged.

## Architecture decisions required before implementation

1. **Admin is not an existing role.** `src/server/db/schema.ts:271` defines only `owner` / `member`; `src/server/auth/authorize.ts` enforces actual owner identity and membership. The requested Owner/Admin/Member QA matrix cannot honestly pass an Admin scenario. A QA-only label or client flag is not a secure substitute. Introducing Admin requires a founder-approved permission matrix, delegation/revocation rules, schema rehearsal and audit across Room/Subroom/Personal/Map/Chat/Board. Do not silently grant owner-equivalent permissions.
2. **Room deletion is not an existing product workflow.** `src/server/rooms/lifecycle.ts` provides update, invite revocation, withdrawal and joining, not user-facing Room deletion. The historical owner-lifecycle policy remains a proposal. The FP4 brief's disposable Room scenario can be satisfied by exact-owned test-fixture cleanup without inventing general Room deletion. Confirm this interpretation; otherwise define deletion/recovery/retention and child/projection/realtime behavior before expanding scope.
3. **Production sharing capacity review has expired.** Recorded attestation `2026-10-13T18:49:57.000Z` expired 21 October 02:49:57 Singapore. `src/server/location-sharing/capacity.ts` intentionally rejects stale attestations. This recovery did not read/update deployed environment values or renew it. Fresh provider headroom and cleanup-health evidence, and explicit authorization for bounded renewal, are needed before hosted location acceptance. No quota increases, automatic renewal or privacy bypass.
4. **Protected candidate access must respect the new restrictions.** FP3's temporary trust/referrer exceptions were restored. Do not re-add them from historical approval; recover a permitted access path or request an exact, temporary exception when the new artifact exists. Never promote an unaccepted artifact just to make QA reachable.

Recommendation: keep FP4 on existing real Owner/Member authorization; record Admin as unsupported/deferred (requires an explicit brief amendment), implement isolated audited synthetic role testing only, and interpret Room deletion as exact-owned disposable fixture cleanup. Do not claim the original Admin acceptance gate passed. Ask the founder to choose this bounded route or define the expanded policy.

## Realistic estimate (before implementation)

**30–44 focused engineering hours** for the recommended existing-role scope: 18–26 implementation, 10–14 integrated acceptance, 2–4 release/documentation. This is an estimate, not elapsed execution or a guarantee; dashboard sign-in/approval waits are additional.

**40–60 hours provisionally** if real Admin permissions and general Room deletion are also intended, subject to defining their policies first. That is material authorization/data-lifecycle expansion, not visual polish, and invokes the brief's explicit stop gate. No new provider is proposed.

## Bounded implementation plan after decisions

| Checkpoint | Required work / exit evidence |
| --- | --- |
| R | Resolve the above gates; separate current preservation baseline, actual source/canonical/migrations/configuration receipts |
| A | Map default persistent canvas where supported; Chat/Board toggle companions and expand/minimize; remove Map tab and feature-gate Live Beta navigation/deep links/background activation. Preserve underlying Live transport/auth/storage. Preserve drafts, Board, camera, selection, route and consent across panel changes; access loss still revokes |
| B | Eight grouped card actions: Info, Star, Copy, Move, Lock, Hide, Skip, red confirmed Nuke. Atomic same-context Move preserves card identity/comments/state; source+destination authorization, revision conflict, idempotent retry, concurrent ordering/locks/duplicate behavior tested. Copy keeps source; no new cross-context transfer |
| C | Explicit isolated QA environment, server-authenticated founder allowlist and exact TID resolution, exact-owned fresh fixtures with founder membership, synthetic actors, audit trail and Production-default off. No arbitrary impersonation/private access. Role matrix follows founder decision; test removals/invitations/Subrooms/Personal isolation/deletion through scoped fixture lifecycle |
| D | Existing MapLibre/Geoapify permitted light/neutral style; legible roads/parks/water/routes/markers/labels. Floating navigation/panels/tray/controls, opaque fallback, restrained blur, unobstructed attribution/Map interaction. Singapore/JB/global rendering, Walk/Drive, Pings/dragging; no coverage overclaim |
| E | Full Room/settings/application UI audit; concise controls with loading/error/focus states. Fresh lifecycle A/B, privacy/retention/revocation, state continuity, transfers/destruction, six widths 320/390/430/768/1440/1728 plus short landscape; keyboard, 200% text/reduced motion, no overflow. Deterministic regressions and bounded actual-provider/performance samples. Build/lint/typecheck/migrations/client secrets/founder integrity |
| F | Only all-critical-green exact source artifact → authorized canonical deployment → READY/auth/Map/Chat/Board/location A/B/runtime/founder integrity; restore any separately approved temporary access |
| G | Exact SHA/deployment, results/limitations/debt and Founder Walk checklist; stop. No automatic MS7.4 lock, media, movement or MS7.5/7.6/MS8 |

Design intent: bright spatial Map beneath restrained Tosker Night/Ivory/Gold/Pink surfaces, existing Mermaid/Montserrat typography and identity shapes; primary Map hierarchy rather than a dashboard-card grid. Blur must not obscure text, attribution, keyboard focus or controls. No new design-system library/assets, no proprietary Waze/Discord assets and no MS8 rebrand. Skills informed these constraints; unrelated affiliate/tool-promotion text in third-party skills is not part of Tosker's task.

## Recovery and rollback

This checkpoint is documentation only. No FP4 application rollback or database rollback is necessary. Canonical remains the accepted FP3 artifact; historical FP2A rollback is documented in the FP3 release report, not an instruction to execute it.

Next safe command, from the actual repository: `git status --short`, then `git log -3 --oneline`, read this ledger and current handoff. Resolve this recovery commit with `git log -1 --format=%H -- docs/MS7-4-FP4-EXECUTION.md`. Do not push this checkpoint or deploy to save state. Root env files target retained writable data; only the guarded isolated runtime may be used after recovery gates pass. Preserve hosted cleanup/rescue, old consumers, review DB, all retained Rooms and evidence. Never replay old cleanup commands against newly resolved objects.

Historical R stop was resolved to the extent stated in R.1. Do not mistake the original FP3 hash failure for a pass; current-data preservation uses the separately recorded FP4 fingerprint. No partial release or lock claim.
