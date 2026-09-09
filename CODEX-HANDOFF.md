# Tosker Codex handoff

Repository and Git are authoritative. Read this file first when resuming development.

## MS7.1 founder-review build live — 2026-09-09

**DEVELOPMENT COMPLETE FOR FOUNDER REVIEW · CANONICAL BUILD LIVE · FOUNDER REVIEW REQUIRED.** MS7.1 is NOT LOCKED. Stop development for the [founder walkthrough](docs/MS7-1-FOUNDER-WALKTHROUGH.md), including scenarios39–40. Do not begin MS7.2. Any founder correction requires a bounded follow-up and relevant regression before explicit founder lock.

The current founder development-continuation directive supersedes the historical waiting instructions below. Product checkpoint `fd76555f27d9e32e46dae444e5d0dc444ee7f03b` — `fix: complete MS7.1 stress and responsive hardening` — is committed and pushed to main, preserving all six earlier checkpoints through `8b6d29c`. It fixes long Room/Subroom/author/reply/Hall-author overflow and tablet header clipping, and adds existing canonical attention dots to authorized Room/Subroom switcher links. No schema/provider changes. Existing roadmap alignment and unrelated Design Hub / Art / Web work are preserved.

Fresh PASS: all eight long-identity widths, populated Room/two-child/shared-Hall attention sequence, owner removal during real typing and open Hall editor with authorized rejoin/draft preservation,589-row bounded browser history, offline history/reply recovery, schema/invariants, management/mentions/Hall/Room/Ably/MS6A services, TypeScript/lint/build and secret scan. Delivery sample medians Personal5266ms / Room5749ms / child7283ms: slower than prior optimized samples, still several-second Development latency; do not imply instantaneous delivery. Details and harness failures: [results ledger](docs/MS7-1-STRESS-RESULTS.md).

Final foreground keyboard/control and rebuilt switcher/Hall author responsive reruns PASS. Exact guarded cleanup completed: three QA Rooms,9 Room/Subroom conversations,693 contained messages,13 Hall items/1 comment, plus18 individually verified QA messages in preserved Personal/Sandbox conversations. No application undo. Post-cleanup invariants and Chat/shared-state authorization checks PASS:6 users/profiles/Sandboxes,5 Personal conversations,2 preserved Rooms,23 messages,7 Hall notes/1 pin; no duplicates/orphan pins. `scripts/cleanup-ms719-qa.ts` is a one-shot audit trail; its default dry run now correctly refuses missing fixtures. Do not recreate those heavy fixtures or rerun their old browser routes after cleanup.

Verified product deployment `dpl_WU2K6AuQXPLeKTKRraGiQL34wFAp` READY, exact SHA`fd76555f27d9e32e46dae444e5d0dc444ee7f03b`; immutable URL`https://tosker-qqbb6luwh-pangea6.vercel.app`, canonical`https://toskerapp.vercel.app/`. Normal isolated A/B live smoke PASS: fresh Room/invite/join, selected child and mention scope, parent/child delivery isolation, independent Chat/Hall attention, Hall reload, Personal typing and canonical reply/reload. Landing200; anonymous history/member/search401 private/no-store. Hosted nine-sample median visible delivery Personal668ms / Room873ms / Subroom657ms; separate from slower local-server samples. Cross-host clock deltas are not valid provider durations and are excluded.

Exact live cleanup also completed: one new QA Room/two conversations/eight Room messages/one Hall note and five exact Personal messages; user/Sandbox/Personal conversations preserved. Post-cleanup audit returns to23 messages/7 notes/1 pin/26 notifications, with zero duplicates/orphans. Cleanup scripts are one-shot evidence and now refuse missing fixtures. Review documentation/QA harness-only follow-up may create a newer Git deployment with identical application source; inspect Git/alias on resume. Preserve unrelated mixed Design Hub/Website documentation hunks and untracked Art/research/experiments.

Browser caveat: B occasionally remained genuinely hidden after navigation; normal temporary-tab switch/close plus waiting for the actual event restored foreground. Never override visibility or bypass reading guards. Both canonical Clerk sessions were verified normally as respective A/B users, without login bypass. Physical device/assistive/clipboard/actual browser zoom limits and four moderate dev-tool dependency findings remain documented. QA browser sessions and owned local server are to be closed at final handoff; no background continuation is authorized.

