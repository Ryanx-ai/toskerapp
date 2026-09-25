# MS7.2 FP3 — partial UI overhaul / release ledger

2026-09-25. Founder execution PDF read in full. FP3 authorized through local acceptance, normal push, canonical deployment and live smoke; MS7.2 must not auto-lock and MS7.3 must not start. Preserve unrelated Art/Web/research/experiments and untouched/untracked `toskerArt/`.

## Recovery

- HEAD `e3228bd`; FP2 application `03b25a2`, foundation `00c9e95`. Main13 ahead; remote main independently read as `5ae54fb0ff7d0dc6ab5d026ada8a69f25e34e70a`.
- Canonical `toskerapp.vercel.app` still aliases READY Git-backed MS7.1 deployment `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp`, same remote SHA. No push/deployment performed.
- Existing local server listens on3000. No server/session/auth configuration changed.
- All20 migration hashes match Development; latest catalog matches25tables/164columns/78constraints/15enums. No migration/schema/data mutation.
- Development invariants PASS:8users/8profiles/8Sandboxes,3Rooms/4memberships,5Personal conversations,29messages,9Hallnotes/2pins,3capabilities,6accepted connections,32notifications; duplicate/orphan checks0.

## Fresh signup verification — human challenge resolved, TID gate FAIL

Read-only Clerk SDK and parameterized Development SQL verified each supplied email has exactly one Clerk account, verified email, one matching Tosker User, populated Profile/username and one permanent Sandbox:

| Founder account | Application UUID | Username | TID contract |
|---|---|---|---|
| ryanchinqf3@gmail.com | d3d151d1-6ff3-459a-9027-bde698ed3288 | ryanchinqf3 | Legacy format; fails `^[A-Z0-9]{7}$` |
| orcxcustoms@gmail.com | 415077dd-5f7d-4917-8c6e-ac772dc80e75 | orcxcustoms | Legacy format; fails `^[A-Z0-9]{7}$` |

No duplicate/partial identity observed. Founder confirms successful normal signup, with human verification on one account; no evidence that the differing challenge behavior is a Tosker defect. Full FP2 registration release gate cannot yet be marked satisfied because both persisted TIDs fail the required canonical contract. No impersonated browser session or password requested.

Root cause is consistent with the verified deployed source: `5ae54fb:src/server/accounts/bootstrap.ts` generates `TID-XXXX-XXXX`; the local MS7.2 generator creates seven characters. Existing-identity bootstrap deliberately preserves the stored TID, so merely logging into the local build will not repair it. The approved historical reset tool is restricted to six explicitly inventoried users; these two new real founder accounts are outside that allowlist. Do not rerun or widen the old reset implicitly.

## Approved repair / FP2 gate closeout

Founder explicitly approved the two-account repair and continuation on2026-09-25. `scripts/ms72-fp3-tid-repair.ts inspect` verified27 UUID foreign keys and25-table fingerprints. Explicit `apply` changed exactly2 legacy TIDs to unique canonical IDs. Fingerprints exclude ONLY these two `users.tid` values; all other fields, rows and every other user's TID remained identical. No accounts deleted, provider calls, schema/migration changes or alias system. A subsequent apply is idempotent, not a rekey operation.

Fresh TypeScript, scoped ESLint, all20 migration hashes/catalog and DB invariants PASS after repair. Founder-performed normal signup plus verified canonical application identity closes the prior **FP2 RELEASE GATE: SATISFIED**. FP2 local acceptance remains complete; canonical release is still pending, explicitly combined with the next validated FP3 candidate. The original failed verification below is retained as history, not an outstanding request.

## FP3 implementation

Repair checkpoint `a72800e`. Dedicated scoped `fp3-shell.css` establishes three desktop planes: floating sidebar, separate context/top bar, bounded rounded workspace. Collapse retains an explicit recovery button and widens the workspace; private saved preference remains unchanged by routing. Reduced motion is immediate; translucent planes have opaque fallback. Existing palette, Montserrat/Mermaid hierarchy and profile/appearance presets are retained. UI/UX skills informed geometry, focus, contrast and recovery checks; no new design system or artwork.

Create Chat has one search focus ring and lean copy. Create Room keeps TRIP plus one optional short trip label in existing Room tags; owner Settings can edit/remove the label. Server permission, limits and persistence remain authoritative. Sidebar projects `TRIP · label` independent of tag retrieval order. No Map schema or service. Sandbox stays first; no fabricated Now timestamps; Friends stays with identity and Help with Settings.

