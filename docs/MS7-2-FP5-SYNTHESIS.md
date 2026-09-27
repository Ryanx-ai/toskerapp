# MS7.2 FP5 — synthesis and lock gate

2026-09-27. LIVE AND ACCEPTED — MS7.2 LOCKED after canonical A/B acceptance and exact QA cleanup. Authority: founder FP5 execution PDF and post-restart continuation/conditional lock directive. MS7.1 remains locked; MS7.3 NOT STARTED, NEXT only: Collaborative Trips / Map + Location Cards. Historical pending checkpoints below are superseded by the final acceptance section.

## Recovery (before mutation)

### Post-restart forensic recovery — 2026-09-27

Recovery completed before new mutation. `main`/HEAD/local origin and remote `ls-remote` all remain `3a83653cd9fbbc080b224a01278e31915fa7d43c`;0/0 divergence, index empty, no FP5 commit in log/reflog. Reviewed surviving tracked diff and new FP5 source/tests/docs; unrelated WIP remains separate. Canonical still READY `dpl_CAU5QWUuUxzv5o6ynUAmW7TPEFhe`, exact3a83653/canonical alias, production hosting of Development services. No app/browser/test process survived. `.next` survives but is not trusted as fresh acceptance. `/tmp/tosker-fp5-qa.MtJRn3` and screenshots did not survive.

Read-only recovery:20 hashes/catalog/DB invariants PASS.8users/profiles/Sandboxes,5Rooms/7memberships (includes exact FP5 fixture),5Personal,32messages (29retained+3empty Nuked receipts),9notes/2pins,33notifications, zero duplicate/orphan invariants. Exact fixture inspect and Personal receipt dry run passed; QA note absent. No cleanup repeated and no retained record removed. The one extra notification is retained pending exact ownership verification, never deleted by count alone.

| Gate | Status at recovery | Evidence | Required action |
|---|---|---|---|
| Implementation / ownership | VERIFIED COMPLETE | Surviving source/diff/new scripts; empty index, unchanged HEAD/reflog | Preserve; focused staging later |
| Prior service/behavior regressions | VERIFIED COMPLETE | Written ledger plus completed tool results in this thread, exact fixture states | Inherit, not rerun the giant campaign |
| Dark/Light/System decision | VERIFIED COMPLETE | Source + MS7.6 record: Dark only; explicit Light/System deferral | Preserve decision |
| Fresh code/build/secrets | NEEDS RECHECK AFTER RESTART | Old build exists, runtime lost | Fresh diff/type/lint/build/secret scan |
| Migrations / invariants / QA inventory | VERIFIED COMPLETE | Fresh20-hash/catalog/invariant + exact dry-run output | Final cleanup/audit after live smoke |
| Final visual evidence | NEEDS RECHECK AFTER RESTART |320/1728 final-build PASS in prior tool output, but `/tmp` images lost; last extras call interrupted | Fresh1440/1728/narrow and full tour, persistent captures |
| Commit / push / canonical FP5 | INCOMPLETE | No FP5 commit; canonical stillFP4 | Normal focused Git release |
| Live smoke / cleanup / lock | INCOMPLETE | Not previously claimed | Small live A/B; exact cleanup; conditional lock audit |

First incomplete executable gate: fresh post-restart sanity/build, then visual resweep. No evidence of lost implementation or a failed product gate from the restart itself.

`main` / `origin/main` = `3a83653cd9fbbc080b224a01278e31915fa7d43c`, divergence 0/0 after fetch. Canonical `toskerapp.vercel.app` READY deployment `dpl_CAU5QWUuUxzv5o6ynUAmW7TPEFhe`, exact SHA and alias. All20 historical hashes and current catalog match (25 tables /164 columns /78 constraints /15 enums). Read-only invariants:8 users/profiles/Sandboxes,4 retained Rooms,5 memberships,5 Personal conversations,29 messages,9 Hall notes,2 pins,6 accepted connections,32 notifications; duplicates/orphans0.

Preserve existing mixed handoff/inheritance changes, untracked Design/Art/Web/research/experiments and untouched `toskerArt/`. Explicit staging only. No old QA fixture replay.

## Pre-code surface/control inventory

Classification describes the recovered implementation, not an acceptance claim. Every row must be revisited in the final browser tour.

