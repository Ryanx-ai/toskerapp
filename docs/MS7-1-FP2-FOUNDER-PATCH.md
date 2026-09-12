# MS7.1-FP2 — founder walkthrough patch

2026-09-13. Gate 2 execution authorized from `77cb301`; MS7.1 remains founder review, not locked. No MS7.2. Preserve unrelated Art/Design Hub/Web/research/experiments WIP.

## Slice E / assembled acceptance — 2026-09-13

Implemented explicit Development-stage Call/Video header or mobile-menu disclosures (not Sandbox), Files & images in composer/Hall editor, and Translate in message menus. Exact founder debt strings are centralized in `DeferredControl`; native buttons expose the same information on hover, focus and touch. No picker, permission, service call, success simulation or mutation. Escape dismisses the nested explanation first and returns focus; leaving/refocusing allows it to reappear. Real actions precede mobile deferred entries to avoid autofocus obscuring the menu. Before Beta, revisit visibility and remove engineering milestone language. Design skills kept this within existing Tosker surfaces/focus patterns, not MS8 redesign.

Fresh assembled evidence: TypeScript/ESLint/production build; 15 migrations/48 FKs; invitation join/revoke races and legacy compatibility; Room lifecycle/Ably-revocation acceptance; Subroom exact-set/stale-owner concurrency; notification burst pure tests and DB attention acceptance; secret scan of tracked/owned source and client bundles. Full initial invitation security suite is inherited from unchanged Slice A, not falsely rerun. Real isolated A/B journey recorded below covers consent/share/messages/order/grouping. Invitation toast copy now says invited to a Room rather than falling through to Hall copy; transport/delivery logic unchanged.

Browser PASS at320/390/430/768/1440: Invite/Friends/exact username/QR/expiry, People/Structure, deferred info bounds, no horizontal clipping. Keyboard PASS: Call/Video Tab and Shift+Tab return, nested Escape/focus, Files/Translate, Hall editor and Sandbox exclusions. Additional existing authorized Personal/Subroom disclosure checks pass without sending or creating records. Screenshots visually inspected for narrow invite, tablet management and grouped Notifications. No physical-device or screen-reader certification.

Harness/runtime limits: stale structural selectors, an obsolete message-scroll selector, accidental0px resume input and browser-session interruptions were corrected/retried; failed runs are not passes. Native automation evaluation can disturb focus, so keyup-boundary assertions observe the actual key result. One restarted session without the retained profile produced a Clerk refresh warning; normal isolated profile restoration recovered without credential/auth configuration changes. Local destination-read settling exceeded an initial30s deadline, then canonical DB/workspace verification passed. No messaging rewrite or claimed instantaneous latency. Recovered browser error scans were empty.

Exact local cleanup completed after acceptance: two recorded FP2 Rooms, six children, five conversations,28 messages,35 notifications and four non-login QA users removed. No application undo. Post-cleanup invariant audit PASS:6 real users/profiles/Sandboxes,2 preserved Rooms,5 Personal conversations,28 unrelated/preserved messages,8 notes/1 pin; no duplicate memberships/TIDs/Personal pairs or orphan pins. Do not force historical counts by deleting unrelated content. The one-shot cleanup and fixture-specific service/browser commands now correctly refuse missing targets; do not recreate them just to rerun. Release/live evidence follows. No milestone lock is implied.

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
# Slice D — notification burst presentation (2026-09-13)

Consecutive ordinary message events group per recipient/sender/conversation/context with rolling≤2m gaps. Individual rows, exactIDs, event-count bell, realtime toast IDs and destination attention remain authoritative. Stable group identity uses earliest eventID, not count/read state. Mentions, differing senders/contexts, Hall/Friend/invite events split groups. Notifications acknowledges exact rendered/filter IDs once per view; arrivals during/after that snapshot stay unread. Foreground/reopening is a new explicit view. No transport, persistence or message pipeline rewrite.

PASS: pure25-row grouping/stable identity/rolling boundary/all separator cases/immutable input; existing database attention acceptance verifies recipient-only exact ack and Chat/Hall/manual separation. Real A sent25 messages through normal Chat; B saw one25-event group, list acknowledgement preserved destination/manual unread. Later26th event joined group but stayed list-unread; real selected mention remained separate/unread. Opening Chat eventually cleared destination/manual marker, independently confirmed in Neon and workspace response. Initial30s local browser check timed out before that convergence; recorded as harness/local settling limitation, not a passed timing SLA. No pipeline fix. TypeScript/scoped lint/diff-check pass; final fresh assembled gate remains.

# Slice C — shared Subroom ordering (2026-09-13)

Owner-only Room-locked service; exact expected/current IDs reject stale concurrent writes and cross-Room/duplicate targets. Safe lazy normalization runs before create/reorder under the same parent lock: position→createdAt→id becomes0..n−1; new children append. Readers use the identical deterministic fallback. No schema columns, visibility/access/parent changes. Non-optimistic UI shows pending then canonical refresh; failure/conflict refreshes authority/order rather than overwriting.

PASS: dedicated service fixture normalization, member/cross-Room/duplicate negatives, concurrent winner/stale rejection, durable positions, unchanged metadata. Three retained service-only children `cf027101-4444-4444-8444-444444444441`, `cf027101-4444-4444-8444-444444444442`, `cf027101-4444-4444-8444-444444444443` in the existing FP2 service Room. Real A/B browser: Alpha/Private/Beta created through owner UI, append order; sidebar Move earlier/native drag; Settings Move earlier; reload persistence; B sees Alpha/Beta relative order without private child or reorder controls. Room Chat remains fixed. New UI uses existing top-layer popover and native keyboard buttons. Harness Settings click required explicit scroll into view; no product defect. Fresh TypeScript/scoped ESLint/diff-check required for checkpoint; final matrix remains outstanding.

# Slice B — local two-user invitation gate (2026-09-13)

PASS with isolated normal Clerk A/B sessions: fresh Room creation without automatic bearer link; accepted Friend selection, pending recipient Room route404, decline, exact normalized username/one result, duplicate disabled state, owner cancellation and recipient Cancelled, accept→membership→B message delivered to A, member state on reopen. Owner share defaults24h, selects1h/7d, renders actual QR, copies/reopens identical link, replaces/denies old link, member sees no share controls, B leaves/rejoins with valid replacement, revoke removes active UI/denies bearer while membership stays.

Retained browser fixture: Room `9d2a70a7-9983-434a-b572-842706a740df`, slug `fp2-invitation-review-039009`, primary conversation `bf6069cb-fc35-45bd-9736-0724ad3e43e9`, message `c8e48353-6dc2-44dc-9c1c-cd872b3afd5a`. Existing real A/B users preserved. Use `scripts/browser-fp2.mjs`; resume modes record interrupted harness steps, not extra feature requirements. Local Next explicit127 binding failed; default binding resolved, normal Reload workspace recovered A's existing Clerk session. Harness corrected label syntax, asynchronous management wait and scroll-before-click. Actual copy confirmed. Fresh TypeScript/full ESLint/diff-check passed; final assembled production build/responsive/keyboard/live gate still outstanding. No push/deploy.
