# Tosker Codex handoff

Repository and Git are authoritative. Read this file first when resuming development.

## Current milestone

MS5 — Identity + Persistence + Real Chat. MS5.5 is the final hardening/founder-readiness checkpoint. Do not begin MS6 and do not deploy MS5 to production without founder approval.

## Checkpoints

- MS5.0A `882d779` — backend foundation
- MS5.0B `3cd6e33` — Development Neon database
- MS5.1 `d3b7c89` — Clerk auth, User/Profile/TID/Sandbox
- MS5.2 `957953e` — Rooms, memberships, invitations
- MS5.3 `1d96553` — persistent conversations/messages
- MS5.4 `9db7257` — Friends, Hall, Room capabilities, notifications
- MS5.5 — this final hardening checkpoint; inspect `git log -1` for its hash

## Environment and release boundary

- Development database: Neon `neon-byzantine-jacket`
- Development auth: Clerk Development
- Canonical production: <https://toskerapp.vercel.app/>
- Production stays on MS4.1 `ef84e8835cef243079799bf62c3fad42f817f3cd`
- Preview and Production databases are not provisioned.
- `toskerArt/` remains untracked, untouched, and unintegrated.

## Verified state

Two separate Clerk users have stable canonical Profiles, distinct TIDs and one Sandbox each. They share one persistent Room as owner/member, retain membership through authentication, share Room and personal messages in both directions, retain one canonical personal conversation, have one accepted connection, share a Hall-native note and pinned-message reference, and retain unique installed Room capabilities.

See `docs/MS5-HARDENING.md` for the source-of-truth, authorization, security, interaction, Hall, known-limit, and MS6 handoff contracts. See `docs/MS5-FOUNDER-WALKTHROUGH.md` for the local walkthrough.

## Recovery

1. Run `git status` and `git log --oneline -8`.
2. Preserve all completed checkpoint commits; do not squash or amend them.
3. Keep production on MS4.1 until founder approval.
4. Do not touch `toskerArt/`.
5. Stop after founder review preparation; do not begin MS6.