| Routes / surface | Controls and states | Baseline / FP5 action |
|---|---|---|
| `/`, `/app` | Auth entry, sign in/up, Sandbox default, list recovery, neutral loading, bootstrap retry | WORKING; measure repeated auth/navigation, preserve drafts and authorization |
| Shared shell | expanded/collapsed/mobile sidebar, search, Create, profile/namecard, Notifications, Settings, Friends, pin/unpin/drag/move | INCONSISTENT: pseudo-tooltip clipped by stacking/overflow; verbose overflow. Preserve Sandbox anchor and private ordering |
| Personal Chat, Room Chat, Subroom Chat | identity/status/context switch, Chat/Hall, static future Map, search, options, mute/unread, history/older/retry, composer/emoji/mention/reply, message menus/reactions/edit/Nuke | WORKING locked services; INCONSISTENT mute placement/menu prose; DEFERRED text formatting to implement safely |
| Personal/Room/Subroom Hall | notes/new/edit/color/archive/restore/Nuke, source pin/unpin/location/edit, ordering, comments/reactions, archive/empty/error states | WORKING lifecycle; INCONSISTENT inline menu collision; add IME-safe Enter/Shift+Enter comment behavior |
| `/friends` | Add friend, search/discovery, All/Online/Requests, Namecard/message/accept, private nickname edit/remove, busy/error/empty | REDUNDANT topbar Create; INCONSISTENT inline row menus and initial false-empty risk |
| `/notifications` | filters/list/read/navigation/invite responses, empty/error/refresh | WORKING privacy-safe WHO+CONTEXT; REDUNDANT topbar Create |
| `/profile`, Namecard | banner/avatar/name/handle/TID copy/status/bio, edit/Friends/Settings, relationship actions, private nickname, common Rooms | WORKING approved FP4 composition; preserve; username propagation needs regression |
| `/settings`, own Profile editor | Profile, Status, Privacy, Profile Card, Account, Notifications, Appearance, Support; save/reset/discard/conflict/failure | WORKING presets/privacy; DEFERRED avatar/banner must become explicit truthful states; immutable username must become safe edit; dark-only theme decision requires full color audit |
| Personal Chat Settings | Overview/nickname, Communication/mute, Media, Files, Links, Privacy | INCONSISTENT category/prose density; private tags absent (DEFERRED: durable owner/revision model); future media truthful, not fake upload |
| Room Settings | Overview/Trip label/name/tags, People/invite/Room nickname/owner reset, Structure/Subrooms/order/access, My preferences/mute, leave/archive/restore/delete | WORKING owner/member authorization; INCONSISTENT copy/grouping; do not rewrite lifecycle |
| Create Chat / Room / Subroom | friend/discovery search, canonical Chat reuse, name/trip/tag fields, steps/back/close, validation/dirty/busy/failure | WORKING; sweep fields, previews, focus, no generic surface picker |
| `/join/[slug]` | existing authorized invitation response, auth return, revoked/expired/no-access | WORKING locked invitation boundary; no provider change |
| `/help` | product guidance and support | WORKING; copy needs current capability sweep |
| `/explore`, `/explore/create`, `/create`, `/studio`, `/marketplace` | legacy direct destinations/redirects and deferred capability descriptions | DEFERRED legacy extension surfaces; inspect exposed controls, no extension implementation |
| All overlays | Settings sections, Namecard, search, nickname, note/edit, creation, confirmation, invite, emoji, deferred disclosures | WORKING native modal boundary; INCONSISTENT inline menus/tooltips; unify action geometry/collision/focus, retain destructive consequences |
| Full visual/art/motion/type system | deep Hall redesign, Map visual integration, advanced customization | MS8, not this patch |

## Design approach

Existing trip-planning groups on desktop/mobile need recognizable identity, concise actions and recoverable edits. Preserve the FP4 Namecard and Tosker fonts/palette/rounded language. Reuse top-layer positioning for menus and tooltips; no giant-z-index workaround. Move explanations into Settings and preserve consequential privacy/destruction copy. No replacement design system or fonts. Skill guidance is advisory; keyboard focus must remain visible, pointer and touch alternatives remain available.

## Acceptance ledger

### Implemented control disposition