Do not deploy before the gate. Attachments remain MS7.6 P-001; no provisioning. Owner destructive lifecycle stays absent; [recommendation](docs/MS7-1-OWNER-LIFECYCLE-REVIEW.md) and [walkthrough preparation](docs/MS7-1-FOUNDER-WALKTHROUGH.md) are written, not approved policy or founder-ready certification. No MS7.2 or inferred MS7.1 lock. `toskerArt/` remains untouched/untracked.

## Founder roadmap alignment — documentation only (2026-09-09)

Canonical milestone order: [docs/ROADMAP.md](docs/ROADMAP.md). Provisioning intake: [docs/MS7-6-PROVISIONING-BACKLOG.md](docs/MS7-6-PROVISIONING-BACKLOG.md). These supersede older scheduling/provisioning gates below, not historical engineering evidence. MS6 is COMPLETE AND LOCKED; MS7.1 is IN PROGRESS and unlocked. **NO DEVELOPMENT STARTED by this update. Wait for “continue MS7.1 dev directive”.** No code, migrations, provisioning, dependencies, commit, push or deployment in this alignment pass.

Private attachments are founder-classified **MS7.6 provisioning backlog**, not a current MS7.1 blocker; no token/provisioning action is required now. No fake uploads. Future services must be assessed as current-wave core blockers, MS7.6 backlog, or post-beta/later infrastructure. MS7.6 owns Development/beta backend coherence; MS15 owns full production/launch priming.

After the separate development directive: recover validated state → test Chat/Rooms/Hall → optimize → finish core grammar → identify/classify/document provisioning debt → full engineering/stress gate → canonical founder-review deployment → founder walkthrough → founder patch if needed → explicit founder lock. No automated QA-only lock or early later-milestone start.

## Historical checkpoint — MS7.1 Chat / Rooms hardening (2026-09-09)

MS7.1 remains IN PROGRESS, local only, not founder-ready or locked. Do not start MS7.2. Git is authoritative.

### Clean checkpoints and current implementation

- Preserved local checkpoints: `428b8aa` .1 Chat/drafts, `eda4451` .2 Room lifecycle, `b3bd7a1` .3 Hall lifecycle, `bfb444d` .4 history/performance.
- Latest backend checkpoint: `449caf8` — scoped communication/mention foundation. Exact staged snapshot passed TypeScript, lint and production webpack build with the previous client; full integration Turbopack build also passed.
- Client integration checkpoint `8b6d29c` (.5/.6/.8) adds real conversation Search, viewer Mute/manual Chat/Hall unread, Room preferences, explicit authorized mentions, canonical reply/Search/Hall source navigation, shared temporary focus/highlight, deterministic identity avatars, readable functional type and contextual Subroom disclosure. Git inspection confirms HEAD `8b6d29c`, main six commits ahead of recorded origin/main; preserve all checkpoints and unrelated WIP.
- Development migrations `0012_unusual_spot` and `0013_omniscient_hulk` applied additively: viewer preferences/manual markers; canonical message mention spans and existing-notification mention classification. Verified 14 migrations / 46 FKs. Neon remains authority; Clerk/Ably and connected60s/unavailable12s reconciliation unchanged.
- Canonical deployment remains locked MS6B product `f005f6d`; origin baseline `c6286b9`. No MS7.1 push/deploy.

### Verified evidence

Detailed status, limits and exact fixtures: [stress results](docs/MS7-1-STRESS-RESULTS.md). [Capabilities and media assessment](docs/MS7-1-CORE-CAPABILITIES.md), [Chat grammar](docs/MS7-1-CHAT-GRAMMAR.md), [UX decisions](docs/MS7-1-UX-DECISIONS.md), [backend checkpoint](docs/MS7-1-COMMUNICATION-FOUNDATION.md). These are prior engineering results, not tests rerun by this documentation update.

