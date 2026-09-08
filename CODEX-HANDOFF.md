# Tosker Codex handoff

Repository and Git are authoritative. Read this file first when resuming development.

## Active session — MS7.1 Chat / Rooms hardening (2026-09-08)

**Current continuation checkpoint — MS7.1.4:** based on `b3bd7a1` (.1/.2/.3 preserved locally). Bounded authorized message history now uses no-store GET, latest/older/newer pages of 50, maximum canonical window 200, stable anchors, held history during arrivals and Latest recovery. Read-only navigation/notification refresh also uses GET with the existing actor/scope checks; mutations, Neon authority, Ably and 60s/12s fallback remain unchanged. Content-free local timing shows median recipient visibility improving from Personal/Room/Subroom 7885/8584/10224 ms to 3975/5441/6119 ms; server roundtrip debt remains explicit. No migration.

Database 525-row mixed-history/cursor/scope acceptance, browser 525 traversal, old quote/draft/offline retry, real A/B Personal+Room attention, 55 seeded missed-record reconnect, anonymous/private-child API denial, MS6A authorization regression, TS/lint/build and diff checks pass. Smooth-scroll falsely entering history was reproduced/fixed/retested. Exact evidence and detailed hidden-control inventory: `docs/MS7-1-STRESS-RESULTS.md`. Seed-only private history child lacks a navigation access row by construction; direct API denial tested; real owner child creation/navigation passed .2. No production claim.

Continue automatically to .5 local UX/identity/loading/responsive, then .6 integrated 40-scenario/chaos/security/cleanup gate, push/deploy/live smoke and founder walkthrough preparation. Do not stop merely after this local checkpoint. `docs/MS7-1-UX-DECISIONS.md` currently records official-source hypotheses only, not implementation. Current local production server on port3000, owned tool session1870; browser sessions ms71-a/ms71-b retain isolated authentication. New exact QA Room `ms714-history-26ba8c8f` / `26ba8c8f-a478-4550-bb68-e50a28c539d4` contains525 seed rows +2 browser messages +55 gap rows; conversation `7a03d40e-6da6-4322-8af3-418987567f2c`; remove exact Room at final cleanup. Three rounds of `MS714 latency` prefixes added to existing QA Personal/Room/Subroom (27 messages), plus two more `MS711 attention` records; clean only exact actor/context/prefix records, never existing Personal conversation/history. Existing .1–.3 fixtures remain until integrated QA. Unrelated Website/Art/research/experiments remain unstaged; `toskerArt/` untouched/untracked. Founder readiness/lock not granted, no MS7.2+.

Persistent founder inheritance directive: read `docs/CROSS-PROJECT-INHERITANCE.md` before future identity/Profile/Settings/Room customization/Gizmos/Art/skins/Developer work. Source projects are read-only R&D; archaeology is deferred during the active MS7.1 slice. Candidate paths and hypotheses are explicitly unverified, not research findings or permission to integrate.

Founder explicitly authorized MS7.1 only. Baseline `c6286b9`, product `f005f6d`, main matches origin. Existing Website handoff/untracked Art/Web/research/experiments are unrelated and must remain preserved/unstaged; `toskerArt/` untouched. Approved audit and MS6B acceptance read; two authenticated canonical browsers inspected before edits. Current plan/contracts: `docs/MS7-1-CHAT-ROOMS.md`. Shared founder/engineering suite: `docs/MS7-1-STRESS-SCENARIOS.md` (01–40), evidence and version template: `docs/MS7-1-STRESS-RESULTS.md`. Increment MS7.1.x only for completed validated slices; preserve partial/failing evidence and founder-only 39–40. Local coherent checkpoints allowed; no canonical deployment until all MS7.1 gates pass. MS7.1 locks only after founder walkthrough/approval. Do not start MS7.2–7.5.

**Current recovery:** MS7.1.1 Chat slice validated for a coherent local checkpoint: safe Chat HTTP(S) links, removal of deferred translation/media/header utilities/Gizmo installation, honest authenticated rows, two-step Room creation, actor/conversation-scoped tab-local draft/reply/retry recovery, Chat loading/fetch-error distinction and truthful date/grouping boundaries. Changed components: communication-ui, message-bubble, messaging-app; small shared CSS; message-links/chat-drafts/message-presentation helpers and targeted/browser scripts. No server policy/schema/migration changes. Fresh TS/ESLint/production build, diff check, parser/draft/date tests, read-only UI fixture checks and two-user database regression pass. Real A/B Personal/Room typing/delivery/attention, offline reply/retry/reload, edit/delete/canonical quotes, reaction counts/selection, 30 rapid sends, long content and safe external navigation pass. Full-wave remaining work and physical/clipboard automation limits stay explicit in the numbered ledger. No MS7.1 push/deploy.