| Control / state | Disposition | Evidence / boundary |
|---|---|---|
| Hall comment Enter / Shift+Enter | IMPLEMENTED | Composition guard, repeat guard, synchronous pending guard; explicit Post remains. Plain comment storage and existing idempotency retained |
| Chat inline emphasis | IMPLEMENTED | Shared escaped React renderer for body, reply preview, Hall pin and search excerpt. `**bold**`, `*italic*`, `_italic_`; bounded nesting, literal malformed text, atomic mentions/HTTP links. No HTML/images/embeds. Notification bodies unchanged |
| Header/sidebar/Friends/Hall/message menus | IMPLEMENTED / ALIGNED | Existing authorized actions, common top-layer panel, 44px rows, icon/label spacing, bounded scroll, native focus/Escape. Routine prose removed; mutation errors and destructive consequences retained |
| Mute, unread, private pins/order | IMPLEMENTED / PRESERVED | Muted icon beside identity, not utility actions. Existing private service/attention rules, Sandbox anchor unchanged |
| Friends / Notifications global Create | REMOVED | Redundant action removed only on utility destinations; sidebar Create remains available |
| Friends loading/failure | IMPLEMENTED | Explicit initial loading/retry; background outage retains last successful list; nickname removal/message failures surface |
| Collapsed rail tooltip | IMPLEMENTED | Native top layer, viewport collision clamp, hover/focus/Escape and hoverable description. No z-index escalation |
| Personal Chat / Room Settings | IMPLEMENTED / ALIGNED | Identity, Notifications, Shared content, Organization, Privacy; Room Trip details and existing owner/member structure. Shared vs private ownership preserved |
| Tosker username | IMPLEMENTED | Owner-only canonical edit; trim/optional @/lowercase, 3–24 ASCII letters/numbers/hyphens, reserved names, case-insensitive collision check + existing unique constraint, revision guard. Durable isolated 10-attempt/10-minute limit. Old handle released, not aliased; Clerk/TID untouched |
| Avatar / custom banner upload | DEFERRED/HIDDEN | Truthful noninteractive Settings state, no fake picker. Existing sign-in image/presets retained. Protected delivery/image safety/consent contract: MS7.6 |
| Light / Follow System | DEFERRED/HIDDEN | Dark only, no selectable half-theme; three existing private accents remain functional |
| Private Chat tags / per-Chat themes | DEFERRED/HIDDEN | No owner/revision/tag storage contract. Shared Room tags are not repurposed |
| Voice/video/calendar/attachments/translation/location | DEFERRED/HIDDEN | Existing explicit Development disclosures or static future Map, never a simulated operational system. No new runtime |
| Namecard / presets / canonical identity | IMPLEMENTED / PRESERVED | Approved FP4 hierarchy retained; no wholesale redesign or new font/media |

### Local evidence (ongoing; not release acceptance)

- Production build, TypeScript, lint PASS (one pre-existing unused `eq` warning in unrelated cleanup script). No new dependencies/migrations.
- 20 historical hashes and catalog PASS:25 tables/164 columns/78 constraints/15 enums; DB invariants PASS. 0006 and all later migrations untouched.
- Source/client secret scan PASS; `.env.local` ignored; no credential output.
- Pure formatter/escaped HTML/atomic mention+URL/malformed text tests PASS. Owner username normalization, reserved/case collision/stale/forged fields/missing revision, canonical peer reads, stable auth/TID and isolated rate limit tests PASS in rollback transactions.
- Existing profile/privacy, customization/contrast, Room identity, Settings and Trip suites PASS; synthetic transactions rolled back. Interface fill/text contrast: Tosker6.05, Iris6.34, Tide6.10; highlight/background4.81/5.13/4.90 respectively.
- Actual A/B username UI: invalid and peer collision retain draft; normalized save, reload, peer Namecard, new @handle discovery/old-handle non-resolution, stable TID, exact original username restored. No Clerk binding change.
- Optimized browser full route/control tour passed320/390/430/768/1440 at the initial build. A broad test role selector incorrectly closed Settings at768; scoped real category click passes.1728 initially reached signed-out entry, not a layout result; rerun required. Current-build captures/check-back pending completion.
- Actual A/B Personal/Room/Subroom formatted send, live arrival, durable reload, safe literal image-like text, reply preview, reaction toggle, Nuke/reload PASS. Room pin formats in Hall; source Nuke retracts Hall reference.
- Hall keyboard: whitespace reject, Shift+Enter newline, Enter post, synthetic composition protection, injected request failure retains draft, three immediate pending submissions produce one comment, peer reads3 persisted comments. Archive/Restore/Nuke PASS. Test was resumed against the same exact note after waiting for pending controls; no duplicate note was created. Exact note/comments removed through UI.
- Signed-out auth dialogs: all6 widths, outside/Escape preserve signup draft, explicit close/reopen, bounds PASS; no new account creation/CAPTCHA attempt.
- Current-build A/B customization: all identity accents/banner/frame options and all3 private interface accents save/reload/peer isolation PASS; reset, stale edit with explicit reload, injected network failure/retry PASS;6-width Profile Card/Appearance/Account/Namecard bounds PASS. Exact original presets/audience restored.
- Real full-row sidebar pointer drag, persisted order/reload, peer isolation and Move earlier alternative PASS; exact pins restored. Mute/unmute indicator, unread/list recovery and Sandbox anchor PASS.
- Private nickname save, peer isolation, exact restore and Namecard focus return PASS. Chat/Hall/parent-child switching, reload/background and per-conversation draft isolation PASS. Injected failed history preserves shell/draft; Retry recovers; exact unsent draft cleared; `/` selects the existing own Sandbox.
- Current-build Room identity A/B save/reload/metadata, scoped Namecard, owner reset/stale member draft recovery and6-width bounds PASS; Subroom mentions inherit parent nickname. Exact original blank nickname restored. Global/private identities untouched.

