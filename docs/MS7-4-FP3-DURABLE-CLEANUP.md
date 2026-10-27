# FP3 durable cleanup decision — 13 October 2026

## Current continuation — 27 October 2026 FP4

[FP4 canonical release](MS7-4-FP4-RELEASE-2026-10-27.md) independently reverified five-minute expiry and hosted physical deletion with sender Stop blocked; no laptop worker. Capacity renewal is explicitly anchored26October12:05:21.406UTC and ends2November12:05:21.406UTC (20:05SGT), same100/2000/30caps; server-authoritative accounting now covers local/hosted paths. This supersedes the expired17October capacity heading below without erasing it. Six-hour backup/outage distinctions and healthy60second active-deletion target are unchanged.34migrations verified; temporary management credential remains revoked. Retain consumers/rescue; MS7.4 unlocked, STOP for Founder Walk.

## Current disposition — 17 October 2026

The approved queue-first/hourly-rescue architecture is now operational and accepted for the bounded FP3 Founder Walk. [Canonical release and measured evidence](MS7-4-FP3-RELEASE-2026-10-17.md) supersedes the historical unimplemented status below, not its privacy/outage/backup distinctions. Exact-artifact natural expiry and hosted active-row deletion passed; scheduled rescue, management-key retirement and33migration checks are preserved in the execution ledgers. No laptop runtime is required for Production cleanup.

Current caps are100consents/day,2000reads/day and30session checks/10seconds, with an unrenewed seven-day capacity attestation expiring20October18:49:57UTC. Healthy deletion target60seconds is not an outage/all-copy erasure guarantee; six-hour Neon recovery history remains. Preserve consumers/rescue during rollback. MS7.4 is unlocked; development stopped for Founder Walk.

## Historical decision and implementation evolution

Status: researched recommendation, **not operational or accepted**. Founder pre-authorizes existing Free-plan mechanisms; hosted eligibility and real failure/recovery evidence remain gates. Prior R checkpoint `2c44367ca493b3c5b5f6c313031952a0dd8d85b8` verified before this decision. No new provider, plan change, credential, function, queue, trigger or migration has been created.

## 14 October eligibility clarification

Founder Ryan declares Tosker currently a personal, non-commercial development project: MS1–MS13 experimentation/testing/product validation, no subscriptions, advertising revenue, paid customer deployments, commercial client services or revenue-generating use. MS14 is the intended Commercial Foundation reassessment; any earlier actual commercial activity triggers immediate reassessment. The declaration expressly does not override provider terms. No upgrade or billing authorization.

Fresh official Vercel fair-use review remains consistent with this stated personal non-commercial use. The prior factual eligibility hold is resolved on that declaration, not a provider exception or a permanent entitlement. Paid development, sale advertising or other financial-gain use would require reassessment even without revenue. Ordinary FP3 execution may continue under existing Free allowances; actual usage/headroom, hosted cleanup and release acceptance remain separate gates. Historical unresolved statements below describe the earlier checkpoint.

## Selected approach, subject to the gates below

### Overnight account/access evidence — 14 October

Fresh authenticated dashboard observations and exact recovery results are in the newest [closeout entry](MS7-4-FP3-FINAL-CLOSEOUT.md). Neon Free usage is 15.45 CU-hours since October 1; Vercel's displayed 30-day window shows roughly 60K function invocations, 38m35s CPU, 2.8 GB-hours memory and zero queue operations. These leave apparent evaluation headroom, not an acceptance result or a guarantee of remaining capacity. Preserve reserve budgets and measure actual polling/cleanup consumption before release. The hourly rescue estimate remains 15 CU-hours per 30-day month plus query time, not permanent minute polling.

