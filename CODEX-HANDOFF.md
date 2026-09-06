# Tosker Codex handoff

Repository and Git are authoritative. Read this file first when resuming development.

## Current milestone

MS5 — Identity + Persistence + Real Chat. Founder walkthrough **passed foundational multiplayer communication**. Founder-polish implementation is complete and locally validated; canonical deployment verification is the remaining release step. Do not begin MS6.

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
- Founder-polish checkpoint: `polish: refine Hall and MS5 interface consistency`, based on `a412763`. Resolve exact SHA with `git log -1 --format='%H %s' -- src/server/hall/service.ts`.

## Environment and release boundary

- Development database: Neon `neon-byzantine-jacket`
- Development auth: Clerk Development
- Canonical Development app: <https://toskerapp.vercel.app/>. Release evidence: `docs/MS5-FOUNDER-POLISH-CLOSEOUT.md`.
- Preview and Production databases are not provisioned.
- Canonical alias uses the Vercel production target but **Development** Clerk/Neon; the old MS4.1 deployment statement is obsolete. Founder authorized this polish commit/push/deploy. Do not provision production infrastructure.
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

## Known MS6 debt

Realtime delivery/reconciliation, automatic presence inference, typing, read receipts, offline queue, replies/reactions persistence, attachments, notification preferences/channels, Hall depth, and Gizmo runtimes remain deferred. Manual presence is the compatibility contract for a future realtime layer; do not add heartbeat writes or polling beyond the existing foreground bridge.

## Recovery

1. Run `git status` and `git log --oneline -8`.
2. Preserve completed checkpoint commits; do not squash or amend prior milestones.
3. Treat the canonical deployment as the MS5 Development prototype with accepted foundational communication.
4. Do not touch `toskerArt/`.
5. After healthy canonical deployment and smoke, save/complete MS5. Do not begin MS6. Separately requested post-release art feasibility is documentation only; no integration or art generation.
