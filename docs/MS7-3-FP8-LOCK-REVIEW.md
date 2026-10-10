# MS7.3 FP8 final lock review

10 October 2026. **Recommendation: LOCK, subject to founder approval.** FP8 is canonical and the missing live acceptance gates are complete. No unresolved technical lock blocker was observed within the approved scope. MS7.3 remains unlocked until the founder decides; development stops here.

## Release identity

| Field | Verified value |
| --- | --- |
| Canonical | https://toskerapp.vercel.app |
| Application SHA | `35a6f86182e36a2f31eca84a9280e965d71f17cd` |
| Deployment | `dpl_4jNvKenubueFoVCm24GVZiUDE3Dg` |
| Immutable host | `tosker-743mjmjfd-pangea6.vercel.app` |
| Target and state | Production, READY; canonical alias explicitly verified |
| Framework and build duration | Next.js; 38.023 seconds from deployment timestamps |
| Database | 29 exact migration hashes; catalog and ownership guards pass |
| Recovery artifact | Local verification/docs commit; exact SHA in `.git/fp8-recovery/release-final.json` |

Canonical uses the existing founder-review Development services under Vercel's Production target. This is not MS15 production certification or permanent Geoapify approval. No application changes, migrations, environment edits, provider provisioning or redeployment occurred in recovery.

## Acceptance evidence

Normal Clerk A/B sign-in, real basemap/attribution, Map+Chat, rename/revert, direct tagging, peer reconciliation and reload persistence passed on canonical. All four location-attached Pings appeared only for the sender, expired and retained the unchanged location marker. Tested Ping flows made no coordinate POST, Ping broadcast or durable/private-coordinate storage. Locate alone still grants no peer-sharing consent.

The deployed optimized SVG replay rendered the two saved real-provider legs, completed finitely and cancelled for mode/reduced-motion changes. Selecting the first stop retained only its adjacent leg label. There were no additional road requests for replay or selection. Road geometry was replayed by the QA harness; **no new road/geocoding provider tests were run**. Canonical's real basemap was not mocked.

Twenty deployed JavaScript assets passed configured server-secret matching. Production/Development variable names, types and assignments were checked without exposing values. No browser page exceptions occurred. The scoped Vercel error/fatal window `2026-10-10 02:57:29–03:27:29 UTC` was clear. Log drains and continuous monitoring were not audited or provisioned; the bounded smoke is not continuous reliability certification.

Existing completed local evidence remains valid for the exact deployed source: six responsive widths plus short landscape, keyboard/reduced motion, direct nearby-POI preview/confirmation, exact manual coordinates, Route Nuke/fresh-add lifecycle, receipt retries/stale A/B handling, Room/Subroom/Personal/Sandbox authorization, independent Route Copy/Share and FP6 routing/privacy regression. These suites were not needlessly repeated. Detailed results, historical failed attempts and provider observations are in [the execution ledger](MS7-3-FP8-EXECUTION.md).

## Nine lock questions

| Question | Assessment |
| --- | --- |
| Are core Map workflows functional? | Yes within tested scope: explicit search/pin preview and Add, owned cards/Routes, ordering/routing and lifecycle. Fresh live A/B covers the FP8 refinements; completed local/provider evidence covers the wider flow. |
| Are interactions understandable? | Compact inspector, direct tags, rename/default/revert, adjacent labels and four-icon Ping replace the reported friction. Final founder playtest remains the acceptance decision. |
| Are authorization boundaries intact? | Existing Room/Subroom/accepted Personal/Sandbox and revoked/forged denial tests passed; canonical normal A/B succeeded. No auth bypass or weakened boundary was introduced. |
| Is personal location private? | Yes in tested Locate/Ping flows. One-shot origin is transient; explicit provider-routing consent does not imply peer sharing. No continuous tracking. |
| Are route estimates truthful? | Real provider geometry, ordered-leg totals and planning-estimate language are preserved. Replayed QA responses are explicitly distinguished from live provider results. No traffic or universal ETA guarantee. |
| Is Route/Card ownership correct? | One card belongs to one Route; independent copies/share and Pin transfer remain separate. Seven guards and zero orphans/mirror mismatches/duplicate positions verified after cleanup. |
| Are known critical issues resolved? | The reported FP8 scope and release gates passed. Earlier stuck QA was recovered, not mistaken for a completed smoke. No unresolved critical defect was observed; this is not proof of absence of all bugs. |
| Is remaining visual work appropriate for MS8? | Yes: deeper art, typography/theme and decorative polish remain out of this patch. No MS8 work began. |
| Is anything blocking technical lock readiness? | No observed technical blocker within the bounded acceptance scope. Actual locking still requires founder approval. |

## Remaining findings

| Classification | Finding and boundary |
| --- | --- |
| BLOCKER | No unresolved technical blocker observed. Founder approval is still required; do not auto-lock. |
| SAFE DEFERRAL | Geoapify can return ambiguous/duplicate or district-level POIs rather than exact entrances. Users must select, preview and confirm; coordinates are never silently snapped or result zero saved. |
| SAFE DEFERRAL | Historical custom checkpoint names had no stored original; migration assigned stable defaults without claiming to recover lost history. |
| SAFE DEFERRAL | Remaining auth/database/network overhead affects private-origin latency. Do not weaken authorization or quotas to improve a benchmark. |
| SAFE DEFERRAL | Provider restrictions/Free-plan policy were not freshly audited in the dashboard during recovery. They were not changed; canonical basemap authorization and Vercel environment assignment passed. |
| SAFE DEFERRAL | Physical mobile/assistive-technology behavior and broad device performance remain beyond the automated responsive/keyboard checks. Sampled logs are not continuous monitoring. |
| MS8 VISUAL DEBT | Art, deeper typography/theme refinement and broader aesthetic redesign. |
| LATER PRODUCT FEATURE | Collaborative location-attached Pings need separate explicit sharing consent. Current four-icon Pings remain private; continuous Live coordination stays MS7.4. Production-provider reassessment remains MS7.6. |

Local software-renderer measurements were idle **16.7 ms median / 18.3 ms p95**, replay **16.7 / 18.5 ms**. Canonical confirmed that the optimized implementation is deployed and behaves correctly; no identical Production frame-time claim is made. The tracer updates SVG strokes without per-frame WebGL data uploads or React state updates.

## QA cleanup and founder access

| Room | Purpose | Disposition |
| --- | --- | --- |
| `ms73-founder-review-904a9dea` — MS7.3 Founder Review — Singapore Trip | Final manual Map/Routes/Cards/Board/Chat walkthrough | Retained with exact founder TID `8V3X7P1`; never auto-clean |
| `ms73-qa-bfff9475` — MS7.3 QA — bfff9475 | Protected existing founder-authored content | Retained with founder membership; accessible, not disposable |
| `ms73-qa-1fed56ad` — MS7.3 QA — 1fed56ad | FP8 isolated A/B acceptance | Deleted after exact ownership/contribution checks; no UI undo |

Retained-row fingerprints across all **35 public tables** matched before/after cleanup. Both retained Map Pins and founder data were preserved. Final database: 6 Rooms, 5 plans, 8 Routes, 19 owned cards, 5 comments, 108 mutation receipts, 2 Map Pins; no missing checkpoint defaults or orphan comments. Owned QA browsers are closed and local port 3000 is free. Historical fixture receipts must not be replayed or recreated.

## Final state

MS7.1 LOCKED. MS7.2 LOCKED. **MS7.3 FP8 CANONICAL LIVE / LOCK CANDIDATE, still UNLOCKED.** MS7.4 NOT STARTED. MS8 NOT STARTED. **STOP — awaiting founder approval.**
