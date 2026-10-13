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
