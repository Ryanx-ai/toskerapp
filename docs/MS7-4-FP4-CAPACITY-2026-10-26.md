# FP4 bounded sharing-capacity renewal

26 October 2026. Founder explicitly approved a seven-day renewal after the read-only assessment below. This is bounded QA/Founder Walk capacity, not a public-beta entitlement, paid procurement or production certification.

## Exact approval

- Attestation is conservatively anchored to the preceding assessment: `2026-10-26T12:05:21.406Z`.
- Expiry: `2026-11-02T12:05:21.406Z` — **2 November, 20:05:21 Singapore**. Do not move the date on build/deploy/retry.
- Unchanged application caps:100 new consents/day,2,000 latest-state reads/day,30 session checks/10seconds.
- Additional operational bound for isolated review QA:20 consent attempts and800 latest-read attempts/day, including failed attempts. Preserve failed-run receipts and count them toward the bound.
- Five-minute per-consent expiry, explicit broad/precise consent, manual-only acquisition, context/session/member authorization, Stop and fail-closed cleanup remain unchanged.
- No provider quota increase, billing change, counter reset, automatic renewal, new provider or credentials.

Approval permits isolated synthetic QA, then hosted acceptance and bounded Founder Walk. **No Production environment has been changed at this checkpoint.** Apply the fixed attestation only to the correctly identified accepted release workflow; never make a new timestamp merely to get past expiry. Current canonical retains its previous expired attestation until a separately verified release configuration is applied. Re-check actual deployment environment assignment before release.

## Observed headroom

All figures below were read on26October from authenticated existing accounts; dashboard windows and units are retained. They are not guaranteed instantaneous billing measurements.

| Existing service | Observation | Relevant unchanged allowance |
| --- | --- | --- |
| Ably account Limits |5,820 monthly messages; peak5 connections and15 channels;251KiB transfer; resets in6days. App overview2,509 inbound/3,311 outbound; current1connection/3channels |6M messages/month;200 concurrent connections;200 channels;28.6GiB transfer;500messages/s. Per-channel50messages/s. No permissions changed |
| Vercel Hobby,26Sep–26Oct |56,571 invocations;43m10s active CPU;3.4GBh memory;62,653 CDN requests;845.81MB transfer;460.07MB origin transfer |1M invocations;4CPUh;360GBh;1MCDNrequests;100GB transfer;10GB origin transfer |
| Vercel queue counters |68 sends,40 receives,31 deletes,96 notifications,15 visibility changes |1M operations included; counters are operations, not user messages. Do not interpret a dash in the usage UI as unlimited |
| Neon retained main Free |34.54CUh;38.6MB storage;1.14MB history;231.79MB transfer;0.25CU compute;6h recovery history |Existing Free project remains unchanged.100CUh/project/month and1GB/project; actual function execution headroom is not proven merely by database compute totals |
| Neon isolated review Free |1.46CUh;34.29MB storage;327.51kB history;10.27MB transfer;6h history |Separate empty-schema/synthetic-only project, no founder content copies |
| Geoapify Free, before this continuation |26Oct53requests/29credits; displayed month545requests/550credits |3,000credits/day. Browser key unchanged. New bounded real-basemap QA requests tracked separately in private receipts |

Read-only retained database at`2026-10-26T12:05:21.406Z`:0payloads,0active consents,0overdue payloads,0overdue obligations, no current-day consent budget row. Scheduled rescue last success`2026-10-26T11:35:01.205Z` (19:35SG). Queue readiness ACK remains historical16October; **this is not fresh readiness**. New admission must obtain/verify actual consumer readiness and satisfy the existing60second readiness,65minute rescue-health and zero-overdue checks. Renewal does not bypass any of these checks.

## Interpretation and release constraints

2,000reads at one read/3seconds is approximately1.67aggregate viewer-hours/day, not200active beta users. Seven days at the existing read cap permits at most14,000 admitted latest reads in the retained environment, plus separately counted admission/Stop/notifications and synthetic review traffic. This is modest against observed request/message headroom, but request counts alone do not certify CPU latency or concurrent correctness.

As a conservative compute illustration, one continuously active0.25CU endpoint for seven days consumes42CUh; adding the observed main34.54CUh yields76.54CUh. This is an upper-envelope illustration for that fixed compute size, not proof of provider billing, autoscaling or function costs. Do not increase compute size or use this to certify1,000users. Existing periodic rescue continues regardless of UI admission; preserve its scheduler and backups. Monitor after QA and before deployment; stop if headroom or retention cannot be substantiated.

Ably default history limits do not authorize storing coordinates there. The accepted architecture keeps coordinate payloads in the authorized latest-state API, with coordinate-free Ably invalidations; six-hour database recovery history remains explicitly disclosed. No location history or continuous movement is introduced.

Local QA uses the existing supervised synthetic-only worker, explicitly scoped to current FP4 fixture ownership and founder membership. That worker is not Production cleanup infrastructure. Hosted acceptance must separately prove queue/rescue operation and deletion without the laptop worker before canonical promotion.

Private approval receipt: `.git/ms74-fp4/capacity-approval.json`. Live-run receipts track attempts and cleanup. Report latest actual usage again at release; do not replay previous passed investigations or silently expand the budget.

## C.2 operational hold

At closeout26October, dedicated privacy receipts total9consent attempts and651latest-read attempts. Earlier non-privacy browser traffic and teardown were not fully counted, so this is a lower bound; compliance with800/day cannot be certified from those receipts. Further sharing QA is held, not given an assumed149read balance. Private `qa-budget-hold.json` blocks FP4 browser login/worker/privacy entrypoints. Preserve all receipts and counters; conservatively exhaust this day unless complete reconciliation proves otherwise. Before the next day's tests, implement shared accounting across every harness and teardown, then verify available allowance and worker lifetime. This does not renew/increase capacity or slide the expiry date.

Worker and local server stopped; independent isolated DB0payloads/active consents/workers. No Production renewal/env assignment performed. Natural-expiry sender-state acceptance and later hosted privacy/cleanup gates remain incomplete; canonical stays verified FP3.