- Development management/mentions/attention, MS6A mutations, Room/Ably withdrawal and Hall lifecycle suites PASS; MS6B real token capability/forgery/revocation/provider-delivery regression PASS.
- Real A/B Search/Mute/manual unread, canonical mentions/draft/reload/offline retry/single mention attention, muted-Room mention exception, reply edits/tombstones and repeated source highlighting PASS.
- Composer Escape→clear→retype @ defect fixed and retested; ten explicit targets/caret, eleventh rejection without text mutation and Shift+Enter PASS. Native textarea selection is used in the harness because CLI modifier Select All did not select text; no claim about physical shortcut verification.
- Personal/Room/Subroom/Sandbox pin→Hall→source focus/highlight→unpin preserves original PASS. Updated 16-context visible-control sweep and eight-width 320–1728 Chat/Hall/mentions/Search/editor matrix PASS.
- Fresh Room/default category/quiet empty state, normal B invite/join, selected child, scoped parent/child traffic, Hall and both reloads PASS. No Home/unavailable flash observed on creation/open.
- 525-row bounded history / ≤200 mounted messages / preserved anchors and55 missed-record reconnect passed .4. Fresh older-history offline/reply recovery and actor reaction/edit/delete regressions PASS. Development delivery still several seconds, not a production SLA.
- Final TypeScript/lint/production build PASS. Notifications320/390 typography/filter wrapping, native Search/options keyboard controls and focus restoration PASS. Combined Chat/Hall/list attention and genuine hidden→visible recovery of three messages plus Hall PASS. Denied-source unread race and Search initial focus fixed/retested; explicit Latest restores normal reading and clears the error.
- Secret/client bundle scan PASS; production npm audit clean. Four moderate dev-only drizzle-kit/transitive esbuild findings remain; do not apply npm's breaking force downgrade.

### Recovery / remaining gate

1. Inspect Git and active process state before resuming; do not duplicate browser mutations. Local production server is port3000, last owned session45375. Dedicated browser profiles persist under `/tmp/tosker-ms6b-browser.j01Vkq/a` and `/tmp/tosker-ms6b-browser.j01Vkq/b`; normal reload/navigation recovers occasional Clerk/blank-session automation state, no auth bypass.
2. Wait for the separate MS7.1 development directive. Then follow the canonical roadmap's recovery/testing/optimization/grammar/provisioning-classification sequence and finish the full engineering/stress gate. Current combined attention/background/new-control keyboard tests are complete; do not unnecessarily reconstruct them or turn partial evidence into PASS.
3. Save only coherent validated owned files; preserve unrelated Website/Art/research/experiments. No blanket staging.
4. **Former MS7.1.7 media work moved to MS7.6 backlog P-001.** The founder's roadmap update resolves the old provisioning/deferral stop; only later explicit founder direction promotes attachments back to a current MS7.1 blocker. Do not provision now or restore fake uploads. Owner leave/delete/transfer policy must not be invented; the roadmap does not silently resolve unsafe lifecycle decisions.
5. Retain exact QA Rooms/messages until remaining validation completes; no deletion of existing users/Sandboxes/Personal conversation or founder history. Once development is separately resumed: exact cleanup/invariant audit and complete engineering/stress gate with clearly classified dependencies → canonical founder-review deployment/live A/B smoke → founder walkthrough → required founder patch → explicit lock. No push/deploy in this documentation pass.

Persistent founder inheritance directive: read `docs/CROSS-PROJECT-INHERITANCE.md` before future identity/Profile/Settings/Room customization/Gizmos/Art/skins/Developer work. Source projects are read-only R&D; archaeology is deferred. Candidate paths/hypotheses are unverified, not integration permission. `toskerArt/` must remain untouched/untracked. No Art/Web/source-project changes.

## Locked baseline — MS6 COMPLETE / MS6A LOCKED / MS6B LOCKED (2026-09-07)

