# MS7.2 FP2 — execution and evidence ledger

## Recovery / authority

2026-09-25: main `47ef294`, ten ahead/zero behind origin `5ae54fb`; canonical READY `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp`, Git-backed MS7.1. No later application work. All19 migration checksums/catalog pass (25tables/161columns/78constraints/12enums); Development invariant audit passes: six users/profiles/Sandboxes, four Rooms, seven memberships,29messages,9Hallnotes,2pins,32notifications. Unrelated handoff/inheritance and Art/Web/research/experiments preserved. No provider/credential change. Human fresh-signup gate remains required BEFORE push/deploy; MS7.2 not locked, MS7.3 unstarted.

## Reference decisions / design check

ADOPT: deliberate profile preview → save ([Discord Custom Profiles](https://support.discord.com/hc/en-us/articles/4403147417623-Custom-Profiles)); viewer-only, cross-device appearance ownership ([Slack themes](https://slack.com/help/articles/205166337-Change-your-Slack-theme)). ADAPT: curated identity presets instead of unrestricted colors; existing Tosker profile audience applies to all shared expression. Existing TethrLink/LunaVault inspection in CROSS-PROJECT-INHERITANCE supplies hierarchy/ownership principles only, not verified reusable infrastructure. REJECT: Nitro monetization, animated profile effects, arbitrary CSS/fonts, per-Room brand variants, uploaded media and theme governance.

For ordinary group members on desktop/responsive Web: make personal identity expressive but names, actions and privacy clear. Retain Night #080D10, Ivory #F4EFE6, Gold #C89C5D and existing pink action fill. Mermaid remains expressive headings; Montserrat remains functional identity/body/control text. Compact, left-aligned identity hierarchy and stable Settings frame; variation confined to card banner/avatar accents and viewer controls. Focus/danger/status colors are protected. No global MS8 redesign.

## Before-code visual sweep

Local authenticated A,390/768/1440. Captures `/tmp/tosker-fp2-qa.k1VdZs/before-*`; audit script `scripts/browser-ms72-fp2-audit.mjs`. Loading captures prompted additional settled-state checks, not false claims of loaded acceptance.

| Finding | Classification / disposition |
|---|---|
| Account sign-out left-aligned, quiet ordinary text | FP2 CLEANUP: center and semantic danger treatment |
| Username and TID share one dense line | FP2 CLEANUP: distinct secondary/tertiary identity hierarchy |
| Own Profile brand controls absent from direct edit; Namecard accent too slight | FP2 CLEANUP + authorized customization: live preview, save/reset, shared banner/frame presets |
| Account appearance has no durable preference | Authorized FUNCTIONAL addition: bounded viewer-only preset using current revision model |
| Notifications says caught up before initial authenticated activity resolves | FUNCTIONAL DEFECT: explicit loading/error state, no false empty success |
| Sidebar currently has no rendered Now/Available now text | Preserve; verify attention/menu/pin/long-name layout |
| Context Settings stable loading frame works | Preserve; check settled content, failure and keyboard states |
| Whole-app depth/type/radii/animations; Hall redesign | MS8 REDESIGN, not this patch |
| Media uploads, custom fonts, calls, translation, location/providers | DEFERRED INFRASTRUCTURE MS7.6 / separate font rights; no fake implementation |

## Implementation / validation

Independent local implementation and acceptance COMPLETE. Application checkpoint `03b25a2`; foundation `00c9e95`. Fresh-user registration, canonical push/deployment and live smoke remain gated. MS7.2 is not locked; MS7.3 not started. Earlier checkpoints below are chronological evidence, not outstanding local tasks.

### Slice 1 — durable customization foundation

Forward Development migration `0019_ms72_fp2_customization` APPLIED through normal migrator. SHA256 `852b81c5fc3cfcee069dd108069a9b65fd7fb9c45ba6022262617ed2b9ee4eb0`; three finite enums/columns, no backfill or historical edits. All20 checksums/catalog pass:25tables/164columns/78constraints/15enums. Existing revision trigger covers new fields and old writers; no new concurrency mechanism. Shared banner/frame withheld before serialization under existing details audience; interfaceAccent never included in peer projection. Private preference-only invalidation goes only to owner. No communication mutations.

Fresh service tests PASS:30 identity combinations,3 interface presets, defaults/save/reset, owner-only validation/forgery/invalid values, stale revisions, audience withholding, unchanged peer and activity counts, synthetic fixtures rolled back. Profile/privacy,Room identity and Settings suites PASS. TypeScript/lint/build PASS; preexisting unused `eq` warning in unrelated cleanup script remains. Credential scan PASS (383source/owned files,26client bundles), no values logged. Browser customization is underway, not a completed release gate.

Contrast: primary white/default fill Tosker6.05/Iris6.34/Tide6.10; worst existing1.15brightness hover4.81/5.13/4.90. Selected text≥4.5; protected gold focus≥3; danger text≥4.5. Full rendered preset/keyboard/responsive acceptance still tracked separately.

### Slice 2 — UI and ongoing acceptance

Foundation committed locally as `00c9e95`. Implemented compact Namecard banner/avatar expression, separated username/TID, actual manual status on own Profile, direct Personal Brand editing with a live preview, and Appearance in the same stable Settings frame. Viewer accent is server-rendered from the owner's durable preference, not localStorage or a global theme effect. Reset stages defaults and persists on Save. Notifications now distinguish initial loading/error from a real empty result, with a working Retry. Log out is centered with protected danger/focus treatment. No message transport/history, Hall lifecycle or attention mutation semantics changed.

Fresh browser PASS: every identity accent and all banner/frame choices, peer metadata/reload, all three private appearance presets with B unchanged, saved reset for both layers, two-tab stale rejection/explicit recovery, aborted save/draft retention/retry. Brand/Appearance/Account/Namecard bounds pass320/390/430/768/1440/1728. Rendered Rose/Plain, Sage/Glow, Gold/Weave and Tide Appearance inspected; presets preserve readable identity/actions. Notifications initial failure/retry, keyboard native radio/focus, Keep editing/Discard, six-width loaded geometry pass. Eight addressable Settings categories, six-width frame/scroll, dirty Account guard, Brand privacy revocation and Quiet/B preference isolation pass.

Harness correction: request interception must be registered on the tab receiving the request, and use the exact local origin. No application behavior was changed to make an unmatched interception pass.

Local-session warning: old B browser had repeated15s API timeouts and a102s page/action response; privacy refresh assertions timed out. A focused owner-save check verified canonical `self` in Development and both peer Namecard/header cleared within15s. Fresh normal Clerk B login in `fp2-b` (`/tmp/tosker-fp2-fresh-b.42F7fE`) passed the full share/revoke/header/reload boundary. No auth bypass/config change, no proven underlying Clerk/Next cause. Read-only DB activity showed no blocked/long-running query at sampling. Do not claim instantaneous delivery or erase the failed runs. Privacy header recovery test allows the existing60s reconciliation path, not a transport change.

Latest static gate: TypeScript, production build, lint(no errors; same unrelated warning), all20 migrations/catalog, invariants, TID validation/collision/reuse/rollback, and credential scan(385source/owned files,26client bundles) pass. Full existing Room/sidebar/modal suites and actual logout/new-browser persistence still being completed; no full local acceptance or release claim yet.

Further browser PASS: A/B Room nickname save/reload/metadata, owner reset/stale member draft, all six widths, parent identity in Subroom mentions (no message sent); scoped Sandbox menu, private pins/order/reload/B isolation, shared child ordering/member controls, inherited mute, selected Mark unread, Settings/Invite/Leave-cancel and explicit sidebar recovery. Test pins, nicknames, order and mute restored. Room/Personal stable frames, categories, failed-load Retry, dirty Keep/Discard, nested nickname, short viewport and focus return pass after normal owned-dev-server restart. Logs show successful authorized responses; variable Development request latency remains documented, not certified Production performance.

Actual session acceptance PASS: A saved non-default Weave/Ring Brand and Iris Appearance; a new isolated browser profile `/tmp/tosker-fp2-fresh-a.Ism2g3`, session `fp2-fresh`, signed in normally through Clerk and displayed canonical saved values. Real Log out → normal sign-in retained both layers. Original owner values restored through UI. This proves existing-account persistence, NOT a new-account registration pass. Fresh B session is `fp2-b`; use these clean sessions for final smoke.

Self Namecard → Edit Profile, dirty/nested focus return, Profile/Namecard/Settings six widths plus844×390, native Settings Back, long mixed-script name hover/focus/reduced-motion reveal/reset all pass. Short landscape Profile is naturally scrollable: actions verified reachable; modal bounds remain strict. One test-only assertion incorrectly required the entire page card to fit one viewport and was corrected. Actual Profile manual-status spacing was corrected and captured. Canonical TID/copy, exact lowercase/trim lookup, negative partial/legacy lookup, real support mailto and gated Account controls pass. All owner test values restored. No new schema/application authorization defect was found in these regressions.

## Final local release evidence / limitations

The dev runtime later stalled history/token/workspace reads, including clean sessions. Temporary, non-identifying stage logs showed Clerk auth returning but the actor DB lookup not completing; ordinary service queries and durable owner writes still worked. Diagnostics were removed exactly; auth and message API files have no diff. No provider, auth, pool, polling or transport change was made to force a pass. Root cause remains unproven; do not describe all delays as a proven Clerk failure.

Final production build was served **locally** with `npm run start`, port3000, existing Development services. This is not a deployment. Personal A/B delivery→reload→Nuke passed; a subsequent transition briefly returned to `/app` and was not hidden. Reopening the authorized Room recovered. Resumed Room/Subroom delivery→reload→Nuke passed, including Room Chat pin→Hall retained reference→source Nuke→peer Hall retraction. Final independent six-route A/B navigation/reconnection pass completed without errors or redirects: A7127/5675/6095ms, B5596/5602/6103ms for Personal/Room/Subroom respectively (automation wall-clock, not production-performance certification). Both clean browser error lists empty. No instantaneous latency, physical-device or screen-reader certification claimed.

Final gates PASS: TypeScript; lint0errors/one pre-existing unused `eq` warning in `cleanup-fp4-qa.ts`; optimized build; all20 historical hashes and25-table/164-column/78-constraint/15-enum catalog; TID service/rollback; profile/privacy/Room/settings/customization service suites; secret scan386source/owned files and26client bundles; staged and working diff checks. Source API/auth diagnostic changes fully removed. Product source is committed as `03b25a2`; no push/deploy.

### Exact QA cleanup

All four FP2 smoke messages (one interrupted-dev send plus three production-build sends) were Nuked through author UI. Read-only identity/body/timestamp checks preceded deletion of their four empty receipts; `scripts/ms72-fp2-smoke-cleanup.ts` validates exact IDs, author, conversation, creation time, deleted state and absence of replies/notifications/Hall dependencies. Then `ms722-fixtures.ts inspect/cleanup` removed exactly two empty owned QA Rooms, two child contexts, four contained conversations and related QA preferences. No application undo. These disposable fixtures are gone: do not rerun their suites or blindly reseed them. No real user/Room/message/Hall content was removed.

Post-cleanup invariant audit PASS:6users/profiles/Sandboxes;2Rooms/3memberships;5Personal conversations;29messages;9notes/2pins;3capabilities;6accepted connections;32notifications. Invalid owners, duplicate TIDs/memberships/Personal pairs and orphan pins all0. Real history and all six retained accounts preserved. Test global names, audiences, status, Brand, Appearance, nicknames, pins/order/mutes restored.

### Control / scope disposition

| Surface/control | FP2 result |
|---|---|
| Own Profile / compact Namecard | Distinct name/username/TID; manual status; bounded banner/frame; copy/actions readable |
| Personal Brand | IMPLEMENTED:5 accents×3 banners×2 frames, preview, owner Save, staged persisted reset, audience protection |
| App Appearance | IMPLEMENTED:Tosker/Iris/Tide, viewer-only account preference, preview/Save/reset, protected functional colors |
| Settings / contextual editors | Existing native frame/category history/focus/dirty/stale/failure recovery preserved and tested |
| Account Log out | IMPLEMENTED real Clerk sign-out, centered danger control; full provider panel/deletion remains gated |
| Notifications | IMPLEMENTED truthful initial loading/error/Retry and filtered empty states; persisted attention unchanged |
| Sidebar / Room actions | Existing pins/order/mute/unread/Invite/Leave-cancel verified; no fake Now/Available now label introduced |
| Uploads / fonts / arbitrary theming | DEFERRED, not fake controls:storage/media MS7.6, font rights separately, full visual/motion/theme overhaul MS8 |

## Human gate / exact restart

Read-only Clerk lookup reverified **zero** accounts for `tosker.ms72.fp1.20260925+clerk_test@example.com`. The earlier normal registration hit human verification; the old automation registration tab is now blank, not a completed signup. Normal existing-user sign-in/logout acceptance is not a substitute. Founder must complete normal fresh registration in their own clean/private browser at `http://localhost:3000/app`, including any human challenge. Never automate CAPTCHA, weaken protections or modify credentials.

Then verify new canonical User/Profile/seven-character TID/permanent Sandbox across reload/logout; Profile/Namecard and discovery; exact disposable-account cleanup only if safe. Do not repeat removed fixture suites. If application source changes, rerun affected gates. Otherwise normal main push→Git-backed canonical SHA/READY/alias/HTTPS→live A/B smoke/timings→founder walkthrough. Origin/canonical remain `5ae54fb`, READY `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp`; no partial deployment, no automatic MS7.2 lock, no MS7.3.

Local production-build server remains on3000. Clean A=`fp2-fresh` (`/tmp/tosker-fp2-fresh-a.Ism2g3`), B=`fp2-b` (`/tmp/tosker-fp2-fresh-b.42F7fE`). Captures `/tmp/tosker-fp2-qa.k1VdZs`. Old A/B browser processes closed; their profiles preserved. Unrelated handoff/inheritance/Design Hub/Art/Web/research/experiments changes stay unstaged; `toskerArt/` untouched/untracked.