Local production build runs on port 3000 (owned start session 66552); browser sessions `ms71-a` / `ms71-b` are authenticated distinct existing test users. Offscreen clicks require scrollintoview plus settled bounds; mouse coordinates must be integers. CLI fill with empty text did not clear controlled input; fill a single space then Backspace works. No auth/provider changes. QA Room `ms7-1-qa-japan-trip-2027-6f6ae6` retains all current-wave fixtures; existing A/B Personal `be192eac-38c6-4d46-a6d2-bea19fa324fa` has only new `MS711 stress…` / `MS711 attention…` QA messages to clean later, never delete that conversation or historical content. Temporary DB-suite Room was cleaned by its exact-ID finally block. Clipboard write succeeds but read-back is denied; physical touch/OS keyboard/real browser zoom remain founder checks. Next: MS7.1.2 owner/member management, safe leave/remove/invite revocation, Subroom/access-loss/token races, then Hall/history/full wave. Keep 60s connected / 12s unavailable reconciliation; no MS7.2, new infrastructure, Art or Website work.

**Latest continuation:** MS7.1.1 committed locally as `428b8aa`. MS7.1.2 acceptance now passes: Room details/name/tags/member permissions, confirmed leave/removal, invitation revoke/idempotent rejoin, public/owner-only/selected Subrooms, access-loss recovery. `verify-room-lifecycle.ts` passes against Development including actual Ably old-token rejection, renewal/removal serialization and provider-failure rollback; exact temporary DB Room cleaned. Real A/B browser lifecycle and selected-member suites pass; B restored to QA Room with A, children Gaming/Trip Planning/Budget Secret/Selected QA retained. Fresh build/TS/lint/diff and MS6A database regression pass; final Chat UI regression precedes local checkpoint. No schema change. Latest local start session `99339`, port 3000. Harness fixes: wait for enabled controls/settled scrolling/Room header after joins; preserve null eval results. Normal reload recovered transient Clerk refresh/blank state, no auth bypass. Full-wave no-dead-core-control inventory is in `docs/MS7-1-STRESS-RESULTS.md`; Hall Archive/Restore/moderation, history/latency and final all-context sweep remain release blockers. Next slice is Hall recovery/moderation, not MS7.2. No push/deploy, no Art/Web changes.

MS7.1 recovery update: `.2` committed locally as `eda4451` after final A/B Chat reaction/edit/delete regression passed; main ahead of origin by two. `.3` Hall recovery/moderation is uncommitted. New `src/server/hall/lifecycle.ts`, Hall service/action transaction authorization, Board/Archived UI with Restore, disabled reorder boundaries and native Nuke confirmation; no schema change. `scripts/verify-hall-lifecycle.ts` passes and cleans its exact temporary Room. Fresh build/TS/lint pass. Local start session `64357`, port 3000; real A/B `scripts/browser-ms713-hall.mjs` QA currently running. Do not duplicate active browser mutations. Its new notes use `MS713` prefixes inside the existing QA Room. Full-wave gates remain; no push/deploy, no Art/Web work.

**Latest recovery supersedes the paragraphs above:** MS7.1.3 is validated for local checkpoint (`feat: harden MS7.1.3 Hall lifecycle and beta controls`, based on `eda4451`; inspect Git for its exact SHA). Hall author/owner moderation, Board/Archived/Restore, confirmed Nuke, retry-safe creation, transaction reauthorization and scope isolation pass. Real A/B comments/reactions, menu/keyboard/native grip order with reload, archive/restore and pin/unpin preserving Chat pass. Hall Open in Chat is deliberately hidden: fragment-only navigation could not resolve older sources outside the latest 50. No schema changes. Fresh TS/lint/build/diff and Development Hall lifecycle including Personal/Sandbox permissions PASS; exact temporary DB Room/notes cleaned. Existing QA Room and `MS713` browser fixtures remain for full-wave cleanup, not founder data.

Core-control ledger now records IMPLEMENTED / REMOVED / DEFERRED-HIDDEN for the founder list. Desktop/mobile Personal/Room/Subroom/Sandbox Chat/Hall inventory sweep (16 context/viewport checks) PASS; never equate this with complete milestone acceptance. Latest local production start session `95492`, port 3000; retained A/B CLI sessions `ms71-a`/`ms71-b` authenticated, no scripts still running. Browser harness fixes: wait for loaded state and enabled/settled controls; native drag needs actual dragover within the target and an enabled grip after preceding mutation. Earlier blank-session interruptions remain recorded, no auth bypass. Exact next slice: MS7.1.4 bounded history/older loading/scroll and delivery latency, then .5 shared UI and .6 full abuse/regression/cleanup gates. Source-jump control stays hidden unless that slice validates an authorized lookup. No canonical push/deploy or founder-ready claim. Keep Art/Web/unrelated files untouched and unstaged; do not begin MS7.2.

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
