# MS7.4 FP3 — post-reset recovery and next-wave plan

14 October 2026. **Planning only; STOP pending explicit founder execution approval.**

Authority: founder attachment `8b8825ec-675e-4162-827b-6aa9f9267626/Pasted text.txt`, read in full. This supersedes older automatic continuation instructions. No app changes, migrations, provider/configuration/credential changes, server start, new QA, push or deployment occurred in this planning pass. Only this recovery plan and a scoped handoff entry are checkpointed locally; unrelated Art/Design/Web work remains untouched.

## 1. Verified recovery state

| Item | Evidence and status |
| --- | --- |
| Repository / branch | `/Users/ryanc/Developer/toskerapp`, `codex/ms74-foundation` |
| Recovered HEAD | `6ec0e3b1013580fc10d2b1ea51ba058dd6848924` |
| FP3 application | `2aecb438f39581137ea7bc39b52eb01430540340`; no app/package/migration/Next-config diff from candidate to recovered HEAD |
| Canonical, freshly inspected | `https://toskerapp.vercel.app`, READY `dpl_BeaJBAwSj33GQzxWzE2HRXj5vcLh`; authenticated deployment metadata gives exact FP2A SHA `3e06bf9e5c9ec09ee0c3dedb82e5e7088cc41161` |
| Protected FP3 stage, saved receipt | `dpl_8MNff9dgwkE9ZYEoqbLM86Lio1Xz`, `tosker-kv4f3isg9-pangea6.vercel.app`, exact `2aecb43`, no canonical aliases. Not accepted. Never promote diagnostic overlay `dpl_BV5ZeaefzRoFGmQEbWDA1XCVqqEa`. |
| Database, fresh read-only check | At `2026-10-14T01:09:56.381Z`: all 33 migration hashes/timestamps match local journal; zero location payloads, consents, workers and cleanup obligations. No pending migration for this candidate. |
| Founder protection | Exact TID `8V3X7P1` resolves once; all three retained review memberships present. This limited fresh check is not a new full founder-content fingerprint. Preserve prior qualified Sandbox read-timestamp drift; do not claim a pristine baseline or rebaseline it. |
| Durable cleanup | Neon `toskerfp3rescue`, deployment 2, hourly rescue trigger retained. Fresh database heartbeat `2026-10-14T00:35:00.756Z`. Existing queue/rescue acceptance evidence retained; no job changed. |
| Temporary management key | Prior authenticated Console absence and HTTP 401 establish revoked Neon management key. No second revocation or key use needed. Runtime does not depend on it. |
| Browser-key restrictions | Prior closeout removed temporary exact staging Referer. Last uncached evidence: stage 401, canonical/localhost 200. No new provider probes here; no restriction changed. |
| Local preview | No listener on port 3000. Shared writable Development database makes an ordinary local Founder Walk unsafe. |
| Working tree | Existing handoff hunks, cross-project inheritance changes and untracked Art/Design/Web/research/experiment material preserved. Index initially empty. |

Retained rooms: `ms74-fp1-qa-a39d9eea` for Live/workspace/location acceptance; `ms73-founder-review-904a9dea` for Map review; `ms73-qa-bfff9475` contains historical founder content. None is scheduled for deletion. Preserve founder membership and retained content; any new fixture must resolve exact TID server-side and obey exact-ownership cleanup.

Read evidence: [progress audit](MS7-4-FP3-PROGRESS-AUDIT-2026-10-14.md), [latest-state ledger](MS7-4-FP3-LATEST-STATE-EXECUTION.md), [closeout](MS7-4-FP3-FINAL-CLOSEOUT.md), [delivery recovery](MS7-4-FP3-DELIVERY-RECOVERY.md), [incident](MS7-4-FP3-P0-INCIDENT.md), relevant architecture/cleanup ADRs. Receipt directory: `.git/ms74-fp3/` (private, do not publish credentials or raw sensitive evidence).

