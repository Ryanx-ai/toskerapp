# FP3 delivery recovery / location architecture

13 October 2026. Recovery base `b5f270a`. Research and bounded diagnostics, not release acceptance.

## R — recovered

Read both founder attachments in full: location architecture investigation and collaborative movement. The latter permits local prototyping of foreground movement at most once per 60 seconds, with a fixed five-minute consent session, but not canonical deployment. The accompanying direct delivery-recovery instruction separately forbids implementing temporary snapshot storage without founder approval and permits release only of a verified privacy-equivalent ephemeral repair. This pass takes the common safe scope: investigate existing delivery, research/propose storage and movement, preserve FP2A. No storage implementation or deployment.

Fresh Vercel alias lookup confirms `toskerapp.vercel.app` → `dpl_BeaJBAwSj33GQzxWzE2HRXj5vcLh`, READY, exact `3e06bf9e5c9ec09ee0c3dedb82e5e7088cc41161`. The immutable rejected FP3 `0264500` deployment remains available for scoped diagnostics, not canonical. Deployment metadata's historical alias list is not authoritative; the fresh alias lookup is. CLI resolves existing `pangea6 / tosker.app` correctly. No new deployment, promotion or provider configuration.

Git source remains original FP3; unrelated design/art/website WIP preserved. Read full incident and execution ledger. Existing consent-only migration0029 remains; fresh read-only verifier passes30 hashes,36tables,260columns,134constraints,15enums. No schema migration or database rollback. Prior founder Sandbox read-marker drift remains a qualification, not rebaselined. Existing QA fixture must pass exact run/owner/creation checks and server-side unique founder TID8V3X7P1 membership before use; no fixture creation or membership edit.

Prior evidence retained unchanged in `MS7-4-FP3-P0-INCIDENT.md`: failed acknowledged ephemeral→remote delivery, working ordinary messages, local/Singapore successes, cold cross-region miss and delayed success. No repetition of fallback/SDK/REST/region candidates. New hypothesis: test whether explicit listener attachment plus actual ordinary/ephemeral receipt confirmation on the recipient feed resolves deployed snapshot delivery. No arbitrary warmup sleep. No precise provider test, no geocoding/routing calls.

## A — readiness diagnostic complete; repair NOT established

`scripts/investigate-ms74-fp3-readiness.ts` targets only the retained immutable FP3 deployment. Real isolated A/B Clerk sessions and exact application-issued scoped Ably tokens; synthetic public landmark, broad payload only. Both directions, attached and receipt-confirmed modes, plus Stop. Readiness probes contain version/random nonce only, never location or identity payload. Probe originates locally: it proves that recipient path, **not** a distributed Vercel-region readiness barrier. No application instrumentation is deployed.

Anonymous monotonic trace captures subscriber creation, attachment start/ready, probe publish/ACK/receipt, snapshot request/accepted/receipt and Stop request/receipt. Server-internal auth/publish/ACK and UI reconciliation are explicitly unobservable in the unchanged deployment and not fabricated. Twelve seconds is a missing-delivery observation deadline, not a publication delay. Missing deliveries are null, excluded from latency percentiles. Receipts are write-once private files; prior evidence is not overwritten.

Receipt: `.git/ms74-fp3/readiness-1791887677152.json`, completed10:34:37UTC. Real application-issued tokens had subscribe access on exact user feeds and no wildcard grants. No presence permission or provider setting was altered. No browser/geolocation access, no founder session used.

| Direction / state | Snapshot | Request → SDK receipt | Stop → SDK receipt |
| --- | --- | ---: | ---: |
| A→B, first freshly attached receiver | MISSING | null (12s deadline) | MISSING (12s deadline) |
| A→B, ordinary + ephemeral probe receipt confirmed | received |3282.4ms|3508.0ms|
| B→A, new receiver later in same run | received |3290.8ms|3157.9ms|
| B→A, ordinary + ephemeral probe receipt confirmed | received |3083.0ms|3126.7ms|