Neon function deployment access is not yet established. [Official CLI authentication](https://neon.com/docs/cli/install) requires a Neon API key for Vercel-managed projects; the authenticated Console shows only CLI deployment instructions. No such key is configured in the existing local environment or documented CLI credential path. The inspected, unsubmitted Console form offers project-scoped access. [Project-scoped keys](https://neon.com/docs/manage/api-keys) confer Editor access to the whole selected project, not function-only rights. Do not mint this security-sensitive access under generic infrastructure approval. Request a temporary, exact-project founder credential handoff and narrow operational authorization, use no management key at runtime, and retire it after verified setup. No resource/key has been created.

[Queue pricing](https://vercel.com/docs/queues/pricing) was freshly checked: 1M Hobby operations, 4 KiB metering, idempotent sends and max-concurrency push notifications double that operation's units, separate function compute. [Hobby limits](https://vercel.com/docs/plans/hobby) pause affected usage when exhausted rather than authorizing paid overages. Actual callback/rescue operation and retention guarantees remain unverified; canonical must remain FP2A.

Use **demand-driven Vercel Queues for expiry cleanup**, plus an **hourly Neon Function safety sweep** on the existing database branch. Keep the existing authorized latest-state API and content-free Ably notifications. Neither job carries coordinates, identities, context IDs, profile copies or location labels. No job writes location history.

The queue is the normal expiry mechanism. The independent Neon sweep is recovery for lost/exhausted queue delivery, a deleted old deployment, or misconfiguration—not an hourly replacement for the approved healthy-path deletion target. Two small idempotent entrypoints share a reviewed deletion predicate; neither may delete Rooms, messages, profiles, saved places or retained content.

Why both: Vercel Queues retries survive process loss, but messages eventually expire or reach a delivery cap, and deleting their originating deployment prevents its callbacks. A queue alone does not provide indefinite orphan recovery. Neon scheduled triggers fire with sleeping compute and give an independent recurring repair path without another provider. Database unavailability can still prevent either writer from deleting; no Free plan offers a physical-erasure deadline during an outage.

## Admission and deletion contract to implement and test

1. Authenticate and resolve exact authorized context/precision; retain current actor/context revocation locks. Sandbox remains private. All acceptance uses synthetic fixes only.
2. Establish a current successful queue-consumer readiness receipt before admitting the first share after idle or unhealthy cleanup. Use a content-free random canary and an explicit acknowledged barrier, not a guessed sleep. Fresh queue-publish acceptance alone is not evidence that the consumer works.
3. Reserve a fixed server expiry and durable cleanup metadata **without coordinates**. Register delayed expiry work and require provider acknowledgment **before** accepting any snapshot. Scheduling failure closes admission. A crash before arming leaves at most a bounded metadata row, never an accepted unscheduled coordinate.
4. Consent and payload must reference the armed cleanup reservation. Database-clock expiry, transaction fencing and an idempotent conditional sweep must cover enqueue/commit races, early delivery, retries, duplicate/out-of-order callbacks and Stop during an in-flight write. A job delivered early must defer/retry until due; it must not acknowledge away a future obligation. Never compute a later expiry after registering the earlier job.
5. At expiry, delete current payload and expired consent in a transaction, no coordinate-bearing `RETURNING`, logs or errors. Log only aggregate outcome/elapsed time. Stop deletes immediately in its authorized transaction, independently of job health; jobs arriving afterwards are harmless no-ops.
6. Detect overdue cleanup obligations and reject new shares on stale readiness, deletion failures, resource exhaustion or an overdue expired row. Reads always independently enforce expiry/current authorization. Do not extend client display validity or accept stale rows to disguise service failure.
7. Run the independent Neon sweep hourly. Check Neon's edge-attested trigger header and exact branch; reject ordinary public calls. Use injected server-only database access, fixed scoped SQL, bounded statement duration and batches. Never accept table names, actor IDs or cleanup predicates from callers. No payload-bearing response or raw exception logging.
8. Keep queue consumers private through the documented queue trigger, exact topic and existing deployment OIDC. No static queue credential or publicly callable cleanup endpoint. Preserve earlier deployment consumers until obligations drain; rollback does not mean deleting them.

This requires additive cleanup reservation/health/capacity metadata and a carefully validated transition from the local worker foreign-key fence. **Do not simply remove `local-qa.ts`, its deployed denial or the current worker FK.** Rehearse the forward migration and FP2A compatibility, privately back up exact affected data, prove all old hashes/catalog and retained data unchanged, then apply only the additive migration. No migration rollback/rewrite.

## Retention and failure semantics

| Layer | Contract |
| --- | --- |
| Consent | Fixed five minutes; explicit broad default / separate precise consent; no automatic renewal |
| Logical expiry/revocation | Server rejects expired or revoked access immediately, independent of cleanup |
| Foreground peer display | Existing request-start five-second authorization bound; clear on failed/late recheck, hide/disconnect/context loss; no stale-response resurrection |
| Active database rows | Queue due at expiry, target deletion within 60 seconds **while infrastructure is healthy**, verified with actual delayed delivery and DB reads |
| Degraded cleanup | Fail closed; retry then independent hourly rescue. This is an incident, not a passing 60-second measurement. Database outage/quota suspension can delay deletion beyond an hour; no absolute deadline is promised |
| Queue metadata | Version, due time, optionally unrelated random readiness nonce only; explicit short TTL (proposed one hour), no identity or location data. Processing acknowledgment is not a promise of immediate removal from all provider internals |
| Database metadata | Bounded reservation/health counters; no location samples in receipts/history. Purge expired reservations in the same cleanup path; retain aggregate capacity counters only as needed for the current quota window |
| WAL/backups/MVCC | Previously verified Neon six-hour recovery window remains unchanged. SQL DELETE is active-row deletion, not secure erasure from disk/WAL/backups or recipients' devices |

The earlier approved ledger already distinguishes a healthy-scheduler target from physical erasure. This design must not relabel that target as an outage guarantee. If the founder requires all-copy erasure within five or six minutes even during outages, this architecture is unsuitable and implementation must stop.

## Free-plan feasibility and proposed bounded release budget

Official docs checked 13 October 2026:

- [Vercel Queues pricing](https://vercel.com/docs/queues/pricing): Hobby includes 1,000,000 operations; message size/options affect units; function compute is separate. Current maximum delay/retention is seven days, not the outdated 24-hour maximum in older cached docs. We do not need that longer retention.
- [Queue concepts](https://vercel.com/docs/queues/concepts): at-least-once, retries, per-deployment consumers, optional delivery cap, private consumer functions and delay. These are durability mechanisms, **not a documented sub-minute delivery SLA**. Queues remains beta.
- [Neon Functions](https://neon.com/docs/compute/functions/overview) and [scheduled triggers](https://neon.com/docs/compute/functions/triggers/schedule): available on Free and in the existing Virginia region; scheduled invocations wake sleeping compute. [Trigger authentication](https://neon.com/docs/compute/functions/triggers/overview) relies on Neon stripping client-supplied `X-Neon-*` headers at the edge; this must be tested on the actual hosted function.
- [Neon plans](https://neon.com/docs/introduction/plans): 100 CU-hours/project/month, five-minute scale-to-zero; Functions include 1M invocations and 10 active/400 waiting capacity-hours. Free compute suspends when its allowance is exhausted. Backup history remains separate.
- [Vercel Hobby](https://vercel.com/docs/plans/hobby): existing team freshly reports `hobby`, `active`. Account-wide usage shares these caps with the rest of Tosker.

Sizing is a proposal, not measured consumption: initial bounded founder-review cap **100 new consent sessions/day**, no automatic renewal, at most two queue messages per admitted session (readiness canary + expiry). At 3,000 monthly sessions, approximately 6,000 messages, budget six operation units per normal lifecycle = roughly 36,000 operations. A proposed maximum eight delivery attempts bounds failed work; conservatively allowing six units on every attempt is 288,000 operations. Reject new admission before consuming the reserved cleanup budget; do not reset counters during QA or spend the reserve on new shares. Exact SDK/platform operation counts and retry defaults require staged measurement before final caps are accepted.

An hourly Neon sweep has 720 invocations in a 30-day month. At fixed 0.25 CU and five minutes awake per isolated invocation, its database idle-tail estimate is **15 CU-hours/month**, plus query time. Existing app activity may overlap rather than add to this, but concurrent application/QA workload also consumes the same 100-CU-hour budget. The previous account usage reading was 14.53 CU-hours; it is historical, not a fresh remaining allowance. Recheck actual headroom before activating jobs or claiming affordability. No billing/plan changes or trial.

Queue callbacks need short timeouts and bounded batches; retries must not exhaust the function CPU/memory allowance. A five-second maximum at 2 GB for 48,000 worst-case callbacks would be about 133 GB-hours, before the rest of the app. This is a sizing ceiling to verify, not a configured limit or guaranteed cost. Normal work should be far lower. Preserve cleanup capacity and close admission when limits/health cannot be established. The read API's existing adaptive polling cost is a separate outstanding acceptance gate, not solved by cheap cleanup.

## Alternatives rejected for this wave

### 14 October implemented-capacity correction (supersedes sizing above)

Actual queue and location API maxDuration are10 seconds, not the proposed5 seconds. At2GB,48,000 worst-case queue invocations would be266.7GB-hours/month; do not reuse the earlier133GB-hour figure as implemented evidence. The service now requires a manually established capacity attestation valid less than seven days, never auto-renewed.100 new consents/day,2000 admitted reads/day and30 source/viewer session checks per10-second bucket are bounded founder-review limits, not200-user beta capacity. At3-second reads2000/day is about1.67 aggregate viewer-hours/day. Read-budget failures consume their attempted allowance, clear client state and back off; Stop and cleanup do not depend on read admission.

Seven full days at worst-case queue retries would be62.2GB-hours and at the read cap77.8GB-hours before admission/send/Stop/other app work. These are conservative wall-time memory envelopes, not CPU measurements or guarantees; don't conflate them with the4-hour active-CPU allowance. Recheck actual account usage before canonical and before any renewed attestation. Stage QA is a small finite workload; canonical capacity acceptance remains open pending hosted measurements. No quotas are reset to make tests pass.

Latest Neon Console:15.79CU-hours sinceOct1,38.54MB storage,2.27MB history,188.86MB network,0.25CU/6h retention unchanged. Vercel displayed account-wide window endsOct13 10:00 America/Los_Angeles and shows~60K invocations,38m35s activeCPU,2.8GB-hours memory; it is delayed evidence, not zero-cost proof of the recent queue tests. The Console rejects an end date beyond its allowed range. No plan, key, permission or billing change.

- Vercel Hobby cron: once/day with up-to-hour timing variance; cannot provide normal minute-level expiry cleanup. Do not split cron jobs to circumvent this limitation. [Cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- Permanent minute SQL sweeps, including Neon Function cron: likely prevents five-minute database sleep; 0.25 × 24 × 30 = **180 CU-hours/month**, beyond Free before app traffic. Native `pg_cron` also stops when compute sleeps.
- Laptop worker, browser timer, serverless `setTimeout`/after-response task: cannot survive loss of their owning runtime; not production retention.
- Workflow: durable sleeps are suitable technically, but add state/event persistence and orchestration for a one-shot delete. Hobby has 50,000 events/month plus underlying queue/function usage. Prefer the narrower queue primitive here. [Workflow limits](https://vercel.com/docs/workflows/pricing).
- New free scheduler/cache/provider: outside the approved existing-provider boundary; not procured.

## Exact authorization / remaining decision

The new founder attachment already approves ordinary additive schema, bounded jobs and existing Free scheduling. No further generic proceed approval is needed for this design within its verified limits.

**Hosted eligibility is unresolved:** Vercel's [fair-use terms](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) restrict Hobby to non-commercial personal use and define commercial purpose broadly, including paid development. No current revenue by itself is not sufficient evidence. Asked the founder whether this is a genuinely non-commercial personal prototype or covered by a Vercel exception. Do not assume the words “Development” or “founder review” override those terms. No plan upgrade, provider migration or paid resource is authorized as a workaround. Continue only independent already-authorized local preparation while this factual gate is unresolved.

## Rollout, rollback and acceptance

After eligibility/headroom: implement and unit-test the state machine; migration rehearsal/backup; deploy only the bounded cleanup candidate off canonical; prove anonymous canary, delayed expiry, duplicates, crash-before-ack, enqueue failure, lost notifications, cold Neon, rollback/draining, retry exhaustion and independent rescue. Test unauthorized direct cleanup requests and exact data ownership. No real founder/Jenn GPS. Capture anonymous timestamps and active-row counts, not values.

Do not remove deployed storage denial until durable hosted cleanup is operational and admission/retention tests pass. Then complete A/B browser, authorization/revocation/expiry/reconnect, latency, responsiveness and production UI gates. Stage and promote only the verified application SHA. Failed gates preserve FP2A canonical.

Rollback: close new sharing admission first; invalidate/delete authorized active location snapshots through the reviewed scoped service; confirm zero active payloads/obligations; preserve independent rescue and originating queue deployment until drained. Restore the existing verified FP2A application only after compatibility checks. Keep additive schema and historical migrations; never restore older founder data. Do not disable cleanup merely because the UI was rolled back.

No cleanup infrastructure or retention acceptance has been claimed at this research checkpoint.