## 2. Acceptance matrix — preserve passed layers, complete missing layers

**COMPLETE below means the named layer, not total FP3 acceptance.** Saved protected-stage HTTP tests exercised real Clerk, database, queue and Ably. Service-context tests used real isolated actors/database but an injected publisher. Earlier local browser evidence is not current protected-stage two-browser acceptance.

| Gate | Status / existing evidence | Exact outstanding work |
| --- | --- | --- |
| Latest-state API | COMPLETE at hosted API layer: broad A→B, precise B→A, authorized latest read, content-free hints | Current two-browser reconciliation/rendering in both directions |
| Locate ON/OFF, private position | IMPLEMENTED BUT UNVERIFIED on final hosted browser candidate; older local synthetic ON/OFF passed | Synthetic permission allow/deny/timeout; stable Locate label/active state; OFF removes own marker/origin and stops sharing; no real GPS |
| Fixed temporary origin | Implemented; origin must remain fixed, not silently follow refreshed location | Confirm origin/card/route behavior after later private fix, OFF and context switch; distinguish own marker from fixed route origin |
| Keep Private / broad / precise | Older local UI defaults, Keep Private, area NULL coordinates, explicit precise consent passed | Current sender and receiver UI, exact audience, default broad, explicit confirmation, cancel/Escape, denied permission; no precise leak from Locate alone |
| Five-minute expiry | COMPLETE hosted natural expiry/deletion: observed deletion upper bound 1318 ms after expiry | Browser countdown/state and bounded peer removal while online, reconnecting, hidden and after tab resume; never display stale coordinates |
| Manual refresh | COMPLETE API fixed-expiry refresh; six content-free `{version:1}` hints | Verify refreshed permitted state without extending expiry. QA refresh controls remain Development-only; normal Production renewal is explicit Locate OFF→ON consent, not a new CTA |
| Stop Sharing | COMPLETE API bidirectional empty-state and service race coverage | Two-browser OFF, pending begin race, outage/deletion-unconfirmed retry, stale response suppression and measured removal bound |
| Cold / warm / late subscriber | COMPLETE hosted API cold publish-before-attach/new SDK connection/two receivers | Explicit subscription/read readiness, UI cold/warm A→B and B→A; no arbitrary sleeps or assumption presence proves delivery |
| Peer removal | Implemented request-start-bounded five-second display freshness | Measure authorized UI disappearance on Stop/revocation/network loss; reject late responses; retained pixels/previously disclosed coordinates cannot be recalled |
| Membership / session revocation | Service/context and selected HTTP denial coverage passed | Actual sender and receiver browsers after membership removal, logout/session invalidation; stale in-flight reads and reconnect must not restore markers |
| Room / Subroom / Personal | Service audience, relation/member revocation and hosted denial cases passed | Browser cross-context navigation and authorization matrix; selected/everyone audience as implemented; no cross-context reuse |
| Sandbox | Service denial and older private-only UI passed | Final UI private-only, no share prompt/publish; exact isolated actor |
| Reconnect / multiple tabs | API new connection and two-receiver evidence passed | Two actual tabs, cold/warm reconnect, navigation, one owner/subscription lifecycle, no stale state resurrection or duplicate listener |
| Live / Chat / Board continuity | Deterministic composition and transport suites passed; partial older browser evidence | Affected Join/Leave/navigation/reconnect checks; preserve draft, active panel, camera and Live state according to existing lifecycle contract |
| Production-only UI gating | COMPLETE build/source layer, QA controls compiled out | Final hosted visual check: no debug/manual-refresh/private fixture controls leak; honest expired/unconfirmed states |
| Responsive / accessibility | Partial older 320/390/430/768/1440/1728 screenshots and keyboard/default/Escape/focus checks | Current consent, errors, precise markers, companion/expanded states at all six widths; tab order/focus return/visible focus, touch targets, reduced motion; viewport tests are not physical-device certification |
| Production cleanup / retention | COMPLETE hosted queue, retry/failure bounds, rescue schedule and natural expiry layers | Fresh operational health and release-environment wiring check; preserve independent rescue/old consumers until drained, no repeat exhaustive passed probes |
| Backup disclosure | COMPLETE policy/design: five-minute logical expiry, healthy cleanup target ≤60 s, outage hourly rescue, six-hour recovery history | Final user-facing disclosure must distinguish active deletion, outage delay and backups; never promise immediate erasure from every backup |
| Build / security / migrations | COMPLETE at candidate: build/typecheck; lint zero errors/two pre-existing warnings; 805 source/owned files and 43 client assets scanned; 33 migrations/catalog checked | Repeat only affected checks after changes or new artifact; release artifact secret/client scan and exact SHA binding mandatory. Surviving local build is not that verified receipt. |
| Capacity / latency / provider usage | BLOCKED release gate: current final dashboard totals and representative browser performance absent | Fresh Free-plan usage, projected polling/cleanup load, bounded p95/error measurement. Eight hosted reads 413–1687 ms are not p95 or browser responsiveness acceptance. Do not reset counters/raise caps. |
| Founder integrity | Prior qualified preservation evidence; fresh exact identity/membership and zero-state checks | Compare protected retained-data baseline at release; disclose known read drift, no broad cleanup/profile edits |
| Canonical | BLOCKED by missing browser/privacy/capacity gates | Explicit next-wave approval, all critical gates green, scoped app commit/build/scan, exact deployment SHA, live A/B smoke and recovery receipt |
| GitHub consolidation | NOT STARTED (intentionally ordered after release) | Separate documentation commit after canonical verification; no false deployed claims |

