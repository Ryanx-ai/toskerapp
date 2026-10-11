# MS7.4 Live coordination architecture

## Implemented ownership amendment — 11 October 2026

Founder approved the local3–5h extension. Application `8683263` replaces page-owned SDK lifetime with a persistent authenticated-workspace owner. This supersedes the historical ownership stop gate below. The layout owns one lazy SDK, pages acquire cancellable exact-context leases, and cleanup/reauthorization serialize. Current actor/session and authorization lease are checked before/after token I/O; immutable SDK identity is never switched in place. A retired owner requires a fresh document. Dynamic context capability changes use existing `auth.authorize()` on the same SDK, with old channels drained first. See [Ably token authentication](https://ably.com/docs/auth/token?lang=javascript) and [identified clients](https://ably.com/docs/auth/identified-clients).

No vendor edits or global listener interception. Actual browser metrics now distinguish Ably2.28's unauthenticated `checkWsConnectivity()` probe (`node_modules/ably/src/common/lib/transport/connectionmanager.ts`, platform `wsConnectivityCheckUrl`) from an authenticated realtime connection; exact probe host with no query only. Raw connection events omit URLs/tokens. Resource gate passes zero growth after20cycles. Identity/session fences, true600s token renewal, context transitions, revoked scopes and actual UI logout are covered in the [final local ledger](MS7-4-EXECUTION.md).

Local Founder Walk candidate only: join/peer p95 remain3.84/4.17s, above the proposed2s goal. Long-outage recovery requires explicit reload/rejoin. Reconnect profile refresh can cancel an immediate navigation; settling/retrying is a known limitation, not a fixed gate. Retained-data comparison has an explained two-QA-read-timestamp exception, never a rewritten baseline. No canonical cutover is authorized; no media/email/location implementation or new infrastructure.

10 October 2026 · Checkpoint A · **Architecture complete; implementation awaits founder approval.** Canonical remains locked MS7.3 FP8 `35a6f86`. This decision record recommends one local FP1 slice, not media, email or deployment procurement.

## Decision and execution gate

Build **Live presence foundation**: intentional Join/Leave, real authorized participant names/avatars, connection recovery and expiry. Selecting Live alone must not announce participation. Existing Tosker presence does not already provide this: the Live panel is synthetic, typing is transient conversation activity, and profile status is manually chosen.

Use the existing Ably connection and context authorization. Do not add a second realtime connection, database presence heartbeat service, background worker or paid provider. No schema migration is expected for provider-managed ephemeral presence. Keep a small Live adapter separate from future media so audio/video can later be added without changing what Room membership means.

**Estimate: 9–12 engineering hours after the capability dependency is resolved**, excluding founder response time and physical-device availability. This exceeds section18's eight-hour gate. Stop at A; B–E are not started.

| Work after approval | Estimate |
| --- | --- |
| Scoped token/profile boundary, revocation/logout design and tests | 2–2.5h |
| One-connection presence adapter and lifecycle/race handling | 2–2.5h |
| Replace synthetic Live panel with real, accessible states | 1–1.5h |
| A/B, disconnect, multi-tab, revoked/forged/context isolation tests | 2–2.5h |
| Responsive/performance, full regression/build/secret scan and checkpoint | 2–3h |

A 4–6h estimate would omit required authorization and lifecycle acceptance. No scope was added to justify the extension: the estimate excludes voice, camera, coordinates, email and new infrastructure.

## Existing system and reuse

| Area | Observed implementation | FP1 consequence |
| --- | --- | --- |
| Live | `src/components/live-preview.tsx` explicitly labels synthetic participants; mic/camera/PTT controls only change local booleans | Replace this surface; do not present toggles or speaking as real media |
| Realtime | `use-conversation-realtime.ts` owns one Ably modular connection, private to the hook; subscribes to user/conversation feeds and typing; closes on context cleanup | Extend this owner with a Live adapter; avoid duplicate clients and whole-workspace refresh on every presence change |
| SDK | Installed Ably exposes `RealtimePresence`; current modular import omits it | Existing dependency can support presence; no SDK replacement required |
| Token issuance | `src/server/realtime/auth.ts` fixes clientId to authenticated user, ten-minute TTL, exact channels; actor advisory lock and current scope lock before issuance | Add only exact Live channel permissions after existing authorization; no browser API key or wildcard token |
| Revocation | Room withdrawal and selected-Subroom/Personal revocation serialize against issuance and revoke actor tokens before committing | Reuse this path; Live must clear roster/intent on access denial, not just hide controls |
| Contexts | `map-pins/scope.ts` verifies current Room membership, exact child grant, accepted two-person relationship, or Sandbox ownership | Reuse strict predicates; a stale participant row alone is insufficient |
| Identity | `profiles/projection.ts` masks optional profile details/status server-side | Fetch authorized basic display identity; do not trust presence payload names/avatar URLs or expose hidden profile fields |
| Workspace | `messaging-app.tsx`, `workspace-surfaces.ts`, `use-chat-companion.ts`: URL selects primary surface; Chat companion at width>=1100; mobile singular | Preserve controller. Existing Sandbox deliberately disables Live; retain that UX and deny peer access to its context |
| Chat and attention | Idempotent send receipt and message/mention insert precede best-effort invalidation; notifications exclude sender; destination acknowledgment differs from list acknowledgment | Do not redefine unread, fabricate message delivery from presence or mark Chat read just because Live is open |
| Map privacy | FP8 Locate and location-attached Pings remain private; provider routing consent is separate; existing Route invalidations reconcile authorized DB state | No coordinates, accuracy, routes or destinations in Live presence payloads |
| Limits | Typing throttle2s/expiry5s; existing Geoapify search/road actor and daily guards; token endpoint has no explicit Live admission rate limiter | Leave map quotas unchanged; new Live lifecycle must be bounded and measure reconnect/token activity |
| Logout | Clerk `SignOutButton`; realtime cleanup closes connection on unmount; no explicit Live/session revocation flow | Test normal logout and stale-token behavior; do not claim Clerk logout automatically revokes an already issued Ably token |

### Verified capability dependency

A server-only, token-only probe resolved isolated QA A and the existing authorized `ms73-qa-bfff9475` primary conversation through the database and `scopeForConversation`. It requested **only** `presence` and `subscribe` on that exact proposed `tosker:live:<conversationId>` channel, TTL60s. Ably returned **subscribe only**. No connect, enter, publish, fixture mutation or provider configuration occurred; token/key values were never printed or saved. The disposable token expires automatically.

This demonstrates that the tested local credential cannot currently grant the needed presence operation; successful token issuance alone is not a successful presence test. It does not certify every other environment's key. Ably caps derived tokens at issuing-key capabilities. Existing published documentation also describes the earlier key as publish/subscribe only. [Ably capabilities](https://ably.com/docs/auth/capabilities).

**Required founder decision:** authorize a narrowly scoped presence capability on the existing server credential for `tosker:live:*` (retaining existing unrelated grants/restrictions, Free plan and budgets), or provide an existing correctly scoped credential through the secret workflow. First inspect the actual dashboard/API capability model; do not broaden all channels or silently rotate keys. This is a permission expansion, not approved by this audit. If the account UI cannot represent the narrow grant safely, return for a decision rather than relaxing it. No new paid service is needed for FP1.

## FP1 selection

| Criterion | Live presence | Voice/video now | Email notifications now |
| --- | --- | --- | --- |
| User value | Real shared participation | Rich coordination, much broader | Useful away-from-app awareness |
| Effort | 9–12h including required gates | Multiple implementation waves | New consent/delivery lifecycle |
| Infrastructure cost | Existing Ably allowance, bounded additional events | Media minutes, transfer, possible TURN | Sending plus reliable job delivery |
| Privacy risk | Participation and identity only | Microphone/camera exposure | Private content and email disclosure |
| Reuse | High: auth, connection, profiles, surfaces | Auth/UI reusable; transport new | Attention reusable; delivery/consent new |
| Mobile reliability | Test sleep/reconnect and explicit rejoin | Additional permission/audio/background constraints | Browser-independent delivery; preference UX needed |
| A/B testing | Direct deterministic roster assertions | Devices/network/audio capture matrix | Mailbox/webhook/retry tests |
| Reversibility | Remove Live adapter; no retained presence data | Provider and session integration | Opt-in/out, outbox and suppression data |
| Extensibility | Stable context/session boundary | Premature before lifecycle proof | Separate capability, not prerequisite for Live |

## Proposed lifecycle and UX contract

Target users are friends or small groups coordinating in an existing Room on desktop or mobile. The key UX promise is knowing who intentionally joined without implying a call, tracking or global online status. Copy: “Join Live”, “Leave Live”, “Reconnecting”, and “Connection lost. Join again.” Explain once that FP1 shares presence only. No mic/camera permission prompts or fake speaking/muted states.

The exact opaque conversation ID is the session context; no independently forgeable Room/session pairing. Provider members are identified by authenticated clientId and connectionId. Deduplicate tabs by user for display, while retaining connections internally so one tab leaving does not remove another joined tab. Names/avatars come from a bounded, current-authorized server projection; unknown/revoked IDs are not rendered. Payload contains only a small version marker, never client-supplied identity, messages or coordinates.

Use provider-managed presence and its synchronized set, not an independently accumulated event history. A presence `get()` on the attached realtime SDK uses its synchronized local set. Short disconnect grace and recovery are provider features; verify actual timings against the installed SDK/account. Current docs describe abrupt-disconnect presence grace of15s, while connection recovery can retain state for longer; **do not equate those two clocks**. [Presence](https://ably.com/docs/presence-occupancy/presence?lang=javascript), [connection recovery](https://ably.com/docs/connect/states).

| Event | Proposed behavior |
| --- | --- |
| Open Live | Authorized roster observation only; NOT JOINED. Subscribe without entering. Opening another surface never joins |
| JOIN | Intentional one-click action; serialize in-flight join; enter exact current channel; CONNECTED only after acknowledgment. Duplicate clicks idempotent |
| LEAVE | Clear local joined intent immediately; send leave, detach Live observation when no longer needed. Failed network leave relies on bounded provider expiry, not a false global-success claim |
| DISCONNECT | Show reconnecting/uncertain state, not a stale “everyone connected” roster. Keep intent only during a short bounded reconnect window |
| RECONNECT | Same current context + retained intent + successful current authorization can restore; use SDK synchronized set and operation generation to reject late results. No double automatic re-entry plus manual enter |
| SESSION EXPIRE | After failed bounded recovery (proposed maximum30s), clear intent and require Join again. Ten-minute token renewal is not new consent; renewal denial clears state |
| MEMBERSHIP REVOKED | Existing server revocation prevents continued authorized access; clear roster/intent and return to allowed surface. Reconnect cannot restore revoked membership |
| TAB SWITCH | Switching Live to Map/Board/Chat leaves Live in FP1. Chat companion on desktop can remain without leaving the Live primary surface |
| PAGE HIDDEN/CLOSE | Hidden/background page leaves for FP1; foreground requires Join again. Pagehide/unmount attempts leave and connection cleanup; crash/no-network requires provider expiry. Do not rely on unload delivery |
| REFRESH | No stored autojoin flag; return NOT JOINED after old connection cleanup/expiry |
| LOGOUT | Clear intent and leave/close before signout where possible; verify cleanup when signout comes from another tab. A proposed server revocation step must use the issuance lock and handle failure honestly |

Logout needs particular care: existing clientId revocation affects that user's other realtime sessions too, which can reauthorize from still-valid Clerk sessions. Decide and test that tradeoff before integration; a session-scoped token identifier is an alternative but would add scope and must not appear silently. An application-controlled leave is not proof that a previously issued bearer token is unusable. No permanent Live history or new joined-state table is proposed.

Bound asynchronous operations by context generation so a late join after Leave/navigation is removed, never resurrected. Cleanup must remove connection, channel, document and window listeners and timers. After the30s recovery window, no background rejoin loop. Use existing backoff transport behavior rather than a new polling loop. A paused/hidden phone must not look actively joined indefinitely.

## Active coordination after FP1

Reuse Route/Map invalidations for current authorized content. Later, an opt-in compact activity indication can identify meaningful route changes without copying chat bodies or coordinates into presence. Batch repeated order changes; do not convert every edit into a notification. Invite-to-Live is a separate authorized event, not automatic join.

Live presence only tells peers who intentionally joined that context. It grants no permission to reveal private Locate position, routing origin or location-attached Pings. Continuous sharing would need separate explicit, revocable, context-specific consent, audience display, expiry and immediate stop/revocation behavior. That is not FP1 and no new realtime infrastructure is justified for it now.

## Future media decision

Ably may carry signalling but is not an audio/video transport. A peer mesh of n users has n(n−1)/2 peer connections and up to n−1 outbound copies per sender; at8 users that is28 peer links and7 outbound copies each. That engineering scaling model makes mesh an unsuitable default for Tosker groups. TURN relay operation and mobile uplink/battery still need funding even with browser WebRTC.

Prefer a separately approved managed SFU evaluation when voice is requested. An SFU forwards selected media streams; it avoids every user uploading a copy to every peer. Self-hosting an SFU adds server, region, TURN, scaling and operational responsibilities. [LiveKit SFU architecture](https://docs.livekit.io/reference/internals/livekit-sfu/).

| Candidate | Current published cost boundary | Recommendation |
| --- | --- | --- |
| LiveKit Cloud | Free Build: 5,000 WebRTC minutes, 50GB downstream, 100 concurrent participants; free allowance is a hard cap shared across a user's free projects | First future bounded media-evaluation candidate, subject to founder procurement and privacy review |
| Daily | 10,000 free participant-minutes; published base video $0.004/participant-minute, audio-only $0.00099; video once changes session billing; no hard stop after free allowance | Credible alternative, but explicit spending control needed before trial |
| Self-hosted SFU / mesh | Hosting, transfer, TURN and operations; no honest zero-cost assumption | Not appropriate to add to FP1 |

Sources: [LiveKit pricing](https://livekit.com/pricing), [LiveKit quotas](https://docs.livekit.io/deploy/admin/quotas-and-limits/), [Daily pricing](https://www.daily.co/pricing/video-sdk/). These are published offers, not Tosker accounts or purchases. Example workload:6 people ×30min ×20 sessions =3,600 participant-minutes; bandwidth, recording and extras are separate. No recordings/transcripts are proposed. An SFU does not by itself establish end-to-end encryption or an approved retention policy; review regions, metadata, DPA and encryption before procurement.

Future capture requires secure context and explicit browser permission. Handle denial, no device, ignored prompts, revoked permissions and stale permission grants. Always stop every local media track on Leave/logout/unmount; a late permission result after Leave must be stopped too. [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [track.stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop). Test real iOS Safari/Android Chrome, audio playback gesture restrictions, interruptions, Bluetooth/headset changes and background suspension before promising mobile calls. None of this capture is implemented in FP1.

## Notification foundation

Current message sends create recipient notifications inside the successful DB transaction, excluding the author; accepted send receipts suppress retries. Mentions have persisted validated targets. Muting/unread/banner preferences already exist, but are not email consent. Hall attention filters current scoped membership. Canonical reads reauthorize; a historical notification row is never authority to disclose content. Map changes currently provide invalidation, not a durable email event stream.

Tosker's local user/profile schema and bootstrap do not persist email. Clerk may hold email, but availability and verification must be checked server-side for the current account at opt-in and delivery. Do not assume all accounts have a verified deliverable primary address or expose it to peers.

Recommend **opt-in batched mention/message email first, in a later slice**. No email provider or delivery code in FP1. Propose separate preferences by event and context, off by default; honor unsubscribe, mute policy and quiet hours. Default content should be generic (“You have new activity in Tosker”) with an authenticated destination link, not Room names, message excerpts, location, route geometry or participant lists in email.

| Event | Proposed future policy |
| --- | --- |
| Chat message | Opt-in digest after inactivity; suppress self, already-read activity and repeated retries |
| Mention | Optional higher-priority bucket, still batched/rate-limited; never bypass global unsubscribe |
| New Map destination | Context opt-in digest only, reauthorize source at send |
| Route changed | Coalesce to latest meaningful revision; avoid every drag/order event |
| Live invitation | Explicit invitation from an authorized member; rate-limit sender/recipient; not autojoin |

Use a durable transaction outbox and unique event+recipient+channel keys. A bounded scheduled dispatcher would claim jobs, recheck current Room/Subroom/accepted-Personal/Sandbox access, preferences, verified email and read state, then send through a replaceable provider adapter. Revoked/deleted contexts and unsubscribed recipients are cancelled. Provider timeouts require idempotency, capped exponential retry and dead-letter visibility, not silent repeated sends. Provider idempotency is supplementary to the durable DB record. Signed webhook verification and event deduplication handle delivery, bounce and complaint suppression. A signed unsubscribe endpoint must work without login and immediately suppress pending deliveries. New schema, job runner and cutover require separate approval.

| Provider | Published boundary | Recommendation |
| --- | --- | --- |
| Resend | Free3,000 emails/month,100/day; straightforward email API | Preferred bounded future evaluation if founder approves sender-domain/DNS work and hard application caps |
| Amazon SES | À-la-carte outbound $0.10/1,000 plus data/add-ons; other plans differ | Lower unit-price alternative, with AWS permissions, sender verification and deliverability operations to assess |

Sources: [Resend pricing](https://resend.com/pricing), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [SES pricing](https://aws.amazon.com/ses/pricing/). At1,000 monthly sends, SES base sending arithmetic is$0.10 before data/other fees; Resend fits its monthly allowance only if the100/day cap is also respected. Neither is provisioned. Domain ownership, SPF/DKIM/DMARC, suppression, retention and budget approval precede delivery. Email-foundation work is not hidden inside the Live estimate.

## Acceptance plan and operating budget

No new MS7.4 QA fixtures were created during architecture. Future collaborative fixtures must resolve TID `8V3X7P1` exactly server-side, stop on zero/multiple matches, include founder alongside isolated A/B, and record exact ownership. Preserve both retained MS7.3 Rooms and all founder data. Do not reuse protected content for destructive tests.

1. **C / authorization:** normal Clerk A/B join/observe/leave; duplicate joins and two tabs; forged context IDs/client IDs/payloads; cross-Room, selected Subroom, accepted/revoked Personal and owner-only Sandbox denial; issuance vs withdrawal race; disconnect both clients; late acknowledgment after leave/navigation; token expiry; logout and stale-token handling. Actual provider test must fail if requested presence was silently omitted. No mock-only claim of provider acceptance.
2. **D / interface:**320/390/430/768/1440/1728 and short landscape; real long names/empty/one/many participants, wrapped controls and no overflow; keyboard/focus, screen-reader names/status announcements,44px touch targets, reduced motion. Preserve desktop companion and mobile singular surface. Inspect rendered pages, not just component dimensions.
3. **D / measurements:** collect join-to-ack and peer-update latency, reconnect latency, expiry time, token requests, inbound/outbound counts, memory/React commit changes and listener/channel counts. Compare against same-browser idle baseline. Proposed local QA targets: connected join/peer p95<2s, reconnect after network restoration<10s, no indefinite ghost beyond the measured provider grace, no growing listeners/heap after20 join/leave/context cycles. Report sample size/network and failures; these are acceptance targets, not measured results or SLAs.
4. **E / release candidate:** TypeScript, lint, production build, exact migration/catalog/ownership audits, existing Chat/Board/Map auth regressions, secret/client-bundle scan and diff check. No production migration, deployment or unfinished push. Record exact SHA and fixture inventory for founder review.

Ably's published Free allowance is6M messages/month,200 concurrent connections/channels and500 messages/sec; the actual account's remaining usage must be checked before live QA. [Free package](https://ably.com/docs/platform/pricing/free). One extra Live channel per active context, one existing connection per workspace tab, tiny payload, no application heartbeat polling. Presence fan-out grows with subscribers; proposed single-wave QA cap10,000 delivered events,2 actors plus founder, bounded20 lifecycle cycles, stop on quota/auth/reconnect storm. Actual event accounting and provider dashboard availability remain acceptance work. No Geoapify calls needed. No changes to approved map or other provider budgets.

## C/D implementation findings — 11 October 2026 SGT

The founder approved the local9–12h wave and narrow presence permission; the historical approval request below is superseded. See the execution ledger for current evidence and the **transport-ownership stop gate**. Core A/B behavior works, but the inherited page-owned Ably client retains global handlers across route remounts. A stable authenticated-workspace owner requires a separately reviewed lifetime/lease refactor before D/E can pass. Estimate3–5 additional local hours; no canonical permission.

Measured abrupt-offline peer expiry was about58.6s including provider disconnect detection, not the nominal presence grace alone. Extended outage can require the existing explicit workspace reload before a new Join; do not claim seamless recovery. Join/peer p95 currently3.34s/3.67s, above the proposed2s target. All authorization/privacy checks still fail closed. Application presence has no persisted history; provider-managed ephemeral state/retention is distinct and remains subject to provider terms.

## Risks and founder review (historical checkpoint A)

Key risks are the missing presence grant, the shared hook's lifecycle ownership, logout/session-token behavior, background-mobile expiry, profile visibility and provider fan-out. No FP1 A/B, responsive or performance result is claimed yet. All existing FP8 evidence belongs to locked MS7.3, not this unimplemented feature.

Approve a9–12h local implementation wave and the narrow existing-Ably capability change to proceed. If denied, retain this architecture checkpoint without substituting fake presence or homegrown polling. Canonical remains FP8 regardless; later deployment needs its own approval.

After implementation, founder walkthrough: open Live without joining; see another authorized QA actor join; join and verify both rosters; leave; switch to Map/Board and confirm departure; toggle network/refresh/logout and inspect recovery; check mobile single-surface/desktop Chat companion; confirm no mic/camera prompt, coordinates or hidden tracking. At checkpoint A this checklist is pending, not ready to execute against canonical.
