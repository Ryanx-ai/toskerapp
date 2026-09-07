# Tosker Codex handoff

Repository and Git are authoritative. Read this file first when resuming development.

## Active session — final MS6B founder patch in release validation (2026-09-07)

**Previous deployed baseline:** product commit `a3e94a8bee718f4b43a309ed8cedf0c2d9efc168`, pushed to main and deployed READY as `dpl_EG1JiM7p7ANoTPL2K9NrvEUkddCm` at `https://toskerapp.vercel.app/`. Normal isolated Clerk A/B live Personal/Room/Subroom delivery, typing, reconnect and surface unread passed. Scoped Ably tokens/revocation, 55-message recovery, retry, TS/lint/build/DB/security checks passed; that baseline had no schema changes. Connected reconciliation 60 seconds, disconnected 12 seconds; Friends retains manual-status polling. Existing founder-review target uses Development Clerk/Neon/Ably, not a new Production/Preview stack. Current patch evidence: `docs/MS6B-ACCEPTANCE.md`.

The founder approved `docs/MS7-PRODUCT-STRESS-AUDIT.md` and authorized the bounded final MS6B attention/discovery patch, including the small audit fixes. Current patch remains uncommitted until validation completes. Migration `0011_omniscient_northstar.sql` is applied to Development (12 migrations / 44 foreign keys): notification-list acknowledgement and destination unread are separate. Canonical private-feed refresh now updates navigation and Friends; a single-actor in-memory response cache retains attention across navigation without becoming durable authority. Hall recipients recheck membership/Subroom access. Friends has contained discovery, explicit relationship states, shared pink attention and dark focus/modal primitives. Preserve the identity recovery/Online/dedup/nickname audit fixes.

Fresh TS/lint/build, schema, Chat/shared-state/invariant, Ably authorization and independent-attention suites pass. Two new isolated Clerk QA users (`tosker.lock.0907.a+clerk_test@example.com`, `tosker.lock.0907.b+clerk_test@example.com`) verified request/accept convergence, new Personal rail appearance, active Chat clearing, Hall/list independence, Room/Subroom isolation, search states, responsive 1440/390/320/720 widths and private nickname. Browser QA caught and fixed an authenticated new-conversation transition incorrectly falling back to Sandbox/sample content; unresolved authenticated navigation now shows a neutral loading state. Exact test fixtures remain for the live smoke and must be cleaned afterward. Next: finish final browser/recovery checks, explicit-file commit/push, canonical deployment and live two-user smoke; record release before locking MS6/MS6A/MS6B. **Do not begin MS7.** Unrelated Website/Art docs and experiments remain unstaged; `toskerArt/` untouched/untracked.

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
- Canonical Development app: <https://toskerapp.vercel.app/>. MS6A product release `dpl_B9FBLZhWr4weR3cuYWbJQp9frJrN`, READY, commit `f6ada068`; HTTP 200, authenticated smoke and runtime-error scan passed. Subsequent documentation-only Git deployments may have newer IDs without changing product code. Evidence: `docs/MS6A-CLOSEOUT.md`.
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
3. Inspect latest Git/deployment; MS6A is deployed and landing integration is the current release slice. The canonical alias still uses Development services.
4. Do not touch `toskerArt/`.
5. Follow the active session and landing release record above. Never mix unfinished realtime into the landing release. Stop at the provider account/resource gate; do not begin MS7.