Existing capacity controls: 100 new consents/day, 2,000 latest reads/day, bounded Clerk session checks (30/10 s, burst 60), seven-day deployment attestation. A continuously viewing client at one read/3 s consumes 1,200 reads/hour: 2,000 is approximately **1.67 aggregate viewer-hours/day**, not a 200-user beta certification. Existing attestation dated `2026-10-13T18:49:57Z` must not be blindly renewed. Final dashboards are not freshly certified by this planning audit.

## 3. Local Map failure and safe review recommendation

### Evidence, not a speculative MapLibre replacement

Presence-only environment inspection confirms the Development env has both Geoapify keys; `.env.local` has neither. Both database URLs resolve to the same host/database. No credential values were emitted. Starting a production-mode Next server does not make `.env.development.local` browser values appear in an already compiled client bundle.

The surviving `.next` build exists (BUILD_ID mtime `2026-10-13T18:47:26.121Z`). All 29 current client JS assets were inspected: the configured public browser key is absent. The Map-provider chunk retains a runtime `env.NEXT_PUBLIC_GEOAPIFY_MAP_KEY` default instead of an inlined configured value; the provider helper returns null without a valid key. **This is a concrete static build/environment mismatch and the strongest current lead**, not a runtime reproduction of the founder's historical failure. The saved successful candidate scan covered 43 client assets, so do not assume this surviving build is the exact verified artifact.

MapLibre 6.11.2 worker/shared files exist and byte-match installed dependencies. Source also falls back for SDK/import/WebGL/style errors and a 20-second initialization timeout, with bounded manual retries. Its generic failure UI cannot identify the cause alone. No fresh browser console/network diagnostics were collected: app is stopped and the writable environment is unsafe. Prior uncached localhost style access passed, while staging required its separate temporary Referer. No evidence establishes a defective renderer.

After authorization: verify isolated env and build-time public binding first; then inspect sanitized style/tile HTTP statuses, worker asset/MIME/CSP and WebGL/import errors. Never print request URLs containing keys. Rebuild only when needed to produce a correctly bound, SHA-recorded isolated artifact. Runtime-env fixes alone cannot repair missing compiled public values.