### QA ownership / cleanup ledger

Only FP5 Room `401257a2-b17c-4323-ab65-4b0621dac707` (`fp5-review-9381bd`), child `3af61c93-735e-4594-ad4f-518b566c17e3`, A/B are in scope. Never replay removed FP4 fixtures or delete retained users/history.

Local message receipts (already Nuked through UI): Personal `d1e6713b-56a7-40a2-9275-8c08e48b572b`; Room `9682e26c-aae9-4ec5-91ad-d37536f4f7cb`; child `38eacb31-59b9-4c01-a82c-17ce46b21990`. Hall note `d0e27c84-4e0e-4e05-8be1-4909a74efc8c` plus3 comments already removed through UI. Exact guarded receipt/Room cleanup still pending live smoke.

### Release gate

Fresh post-restart `git diff --check`, TypeScript, ESLint (zero errors; one pre-existing unused import warning), production build, all20 checksums/catalog, DB invariants and source/client secret scan PASS. Fresh formatter and rollback username-security suites PASS. Signed-out auth passes all six widths with no browser errors. Narrow320 full tour PASS. The1440 tour reached and captured the unclipped top-layer tooltip, then its browser context was lost (`about:blank`, signed out); it is being rerun, not counted as a product pass or failure. No source implementation was rewritten in recovery.

Read-only exact notification inspection identifies `cb90c0f2-b832-4f93-822b-770550fa373f` as `hall_note`, A→B, Room `401257a2-b17c-4323-ab65-4b0621dac707`; its Room foreign key cascades. It is QA-owned, not an unexplained retained-data change. No cleanup yet.

Fresh visual coverage completed as split evidence:320 full `ui` run PASS;1440 and1728 tours passed every route, eight Settings sections, Namecard focus return, Create Chat/Room preview, menu bounds, tooltip bounds/overlap and capture checks. Their last automation step lost the browser context; the full commands are **not** recorded as successful exits. Separate `tooltips` runs then passed the actual pointer→Escape keyup→Expand sequence at both1440 and1728. The native driver context resets could not be reproduced as an app failure in isolated checks; both system Chrome and already-installed Chrome for Testing were inspected. `extras` PASS: Help/Explore/Create redirects, five Chat Settings sections and collapsed conversation tooltip. Screenshots were visually inspected (narrow menus/Profile, Friends, Appearance and both desktop tooltips); no clipped core control found. Browser-driver instability remains an evidence caveat, not a claimed app fix or a physical-browser certification.

Fresh A/B Personal formatted send/reload/reply, authorized search excerpt, formatted edit propagation, reaction and Nuke PASS. Exact additional empty Nuked receipt: `d57f2f28-9fb9-4646-99d4-6f2b781cdd61`. No retained message altered. Prior Room/Subroom and Hall behavior evidence is inherited; canonical repeats remain pending.

Local candidate accepted for focused Git release with the explicitly recorded split visual evidence. Pending exact canonical Git deploy/live smoke, guarded cleanup and lock assessment. Do not infer LIVE/LOCKED from source tests. Replacement captures: `/Users/ryanc/.codex/artifacts/tosker-fp5-recovery-20260927/`; old `/tmp` captures were lost. Browser emulation and synthetic composition events are not physical-device/IME certification.

### Git-backed release and live acceptance

Focused38-file implementation/evidence commit `0edd73dd8ff5b0640588894f1a2bbb8413dfa47b`; normal fetch showed1ahead/0behind, normal push succeeded. Only the FP5 handoff hunk was staged; unrelated historical handoff/Design/Art/Web/research/inheritance work remains on disk and excluded. No reset/clean/force push or working-tree upload.

Canonical READY `dpl_8AeQWyP5XnAP5jcjRtVLY87XvWzW`, exact application SHA above, `tosker-pubvg8c9w-pangea6.vercel.app`, aliases include `toskerapp.vercel.app`. Root follows to `/app` HTTP200. Production hosting still uses the expected Development identity/data/realtime services; no provider configuration changed.

