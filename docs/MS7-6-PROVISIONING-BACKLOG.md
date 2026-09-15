# MS7.6 — Provisioning Backlog + Development / Backend Polish

Created 2026-09-09. Durable intake for infrastructure/backend needs discovered in MS7.1–7.5. Governing order and classification: [canonical roadmap](ROADMAP.md). Documentation structure only; no service provisioning, credential changes, migration or implementation is authorized by this record. MS15 retains full production/launch priming.

## Intake / decision contract

FP4 delta (2026-09-14): no new provider or credential. Existing Neon gains private sidebar preferences via forward migration0015; authorized Namecards and Hall-reference interactions reuse current services. Personal Settings explicitly separates unimplemented media/files/link collections/privacy policy from working identity and mute. P-001/P-002/P-003/P-005/P-006 remain outstanding; the canonical review still uses Development services. Local stale Clerk-session/automation recovery is recorded in the FP4 ledger, not evidence of production auth readiness or a reason to silently rotate keys. DK Longreach rights and contextual identity/Room nickname policy are design/founder gates, not new infrastructure requests.

FP2 infrastructure delta (2026-09-13, explicitly founder-authorized): dedicated server-only `ROOM_INVITE_ENCRYPTION_KEY` generated and installed in local `.env.local` and Vercel Development/Production-review only, never Preview or client bundle. AES-GCM recovery supplements authoritative token hashes. P-002 must address environment separation, secure backup/rotation/re-encryption or deliberate invalidation of existing recoverable links; no silent key replacement. No credential values are documented.

FP2 adds only a narrow DB-backed invitation lookup/direct/share quota (P-004 remains broader beta abuse/operational policy). Notification history still reads the current authorized history and derives presentation groups; grouping is not pagination/scaling. Notification-history bounds, indexing/retention and observability belong to later backend polish, not a hidden FP2 transport rewrite. Files remain P-001; calls/video and translation retain separate unprovisioned communication/privacy foundations. No new media/provider services were provisioned.

Assess each need as A — current-wave blocker (core behavior cannot genuinely be validated without it), B — MS7.6 backlog (useful/important but unnecessarily interrupts the wave), or C — post-beta/later infrastructure. Record why and the founder action required. Do not use this backlog to postpone defects in active core authorization/persistence/recovery. A/B/C here are provisioning classes, not the different capability classes in earlier decision ledgers.

For each new item record: stable ID; service/capability; discovered milestone; reason required; classification and rationale; provider/options and evidence date; credential requirements (names only); Development/Preview/Production needs; estimated complexity; security/privacy; status; founder action; acceptance/cleanup criteria. Reclassifications require a dated reason and founder direction where applicable. Never record credential values.

## B — MS7.6 provisioning backlog

### MS7.2 intake — identity / support operations (2026-09-15)

**Founder resolution 2026-09-16 supersedes pending decisions below:** P-007 monitored mail destination approved and implemented for current Support; no ticketing provider needed. P-008 full panel stays gated with provider configuration unchanged; coordinated account deletion/full lifecycle explicitly belongs to **MS15 — Production / launch priming**, not current MS7.2 implementation. Preserve A/B. Dependency audit retained all other four identities with authored history; no deletion architecture added.

- **P-007 / B — operational support delivery.** A simple founder-confirmed monitored address/URL is a current MS7.2 content/configuration requirement, not permission to buy a service. No destination is supplied yet. If beta volume needs transactional delivery/ticketing, research options in MS7.6; no provider, new token or budget presumed. Environment separation, spam limits, minimal diagnostic content, privacy/retention and delivery/failure tests are required. Never send passwords, verification codes or raw account/provider payloads. Founder supplies monitored destination now; approves later service/cost only if warranted.
- **P-008 / B — account deletion/ownership retention lifecycle.** Existing Clerk can delete an identity without Tosker's required Room ownership/retention process. Current MS7.2 Account panel is gated, not patched with CSS. A/B read-only capability check confirms self-service deletion enabled. Founder must decide the immediate provider safety setting or approve the gated boundary; do not silently alter configuration. Later lifecycle design must address owned Rooms, memberships, canonical user/auth links, messages/Hall retention, identifiers, private aliases and provider deletion ordering with failure recovery and exact scoped acceptance. Existing credentials only; no new provider or automatic deletion now. Complexity high; policy approval precedes implementation.

