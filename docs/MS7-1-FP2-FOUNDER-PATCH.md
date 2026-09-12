# MS7.1-FP2 — founder walkthrough patch

2026-09-13. Gate 2 execution authorized from `77cb301`; MS7.1 remains founder review, not locked. No MS7.2. Preserve unrelated Art/Design Hub/Web/research/experiments WIP.

## Slice A — invitation foundation (validated)

Additive Development migration `0014_fp2_invitations`: legacy/direct/share kind, declined status, encrypted share token, one pending share per Room, one pending direct per Room/recipient, notification invitation reference and narrow actor/operation rate counters. Existing rows stay legacy; no global revocation or membership changes. Verified 15 migrations/48 FKs. No message/history/transport changes.

Direct invitations: current member sends accepted Friends (up to ten) or one exact normalized username; recipient accepts/declines. Pending grants no membership/participants/Ably. Existing membership-grant helper reused under Room lock. One notification per newly created invitation; duplicate retry does not duplicate it. Seven-day direct expiry. Owner can cancel any pending invite; inviter can cancel their own direct invite.

Share: owner-only 1h/24h/7d (UI default24h). AES-256-GCM with random nonce, Room/invite authenticated binding; hash verifies presented tokens, encrypted token only supports authorized owner recovery. Same Room lock serializes generate/revoke/join; membership survives revoke. First explicit new generation supersedes pending unbound legacy links in that Room, not recipient-bound direct invitations. Legacy accepted links retain their previous single-recipient contract.

`ROOM_INVITE_ENCRYPTION_KEY` newly generated, installed in gitignored `.env.local` (0600), Vercel Production review target (sensitive), and Vercel Development. Values never printed. No Preview target provisioning. Dedicated key must be isolated/rotated deliberately when genuine environments separate; do not replace it casually or reuse provider credentials.

Narrow limits: lookup30/minute, share6/minute, direct30 recipients/hour per actor. Failed attempts consume quota; fixed one-row actor/operation counters avoid request-log growth. Client debounce is not authority. Broader anti-abuse/Room-wide quotas remain backend debt.

Fresh first service suite PASS: crypto recovery/AAD/tamper; exact scoped lookup; outsider/recipient/member negatives; no pending data/token; duplicate direct invite/notification; accept retry; decline/cancel; reusable share to two recipients; concurrent generation; expiry/revoke/supersede; legacy replacement preserves direct invitations; removed-inviter denial; atomic limits. Tests use isolated non-login `fp2-qa` users; fixture retained until acceptance.

Exact service fixture: Room `e44ceb92-b1d5-4375-bd13-28a836af5d3c`, conversation `7d308cac-7b35-4acf-bb01-89ad98eaec5b`; owned users `d7b21474-9b0e-4744-b05d-030bc2f26ff4`, `0cc1e8c5-7b27-4873-b241-16ad877eb856`, `a8e80815-9e2d-4604-8215-efacdb3ea8f2`, `91c99920-ac79-496b-88d6-c2b6d59167e0`. No founder user modified. Cleanup not yet performed.

## Remaining gates

- Slice A fresh TypeScript, scoped ESLint, migration/check/verification and diff PASS. Additional real DB join-first/revoke-first/concurrent join-revoke and legacy compatibility PASS. Save coherent foundation checkpoint; no push/deploy until assembly.
- B: people-first/select/recipient response + share management; two isolated authenticated users.
- C: deterministic legacy order normalization + owner shared reorder, stale-write guard, sidebar/settings and browser tests.
- D: rolling ≤2-minute consecutive ordinary-message presentation groups; retain individual events/ack/bell/attention/toasts; mentions/Hall/requests/invites separate.
- E: explicit Development-only deferred controls; assembled service/browser/320/390/430/768/1440/keyboard/build/security/runtime gates.
- Exact owned QA cleanup/invariants, push/deploy exact SHA and small live A/B smoke. No release yet.

Notification-history scaling and broad abuse operations remain MS7.6/backend debt. Attachments P-001, calls/translation, roles/lifecycle, MS8 redesign, Pages/Gizmos and Art stay outside FP2.
# Slice B — local two-user invitation gate (2026-09-13)

PASS with isolated normal Clerk A/B sessions: fresh Room creation without automatic bearer link; accepted Friend selection, pending recipient Room route404, decline, exact normalized username/one result, duplicate disabled state, owner cancellation and recipient Cancelled, accept→membership→B message delivered to A, member state on reopen. Owner share defaults24h, selects1h/7d, renders actual QR, copies/reopens identical link, replaces/denies old link, member sees no share controls, B leaves/rejoins with valid replacement, revoke removes active UI/denies bearer while membership stays.

Retained browser fixture: Room `9d2a70a7-9983-434a-b572-842706a740df`, slug `fp2-invitation-review-039009`, primary conversation `bf6069cb-fc35-45bd-9736-0724ad3e43e9`, message `c8e48353-6dc2-44dc-9c1c-cd872b3afd5a`. Existing real A/B users preserved. Use `scripts/browser-fp2.mjs`; resume modes record interrupted harness steps, not extra feature requirements. Local Next explicit127 binding failed; default binding resolved, normal Reload workspace recovered A's existing Clerk session. Harness corrected label syntax, asynchronous management wait and scroll-before-click. Actual copy confirmed. Fresh TypeScript/full ESLint/diff-check passed; final assembled production build/responsive/keyboard/live gate still outstanding. No push/deploy.