Tosker owns a bounded native auth dialog and its explicit X; outside click and Escape deliberately retain the form. Clerk's [supported embedded SignIn/SignUp API](https://clerk.com/docs/reference/components/authentication/sign-in) owns credentials, verification and OAuth. Stable appearance element IDs only; no internal DOM interception, credential change, provider-setting change or auth bypass. Alternative sign-in/recovery methods remain visible. Auth fields/buttons meet the existing functional typography/contrast direction.

Neutral workspace loading has no stale/private identity. Existing Settings/Namecard hierarchy and all durable Chat/Hall mechanisms are preserved.

## Validation and defects caught

- Fresh TypeScript and optimized build PASS; ESLint0errors, one pre-existing unused `eq` warning in unrelated `cleanup-fp4-qa.ts`.
- All20 migration hashes and full current catalog match (25tables/164columns/78constraints/15enums). No FP3 migration, historical backfill or schema mutation.
- Rollback service suites PASS:30 Brand combinations,3 private appearance accents, owner/forgery/stale/reset/audience isolation, profile privacy/legacy writer, Room identity/history/child inheritance, Settings, TID generation/collision/stability. New trip-label suite passes owner/member denial, persistence/reset/input limits and zero Message/Hall/Notification writes.
- Browser A/B: all Brand/banner/ring choices save/reload; peer metadata but no theme inheritance; private appearance; saved reset; two-tab stale conflict; failed-save draft/retry; six-width Profile/Account/Namecard. Original preferences restored.
- Normal Clerk A/B sign-in is tested separately from founder-performed signup. No extra signup account created during auth layout tests.
- Real fresh Room creation, owner label edit/reload and sidebar label PASS. Private pin/reload/peer isolation/restoration, Room/Subroom inherited mute/restoration, selected mark-unread exit, member no-owner editor and Leave-cancel PASS.
- A→B Personal/Room/Subroom message delivery and durable reload PASS. Author Nuke and peer reload PASS; Room pin→Hall reference→source Nuke removes reference PASS. Exact disposable Room/child and receipt IDs are tracked, not a general cleanup campaign.
- A/B Room nickname metadata, owner reset/stale-draft rejection, parent/child inheritance and six-width editor/member views PASS; original blank QA nickname restored.
- Six-width shell/creation/Settings/Profile/Notifications geometry PASS; auth outside/Escape/X/reopen PASS at320/390/430/768/1440/1728, no browser errors.

Browser-discovered fixes: search input shrank to zero width (explicit flexible width); inherited auth-card heading enlarged embedded Clerk title (scope to direct child); broad Clerk footer hiding also removed alternate methods (scope to signIn/signUp footer IDs only); reopened auth Escape navigated away (native dialog capture prevents dismissal); collapsed row menus obscured avatars (show on hover/focus). All require fresh final-build verification, not reliance on previous screenshots.

Evidence directory: `/tmp/tosker-fp3-qa.eDdxjh`. Scripts `browser-ms72-fp3-*`, existing configurable Chat/Room identity suites. Development provider warnings, synthetic CLI-inclusive route timings and emulated viewports are not physical-device, screen-reader, real-world performance or production-auth certification.

## Release protocol / scope boundary

After the complete local gate: explicit owned-file commit → normal fetch/push → Git-backed canonical READY deployment matching exact SHA → HTTPS/alias check → bounded live A/B smoke → exact synthetic cleanup → invariant recheck → Founder Walk3. Never release dirty directory contents or silently advance the milestone. Re-inventory TIDs before/after rollout; do not repair any additional account without authority.

MS7.6: bounded performance/reliability follow-up, including unresolved Development route latency; no new providers now. MS8: systemic whole-product rhythm, art/type and deeper motion/depth work. Current partial shell is not MS8. No media storage, Map/Fleet runtime, OS features, new fonts, Art integration or Website redesign. Preserve `toskerArt/` untouched/untracked.

MS7.1 REMAINS LOCKED. MS7.2 NOT LOCKED. MS7.3 NOT STARTED. Canonical release/live smoke still pending until recorded below.

## Final local release gate