Seven-character existing-TID transition, active profile/Room audience correctness and stale-write defenses remain current MS7.2 obligations, not deferred provisioning work. Font deployment rights are a typography gate, not infrastructure. Current schema migrations0016–0018 are additive Development changes with catalog/hash verification, not Production environment certification. P-002/P-003 remain the environment/operations handoff; no new service or credential was provisioned by MS7.2.

### P-005 — One-time scheduled text messages (FP3 direction only)

Discovered/approved for **Development preview only** in MS7.1-FP3, 2026-09-13. Class B, not provisioned or implemented. The timer beside emoji is an explicitly Deferred explanation, not a scheduler.

Future contract: one-time text only; durable server storage of UTC execution time plus the user's timezone; author-owned queue with edit/cancel; atomic claim; execution-time authentication/Room/Subroom authorization checks; stable idempotent send ID; bounded retries and failed/cancelled/sent outcomes. No recurrence, client timer authority or silent sending after access loss. Integrate with canonical message creation and unread only when execution succeeds. Complexity medium–high, dependent on P-006. No provider or credential assumed; verify actual Vercel/account capabilities and Development/Preview/Production separation before selecting. Founder approval of scope/provider/cost and secure environment provisioning required in MS7.6, not FP3. Acceptance must cover duplicate workers, cancellation/execution race, revoked access, retries/outages/timezones and exact queue-fixture cleanup.

### P-006 — Small durable background-job foundation

Class B / research and provisioning backlog, discovered in FP3. Potential consumers: scheduled messages (P-005), private-object purge/retention, expired-invite housekeeping and media cleanup. **Not a generic workflow engine.** Inspect existing Vercel/account facilities first; no vendor choice, new account, token or infrastructure change now. Credential names follow that later approved choice; never record values. Environment-isolated work, atomic claims, authorization at execution, idempotency, bounded retries, content-free observability and retention/cleanup are required. Medium–high complexity; evaluate costs and privacy/data residency before founder approval. Acceptance includes crash/retry/duplicate execution without double effects, removal of exact fixtures and an operational recovery procedure.

### P-001 — Private attachments / object-media storage