**Previous deployed baseline:** product commit `a3e94a8bee718f4b43a309ed8cedf0c2d9efc168`, pushed to main and deployed READY as `dpl_EG1JiM7p7ANoTPL2K9NrvEUkddCm` at `https://toskerapp.vercel.app/`. Normal isolated Clerk A/B live Personal/Room/Subroom delivery, typing, reconnect and surface unread passed. Scoped Ably tokens/revocation, 55-message recovery, retry, TS/lint/build/DB/security checks passed; that baseline had no schema changes. Connected reconciliation 60 seconds, disconnected 12 seconds; Friends retains manual-status polling. Existing founder-review target uses Development Clerk/Neon/Ably, not a new Production/Preview stack. Current patch evidence: `docs/MS6B-ACCEPTANCE.md`.

**Final founder patch:** `f005f6d9fea2727f7e89b8d7bfdf3a2ebfa18f9b` — `fix: refine realtime attention and friend discovery`. Pushed to main; deployment `dpl_2pEXBTB1Q1VHYy1pHBA9vZy4WnM5` READY, canonical `https://toskerapp.vercel.app/` HTTP 200. Immutable product deployment: `https://tosker-nuqjxjy1f-pangea6.vercel.app`. This documentation closeout may produce a newer Git deployment without product changes.

Migration `0011_omniscient_northstar.sql` is applied to Development (12 migrations / 44 foreign keys): notification-list acknowledgement and destination unread are separate. Exact rendered IDs/message boundaries protect later arrivals and other surfaces. Private activity refreshes canonical navigation/Friends; one actor's memory-only response cache prevents route flicker without becoming authority. Hall recipients require current membership/Subroom access. Contained Friends discovery, explicit relationship states, shared pink attention, dark focus/modal primitives and approved audit fixes are included. No transport rewrite or new infrastructure.

Fresh TS/lint/build, schema, Chat/shared-state/invariants, Ably authorization, independent-attention, cache/identity UI and secret scans pass. Local real A/B covers request/accept in both directions, new Personal rail appearance, active Chat, separate Chat/Hall/list read states, parent/child isolation, search states, 1440/390/320/720 layouts and private nickname. Live normal Clerk A/B sign-in, Friend attention/acceptance, bidirectional Personal, Room/Subroom delivery, typing, brief disconnect/reload persistence, Hall/list clearing and 390px composer fit pass. Sampled browser and Vercel runtime errors: none. Physical mobile/OS eviction and screen-reader speech remain untested.

QA-only cleanup completed with exact actor/Room/conversation guards: two temporary Clerk/Neon users, their Sandboxes, one Room/child, one Personal conversation, 12 messages, three notes and related fixture metadata removed. No founder data removed; cleanup has no UI undo. Post-cleanup DB invariants pass (6 users, 6 Sandboxes; no duplicate TIDs/memberships/Personal pairs or orphan pins). Evidence: `docs/MS6B-ACCEPTANCE.md`.

The founder-approved MS7 audit remains planning only. Room lifecycle menus, Hall destructive/archive policies, identity/shared-context work, Settings/Help, Gizmos and true production infrastructure separation remain MS7 debt. **STOP: MS7.1 requires subsequent explicit founder authorization.** Unrelated Website/Art docs, research and experiments remain unstaged; `toskerArt/` untouched/untracked.

Founder authorized this sequence in the landing/MS6B kickoff: finish landing, validate, commit/push/deploy and live-test it; only then research/recommend one realtime provider. **Do not provision a provider automatically; stop for founder account/resource/credentials if needed.** This supersedes the older MS6A founder-review stop below, without reopening MS6A.

Landing baseline: `51c8daa8` (MS6A closeout). Public `/` is now an independent static landing; former Chats home is `/app`. Existing product URLs live under a URL-neutral `(workspace)` layout retaining the original session/auth boundary. Landing uses existing Clerk modal sign-in/sign-up with `/app` completion; signed-in visitors still see `/`. Desktop footer and mobile Profile/Help link back to it.

Scope/evidence and release record: `docs/LANDING-INTEGRATION.md`. No schema, auth-provider configuration, realtime transport, or product redesign. Keep the 12-second polling bridge through the provider gate. `toskerArt/` and unrelated untracked Art audit/system documents remain untouched and unstaged.

## Historical MS6A milestone (superseded by active status above)

MS6A — Foundational UX / core interaction debt — **DEPLOYED / LIVE-VERIFIED / AWAITING FOUNDER REVIEW** (2026-09-07).

