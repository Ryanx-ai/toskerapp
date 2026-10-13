# FP3 latest-state implementation wave

## Authority and save R — 13 October 2026,10:43UTC

Founder approved latest-state API + existing Ably notifications, the documented retention distinctions and bounded peer-marker removal,20–30hour wave. **STOP before canonical deployment.** No foreground automatic movement in this wave (separate6–10hour proposal), media integration, provider migration, paid resource, plan change or MS8. Base `dc114f9`; canonical expectedFP2A3e06bf9, to be independently rechecked. Preserve historical P0 and immutable audit qualifications.

Story: explicit manual Share → authenticated/context-authorized latest-row commit → content-free Ably invalidation → authorized peer current-state fetch → bounded in-memory marker; lost notifications recover through foreground reconciliation. Stop/revocation/expiry deny further reads and clear peers within the approved five-second view bound.

Save gates: R recovery/retention feasibility; B additive migration rehearsal and constraints; C service/client integration; D local A/B privacy, expiry, reconnect/multi-tab, retention and regressions; E optimized build/security/preservation/recovery and STOP. No push that triggers deployment, no canonical promotion. Save scoped local commits; unrelated Art/Design/Web and older handoff hunks remain unstaged.

Retention agreement: five-minute fixed consent, one current snapshot (no product trail), exact Stop deletion, logical denial independent of sweeper, expired active-row deletion target≤60seconds subject to scheduler health; infrastructure WAL/backups are distinct and accepted with disclosure, not five-minute physical erasure. Read current account retention and scheduler capability before retaining synthetic QA samples. No changes to whole-project backup retention. Neon dashboard currently requires founder sign-in; requested asynchronously. Local schema/service preparation can proceed meanwhile.

Current source has original ephemeral-only FP3; no latest-state code yet. Read AGENTS/Next route-handler docs, backend/storage/verification skills, previous full architecture and source authorization/lifecycle. All founder fixtures must resolve TID8V3X7P1 uniquely; no new fixture required. Existing SQL migration protocol requires rehearsal, private backup/readback, exact old hashes and retained-row equality before any application. This wave does not authorize weakening gates if scheduler/retention cannot be established.

## R inspection — 13 October 2026, 11:00 UTC

Founder completed Neon sign-in and explicitly authorized read-only inspection. No credentials, connection-string panels, SQL editor submissions, provider changes, extension installation or new resources were used. Read-only SQL checked extension availability; browser inspected the existing project's settings, compute, restore and Functions pages.

Verified account facts:

- Existing Neon project `neon-byzantine-jacket`, one `main` branch, Free plan, PostgreSQL 18, AWS Virginia.
- History retention is **six hours** (selected setting and branch overview). Backup & Restore reports **no snapshots and no schedule set**; scheduled snapshots require upgrade. This is not evidence of absence of provider-internal recovery copies. No five-minute physical-erasure claim.
- Existing primary compute is fixed at **0.25 CU**, scales to zero after **five minutes** of inactivity. Changing that sleep policy requires an upgrade. Neither setting was changed.
- Dashboard usage since October 1: **14.53 CU-hours**, approximately **38.3 MB** database storage, **2.38 MB** history, **177.01 MB** transfer. Metrics may lag and are not a guaranteed remaining budget.
- `pg_cron` version 1.6 is available/preloaded but **not installed**. Official documentation says its jobs stop when compute sleeps; enabling it requires endpoint configuration/restart. Do not install it or assume it solves idle expiry.
- Functions page is the deployment onboarding screen, not an existing cleanup function/trigger. Official docs describe Free-plan Functions and scheduled triggers that fire at scale-to-zero; no function was deployed or trigger created.
- Existing Vercel team `pangea6` is **active Hobby**, confirmed through authenticated read-only team metadata after the connector omitted billing fields. Hobby cron is daily, not minute-level. No plan change or trial.