| Field | Current record |
|---|---|
| Discovered during | MS7.1; previously reserved internal slice MS7.1.7 |
| Required for | Genuine image/file attachments with durable private objects and authorized retrieval, not fake upload controls |
| Classification / rationale | **B — MS7.6 PROVISIONING BACKLOG**, explicitly set by founder 2026-09-09. Important capability, but no longer blocks the Chat/Rooms/Hall MS7.1 wave |
| Provider/options | Earlier assessment proposes Vercel Private Blob; not newly selected/provisioned by this update. Revalidate suitability, availability, limits, pricing and region when provisioning is authorized. Prior design evidence: [media assessment](MS7-1-CORE-CAPABILITIES.md#media-provisioning-backlog--ms76) |
| Credentials | Proposed server-only `BLOB_READ_WRITE_TOKEN`; never client-exposed, printed, pasted or committed. Last engineering check reported absent; no environment inspection/change in this documentation pass |
| Environments | Plan appropriate Development/Preview/Production separation. Canonical founder-review target currently uses Development services despite Vercel target name; no automatic store/token sharing or environment creation |
| Complexity | Prior estimate medium–high; upload/finalize/download lifecycle, metadata, client failure/retry and cleanup, not merely a picker/icon |
| Security/privacy | Personal/Room/Subroom authorization on upload/finalization/download; membership revocation; server-only secret; private delivery; MIME/actual-type validation; size/quotas; retention/deletion; no unverified scanning claims |
| Backend/UI acceptance | Durable metadata, idempotent finalization, validated type/size, safe preview/download, progress/failure/retry, revoked-access denial, deletion/retention and orphan-upload cleanup. Neon remains durable metadata authority |
| Current status | BACKLOG / UNPROVISIONED / NOT IMPLEMENTED; no fake controls |
| Founder action | None required now for MS7.1 continuation. At MS7.6 (or explicitly earlier), approve provider/budget/environment plan and securely provision credentials. Only future explicit founder instruction promotes this to a current MS7.1 blocker |

Do not mark the old MS7.1.7 media slice complete; its work moved here. This is not a declaration that attachments are unnecessary for eventual beta.

## A — Current-wave blockers

### MS7.1 continuation sweep — 2026-09-09

No new service is needed for the current text Chat/Rooms/Hall authorization and persistence contract. Existing server provider code emits content-free warnings when Ably invalidation fails and retains canonical reconciliation; this is a recovery mechanism, not complete operational monitoring. The items below are future intake, not provisioning authorization:

| ID / class | Evidence and need | Provider / credentials / environments | Scope, acceptance and founder action |
|---|---|---|---|
| P-002 / B | Canonical founder review still uses Development identity/database/provider services. Preview and genuine Production isolation remain outstanding. | Existing Clerk / Neon / Ably / Vercel; reuse the environment contract's variable names only, never values. No new provider choice now. | MS7.6 approves separate environment/data and secret-rotation plans, verifies migrations and scoped tokens against each intended target, prevents Preview writes to shared founder data. Medium complexity; MS15 still owns launch readiness. Founder approval of environment/budget plan required then, not a current text-feature blocker. |
| P-003 / B | Existing content-free latency marks and provider warnings support local diagnosis, but no complete alerting/retention/health acceptance is established. | Assess existing hosting/provider diagnostics first; no monitoring vendor or new credential presumed. Separate environments and redact content/identity/secrets. | MS7.6 operational evidence: trace a failed request/reconciliation without message bodies or credentials, actionable failure signal, retention/access policy and documented recovery. Small–medium; approve any paid service only if existing tools are insufficient. |
| P-004 / B | Current bounded query sizes, membership authorization and idempotency do not establish a distributed abuse/rate-quota program. Broader beta admission will require an explicit abuse budget. | Evaluate current platform controls before selecting shared counters or a vendor. No credential requested now; environment-specific quotas. | Define send/search/token/invite abuse limits, authorized-user recovery/error feedback, multi-instance enforcement and privacy-safe evidence without breaking legitimate rapid Chat. Medium; controlled founder review is distinct from public-beta admission. Existing core authorization defects remain MS7.1 fixes, never deferred here. |

Media processing depends on P-001's approved formats, safety and retention contract; do not buy a pipeline speculatively. Translation and calls remain Class C / later, with privacy and joinable-context bookmarks in the capability ledger. No current transactional-email/support integration requirement was established by this bounded Chat/Room sweep; do not invent one to populate the backlog.

No new external provisioning blocker is asserted by this documentation-only pass. Assess future dependencies against the actual active-wave core contract; record exact evidence and founder action here when found. Existing product-policy questions are not automatically infrastructure blockers or silently resolved by MS7.6.

## C — Post-beta / later infrastructure

Record separately from committed MS7.6 work. Calls/translation and other prior infrastructure bookmarks remain in the capability ledger; this update does not promote them to provisioned or scheduled services. MS9's full production ToskerBot may move post-beta if it delays beta, per the roadmap; no AI service is provisioned now.

## MS7.6 review checklist — scope, not newly approved implementation

- Inventory accumulated services/APIs/SaaS/server-resource needs and approve only those actually required.
- Reconcile environment boundaries, server-only secrets and rotation procedures without client leakage.
- Review authorization, persistence, query behavior, migrations, realtime/backend integration and storage lifecycle.
- Validate failure recovery and clean temporary Development debt safely.
- Add appropriate logging, error visibility, service-health checks and operational handoff.
- Validate Development/beta coherence and obtain walkthrough/lock as appropriate; keep full production/launch priming in MS15.