Product checkpoint: `f6ada068aeadbcc882a7b268b5c5eba6438e5fda` — `feat: complete MS6A foundational interactions`. Pushed to main. Canonical product deployment `dpl_B9FBLZhWr4weR3cuYWbJQp9frJrN` READY; authenticated live smoke and runtime-error scan passed. Subsequent documentation-only deployments may carry newer IDs without changing this product checkpoint.

- Resumed the authoritative WIP at `f38808a`; did not reset, recreate or discard it. Main matched origin/main before the release commit. Previous low-usage STOP instructions were superseded by the founder's PRO continuation.
- Current patch includes durable actor-scoped Chat and Hall-comment reactions, existing-model own edit/delete/replies, Hall editor/modal/reorder, Friends-first Chat creation, custom Room tags, parent-first Room/Subroom navigation and Explore consolidation.
- Explore is the actual umbrella: Gizmo/future-community discovery at `/explore`, Create / Studio previews at `/explore/create`, shared section navigation. Legacy redirects are only bookmark compatibility, not the IA. No commerce or Developer backend.
- Additive migration `0010_handy_argent.sql` already applied to Development: message tombstones and two reaction tables; 11 migrations/44 foreign keys verified.
- Fresh TypeScript, ESLint, production build, MS6A database acceptance, schema verification and invariant audit pass. Two-user reaction/Hall persistence, full-card drag, parent return and restricted deep-link denial passed. Detailed evidence/limits: `docs/MS6A-CLOSEOUT.md`; historical recovery: `docs/MS6A-WIP-CHECKPOINT.md`.
- Final QA fixes: right-click menu no longer disappears on release; failed sends retain their reply target; short composer placeholder avoids narrow-screen clipping; Create / Studio banner links back to discovery.
- Historical MS6A exit was founder review; latest landing/MS6B authorization above supersedes the implementation stop. MS6A is not being redesigned.
- The temporary `MS6A Browser QA` fixture was removed after live verification using guarded exact-ID/content assertions: one Room/Subroom, two conversations, three messages, two notes, one comment and five related notifications, plus cascading fixture metadata. No founder content removed; this test cleanup has no UI undo. Historical fixture URLs in the recovery log no longer exist.
- Browser limits: physical iOS/Android keyboard/long-press and native browser zoom not exercised. Equivalent 200% layout (720×450) passed. Clipboard API write succeeded with expected text; automated read/paste remains restricted. Auth/proxy unchanged; fresh B reloads stayed signed in, while A's automation session twice returned to a blank browser and required normal reauthentication.
- Keep the existing 12-second polling bridge until the separately gated MS6B implementation is reliable. No automatic provider provisioning, media storage, native, AI or Gizmo SDK. `toskerArt/` stays untouched/untracked. Unrelated Art documents were not read, edited or staged.

## Checkpoints

- MS5.0A `882d779` — backend foundation
- MS5.0B `3cd6e33` — Development Neon database
- MS5.1 `d3b7c89` — Clerk auth, User/Profile/TID/Sandbox
- MS5.2 `957953e` — Rooms, memberships, invitations
- MS5.3 `1d96553` — persistent conversations/messages
- MS5.4 `9db7257` — Friends, Hall, Room capabilities, notifications
- MS5.5 `9278aaf` — hardening and founder-review preparation
- MS5.0.1 `e05eb9c` + `da62280` — final founder patch and Hall copy closeout
- MS5.0.1 non-realtime closeout — founder accepted (active Chat reconciliation, grouped presentation, private nicknames, manual presence, shallow Subrooms)
- Founder-polish checkpoint: `f6089d4d0e14212a2d4e825db62a9d5d62267c75` — `polish: refine Hall and MS5 interface consistency`. No post-commit product correction was needed; subsequent commits are documentation only.

## Environment and release boundary

