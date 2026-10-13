# FP3 P0 snapshot delivery incident — 13 October 2026

## Subsequent authorized investigation — original incident evidence preserved

13October10:34:37UTC, [delivery recovery report](MS7-4-FP3-DELIVERY-RECOVERY.md), anonymous write-once receipt `.git/ms74-fp3/readiness-1791887677152.json`. Existing immutable non-canonical0264500 only; no deployment. First A→B publication begins3720.2ms after recipient attachment completes and is still missing, as is Stop. Later A→B with explicit ordinary/ephemeral probe receipt succeeds; fresh B→A later in same run and receipt-confirmed B→A also succeed.3/4snapshot deliveries; no causal readiness fix established. No deliberate sleep or persistent location fallback. Unknown regional/provider cause remains; no vendor assertion. Full measurement caveats, latency statistics, storage/retention proposal and future privacy gates are in the report. Canonical remains3e06bf9, FP3unaccepted. No modification to historical findings below.

## Final outcome — contained on FP2A, no accepted FP3 repair

Implementation stopped before the two-hour maximum. Canonical and generated project alias both point to verified FP2A **3e06bf9e5c9ec09ee0c3dedb82e5e7088cc41161**, READY **dpl_BeaJBAwSj33GQzxWzE2HRXj5vcLh**, independently rechecked09:19UTC. No database rollback:30 hashes/catalog remain valid, all prior35 tables compatible, consent-only0029 retained. FP3 is **NOT ACCEPTED**; MS7.4 remains unlocked. Git main remains0264500. Vercel rollback pauses auto-assignment until a deliberate future promotion; do not promote unvalidated FP3 to reconcile Git.

The first failing boundary is **acknowledged ephemeral publish → remote attached subscriber receipt**, before B reconciliation/rendering. Authenticated A, exact context, consent, audience and provider ACK succeeded. Normal version-only messages reached the same B feed. Presence is not snapshot evidence. Actual original canonical A→B and B→A failed; retirement failed too.

Further isolation after founder-approved rollback:

- Unchanged source in Singapore (`dd3ef47`, stage8) passes broad/precise/Stop to Singapore A/B. Unchanged optimized local Node22 and24 also pass. A simple regional move is not certified as a reliability fix.
- QA-only coordinate-free cross-region probe `82801eb`,stage9 `dpl_ALShgMyKNnDbz6qsiPEwFegMNXXJ`,had a Virginia subscriber plus normal/control exchange and delivered ephemeral messages both directions. This disproves categorical cross-region incompatibility.
- Attach→publish→close candidate `febe850`,stage10 `dpl_AMzRVHH96swHoCrCif7E5jXkFGVr`,still fails actual broad snapshot and retirement. **Rejected**, not promoted. DB race regression overlapped the API smoke; the observed zero SDK receive events is still the transport failure, not successful rendering. No acceptance inferred from this run.
- Refined probe `efe87c6`,stage11 `dpl_2ZND7XHEG9tGWZNgLUdFG2W5EL1N`,09:15:24UTC: Virginia receives its immediate ephemeral event locally; Singapore misses it. After2seconds, a second ephemeral event reaches Singapore **before any persistent control publish**. The subsequent normal and ephemeral events arrive. This is evidence of a cold regional delivery/readiness discrepancy, not vendor-confirmed root cause. Do not ship an arbitrary sleep or persistent location-message fallback as a guarantee.

All experimental application code removed; `git diff3911488 -- src` is empty. Original FP3 source remains locally for recovery, not accepted for deployment. Failed candidate and diagnostic source survive in local Git history. All11 exact incident-created remote deployments removed with `--safe` after restoring both aliases to FP2A; their URLs no longer serve. Deployment receipts and sanitized observations remain in `.git/ms74-fp3` and this ledger. Original FP3 and verified FP2A deployments were not deleted. No environment/key/provider-permission/billing changes, no extra resource procurement, no provider migration.

### Acceptance and preservation qualification

| Gate | Outcome |
| --- | --- |
| FP2A exact canonical SHA/READY/alias | PASS; existing immutable release restored, not rebuilt |
| FP2A real isolated A/B Join/presence/retained Chat/roster/scoped denial/Leave | PASS08:54:10UTC; one earlier overlapping harness run failed final Leave assertion, sequential rerun passes |
| FP2A browser Map/Chat/Board, Live Join→Board navigation→Leave | PASS with isolated B; no founder session used during P0 |
| FP3 real deployed snapshot delivery | FAIL; no release candidate accepted |
| Room/Subroom/Personal revocation, Sandbox/forgery denial, fixed expiry, Stop failure, schema and DB dispatch race | Rechecked PASS with isolated actors and rolled-back DB/injected transport tests; not claimed as deployed end-to-end snapshot acceptance |
| Natural five-minute client expiry, reload/reconnect and full client privacy matrix | Prior local evidence retained; not rerun/certified against a repaired canonical because none passed transport |
| Restored source TypeScript, targeted lint, optimized build, both server-key source/client scans | PASS; no temporary diagnostics remain in application source |
| Fresh runtime error/fatal scan | No records09:00–09:20UTC; not proof of working FP3 snapshots |
| Founder preservation | No new P0 drift. Strict audit still fails only the pre-P0 founder Sandbox read marker04:41:17.526→07:22:24.744UTC; all other protected hashes unchanged. Baseline not rewritten and no data restored |

