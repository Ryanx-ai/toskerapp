# MS7.5 Notifications — research / architecture handoff

27 October 2026. **Recommendation only; execution awaits MS7.4 Founder Walk/lock and separate authorization.** No implementation, migration, provider provisioning, permission prompt or push/email credential was added. FP4 release evidence is separate.

## Recommendation

Consolidate the existing in-app attention system first. Keep Neon as authorized durable truth and existing Ably as a content-free invalidation signal, using the current Next.js backend and transport owner. Do not add a second websocket client or build persistent delivery around ephemeral signals. Browser push is a separately consented optional phase after in-app correctness and real-device evidence, not a dependency for MS7.5's first release.

This follows the backend skill's workload-first/existing-framework guidance. No provider migration, dedicated service, new database or unrelated platform expansion is needed for the proposed initial slice.

## Existing substrate, verified by source inspection

| Source | Existing capability / boundary |
| --- | --- |
| `src/server/db/schema.ts` notifications | Recipient-owned rows, actor/source references, mention flag, list `readAt` versus `destinationReadAt`; recipient/time index. |
| `src/server/conversations/actions.ts` | Message plus per-recipient notifications in a transaction; idempotent send receipt; realtime publish follows commit. |
| `src/server/attention/service.ts` | Current Room/Subroom authorization for Board recipients; exact-recipient acknowledgement; list-seen does not imply destination-seen. |
| `src/server/shared-state/actions.ts` | Notification list reauthorizes conversation scopes and filters deleted messages. Current query reads all recipient history: pagination/query-cost debt before growth. |
| `src/lib/mentions.ts`, server mention validation | Explicit intact mention spans and validated targets; do not infer recipients from arbitrary display text. |
| `src/lib/notification-bursts.ts` | Recipient-local presentation grouping for adjacent same-sender/context ordinary messages; mentions remain distinct. |
| `src/components/own-profile-editor.tsx` | Existing banner All / Direct-and-mentions / Quiet; unread/list unchanged by banners; context mutes and mention exceptions; email/push/browser explicitly not connected. |
| `src/lib/notification-href.ts` | Existing source links include historical Hall routing. Audit against current Map-first Chat/Board composition before changes; not a newly verified defect. |

These are source observations, not a new end-to-end notifications certification. Route/group activity coverage must be inventoried; existing trip realtime updates are not proof of durable recipient notification coverage.

## Proposed bounded execution slices

1. Recover exact release and audit event matrix: message, explicit mention, invitation, Board activity, Route update, membership/group activity. Define actor exclusion, audience, source deletion and mute semantics with founder approval.
2. Establish one idempotent recipient event contract (event key + recipient + source revision), transactionally written with the source mutation. Small authorized fan-out only; introduce unique constraints/indexes only after backup/rehearsal and compatibility review. No historical backfill or baseline rewrite without explicit scope.
3. Paginated authorized inbox and incremental reconciliation on initial load, reconnect and invalidation. Cursor ties must be deterministic; deduplicate/reorder safely. A lost realtime signal must not lose durable inbox truth. For post-commit signal retry, assess a bounded outbox using existing infrastructure only after capacity review; do not reuse location retention jobs or call request-local background work durable.
4. Preserve list-seen versus destination-read and conversation unread boundaries; synchronize across tabs/devices. Never mark unseen later events read. Deep links must preserve Map state and open only authorized destinations.
5. Preference matrix: Quiet wins over all banners; define mention exception to context mute; avoid silently changing current unread behavior. Coalesce noisy Route edits, suppress own activity and ensure accessible non-duplicated announcements. No location-derived notification or coordinate/history payload.
6. A/B acceptance and isolated fixtures: Room/Subroom/Personal/Sandbox isolation, removed-member delivery/read denial, invite lifecycle, source Nuke, mute/Quiet/mentions, multi-tab acknowledgement, retry/duplicate/out-of-order events, reconnect and quota exhaustion. Founder TID resolved exactly for every owned collaborative QA Room.

## Privacy and delivery contract to approve