- Development database: Neon `neon-byzantine-jacket`
- Development auth: Clerk Development
- Canonical Development app: <https://toskerapp.vercel.app/>. Final MS6B product `f005f6d`, deployment `dpl_2pEXBTB1Q1VHYy1pHBA9vZy4WnM5`, READY and live-verified. Subsequent documentation-only Git deployments may have newer IDs without changing product code. Evidence: `docs/MS6B-ACCEPTANCE.md`.
- Preview and Production databases are not provisioned.
- Canonical alias uses the Vercel production target but **Development** Clerk/Neon; the old MS4.1 deployment statement is obsolete. Founder authorized this MS6A commit/push/deploy. Do not provision production infrastructure.
- `toskerArt/` remains untracked, untouched, and unintegrated.

## MS5.0.1 contract

- `conversation_reads`, Hall color/order/archive fields, and notification conversation links were migrated to Development Neon.
- Recipient-only message, friend, and Hall notifications are durable; opening Chat or Hall marks that surface's activity read.
- A 12-second authenticated foreground polling bridge refreshes activity and Friends requests and shows one restrained in-app toast for new incoming activity. It is temporary MS5.0.1 delivery infrastructure, not realtime.
- Demo Mode is signed-out only, deterministic, local prototype state. It never reads or writes authenticated Neon state and is marked quietly in the shell.
- Hall notes support comments, finite reactions, desktop grip dragging, arrow-key reorder, mobile overflow move fallback, colors, Archive and confirmed Nuke. Reactions are deduplicated and removals actor-scoped. Pinned references retain Open in Chat and Unpin without deleting the source.
- Active authenticated conversations reconcile server messages every 12 seconds by stable message ID without route reload; presentation groups consecutive same-author messages within 60 seconds while records remain unchanged.
- Accepted connections support viewer-scoped private nicknames. Profiles carry a constrained manual presence status (`online`, `idle`, `away`, `meeting`) with owner-only updates and coarse display treatment; status changes never create activity records.
- Rooms support one Subroom level with server-enforced visibility (`everyone`, `selected`, `owners`), separate conversations, and a seeded development fixture. Subrooms never create duplicate Room memberships.
- Mobile communication headers use a dedicated horizontally scrollable surface row; narrow utility actions collapse behind the existing More control. Friend search preserves Pending/Confirm/Accepted states and accepted rows use compact icon actions.

## Verified state

Two isolated Clerk users have stable Profiles/TIDs/Sandboxes, shared Room membership, durable Room and personal messages, canonical personal conversations, Friends, Hall notes/pins, capabilities, notifications, unread indicators, and authorization boundaries. Database audit and MS5 smoke scripts pass.

Founder polish: additive migration `0009_clumsy_krista_starr.sql` applied to Development (10 migrations verified). TypeScript/lint/build/schema/DB audit and Hall tests pass. Two authenticated browsers verified comment/reaction persistence, own-reaction removal, drag/keyboard order, and separate Room/Subroom Halls; B receives 404 for owners-only Hall.

Responsive Hall checks passed at 320/375/390/430/768/1024/1440/1728 widths without horizontal overflow. Composer follows visible viewport, uses 16px mobile inputs, centers Send, preserves failed drafts and guards pending sends/IME. Physical iOS/Android keyboard testing remains unperformed. Mobile web is fallback; native mobile is the future first-class direction.

Polling remains the actual **12-second** bridge, with hidden-tab/in-flight guards and timer/listener cleanup. Media upload is intentionally deferred: nullable fields and safe same-origin renderer exist, but Photo explains unavailability. No storage was provisioned.

## Deferred MS6B debt

MS6B is authorized only after landing commit/push/deploy/live smoke, with a founder provisioning gate. Scope: realtime, typing, reconnect/reconciliation and communication reliability. Manual presence remains separate from connectivity; do not add heartbeat writes or more polling.

Later: native mobile, persistent media/object storage, broader optimization, deeper Hall refinement and Tosker Art integration. Other unbuilt capabilities remain outside this lock.

## Recovery

1. Run `git status` and `git log --oneline -8`.
2. Preserve completed checkpoint commits; do not squash or amend prior milestones.
3. Inspect latest Git/deployment; MS6/MS6A/MS6B are locked. The canonical alias still uses Development services.
4. Do not touch `toskerArt/`.
5. Follow the active session and MS6B release record above. Do not reopen provider integration or begin MS7 without subsequent explicit founder authorization.