Final exact metadata cleanup backed up and removed2additional QA rate rows,0consent rows; earlier incident cleanup removed4. No Room/content deletion or quota reset. Keep all three founder-accessible review Rooms: `ms74-fp1-qa-a39d9eea` (Live/workspace), `ms73-founder-review-904a9dea` (Singapore Map), `ms73-qa-bfff9475` (protected founder QA content). SDK test sessions/clients closed/revoked. Browser QA sessions are logged out as part of closeout. Geoapify new P0 server queries2, cumulative FP3 queries11; no road calls. Browser basemap requests are separate. Ably plan/restrictions unchanged;4480/6M is the historical pre-P0 account reading, **not a fresh final total**.

### Recommended next investigation (not executed)

Prepare a founder-approved Ably support escalation using only version/nonce events, timestamps, SDK2.28.0, Node24 and the cold/warm regional observations. Ask for supported ephemeral-channel readiness/delivery semantics and provider-side correlation. No credentials, coordinates, personal labels or raw user/channel identifiers in an external report. No support ticket sent. Any future repair must pass the complete requested real A/B privacy/expiry/reconnect matrix and cold cross-region tests before promotion. No permanent regional pinning, new provider or persistence compromise approved.

## Current containment — 16:54 SGT

Update08:59:31UTC: unchanged application Singapore-stage `dd3ef474803d1d7c3351efe4c7d8e08fceb68471`,READY dpl_Fran2BDwGsbTjW9cs5hfRsmLxbFC,`tosker-9g950uhxq-pangea6.vercel.app`,regions[sin1],passes A→B broad/precise/fixed expiry/forgery/Stop/scoped denial/Live,zeroGeoapify. Fresh alias confirms canonical remainsFP2A. Browser B joinsLive,navigatesBoardwithpresenceintact,returnsMap/Chat,leaves; retained Board content reads correctly. No content writes. Local server-secret/source/client scan744files43bundles passes,TypeScript passes. Temporary QA-only regional echo diagnostic82801eb next distinguishes same/cross-region; only version+randomnonce persist, no coordinates/identity payload. No new provider grants or environment config. Region is deployment-only, not project default.

Founder approved early restoration and continuing diagnosis within the original two-hour limit. Exact FP2A `3e06bf9e5c9ec09ee0c3dedb82e5e7088cc41161` / `dpl_BeaJBAwSj33GQzxWzE2HRXj5vcLh` restored using Vercel rollback; canonical alias independently verified. Fresh canonical real A/B smoke passed08:54:10UTC with no provider request; browser shows FP2A Map/Chat and sharing control absent. Error log scan08:42–08:52UTC returned no records. No DB reversal, key/billing changes or data deletion. Main remains0264500; rollback pauses auto-assignment until deliberate promotion.

First canonical smoke overlapped the Node24 local A/B smoke and failed its final presence-leave assertion; phase attribution was inadequate. Rerun sequentially with explicit leave phase/one-second propagation bound passes. Do not suppress this harness qualification. Node24 local unchanged optimized0264500 passes broad/precise/Stop and scoped A/B,08:52:36UTC, excluding Node major version alone as sufficient cause. Next one staged regional diagnostic, not a release: same restored source, one Singapore deployment region, no canonical assignment/project-default change/provider migration. No new Geoapify calls. Deadline remains09:45:20UTC.

Founder explicitly authorizes two hours of focused repair, starting15:45SGT /07:45UTC; implementation deadline17:45SGT /09:45UTC. If unresolved, verify previous FP2A compatibility and restore only if safe; never roll back migrations blindly. No generic proceed approval needed. No new features/provider/billing/media work.

Recovery: HEAD3911488; main/canonical0264500; READY dpl_EeJQvaso97gJuaGhT8S6oc2SzYk7 and exactalias.30 migration hashes/catalog pass; additive consent-only0029 unchanged. All unrelated WIP and historical read-marker qualification preserved.

Boundary evidence: explicit consent and authenticated/context-authorized API returns valid snapshots on canonical, but B's attached feed receives none. Existing local SDK can publish an identical ephemeral payload to the canonical-token B subscriber. **Optimized local Production build of0264500 independently passes broad/precise/Stop/fixed refresh/forgery/scoped authorization and Live presence** (07:47UTC, isolatedQA). One bounded Tokyo search passed; no saved place/content mutation. This is local-production evidence, not a repaired canonical.