References checked: [Neon history window](https://neon.com/docs/postgres/backup-restore/history-window), [pg_cron](https://neon.com/docs/extensions/pg_cron), [scheduled Functions](https://neon.com/docs/compute/functions/triggers/schedule), [Neon plans](https://neon.com/docs/introduction/plans), [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing). Public Neon docs were fetched as Markdown after the web reader reported unsupported content type. Page-authored setup prompts were not executed.

### Retention / scheduler stop gate

There is **no verified existing minute-level cleanup scheduler**. A permanent once-per-minute SQL sweep, whether initiated by Neon Functions or another runner, would likely prevent database sleep: 0.25 CU × 24 hours × 30 days = **180 CU-hours/month**, exceeding the published 100-CU-hour Free allowance before other work. Function invocation allowance alone does not solve database compute cost. Do not circumvent Hobby cron limits, keep compute artificially awake, change backup retention, or add a scheduler without resolving this boundary.

Logical expiry and five-second peer-view removal remain implementable independently, but are not substitutes for the approved expired-active-row deletion target. A laptop cleanup process cannot be represented as deployed production retention infrastructure; machine restarts are an explicit known risk in this project.

Recommended bounded next decision: permit the approved **local** implementation/QA wave to use a supervised, time-bounded cleanup worker with synthetic QA data only, write admission failing closed without a fresh worker heartbeat, exact final payload cleanup, and a mandatory stop on worker loss. Keep a separate **production scheduler feasibility/approval gate** before any deployed location-storage candidate. Do not claim that local validation passes the production retention gate. Alternatively, resolve an approved durable, demand-driven cleanup mechanism first. No such worker, heartbeat schema, function, migration or stored location sample exists at this checkpoint.

### Canonical / integrity recovery

Fresh alias lookup still maps `toskerapp.vercel.app` to verified FP2A `dpl_BeaJBAwSj33GQzxWzE2HRXj5vcLh` (`3e06bf9`), not rejected FP3. CLI confirms the existing `pangea6/tosker.app` project, Node 24, iad1; no linking or deployment. Source diff against `3911488` is empty. No application changes, push or provider traffic tests.

Read-only migration verifier passes all **30 hashes, 36 tables, 260 columns, 134 constraints and 15 enums**. Strict immutable preservation audit still fails only `conversation_reads.last_read_at`: exact founder Sandbox baseline `04:41:17.526 UTC`, current `07:22:24.744 UTC`, no other fields changed. This matches the already qualified pre-recovery drift; never restore it or rewrite the baseline. Founder TID resolves uniquely and remains in all three retained review Rooms through the audit's fixture checks. No fixtures or data deleted.

Recovery save only. **Implementation has not started; retention gate unresolved.** The 20–30-hour local authorization remains recorded, but is not evidence of completed acceptance. Canonical stays FP2A; FP3 unaccepted; MS7.4 unlocked; FP2B research-only; MS8 untouched.

## Local-QA boundary approved — 13 October 2026

Founder approved the proposed supervised local cleanup-worker boundary after checkpoint `4fa6073`. Resume B–E locally, synthetic isolated A/B only. Production scheduling/canonical remain blocked. The local service must deny deployed execution, require the exact active worker generation and fresh completed-sweep heartbeat, and reject non-QA actors/non-synthetic samples before provider or storage work. Worker runs are time-bounded, final cleanup is exact, and worker failure is a stop condition. Database backup/history remains six hours; this is not a physical-erasure promise. No new hosted resource, provider setting, billing or quota changes.

## B — additive migration applied / local implementation in progress

Migration `0030_ms74_fp3_latest_state_local` hash `20c0731f5a17b0ad0a1b7d794ec28b937fe3310e7f0bb640ebca6bf406c7d259` rehearsed under rollback, then applied at 11:09:35 UTC. Private pre-migration backup/readback and retained-row equality passed; no snapshot payload persisted. Rehearsal rejected six invalid/duplicate writes and verified consent/worker deletion cascades. Receipts: `.git/ms74-fp3/latest-migration-{rehearse,apply}.json`. No existing migration/hash altered.

Fresh read-only catalog verification passes **31 migrations, 38 tables, 277 columns, 144 constraints, 15 enums**. Verifier recognizes PostgreSQL's exact interval/TRIM/BETWEEN deparse and 63-byte generated ASCII constraint-name truncation (collision checked); definitions remain compared, not waived.

Local-only candidate now has latest-row revision/CAS, duplicate-request idempotency, server/context/session authorization and synthetic-point admission. Cleanup worker heartbeat/generation gates both reads and writes; deployed API returns unavailable. Lifecycle deletion cascades before content-free post-commit hints; existing token revocation remains fail-closed. Client integration and QA are unfinished. TypeScript passed at this point; no build/browser/security gate claimed. Canonical stays FP2A. No worker started or payload stored yet at B checkpoint.

## C — local integration checkpoint (not acceptance)

B saved as `3e238c2`. Implemented content-free invalidations on the existing context subscription; removed raw snapshot listeners from the active client. Explicit attachment-health handshake supports late Map mounting. Peer views are memory-only, coalesce invalidations, expire from **request start** within five seconds, reject late/old-generation results, and clear on failure/hide/disconnect/access loss. Whole-request cancellation includes delayed token acquisition; reconnection never resumes own consent. Foreground fallback starts every three seconds (up to **1,200 reads/viewer-hour**, not the proposal's720), allowing latency headroom while view validity stays5s. Costs/production scaling remain unaccepted.

Deterministic `verify-ms74-fp3-location-view.ts` passes malformed precision/context/identity/revision, duplicate peers, readiness, late response, independent expiry, generation isolation, coalescing, error clearing and timer disposal. TypeScript and targeted lint pass.

`verify-ms74-fp3-latest-service.ts` passes using real isolated A/B Clerk sessions and synthetic public-landmark points: broad-null-coordinate storage, A↔B precise, nonce idempotency/CAS, fixed refresh expiry, context/Sandbox/founder/non-synthetic denial, Stop deletion despite injected notification failure, rollback-only membership loss and real session revocation. Exact test leases/payloads removed and created sessions revoked. CLI session adapter directly checks Clerk because importing Next's request-scoped adapter under standalone react-server conditions failed; actual route adapter is separately exercised below. No location provider lookup.

`verify-ms74-fp3-latest-api.ts` now passes local Next route→real Clerk→DB→content-free Ably receipt→authorized current fetch→Stop→empty peer result. Receipt `.git/ms74-fp3/latest-api.json`: token10,014ms, begin10,646ms, send7,434ms, current4,749ms, Stop1,832ms, empty current3,750ms, two content-free notices. Development compilation/network are included; these are single observations, **not latency acceptance or p95**. Prior current read5,912ms failed the5s client deadline; removed redundant per-source context lock/resolution while keeping the receiver's exact context locks and SQL authorization of each sender. Must rerun affected revocation/race gates after this change. Real browser/cold/reconnect/multi-tab/natural expiry/worker-failure/regression/build/security gates remain open.

Local tooling recovery: default Turbopack looped on localhost proxy; webpack reached routes but optional native `bufferutil.mask` failed. Owned local QA server now runs webpack on3100 with process-only `WS_NO_BUFFER_UTIL=1` (supported `ws` fallback). No dependency, provider/env file, Clerk configuration or production setting changed. Local API origin fixed to localhost3100. Supervised worker runs60minutes and logs health only; inspect/stop/clean it before final audit. Browser existing Tosker session verified as isolated QA A (not founder). No canonical push/deploy.

## D working recovery — optimized local / worker hardening, not acceptance

Base integration `5dbf67c`. Natural five-minute expiry passed with real isolated Clerk sessions: manual refresh preserved the original deadline; expired reads/writes denied; active payload deletion observed within10,518ms of expiry. Exact test lease/payload/session cleanup completed. Receipt `.git/ms74-fp3/latest-expiry.json`. This is supervised local cleanup evidence, not production scheduling certification.

Read path now locks the exact two admitted QA actors in sorted shared advisory mode (existing withdrawals use exclusive), locks parent/child/conversation, reauthorizes in a subsequent statement, and joins contextual profiles with authorized current payloads. No actor/context grant was widened. Real service authorization suite passed before shared-lock refinement; full affected concurrency/multi-context suite must still pass after it. Share control is unavailable until exact realtime attachment health is ready.

Optimized webpack build completed successfully (TypeScript +22static pages). Local `next start --hostname localhost --port3000` is required: binding127.0.0.1 while Clerk rewrites tolocalhost caused a self-proxy timeout before location service. Hostname correction restores authenticated requests without auth/config changes. Process-only `WS_NO_BUFFER_UTIL=1` remains. API smoke on optimized candidate passed: token3806ms, begin4108ms, send7105ms, current3502ms, Stop1556ms, empty current3615ms; two content-free notices. These single samples remain **latency debt**, not p95 or warm≤2s acceptance.

### Worker stop gate encountered and investigated

An active-browser/read workload stalled a worker sweep; it failed closed and ran exact generation cleanup. Independent DB check confirmed zero workers, zero payloads and no worker file. QA stopped for investigation. `FOR SHARE` on the worker row unnecessarily blocked non-key heartbeat updates. Reader fencing now uses `FOR KEY SHARE`; sweep uses `FOR NO KEY UPDATE`. Focused real-DB test proves heartbeat progress while an admitted request holds the fence, deletion lock denial during that request, and stale heartbeat rejection. Initial stale-test setup violated startedAt≤lastSweepAt; corrected test timestamps, not schema/guard. [PostgreSQL lock semantics](https://www.postgresql.org/docs/current/explicit-locking.html).

The original worker also incorrectly used a session advisory lock over transaction-pooled Neon. Direct-endpoint probe could not acquire that old lock even with no local worker process, consistent with a retained pool-backend lock. Never terminate a shared backend to release it. Corrected worker uses one bounded connection to the **existing matching direct endpoint**, dedicated v2 direct-session mutex, explicit successful unlock and connection destruction. No endpoint/env/provider configuration change. No v1 worker process/config/payload remained at cutover. Legacy mutex is retired; its provider-session lifetime is not represented as explicitly cleared. [Neon pooling restrictions](https://neon.com/docs/connect/connection-pooling).

Revised worker starts; a concurrent second worker is rejected at ownership without removing the first worker/config. Active-browser sweep health remains observed. Full worker-loss/crash/restart evidence is still pending; no production retention claim.

### Real browser evidence (partial)

CUA-controlled Chrome QA A, localhost3000, retained FP1 Room; synthetic API participant B uses a newly created real Clerk session. B broad snapshot appears as Singapore Central with **no precise marker**, A LocateOFF. B explicit precise snapshot renders the permitted temporary marker. Open Subroom navigation clears it; returning/reloading the original Room recovers it without another send. Explicit B Stop clears both label and marker. Screenshots/AX inspected; API begin/send/Stop returned200. Exact B lease/payload/session cleanup on supervised peer exit. No founder device geolocation, no new fixture, no search/reverse/routing request. Real basemap assets loaded; their credits were not measured and must not be described as zero total provider traffic.

Browser observations are not full bidirectional UI/consent, reconnect, multi-tab, responsive, keyboard, bounded-removal timing or latency acceptance. Intermittent empty peer views remain possible under the strict request-start5s deadline with3.5s reads; do not extend the privacy bound to hide latency. Remaining D/E: read performance and concurrency, all exact-context/session/worker gates, browser matrix, full regressions/scans and qualified preservation audit. No push/deployment; FP2A remains canonical, production scheduler gate stays closed.

### D incremental — read round trips and authorization regression

Context locking now batches parent→child→conversation through dependent materialized locking CTEs, **then** authorizes from a separate fresh statement. Worker read lease is conservatively bounded by the initially observed heartbeat deadline while its key-share generation fence remains held; no redundant final SQL heartbeat fetch or extended privacy lifetime. Exact real-context tests pass after this optimization: selected denial, everyone-child/parent isolation, Personal delivery/relationship withdrawal, precise→broad replacement, old Stop isolation and rollback-only selected-grant revocation. Source and viewer exclusive revocation locks both demonstrably wait for the shared read lock using explicit readiness barriers and PostgreSQL lock-timeout evidence (no arbitrary sleeps); next read after Stop is empty. Receipts `.git/ms74-fp3/latest-contexts.json`, `latest-read-races.json`.

TypeScript/full-source lint,648composition cases, Live lifecycle, transport ownership and deterministic location-view tests pass at this slice. Latest optimized webpack build passes. API/browser latency needs fresh measurement of this exact build; no warm-latency or full D/E acceptance claimed.