PASS on final optimized application build: normal A and B sign-in through the corrected embedded Clerk flow; six-width auth and creation/shell matrix repeated; canonical TID/copy/exact discovery/negative partial lookup; private metadata/appearance and Room identity suites; seven-size settled Personal/Room/Subroom/Sandbox composer bounds; actual Create Chat reuse; keyboard Enter/Space collapse/reload/recovery; reduced-motion0s; Room Structure→Subroom switcher and capability-only Add. Screenshot review includes settled messages, empty Room, collapsed shell and corrected auth form. No client exceptions on completed repeat suites.

Timing/reliability caveat: most settled local routes including CLI overhead took5.4–7.6s (not an instantaneous-entry claim). During the prolonged matrix one route recorded393.9s, a later landscape route120.3s and one wait timed out; server logged destination-stream/connection termination. Pages recovered. Explicit repeat Personal/Room measured7.389/5.512/5.411/5.487s, all completed without browser errors. Root cause is not established; prior Development DB/host-runtime instability is not claimed fixed. Keep this in MS7.6 and require live smoke before founder handoff. Earlier geometry-only captures were superseded by settled-content captures.

Fresh final typecheck/scoped QA lint/diff/trip rollback suite PASS; previous final-source whole lint/build PASS. All20 checksums/catalog/invariants pass; secret scan397owned/sourcefiles28clientbundles passes. Read-only pre-release TID inventory confirms all8 remain canonical; approved two-account IDs stable. No code/schema/provider change since the final build, only test/docs refinement.

## Canonical release / live acceptance — COMPLETE

Application commit **`2c205f4ba682b46c03e0c8330dec16051c63f3ea`**, `feat: refine MS7.2 FP3 shell and trip creation`, normally pushed to origin/main. Git-backed Vercel **`dpl_4cTZSP8zCUQao8D6nAm5RU1vPz3e`** READY, source Git/main/exact SHA, build45.9s; canonical `https://toskerapp.vercel.app/` aliases this deployment and returns HTTPS200. Immutable URL `https://tosker-4f6ji00l7-pangea6.vercel.app`. No unrelated working-tree files uploaded. A later documentation/QA-cleanup-only closeout commit may deploy the identical application; verify its exact SHA in the final report.

Live isolated sessions `fp3-live-a` / `fp3-live-b` passed normal Clerk sign-in. A/B Personal, Room and Subroom send→peer delivery→reload→author Nuke→peer reload PASS; Room pin→Hall source reference→Nuke retraction PASS. TID/copy/positive+negative discovery/Namecard/Support/safe Account gate PASS. Real live Create Room→owner trip-label edit→reload→sidebar summary PASS. Six-width live shell/creation/focus/Profile/Settings/Notifications matrix PASS with no client exceptions. Screenshots in the evidence directory now include final canonical captures. Deployment-scoped error/fatal scans after the smoke returned zero entries. Monitoring is a bounded sample, not continuous observability certification; no new drains or provider configuration.

Exact guarded cleanup COMPLETE: local QA Room `040a9d77-93de-4636-9ab4-1ad496a4e641` / `fp3-review-4f3080` and its one child, live empty Room `be199ab5-0efd-4098-b7b1-da6249556af2` / `fp3-review-f5732a`, four already-nuked Room/child receipts, and two exact already-nuked Personal receipts `fe2167d8-401b-447e-bbe5-76c0700a6079` / `4ca8bc08-8b3e-4c08-8a9f-ba29195fe2a5`. No application undo; no real user/Room/Personal history or independent Hall content removed. Do not rerun removed fixture suites blindly.

Post-cleanup invariants PASS:8users/8profiles/8Sandboxes,3Rooms/4memberships,5Personal conversations,29messages,9Hallnotes/2pins,3capabilities,6accepted connections,32notifications; all duplicate/orphan checks0. Founder accounts retained, preferences restored. Development Clerk/Neon/Ably remain the environment contract, not launch-production provisioning. `toskerArt/` and unrelated tracked/untracked work remain untouched.

**MS7.2 FP3 FOUNDER-REVIEW BUILD LIVE · FP2 RELEASE GATE VERIFIED · MS7.1 REMAINS LOCKED · MS7.2 NOT LOCKED · MS7.3 NOT STARTED.** Next: [Founder Walk3](MS7-2-FOUNDER-WALKTHROUGH.md), not more implementation.
