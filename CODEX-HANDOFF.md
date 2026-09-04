# Tosker Codex handoff

Repository and Git are authoritative. Read this file first when resuming development.

## Current milestone

MS5 — Identity + Persistence + Real Chat. MS5.0.1 founder closeout is complete; do not begin MS6 until founder review is complete.

## Checkpoints

- MS5.0A `882d779` — backend foundation
- MS5.0B `3cd6e33` — Development Neon database
- MS5.1 `d3b7c89` — Clerk auth, User/Profile/TID/Sandbox
- MS5.2 `957953e` — Rooms, memberships, invitations
- MS5.3 `1d96553` — persistent conversations/messages
- MS5.4 `9db7257` — Friends, Hall, Room capabilities, notifications
- MS5.5 `9278aaf` — hardening and founder-review preparation
- MS5.0.1 — final founder patch; inspect `git log -1` for the checkpoint hash

## Environment and release boundary

- Development database: Neon `neon-byzantine-jacket`
- Development auth: Clerk Development
- Canonical founder review: <https://toskerapp.vercel.app/>
- Preview and Production databases are not provisioned.
- Production remains the locked MS4.1 application; do not connect production infrastructure or deploy without founder approval.
- `toskerArt/` remains untracked, untouched, and unintegrated.

## MS5.0.1 contract

- `conversation_reads`, Hall color/order/archive fields, and notification conversation links were migrated to Development Neon.
- Recipient-only message, friend, and Hall notifications are durable; opening Chat or Hall marks that surface's activity read.
- A 12-second authenticated foreground polling bridge refreshes activity and Friends requests and shows one restrained in-app toast for new incoming activity. It is temporary MS5.0.1 delivery infrastructure, not realtime.
- Demo Mode is signed-out only, deterministic, local prototype state. It never reads or writes authenticated Neon state and is marked quietly in the shell.
- Hall notes support curated colors, persisted move controls, Archive, and confirmed Nuke. Pinned Chat references support Open in Chat, Move, and Unpin while preserving the source message.

## Verified state

Two isolated Clerk users have stable Profiles/TIDs/Sandboxes, shared Room membership, durable Room and personal messages, canonical personal conversations, Friends, Hall notes/pins, capabilities, notifications, unread indicators, and authorization boundaries. Database audit and MS5 smoke scripts pass.

## Known MS6 debt

Realtime delivery/reconciliation, presence, typing, read receipts, offline queue, replies/reactions persistence, attachments, notification preferences/channels, Hall depth, and Gizmo runtimes remain deferred. Do not implement them in this milestone.

## Recovery

1. Run `git status` and `git log --oneline -8`.
2. Preserve completed checkpoint commits; do not squash or amend prior milestones.
3. Treat the canonical deployment as the MS5.0.1 development prototype pending founder walkthrough.
4. Do not touch `toskerArt/`.
5. Stop after founder review preparation; do not begin MS6.