Overall observed delivery3/4=75%, one missing snapshot and one missing retirement. A→B1/2; B→A2/2. Successful-only snapshot median3282.4ms; nearest-rank empirical p95/max3290.8ms. Stop successful-only median3157.9ms, p95/max3508.0ms. A→B successful-only median/p95/max3282.4ms (n=1). B→A median3186.9ms, nearest-rank p95/max3290.8ms (n=2). Stop A→B3508.0ms (n=1), B→A median3142.3ms/max3157.9ms (n=2). These tiny-sample p95s are descriptive, **not an SLA or statistically supported percentile estimate**.

The first receiver was connected/attached371.7ms after attachment began, and the snapshot request began3720.2ms *after* attachment completed. The first miss is therefore not explained by publishing before the SDK's `attached` acknowledgment. This elapsed time came from consent/API work, not a inserted delay. The second receiver attached in100.2ms. Both local ordinary probes and both local ephemeral probes arrived: ordinary81.9/23.9ms, ephemeral14.5/30.0ms from local publish initiation. These are different network paths from the Vercel snapshot request and must not be compared as equal server transport measurements.

Interpretation: cold/warm regional delivery remains plausible; explicit local receipt-confirmation correlates with success but does not prove causality. Time elapsed, regional channel state, and earlier requests are confounders. A new SDK client is not proof that provider regional infrastructure is cold. A nonce received from a local publisher cannot certify Vercel's region has converged. No warmup probe or fixed delay is shipped as a repair.

First failing boundary remains accepted deployed ephemeral dispatch → peer event receipt. Prior instrumented ACK evidence is retained; this unchanged deployment's200 response means all publish promises fulfilled according to source, but does not expose provider-internal timings. UI reconciliation was not reached for the missing event. Browser render, cold repeated cohorts, reconnect, multiple tabs, context switching, precise, expiry and revocation are **NOT newly accepted**. Stop at the confirmed broken boundary instead of running a costly green-looking downstream suite. Prior local tests are evidence only for their original code/environment.

Full-path measurement contract for an approved prototype: one random per-trial correlation token only in transient QA memory, no actor/context/coordinates; subscriber-create/attach-ready, request-send, server-receive/auth-complete/commit/publish/ACK, peer-receive/authorized-fetch-complete/next-paint. Use per-process monotonic durations. Have the QA coordinator receive peer completion to measure end-to-end from its own clock; report that feedback latency as included, or calibrate clock offset with uncertainty bounds. Never subtract unsynchronized device wall clocks. Report missing/late events separately, direction and cold/warm cohorts separately, and at least100 successful trials/cohort before interpreting p95. No such server/UI instrumented deployment occurred here.

## B — architecture comparison and recommendation

**Recommend a Tosker-owned, authorized latest-state API with existing Ably carrying coordinate-free invalidations only.** This combines B (short-lived latest snapshot) and C (authorized retrieval). It is a proposal requiring founder approval, not an implemented fallback. Keep Ably for existing Chat/Live and as an accelerator, not the sole source of location truth. MapLibre and Geoapify boundaries do not change.

| Option | Delivery / recovery | Privacy / operational tradeoff | Decision |
| --- | --- | --- | --- |
| A: ephemeral only | Low nominal latency, but current cold loss unresolved; no late/reconnect replay | No application snapshot store; lost Stop is problematic; authenticated sender re-send would require an explicit lifecycle and still depends on sender availability | Do not release as reliable current-state service |
| B+C: latest-only store + authorized API + invalidation | Missed signal recoverable by context entry, reconnect and bounded revalidation; no sender needed for retrieval within consent | Requires approved storage, deletion/backups policy, read authorization and stale-response fencing; moderate migration/testing | Preferred logical design, storage cutover gated |
| C without a store | API can validate consent but cannot reconstruct a missed location | Re-request from foreground sender is possible, not reliable after sender disconnects; cannot meet late recovery independently | Not sufficient alone |
| Latest-only store + polling, no invalidation | Deterministic reconciliation interval, no signal dependency | More API/read traffic and slower typical update; useful fallback, same storage gate | Include bounded foreground fallback, not a replacement provider |
| Process-memory cache in Vercel | Loses state across instances, regions and recycling | No coherent revocation or late-read guarantee; a local Map prototype would misrepresent deployment reliability | Reject production use |
| New TTL cache/service | Could offer expiry and shorter retention | New provider/configuration, backup/eviction semantics and cost review required; TTL alone does not prove physical deletion | Not approved, not procured |