Supplemental final-build shell check PASS with no browser errors: Sandbox default; actual client-link switching Personal1878ms/Room2376ms; identity-adjacent mute/unmute restored; manual unread visible in list; Room/Subroom/Hall/Friends/Notifications/Profile/Namecard; canonical username; explicit media and Dark-only states;1440 and320 geometry. This independently confirms final shell behavior beyond the interrupted full-tour commands.

Canonical A/B sign-in PASS. Live captures use `/Users/ryanc/.codex/artifacts/tosker-fp5-live-20260927/`. A documentation/test-locator-only closeout may produce a newer deployment; application source remains the exact live-tested commit above. Verify its final canonical SHA/ID rather than assuming alias ownership.

### Final acceptance / lock audit

- Live A→B Personal/Room/Subroom: formatted send/edit, escaped HTML, authorized search excerpts, durable reload, reply preview, reactions, Nuke all PASS. Room source pin formats in Hall and retracts on source Nuke.
- Live Hall: whitespace rejection, Enter, Shift+Enter, synthetic IME guard, failed-submit draft retention, repeated pending submission deduplication, peer reload with3 comments, Archive/Restore/Nuke PASS. Exact note `eb87c02b-748f-4b6e-9a32-b0b6d7204e6a` was removed through UI; old already-removed note was not replayed.
- Live shell PASS, browser errors empty: Sandbox default; Personal/Room/Subroom/Hall; Friends/Notifications; Profile/Namecard; canonical username and stable TID projection for peer; Settings truthful image deferrals; Dark-only Appearance; identity-adjacent mute/unmute; manual unread feedback;1440 and320 geometry. Actual client navigation Personal1402ms/Room1382ms; canonical full-route settle1357–2919ms in this bounded sample. This is an acceptance sample, not a load/performance guarantee.
- Live real-pointer tooltip bounds/Escape/expansion PASS at1440 and1728. Local full-tour driver context-loss caveat remains recorded above; independent local and canonical checks passed without changing product code to appease the driver.
- Deployment-scoped error/fatal and5xx scans returned no matching logs after smoke. Canonical alias rechecked exact `0edd73d` READY; HTTP200. Development services remain intentional, not launch-ready Production provisioning.
- Exact cleanup dry runs PASS, then deleted only owned Room `401257a2-b17c-4323-ab65-4b0621dac707`, its single child,4 empty Nuked Room/child receipts and their dependent QA state;3 exact empty Personal receipts (`d1e6713b-56a7-40a2-9275-8c08e48b572b`, `d57f2f28-9fb9-4646-99d4-6f2b781cdd61`, `a56aac7e-25e0-43e6-b7f3-f6d776f1e6d5`). Live Room/child receipts were `45d64c49-b60a-4ce3-8322-a8d3b149145d` / `f29deed0-ab75-41a8-9c78-9a61ec25f5f9`. Permanent QA-only deletion; not an undoable archive. Never rerun deleted fixtures.
- Post-cleanup baseline restored exactly:8 users/profiles/Sandboxes;4 Rooms/5 memberships;5 Personal conversations;29 retained messages;9 Hall notes/2 pins;6 accepted connections;32 notifications; duplicate/orphan checks0. All20 migration hashes/catalog and DB invariants PASS again. No migration, schema, user deletion or metadata repair.

| Lock gate | Final disposition |
|---|---|
| Exact canonical / live A/B | PASS, application0edd73d / READY deployment above |
| Settings / username / privacy / recovery | PASS, fresh and inherited evidence explicitly separated |
| Images / Appearance | PASS current contract: truthful deferred media; Dark only, real private accents |
| Menus / tooltips / sidebar / headers | PASS responsive capture inspection plus independent local/live interactions |
| Hall keyboard / safe Chat grammar | PASS service and canonical A/B |
| Switching / loading | PASS bounded canonical sample and prior recovery suite; operational latency debt retained |
| Cleanup / DB / secrets / historical integrity | PASS; exact retained baseline restored |
| MS7.6 / MS8 debt | Current, explicit and not silently implemented |

MS7.2 LOCKED under the founder's conditional authority. No known FP5 functional blocker remains. MS7.6 retains private media/delivery/image safety, environment separation, observability/latency and broader provider/operational prerequisites; private Chat tags require an owner/revision data contract, not speculative procurement. MS8 retains whole-product visual/motion/type refinement, complete Light/System contrast, physical-device/assistive-technology/complex-IME validation. Design skills informed reuse of the existing palette, top-layer interactions and keyboard geometry—not a replacement design system. No fonts/Art/provider/schema changes. STOP; no MS7.3 code.