Next: staged Production-only anonymous dispatch counts (provider acknowledgement count, recipient count, failed count), no coordinates/labels/identities/IDs/credentials or persistent diagnostic messages. Do not move canonical before the boundary and critical tests pass. No environment/key changes; existing Free quotas remain.

## 16:20 SGT boundary checkpoint

Canonical alias remains0264500. Staged diagnostics only:6332879→dpl_6aiPt45RhMFzoHYAfHsAU6zeiLei;cb0c20b→dpl_AkB6w347i5p5zt6W4MoEZZMWD8St;6821440→dpl_FgM8EJi8Huh3HmH9iiCcb8bxsTWy;3ff91c9→dpl_FuN9yN4maiFsM9Apvj7K7N4wpkAY. All targeted existing Production environment with `--skip-domain`; the generated project alias moved, canonical did not.

Two recipients resolve and both provider acknowledgements contain one non-null serial. One-way hashed application/channel correlation matches the local publisher and B subscriber; no key, raw identity, coordinates or labels logged. Custom-ID removal, explicit SDK JSON, and direct ephemeral REST each fail to produce B events; retirement also absent. These experiments are **not accepted fixes**. Both isolated SDK B and normally authenticated isolated browser B fail to display the staged broad snapshot. Existing Map/Chat UI loads.

Room/Subroom/Personal revocation, Stop transport-failure invalidation, expired consent, unavailable-area denial and schema lifetime/precision/session constraints re-pass with rollback/no retained content writes. No additional Geoapify calls in staged tests. Next compare version-only normal/ephemeral diagnostic messages on the same authorized feed, never persist a location payload. Remove diagnostic code before any accepted repair release.

Rollback preflight source comparison:0029 only adds `location_shares` plus its own indexes/FKs/checks; prior FP2A schema otherwise byte-identical. Runtime/read-only data compatibility and exact alias verification remain required before any rollback. No database reversal authorized or performed.

## 16:43 SGT containment checkpoint

First failing boundary narrowed to deployed ephemeral delivery: staged ordinary `p0.transport.normal` `{version:1}` arrives on B's attached feed; ephemeral version-only probes, snapshot and retirement do not. Direct REST returns201 and confirms the expected channel. Application/channel digests match. A bounded server WebSocket ephemeral probe and five documented Ably fallback-host probes also produce no observed ephemeral event (fallback per-host acknowledgement not captured, so do not claim each host accepted). No location payload was sent persistently. All diagnostics stay behind existing deployment protection and are NOT canonical fixes.

Further staged receipts:9ce43c1→dpl_BbvRt4ua4Jtja3WipJ6LhfSsLac7;ca7dc47→dpl_C5Lm7HM5vGkBmSuLbuLVSs66UXHo;8a7a847→dpl_BqE16pNsHiqnitxwBXAmCaXrqBrk. Reverse canonical B→A also fails. Unchanged optimized local0264500 passes again08:29UTC with zero new Geoapify calls. This rules out a provider-wide outage in this observation window, but underlying provider/runtime cause remains unproven. Do not describe these transport experiments as repairs. Experimental application changes have been removed; `git diff3911488 -- src/server/location-sharing` is empty.

Exact previous FP2A immutable deployment `tosker-jx4c5rym4-pangea6.vercel.app`,READY dpl_BeaJBAwSj33GQzxWzE2HRXj5vcLh,3e06bf9,passes fresh real A/B presence,Join,roster,retained Chat reads,selected-Subroom denials,Leave independence and one bounded Geoapify query at08:36UTC. Sharing endpoint404. Snapshot comparison proves all35 prior tables/enums/indexes/columns unchanged; only `location_shares` is additive. No DB rollback is required. Preflight receipt `.git/ms74-fp3/p0-rollback-preflight.json`. This does not claim the canonical alias has moved.

Four exact A/B location-rate rows removed after private0600 recoverable backup; zero consent rows remained. No Room/content/founder removal and no provider quota reset. Earlier cleanup count2 is historical. Retain all three founder review Rooms. Total new P0 server geocoding calls2 (one local-production smoke, one rollback preflight), no road calls; cumulative FP3 server queries11. Free plan/keys/restrictions unchanged.

Founder was asked specifically whether to restore verified FP2A **before** the two-hour deadline; no early rollback without that answer. Original17:45SGT maximum remains. Once rollback is authorized/due, use exact existing FP2A deployment,verify aliases/live A/B/runtime/browser,save recovery,STOP. Vercel rollback disables production auto-assignment until a later deliberate promotion; record main0264500 versus canonicalFP2A divergence rather than resetting Git.

Official references consulted: [Ably ephemeral semantics](https://ably.com/docs/pub-sub/advanced), [REST publish](https://ably.com/docs/api/rest-api), [edge/fallback routing](https://ably.com/docs/platform/architecture/edge-network). Public status reported operational, not evidence that this application flow succeeds. No vendor support ticket or account configuration change was made.