Authorize at creation **and** read/delivery; a stored recipient row is not permanent membership authority. For selected Subrooms, never publish sensitive previews on a parent Room channel. Prefer recipient-scoped content-free invalidation; fetch authorized content server-side. Include only minimally necessary source identifiers, not message bodies or precise location in logs/transport diagnostics. Preserve current user/profile/content records.

Inbox persistence is intentionally different from short-lived location retention. Proposed new-event retention is 30 days for read events and 90 days for unread events, with expired source links suppressed; this is **not approved or implemented**, and must not retroactively delete existing history. Founder must decide retention, historical migration and unread semantics before schema/lifecycle work. Queue outage must not fabricate delivery/read receipts. Retry caps, dead-letter handling, aggregate-only observability and a bounded reconciliation fallback need explicit acceptance. No exactly-once end-to-end claim; use at-least-once processing plus idempotent recipient effects.

## Browser and mobile feasibility

System notifications need explicit user-gesture permission and a secure context; mobile should use a service worker's `showNotification`, not assume the desktop constructor works. Denial/unsupported states must leave in-app notifications functional. [MDN Notifications guide](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API).

Web Push can wake a service worker while a page is not open. Subscription endpoints are sensitive capabilities; bind them to the authenticated user/device, protect writes against CSRF, revoke on logout/account change, expire invalid endpoints, and never expose them in logs. This introduces new retained device data and server credentials and therefore needs a separate privacy/security gate. [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

On iOS/iPadOS, support begins with Home Screen web apps on16.4 and requires direct interaction for permission. Do not promise push from an ordinary uninstalled Safari tab or guaranteed background delivery. No Apple Developer Program membership is required for standards-based Web Push, but existing service/browser limits still apply. Validate actual iOS/Android devices; desktop viewport emulation is insufficient. [WebKit Web Push announcement](https://webkit.org/blog/13878/).

Push previews should default to generic “New activity in Tosker” and reauthorize destination on open. A notification already displayed on an OS lock screen cannot be recalled reliably after membership revocation. No precise location or private message preview by default. Native mobile push, email and SMS remain out of the initial scope.

## Capacity model — not procurement approval

Registered users are not concurrent sockets, online recipients or notification volume. Ably's current Free page lists200 concurrent connections,500messages/second and6Mmessages/month; current account dashboard also showed200channels. Account-level usage from all features and tabs must be included, not merely this model. [Ably pricing](https://ably.com/pricing/).

Illustrative assumptions:10 relevant actions per registered user/day,4 recipient notifications/action, one realtime publish and4 deliveries/action,30days. This simplified upper-active-user model is a planning estimate, not the provider's final bill or a measured load test.

| Scenario | Source actions/day | Recipient rows/day | Approx. publish+delivery units/month | Simultaneous users × tabs |
| --- | ---: | ---: | ---: | ---: |
| 200 registered, all active daily | 2,000 | 8,000 | 300,000 | 20 × 2 = 40 sockets |
| 1,000 registered, all active daily | 10,000 | 40,000 | 1,500,000 | 100 × 2 = 200 sockets: no Free headroom |

Per-recipient publishing may increase units; acknowledgements/retries/reconnects/presence and existing Chat add overhead. At even0.5KB/row before indexes,40,000rows/day is~600MB/month—retention/fan-out can dominate Free database storage. Do not conclude1,000users fit Free from message totals alone. Prefer coalesced inbox events and authorized batched refresh; never rapid global polling. Read/write costs, function CPU, queue operations, database compute/storage and transfer must be measured from a bounded synthetic workload before enabling rollout. No fixed polling allowance is granted by this report.

FP4 location caps remain separate and unchanged:100consents/day,2000reads/day,30session checks/10seconds; fixed approval ends2November20:05SGT. Notification work must not consume reserved cleanup headroom or renew sharing capacity automatically. Existing Vercel Hobby non-commercial eligibility declaration remains; reassess immediately on commercial activity and at MS14. No paid resources or quotas were changed.

## Founder decisions / next gate

Approve an in-app-only MS7.5 plan after MS7.4 lock, event/preference/retention matrix, measurable daily and concurrency budgets, and a bounded implementation estimate after source audit. Browser push needs separate consent, endpoint retention, device test, credential and provider-capacity approval. No default subscription prompt or media/location expansion. Until then: **research complete, implementation NOT STARTED**.