Ably documents that ephemeral events are excluded from history, rewind and disconnection recovery. Its channel API provides attachment, not a documented recipient end-to-end receipt barrier. These semantics independently prevent reliable late recovery from ephemeral-only messages. No vendor defect is asserted. [Advanced pub/sub](https://ably.com/docs/pub-sub/advanced), [channel API](https://ably.com/docs/api/realtime-sdk/channels).

### Neon suitability — important approval gate

Existing Neon/Postgres is suitable for transactional authorization and a bounded latest-row model, **but an overwritten/deleted row is not proof of no recoverable historical coordinates**. Neon retains changes in WAL/history for restore/Time Travel; the documented Free history window is up to6hours, not5minutes. The current account's exact history/backups/branches settings have NOT been verified in this pass. Do not silently disable whole-project recovery to accommodate location. [Neon history window](https://neon.com/docs/postgres/backup-restore/history-window).

Distinguish five separate events:

1. Logical expiry: server denies read/write at `expiresAt`, even if cleanup never runs.
2. Revocation: Stop/membership/session invalidation commits atomically and immediately denies future authorized retrieval.
3. Active-row deletion: Stop deletes the latest payload in its transaction; expiry sweeper deletes expired rows. Request-triggered pruning supplements but cannot replace the sweeper.
4. Physical storage/backups: MVCC/WAL/replicas/backups may retain older values; provider retention must be disclosed and approved. No claim of five-minute physical erasure.
5. Client removal: invalidate active views, reject old responses, expire view authorization and clear on disconnect/hide. Already viewed data cannot be recalled from another person's memory/device.

Proposed expiry sweep target≤60seconds after logical expiry is **not an available guarantee today**. Verify existing scheduler/plan first. Vercel Hobby cron is daily, so it cannot meet a minute-level deletion schedule. An approved eligible existing scheduler or separately approved infrastructure is needed. Do not use a browser timer or serverless `setTimeout` as a deletion guarantee. [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Decision: approve Neon only if founder accepts **no product movement history**, with separately disclosed bounded infrastructure backup retention. If “no history” means no recoverable old precise samples at all, do not put raw precise samples in this database. Research a compliant ephemeral storage/key-lifecycle design separately; encrypting rows with a long-lived application key does not erase backup history. No schema/storage prototype has been implemented because the direct recovery instruction requires separate approval.

## C — bounded implementation proposal (NOT executed)

### Data and API

- Keep existing consent and authorization locks; one active sharing session per user initially (safer than simultaneous hidden contexts). A new consent retires the prior session. Exact Room, selected Subroom and Personal authorization; Sandbox denied.
- Separate optional latest-snapshot table keyed by consent session, unique current row; server revision, observed/accepted timestamp, fixed expiry inherited from consent. Broad rows contain only approved area code/label/source; coordinate fields must be null by constraint. Precise rows contain latitude/longitude/accuracy only after separate precise consent. No name/profile copies, arrays of past points, trails, audit payloads or coordinate mutation receipts.
- Server resolves actor/session/context; client cannot choose subject or audience. Deny expired, changed-precision or revoked leases. Updates use a generation/revision or request nonce to reject reordered requests and duplicate-tab writes. User/session lock then context lock, consistent with current auth paths.
- `POST begin`: explicit broad/precise and movement consent, disclose exact context audience; fixed server `expiresAt = createdAt + 300s`. Existing members become eligible only under the disclosed dynamic-context policy; if founder requires a fixed roster, use a consent audience epoch and require renewed consent on membership change.
- `POST update`: one newly acquired sample, validate owner/session/context/precision and freshness; automatic submissions server-rate-limited to≥60s apart across all tabs. Manual refresh has a separate bounded explicit rate; it never bypasses expiry or auto throttling. An update replaces one row and never extends consent.
- `GET current` (authenticated, no-store): resolve exact authorized context and source sessions, return permitted current rows/revisions plus server time, expiry and short view-validity. Never a public link, CDN cache, history endpoint or URL-coordinate query. Prefer delta/revision reads with authorization on every response.
- `POST stop`: idempotent session-specific retirement; commit delete/revoke before best-effort invalidation. An old tab cannot delete a newer sharing session. Sender clears locally immediately and receives truthful server-confirmation/error state.
- Reuse existing realtime connection; publish only `{version:1}` invalidation on existing authorized context channel. Coordinates stay out of Ably, ordinary Chat, queues, logs and analytics. A delayed invalidation is harmless: client fetches current truth. Authorize before commit; publish after commit, no slow network call while holding the location write transaction.
- Client subscribes/awaits attachment, then fetches; buffer an invalidation during fetch and reconcile again. Reconnect/context entry/tab activation fetch current authorized state; generation fencing prevents old-context responses/retired revisions from restoring markers. Reload never resumes own sharing. Peer recovery does not imply renewed sender consent.

### Revocation is a security gate, not eventual UI polish

Existing FP3 validates a received snapshot before display but does not continuously revalidate displayed peers; it relies on retirement, disconnect and fixed expiry. The observed missing Stop event means repairing first snapshot delivery alone is not enough. Proposed reads must deny immediately after committed membership/session loss, and use the same lock/epoch boundary to prevent a concurrent stale read escaping authorization. Existing token revocation stays intact. All membership/relationship/admin paths must use this boundary; raw database changes are not an authorized workflow.

For honest UI guarantees, propose immediate local clear, best-effort peer invalidation, plus≤5second foreground **view authorization** lease/recheck, separate from60second coordinate acquisition and five-minute consent. Failed/late recheck clears marker instead of displaying indefinitely; disconnect/hide clears immediately. This adds720 checks/user/hour. A long partition cannot provide instantaneous peer notification: require founder acceptance of this bounded visibility model, or design stricter infrastructure. Do not claim literal zero-time remote erasure. All coordinates already received by a malicious peer remain outside revocation's recall power. Browser cache/storage/service-worker payloads prohibited; no sensitive error serialization.

### Three position states and movement lifecycle

Private current fix lives only in volatile client memory. Temporary route origin is a separate frozen copy captured on Locate, never overwritten by movement. Shared state is a consent-governed projection, never a saved Route Location and never changes route geometry.

Opt-in movement acquires at most one automatic sample per60seconds, only visible foreground, valid permission, active same context and unexpired consent. Use low-accuracy one-shot acquisition initially, not a continuous high-accuracy watcher. Suppress transmission below an accuracy-aware material-distance threshold (initial proposal max50m/current accuracy; tune with physical tests); broad sharing sends only when area changes. Do not reverse-geocode every minute: local area projection where licensed/available, bounded provider fallback only with existing permission/budget, otherwise “area unavailable,” never precise fallback. Foreground exit stops acquisition and best-effort retires sharing; returning requires an explicit restart in the conservative initial version. No auto-resume after reload/logout/expiry or new consent on reconnect. Display last actual update age and stale/expired state; never interpolate fictional movement. No microphone access for location.

### Required acceptance before any cutover

Backup metadata and rehearse additive migration/rollback locally or in an approved isolated environment before shared DB change; no coordinate-bearing backups of test production state. DB constraints enforce broad-null-coordinate, bounded lifetime, unique active session and revisions. Test discarded/stale writes, publish failure after commit, sweep failure, missing invalidation, cold reads, late subscription, both directions, multiple tabs, reconnect, context switches, member removal, selected Subroom, Personal relationship loss, Sandbox denial, logout/session revocation, in-flight read/revoke races and precision downgrade. Natural five-minute test must prove auto updates do not renew expiry. Separate permissions-denied/background/pagehide/reload tests and one-transport/draft/Map-origin/Chat/Board/Live regressions. Real browser A/B synthetic data; every retained collaborative fixture includes founder8V3X7P1. No founder/Jenn actual location.

Target (not measured): warm authorized update→peer render p95≤2s, cold/reconnect reconcile≤5s under healthy service; fail closed on view-lease expiry. Record real missing rates; no release with a known missing Stop or privacy leak. TypeScript/lint/build/migration/security/client-bundle scans and exact retained-data qualification required. All requested canonical acceptance gates remain blocked; no production candidate exists.

### Estimate and rollback

After storage/retention/privacy decisions: **20–30 engineering hours** for latest-state service and controlled release: data/retention rehearsal4–6h; authorization/API/reconciliation6–8h; A/B adversarial/browser/release8–12h; save-state/cleanup2–4h. Foreground movement and cross-tab ownership adds **6–10h**, excluding physical-device elapsed testing/provider review. Combined26–40h, not another two-hour incident repair. A synthetic local-only model can be explored in3–5h after explicit storage/prototype authorization; it would not certify Vercel/Neon behavior.

Checkpoints R(recovered), A(observations), B(architecture), C(approval plan) saved now. Future implementation requires checkpoint at migration rehearsal, integrated privacy gate, staged acceptance, canonical verification. Keep canonicalFP2A until approved. Rollback: disable sharing entry/write/read, revoke active consents and purge active latest rows through approved exact service, invalidate client views, restore exact FP2A application. Do not undo shared migrations blindly; additive table remains harmless. Verify current database compatibility and retained-data checks, existing Live/Chat/Board. Restore procedures must never reactivate expired/revoked consent or resurrect historical locations from backup.

## 60-second cost model (estimates, no plan changes)

N denotes **concurrent participating users in one fully connected Room**, each explicitly renewing five-minute sessions throughout one hour. One update/minute is an upper bound, not a required transmission. Pubs=60N/h; peer read operations=60N(N−1)/h if each update triggers one delta read/peer. One context invalidation fanout is conservatively counted as one publish plusN deliveries (including sender); Ably units=60N(N+1)/h. An SDK echo cannot generally suppress a server REST publication to its sender, so do not subtract that delivery. Lifecycle, reconnect, other app traffic and authorization queries are extra.

| N | Location writes/h | Peer delta reads/h | Ably invalidation units/h | Update+signal peer payload MiB/h* |
| ---: | ---: | ---: | ---: | ---: |
|2|120|120|360|0.070|
|5|300|1200|1800|0.700|
|8|480|3360|4320|1.961|
|20|1200|22800|25200|13.307|
|100|6000|594000|606000|346.687|

*Assumes512bytes snapshot delta +100bytes signal per peer; excludes sender echo, request/HTTP/TLS framing, profiles, database wire protocol, retries and5second view checks. Not a bandwidth bill. Full roster refetch per event would multiply snapshot bytes further; use bounded delta/batching. Reads may require multiple indexed authorization queries, so this table is not an SQL query count. Twenty/100 users divided among small groups are substantially cheaper than one all-to-all group. Current source limits snapshot audience to50: **100-in-one-Room is a projection, not supported scope or authorization to raise the cap**. Example100 concurrent users in20groups of5:6000writes/h,24000peer reads/h,36000Ably units/h.

Five-second fail-closed view rechecks add720N authorized requests/h:1440,3600,5760,14400,72000 respectively, ideally small revision/authorization responses and coalesced with update reads. Initial consent+four timed updates is at most5automatic writes in an isolated300s session (at0/60/120/180/240); explicit renewal and manual requests add separately. One60second foreground delta recovery read alone is too slow to satisfy a≤5s revocation display bound.

At4seconds, update/write/fanout payload terms are15× the table (view recheck term unchanged):100-member all-to-all≈9.09MAbly units/h;100 users in groups of5≈540000/h. This is a reason to retain60seconds and small groups, not a claim of equivalent battery savings. Movement suppression further reduces actual sends.

Current published Ably Free limits:6Mmessages/month,200connections,200channels,500message units/sec.100-member all-to-all at606000/h consumes6M in≈9.9active hours and synchronized bursts can exceed500/s.100 small-group users at36000/h consume≈2160000units for2h/day×30days, before existing Chat/Live traffic. Tabs consume connections, so100users×2tabs reaches200 before staff/QA; reuse existing transport and set budget headroom. Free remains unchanged. Illustrative paid overage unit rate is$2.50/M plus package/other dimensions, **not a recommendation or approval to upgrade**. [Ably pricing/counting](https://ably.com/docs/platform/pricing).

Neon cost is compute-time/storage/transfer, not a fixed per-write price. Continuous rechecks prevent scale-to-zero: illustrative0.25CU continuously active24h/day≈180CUh/month, versus0.25CU×2h/day≈15CUh/month, ignoring other traffic. Current public Free allowance100CUh/project and1GB storage; actual current account/compute and quota headroom are unverified. Latest rows are small (100×~1KiB≈100KiB logical), but WAL/index/auth read overhead matters. Five-minute deletion needs scheduler capability and a retention agreement, not just cheap rows. No workload benchmark/CU-dollar promise. [Neon pricing](https://neon.com/pricing).

Automatic refresh must not turn into Geoapify per-minute geocoding/routing. Provider budget remains unchanged; projected incremental location refresh calls can be zero using private device fixes plus local area data; unsupported broad areas fail gracefully. No continuous routing recalculation from movement. Physical GPS acquisition/battery cannot be inferred from update counts.

## Browser/mobile and voice boundaries

Geolocation requires permission and an active visible document; permission can be denied/revoked and fixes can be delayed or inaccurate. Page freeze/discard can suspend timers/fetch callbacks or prevent final requests altogether. Server expiry and client lifecycle clearing are therefore mandatory. Ably replacement does not fix acquisition, OS background suspension, network handoff or battery limits. [W3C geolocation](https://www.w3.org/TR/geolocation/), [Chrome page lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api).

Private Alpha physical matrix: iOS Safari and installed PWA; Android Chrome and installed PWA; permission grant/deny/revoke, approximate/precise OS settings, lock/unlock, background/app switching, low-power mode, screen-off, indoor/outdoor movement, Wi-Fi↔cellular, offline→online, multi-tab, browser kill/reload. Measure acquisition timeout/accuracy and battery over comparable walks separately from network receive/render latency. Never promise background tracking or infer continuous motion between60second samples.

Voice ripple remains an interface contract only: future approved media SDK's authenticated speaking indicator → matching authorized participant's visible Map avatar; bounded animation, reduced-motion static indication, clear on silence/disconnect. It conveys speech, not GPS freshness, and never creates/revives a location marker without location consent. No audio over Ably, no fake activity, no microphone permission solely for animation. FP2B remains research-only.

## Closeout / decisions required

No application code, migration, environment, provider permission, plan, billing, push, alias or deployment changed. TypeScript and diagnostic lint pass after replacing an overly broad test-response type. Four exact owned A/B rate metadata rows removed after private0600 backup; zero leases removed, sessions revoked/SDK clients closed. No Room/content cleanup. Fresh strict protected audit still fails only `conversation_reads.last_read_at`, same historical qualification; do not label pristine preservation. Keep founder-accessible `ms74-fp1-qa-a39d9eea`, `ms73-founder-review-904a9dea`, protected `ms73-qa-bfff9475`.

Founder decisions: (1) approve latest-state storage and clarify acceptable backup retention versus strict no recoverable history; (2) approve a bounded peer-view revocation window/foreground lifecycle; (3) authorize a staged20–30h snapshot wave, with movement as a separate6–10h slice, after scheduler/retention viability. No temporary storage implemented while these wait. A vendor escalation can be prepared from anonymous timing evidence, but none was sent.

**STOP: FP2A canonical; FP3 unaccepted/implementation paused; research and bounded diagnostic complete with missing server/UI metrics disclosed; recommended design awaiting approval. MS7.4 unlocked; MS8 untouched.**