### Recommended isolation

Use a **schema-only Neon review branch**, branch-only credential and explicit local environment allowlist, containing only approved synthetic QA data. Do not clone retained founder rows into a disposable environment. Neon documents schema-only branching (beta), with Free root-branch limits; verify actual integration availability, branch allowance, storage and compute headroom before creation. Free compute is shared across branches; eight active hours at 0.25 CU is about two CU-hours before tails/other activity. No paid upgrade is authorized. [Neon schema-only branching](https://neon.com/docs/guides/branching-schema-only), [plan limits](https://neon.com/docs/introduction/plans).

Isolation must cover more than DATABASE_URL:

- Audit Clerk bootstrap/webhooks and account/session actions. Resolve founder exact TID read-only; any minimal isolated identity/fixture projection needs scoped approval, no duplicate account and no canonical profile/settings changes.
- Keep isolated A/B actors. Existing synthetic admission admits specific QA actors/contexts; a founder third participant is not automatically admitted to sharing. Do not bypass that guard to make a walkthrough work.
- Isolate Ably contexts **and user-level channels**; distinct room IDs alone may not isolate notifications. Confirm namespaces and endpoints before enabling local actions. Do not broaden provider permissions implicitly.
- Branch-only cleanup worker and data assertions; local worker is adequate for local synthetic review, never evidence of durable Production cleanup.
- Synthetic GPS only; original founder session/location untouched. The full protected-hosted acceptance remains a separate gate against exact owned review fixtures.

A read-only snapshot preview could show layouts but cannot truthfully exercise Chat/Live/consent lifecycle: normal conversation entry can write read timestamps, and bootstrap/actions may fail on a read-only DB. It is not an adequate substitute for the requested functional walk. If schema-only isolation is unavailable under current Free limits, stop and propose a disposable schema-only database; do not silently use main. No branch, environment or app process was created here.

## 4. Bounded UX proposal and Founder Walk

UI/UX, frontend-design and UX-designer skills informed this source-based proposal. No fresh usability study or current-screen visual acceptance is claimed. Target: Ryan/Jenn and small groups, desktop planning plus narrow-screen coordination; intended outcome is clear state and control, using existing Tosker tokens, not an MS8 redesign.

**Live priority:** `src/components/live-panel.tsx` repeats “Presence only,” “Live, together,” explanatory text, joined state/count and a long lifecycle paragraph. Consolidate into one context header/count, legible participant roster, one Join/Leave action area and one truthful connection-status line. Keep a concise “Presence only—no microphone or camera” capability disclosure. Companion mode should be vertically compact; expanded mode can use the same roster with responsive spacing. Preserve identity, pending/failed/reconnecting feedback and keyboard focus. Joined is not proof of location consent, global online status, or active voice. No microphone controls, speaking animation or media procurement.

Other bounded debt: distinguish temporary route origin from private/current/shared markers; make failed Stop recoverable without claiming peers were cleared; keep one Locate action and compact status; preserve camera and drafts while switching panels. Correct clipped/focus/target defects discovered in acceptance, not an artistic overhaul.

Founder Walk after acceptance:

| Area | Walk sequence / expected truth |
| --- | --- |
| Map location | Locate allow/deny → private marker + fixed origin → Keep Private / broad / explicit precise → peer status → expiry / OFF; clear audience and no background tracking |
| Map planning | Search → choose → preview → explicitly add; Location Card vs independent Map Pin; route reorder/skip vs private Hide; routing mode/region/error/ETA truth; origin behavior |
| Map controls | Fit, expand, collapse tray, focus and marker selection; temporary Ping expires, private unless separately consented; no extra provider calls for Ping |
| Workspace | Map+Chat, Map+Live, Board+Chat, Board+Live, Live+Chat; supported single surfaces; switch both ways, retain drafts/camera/Live ownership; narrow layout one usable foreground surface |
| Live | Empty/one/many participants, Join pending/success/failure, Leave, connection interruption/recovery, companion vs expanded; lifecycle on navigation/background exactly as implemented |
| Accessibility | Keyboard-only action/consent/escape/focus return, screen-reader state names, narrow touch targets and reduced motion; no hidden focused controls |

## 5. Prioritized language debt — proposals only

| Priority | Finding | Proposed direction / invariant |
| --- | --- | --- |
| P0 | Stop/deletion uncertainty can sound like success | “Stopped on this device. We couldn’t confirm removal. Select Locate to retry.” Keep expiry/recovery detail; wording must match actual retry behavior. |
| P1 | Map canvas accessible label says no live location is shared even when explicit sharing may be active | Context-neutral planning-map label plus accurate separate sharing status; do not weaken consent disclosure |
| P1 | User-facing “snapshot” / “authorized participants” | Prefer “temporary location” / the actual Room or selected audience in everyday controls; retain exact storage semantics in privacy detail |
| P1 | Repeated Live headlines, status and long instructions | One title/count, one state, one action; capability and lifecycle detail concise and available, not duplicated |
| P1 | Precision phrasing is technical | “Broad area” default / “Precise location” explicit; explain who sees what before confirmation |
| P2 | Verbose retry and prototype labels | “Retry map” with accessible explanation and same retry bound; audit rendered “Hall” legacy copy without renaming schemas/compatibility code |
| P2 | Development QA language | Verify absent in Production; do not remove useful isolated QA controls from Development merely for appearance |

Preserve meaningful distinctions: Map Pin vs Route Location, viewer-private Hide vs shared Skip, presence vs location vs future voice. No copy changes made.

## 6. Documentation consolidation — after verified release

README is materially stale (early messaging/local-storage/no-auth-or-database narrative). Replace its current-product entry point after release with: map-native social coordination; “Create a group → Plan together → Go together → Stay connected”; Rooms as social foundation, Map flagship, Chat/Board/Live supporting surfaces. Include a capability table separating deployed FP2A, accepted FP3 only when verified, research-only FP2B and unimplemented movement/media/notifications.

Document actual stack/provider boundaries, privacy/retention and Free-plan limitations, verified isolated setup, developer checks, release/recovery links. Align VISION with Room ownership and Map-native coordination, not a false claim that continuous movement exists. Give ROADMAP a dated authoritative current section while preserving historical milestone numbering as history. Handoff should link a concise current state to evidence rather than erase old reports. Archive/index historical material without deleting unverified or unrelated files. No README rewrite now; documentation commit separate from application commit after canonical verification.

## 7. Google Maps research — no procurement or migration

Official public sources checked 14 October 2026. No paid API, representative Google query or new credential was used, so relative search/routing accuracy remains a hypothesis requiring a paired benchmark.

### Separate the five responsibilities

Renderer draws map/styles/markers. Discovery finds places. Routing computes roads/ETA. Device geolocation supplies a permitted device fix. Tosker owns consent, audience authorization, latest state, expiry/revocation and reconciliation. Google does **not** replace that fifth layer, Ably or durable cleanup; device GPS does not require buying Google's Geolocation API.

| Dimension | MapLibre + Geoapify (current) | Google Maps + Places + Routes | MapLibre + independently licensed services |
| --- | --- | --- | --- |
| Discovery / worldwide coverage | Open-data foundation; observed Singapore postal/POI imperfections. Explicit choice/preview remains necessary. | Broad place products, autocomplete, bias/restriction/languages; potentially stronger business POIs, not locally proven better. | Benchmark regional/global discovery independently; more integration/licensing combinations. |
| Routing | Existing provider/region limits and truthful failure handling; no guaranteed global accuracy. | Traffic-aware options and feature-by-country coverage; higher-feature SKUs can cost more. | Choose road provider independently; normalize profiles, attribution, errors and geometry. |
| Rendering / customization | Existing MapLibre styles, HTML markers/avatars, control stack. | Cloud styles/map IDs and custom HTML markers support similar concepts, but renderer port is real work. | Preserve renderer/control investment; swap adapter behind explicit capability boundaries. |
| Mobile | Current web/WebGL; native MapLibre is separate platform integration. | Web JS and native SDKs; SDK availability does not make Places/Routes free or remove Tosker work. | Browser/native compatibility must be tested per chosen service. |
| Movement | First-party consent/latest-state architecture in every option; neither renderer supplies Tosker authorization. | Same. | Same. |
| Risk / recommendation | Keep for FP3; measure actual tiles, search success and road failures. | Evaluate later, not bundled with FP3 rescue. | Preferred architectural direction: replaceable renderer/provider boundaries, independently licensed sources, explicit provenance. |

Feature references: [Google search](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchText), [coverage](https://developers.google.com/maps/coverage), [traffic routing](https://developers.google.com/maps/documentation/routes/traffic_on_polylines), [HTML markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/html-markers), [cloud styling](https://developers.google.com/maps/documentation/javascript/cloud-customization), [MapLibre API](https://maplibre.org/maplibre-gl-js/docs/).

### Rights are a design constraint

Under Google's standard non-EEA service terms, ordinary Places and Routes content cannot simply be displayed on a non-Google map. **Places UI Kit has an explicit non-Google-map allowance**, but it is a distinct product with its own restrictions, not blanket permission for headless Places endpoints or permanent Tosker cards. Applicable terms depend on the billing jurisdiction; confirm it before procurement. [Google service terms, Places/Places UI Kit/Routes](https://cloud.google.com/maps-platform/terms/maps-service-terms).

Place IDs may be stored indefinitely; other Google content has caching/storage restrictions and exceptions. A 30-day latitude/longitude allowance is not permission to retain every place field indefinitely. Attribution, public terms/privacy requirements and a field-level refresh/deletion/provenance design must precede migration. Keep user-authored notes/pins and device fixes distinguished from provider-derived content. [Places policy](https://developers.google.com/maps/documentation/places/web-service/policies), [Routes policy](https://developers.google.com/maps/documentation/routes/policies).

Geoapify explicitly permits storing geocoded address/location results, subject to applicable source licensing and attribution; this is not a universal license for photos/reviews or unrelated providers. Free usage retains Geoapify/OpenStreetMap attribution. MapLibre's BSD renderer license does not license map tiles or search data. [Geoapify geocoding](https://www.geoapify.com/geocoding-api/), [terms](https://www.geoapify.com/terms-and-conditions/), [MapLibre license](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt).

### Costs: model active usage, not registered accounts

Google monthly free caps / first paid USD per 1,000: Dynamic Maps 10,000 / $7; Text Search Pro 5,000 / $32; Place Details Pro 5,000 / $17; Compute Routes Essentials 10,000 / $5. These are separate SKUs; field masks/features may change the billable tier. [Google pricing](https://developers.google.com/maps/billing-and-pricing/pricing). Billing setup is required for Maps JavaScript even when usage fits free allowances; no such setup is authorized here. [Usage and billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing).

Illustrative Google model (not a quote): per monthly active user, 10 map loads, 10 submitted Pro searches, five Pro details and five Essentials routes. 200 MAU produces 2k/2k/1k/1k requests: $0 base SKU charges. 1,000 MAU produces 10k/10k/5k/5k: approximately $160/month. Heavy use at 1,000 MAU with 30/30/10/10 requests yields approximately $1,025/month. Excludes autocomplete, photos, traffic upgrades, tax and Tosker infrastructure. Registered users are not MAU; concurrency independently drives transport and database load.

Geoapify Free is 3,000 credits/day, five requests/second; paid API 10 currently lists $59/month, not authorized. Map tiles cost 0.25 credit, basic geocoding one credit, routing depends on waypoints/distance. [Pricing](https://www.geoapify.com/pricing/), [credit accounting](https://www.geoapify.com/pricing-details/). Assuming **40 tiles/map load** (not measured), 10 loads + 10 searches + five two-point short routes per MAU is 115 credits/month: 200 MAU ≈23k/month (~767/day); 1,000 MAU ≈115k (~3,833/day), exceeding Free even on average. Daily peaks and current app caps (120 geocodes/day, 60 road credits/day) can bind sooner. Measure tile requests before any capacity claim.

**Recommendation:** keep MapLibre + Geoapify for FP3; no evidence yet justifies migration cost or storage-rights disruption. Next research gate is a bounded paired benchmark: Singapore postal/building/entrance/MRT queries, branch ambiguity, Johor, Tokyo/Kyoto/non-Latin and another region; public authoritative venue/address ground truth; search relevance, result choice effort, latency, route plausibility, failure handling and cost. Six public route pairs across walk/drive/cross-border cases, not user locations. Keys, billing and explicit request budget require separate approval. A renderer/provider migration is provisionally 24–40 engineering plus 12–20 QA hours before rights/data complications—separate multi-wave work, not FP3 scope.

## 8. Hannan / original Tethr questions

Only known fact: approximately four-second location updates. Source unavailable; do not infer architecture.

Ask Hannan: (1) exact renderer/tile/search/route providers; (2) device GPS API/accuracy filters; (3) timer versus watchPosition, actual send cadence and distance threshold; (4) REST/WebSocket/provider transport; (5) server/runtime/regions; (6) latest-only state versus history, TTL/backups; (7) group authorization and membership removal; (8) reconnect/resubscribe/cold-recipient recovery; (9) background/screen-lock behavior by browser/OS; (10) battery/network consumption; (11) measured acquisition-to-peer-render latency versus animation cadence; (12) monthly active/concurrent participants, provider requests and real operating costs. Request diagrams/config descriptions or anonymized metrics, never credentials or people's tracks.

Map answers against Tosker's five layers, especially permission/expiry/deletion and failure recovery; a four-second animation is not proof of four-second fresh GPS delivery. Interview and synthesis remain pending external input.

## 9. Future movement and milestone alignment

Movement is planning only. Separate approval must define foreground-only explicit audience consent, broad/precise choice, maximum session length/renewal, stale status, membership/session revocation, retention, background suspension and budget. Proposed automatic cadence **no faster than 60 seconds**; do not turn FP3 manual refresh into tracking. That is at most 60 publishes/hour versus 900 at four seconds, but polling/fan-out costs do not disappear. Do not invent/interpolate fresh positions. Future voice-activity ripple is a separate signal and consent/media architecture, not a GPS transport trigger.

Current authority: MS7.3 LOCKED; MS7.4 active/unlocked; FP1 presence and FP2A composition canonical; FP3 latest-state sharing unaccepted; FP2B voice/video research complete, implementation unauthorized. MS7.5 Notifications; MS7.6 settings/customization/uploads/account controls/functional completeness; MS8 full visual/UIUX; MS9 Private Alpha; MS10 mobile; MS11 desktop; MS12 Public Beta preparation/provider procurement/capacity. Older repo numbering conflicts with this newest directive and must remain labeled historical. MS14 Commercial Foundation per founder's 14 October eligibility declaration; reassess earlier if commercial activity starts. MS15 production-launch priming remains a later direction, not certification. **MS13 exact scope needs founder roadmap confirmation**; do not transplant a stale milestone label. No Gizmos, Pages, marketplace or unrelated expansion.

## 10. Realistic execution estimates and approvals

Focused work hours, not elapsed delivery guarantees; external login/approval/provider delays excluded. Planning research already done is not charged again as future work.

| Workstream | Engineering | Testing/review | Deployment | Documentation | Total / main risk |
| --- | ---: | ---: | ---: | ---: | --- |
| A — remaining FP3 gates + release | 1–3 | 4–7 | 1–2 | 1 | 7–13 h; browser/privacy/capacity failures can block release |
| B — safe isolated review | 2–3 | 1–2 | 0 canonical | 1 | 4–6 h; Free branch capacity, identity/channel isolation, artifact binding |
| C — bounded functional UX | 2–3 | 1.5–2.5 | bundled later | 0.5 | 4–6 h; no MS8/media scope |
| D — language cleanup | 1–2 | 1–2 | bundled later | 0.5 | 2.5–4.5 h; preserve consent/recovery semantics |
| E — post-release docs | 0 | 0.5 | 0 | 1.5–2.5 | 2–3 h; historical/milestone reconciliation |
| F — provider research | desk comparison complete | future benchmark 2–4 | 0 | included | No migration; benchmark requires separate key/billing/request-budget approval |
| G — Tethr follow-up | 0 | interview 0.5–1 | 0 | 0.5–1 | 1–2 h plus Hannan availability |

**Recommend B → A → E, 13–22 focused hours.** This is more than the old 6–12-hour closeout estimate because it includes the newly required isolated review environment, build mismatch and current acceptance/capacity verification. C/D are separately approved follow-up, except genuinely critical acceptance defects. An unexpected architectural/privacy failure could add 4–8+ hours; checkpoint and re-estimate rather than silently start another wave.

Approval requested for: a schema-only Free-plan review branch and least-scope local credential/workflow, bounded synthetic fixtures and reviewed identity/channel isolation; repair only demonstrated Map build/config or acceptance defects; finish missing FP3 gates; canonical only after all critical gates pass; then separate documentation consolidation. Any required temporary exact staging Referer allowance must be specifically included and removed afterward, preserving original restrictions. No new broad permission, paid plan, Google key/procurement, media, movement or MS8. Fresh provider capacity is a hard gate, not a promise of zero incremental cost or permission to raise quotas.

## 11. Recovery / restart / stop

This planning checkpoint is documentation-only. Resolve its exact SHA with:

```sh
git -C /Users/ryanc/Developer/toskerapp log -1 --format=%H -- docs/MS7-4-FP3-NEXT-WAVE-PLAN-2026-10-14.md
git -C /Users/ryanc/Developer/toskerapp status --short
git -C /Users/ryanc/Developer/toskerapp diff 2aecb438f39581137ea7bc39b52eb01430540340 HEAD -- src package.json package-lock.json drizzle next.config.ts
```

Next execution order, **only after approval**: verify this checkpoint and unchanged canonical → validate actual isolation capacity/authority → provision schema-only review and channel/identity safety → correct build-time env and bind artifact SHA → start existing verified Node 24 / explicit-env production-mode localhost workflow only on isolated configuration → synthetic local walk → exact hosted candidate missing A/B/privacy/capacity gates → app checkpoint/build/scan → canonical/live smoke → separate documentation checkpoint → Founder Walk handoff and STOP. Existing known Node executable: `/Users/ryanc/.npm/_npx/387698761821791d/node_modules/.bin/node`; verified local runtime uses `WS_NO_BUFFER_UTIL=1` and hostname `localhost`, not an unreviewed default env. No unsafe start command is authorized by this plan.

Save states: R recovery; I isolation; C missing acceptance; D deployment/live verification; E docs; F handoff. At each, record exact SHA, gates, environment/fixture ownership and rollback path. Preserve existing source and unrelated WIP; never reset/stash it implicitly.

Rollback baseline remains exact FP2A deployment above. Current additive migrations were checked compatible previously; do not roll back migration history or delete retained user data. Preserve cleanup/rescue and queue consumers until safely drained even if FP3 admission is off. If any critical gate fails, keep FP2A canonical and save evidence; no promotion to bypass it.

**STOP NOW. Await explicit founder approval of the next wave.**
