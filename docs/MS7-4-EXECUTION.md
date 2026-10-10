# MS7.4 execution and recovery

## C core verified / D architecture stop gate — 11 October 2026 SGT

Application checkpoint **`02559b2`**. [Local handoff receipt](MS7-4-FP1-LOCAL-RECEIPT.json). The bounded retry of the redundant retained-data audit passed all35 tables at17:13:58UTC with zero changes; the earlier stall was not a data discrepancy. Headless QA browsers and the local server are now stopped. No disposable cleanup remains. Resume only after the transport-ownership decision.

**FP1 is NOT release-ready. No canonical deployment or push.** This section supersedes the earlier in-progress notes below. Local checkpoint is the commit titled `fix: harden MS7.4 recovery and record transport ownership gate` (resolve with Git). Based on B `8611e9c` and partial-audit checkpoint `1cb41d6`. Fresh origin/main and canonical remain exact `35a6f86182e36a2f31eca84a9280e965d71f17cd`; Vercel confirms READY Production `dpl_4jNvKenubueFoVCm24GVZiUDE3Dg`, alias `toskerapp.vercel.app`. MS7.1/MS7.2/MS7.3 LOCKED; MS7.4 local FP1 incomplete; MS8 untouched.

### Verified implementation and C core

Real explicit Join/Leave, authorized basic identity roster, single concurrent workspace transport, deduplication, background/navigation exit and bounded recovery remain implemented. No media, email, coordinate sharing, new schema or persistent application presence history. Added wall-clock recovery expiry (not only a timer), current Clerk JWT acquisition for Live requests, an offline guard for queued profile refresh, and a distinction between expired-auth401 and authenticated context denial403 in Chat history/search. No unauthorized data is returned on either failure.

Latest integrated A/B evidence completed all8 core cases: API denial, multi-tab, surface exit, simulated background, short reconnect3304ms, prolonged expiry58601ms with explicit **Reload workspace** then **Join Live**, membership withdrawal/stale-token denial, logout/concurrent issuance/stale-session denial. The only page exception was the exact test-injected `NetworkError: QA network offline`. Revalidated the saved same-build evidence with `--validate-recorded`, classifying only that exact fault at the injected outage step; zero unexpected application exceptions. This revalidation made no provider calls. Single concurrent WebSocket and minimal `{v:1}` presence payload verified. This is not a claim of seamless long-outage recovery.

Server authorization9-case subset passes exact Room, scoped Subroom viewer/target, forged context, Sandbox owner, exact accepted Personal pair, minimal identity, exact token grants, revoked/stale participant denial and rollback preservation.12 deterministic lifecycle cases plus401/403 recovery regression pass. Extended expiry/dual-disconnect/context-switch/UI-logout coverage must follow the ownership refactor; do not call the entire C matrix complete.

### D results and stop reason

All320/390/430/768/1440/1728 plus844x390 checks pass geometry,44px targets, keyboard focus, reduced motion, long names and mobile single-surface layout. Narrow/landscape disclosure scrolling verified; screenshots under `.git/ms74-recovery/browser/`.320,768,1728 and landscape inspected. Real physical Safari/iOS/Android and assistive-technology testing remain unclaimed.

Final20-cycle run completed with zero API failures/page errors, one connection/Live channel at each sample,325 total observed A-tab protocol frames and no idle Live polling. Join p95 **3336ms** and peer p95 **3665ms** miss the proposed2s target. Heap after route warmup grew615712bytes (below8MiB cap), but listeners grew599→605→611: **resource gate FAIL**, not a pass. Total listeners were586/592/599/605/611 at cycles0/5/10/15/20; DOM nodes/documents stabilized. Do not further loosen the listener threshold.

Root cause confirmed with an observation-only two-roundtrip audit: window `beforeunload`1→3→5, `online`2→4→6, `offline`1→3→5; Tosker-owned handlers stayed stable. Installed Ably2.28.0 registers these global closures in `connectionmanager.ts:292` without removing them in `BaseRealtime.close()`. The page-owned hook creates a fresh client on primary-route remount. This also exists in the inherited transport lifetime; it is not extra Live subscriptions or a reconnect storm.

**Architecture gate:** remediation needs a stable authenticated-workspace transport owner with exact actor/session/context lease changes, serialized reauthorization, stale-callback fencing and channel release. Do not patch vendor code, intercept global event registration, broaden capabilities or hide the growth. Estimate **3–5 additional local hours** for the owner refactor plus cross-context/session/security/resource regressions and final E audit. This is a material ownership change beyond the approved A design and remaining wave estimate; request founder approval before implementation. No canonical permission is implied.

### Quality, data, cost and recovery

Latest production build/TypeScript, full lint (one pre-existing unused-import warning), secret/client scan672files/42bundles,29 exact migration hashes/catalog, DB relational audit,7 ownership guards, Chat draft/workspace contracts and rollback-only FP8 Map regressions pass. No Geoapify calls. Old Hall/Chat mutation scripts were not run because they violate current fixture/founder safeguards; bounded safe regression coverage must be expanded before E. The35-table retained fingerprint audit passed after mutative QA at16:36UTC; founder profiles/messages/Board/settings and protected Rooms unchanged. A later redundant read stalled and was cancelled; do not equate a stalled audit with changed data or a new pass. Recovery audits should use bounded process timeouts.

Retain **MS7.4 FP1 Founder Review — Live a39d9eea** (`ms74-fp1-qa-a39d9eea`), its scoped/open QA Subrooms and exact founder8V3X7P1 membership with A/B. Receipt `.git/ms74-recovery/fixture.json`. B test membership and A Room nickname were restored; no disposable data cleanup is pending. Also retain protected `ms73-founder-review-904a9dea` and `ms73-qa-bfff9475`. No old disposable fixture was recreated. Headless test browsers are closed; local server may be stopped at handoff. The fixture exists in the shared DB, but the new Live implementation is local only.

Fresh dashboard usage **2180/6000000 monthly messages**,4/200 connections,12/200 channels,73KiB/28.6GiB. Observed account increase1165 from preflight1015 is below the10000-event wave cap; dashboard totals are not exact per-test billing attribution. Free plan/restrictions/billing unchanged. Corrected narrow Live capability and immediate revocation of temporary management tokens22319/22320 were verified earlier; do not recreate tokens or reconfigure the key. No credential logged/committed.

Resume by reading this section, ADR and Git; preserve unrelated Art/Web/Design WIP and older handoff hunks. Do not restart implementation or rerun provider permission setup. C evidence is `acceptance.json`, D raw evidence `responsive-performance-progress.json`, diagnosis `listener-audit.json`. Do not advertise FP1 as ready, mark D/E green, push, deploy, or begin voice/video/email/location work. Founder review can inspect the partial local slice, but formal acceptance waits for the ownership gate.

Future media decision remains SFU/managed-provider evaluation with separate approval, not Ably-as-media or mesh by default. Email remains an opt-in, authorized, deduplicated/batched future pipeline; Resend bounded evaluation vsSES alternative is documented in the ADR, neither provisioned. Existing Tosker tokens/Inter/filleted cards and accessibility guidance shaped the compact Live panel; no MS8 redesign.

## C/D audit in progress — recovery note · 10 October 2026

Current application checkpoint B is `8611e9c`; canonical/main remain locked FP8 `35a6f86`, READY receipt `dpl_4jNvKenubueFoVCm24GVZiUDE3Dg`. No push, migration or deployment. Preserve the exact owned retained fixture `ms74-fp1-qa-a39d9eea` and both protected MS7.3 Rooms. Founder8V3X7P1 remains a member; all35 non-fixture table fingerprints match at14:55UTC. Owned B membership and A test nickname are restored in each test's finally block.

**Not a C/D pass or release candidate.** Real A/B cases have passed individually: exact API denial, multi-tab deduplication, primary-surface exit, simulated background exit, short reconnect (2.8–3.8s), sustained-offline peer expiry (55.6s), membership withdrawal plus stale-token denial, logout plus concurrent-token revocation and stale-session replay denial. An integrated run reached the final transport assertion but failed; subsequent runs exposed intermittent reconnect redirect, Join/roster and navigation races. Latest sanitized diagnostic files are under `.git/ms74-recovery/browser/`; they are intentionally not secrets or provider packets. Do not promote partial progress to a green integrated result.

All seven requested responsive dimensions passed geometry/focus/reduced-motion/long-name checks;320 and768 screenshots inspected. The20-cycle resource test is not yet green (first run reached5cycles, ~2.8–3.4s Join, above proposed2s target). Test navigation now waits for the actual Board `/hall` route before returning to Live. Every run checks empty initial presence to avoid attributing a previous abruptly closed QA browser's expiring member to the current run.

Fresh local production build, TypeScript, lint (only pre-existing cleanup-fp4 unused-import warning), secret scan670files/42bundles,29 migration hashes/catalog,11 lifecycle unit cases, workspace source contracts, Chat draft isolation and rollback-only FP8 Map regression pass. No Geoapify calls. Old Hall/Chat mutation scripts were inspected but not run because they do not meet current exact-fixture/founder safeguards. Browser dashboard session expired; final account-wide Ably usage remains unavailable, no billing or restriction changes. Narrow capability configuration and revoked management tokens22319/22320 must not be replayed.

Resume only missing C/D tests and bounded recovery fixes, then E audits. A debounced profile refresh offline guard is being verified locally; it is not claimed as a complete recovery fix. Keep canonical untouched and do not mark FP1 ready until remaining gates are reported honestly.

## B — Local implementation checkpoint · 10 October 2026

Based on A `4db2474`; checkpoint commit is titled `feat: implement local MS7.4 Live presence foundation` (resolve with Git). Origin/main freshly remains `35a6f86182e36a2f31eca84a9280e965d71f17cd`; canonical unchanged from recovered READY `dpl_4jNvKenubueFoVCm24GVZiUDE3Dg`. **No push, migration or deployment.**

Replaced the synthetic Live surface with explicit Join/Leave, server-projected basic identities and an external-store roster on the existing single workspace Ably connection. Presence payload is only `{v:1}`; exact authenticated clientId and exact context token; no coordinates, media or permanent presence history. Navigation/backgrounding cancels intent; foreground/refresh never autojoin. Offline detach clears SDK re-entry; recovery intention expires after30s. Generation/serialized cleanup removes late joins. Current-session token validation and logout use the existing actor lock; logout revokes existing actor Ably tokens and only the current Clerk session. Other still-valid devices may reauthorize; failure is not reported as successful logout.

Validation: TypeScript and scoped lint pass;11 deterministic lifecycle/request cases pass. Server authorization subset passes Room, selected Subroom, Sandbox, accepted exact Personal pair, forged context, minimal identity projection, exact token permissions and rollback-only stale-member filtering. Initial real-browser A/B Join/Leave/observe/refresh passes with zero page errors. Optimized snapshot projection from sequential scope reads to one current-authorized SQL statement; retained locked token authorization. Latest local development sample: AJoin3322ms/Apeer3432ms; BJoin2834ms/Bpeer3680ms. Better than initial5.8s/8s but **above proposed2s target**; production-build/performance acceptance remains pending, not a pass.

DB/catalog fresh:29 migrations/35tables/253columns/128constraints/15enums; relational audit passes,8users/profiles/Sandboxes,7Rooms/14memberships,5Personal Chats,34messages,12Board notes/2pins,6accepted connections/48notifications. One new exact-owned fixture `ms74-fp1-qa-a39d9eea`, **MS7.4 FP1 Founder Review — Live a39d9eea**, contains server-resolved A/B/founder8V3X7P1 plus scoped/open QA Subrooms. Retain for local Founder Walk; no automatic cleanup. Ownership receipt `.git/ms74-recovery/fixture.json`; creation prepared IDs durably before transaction. Old protected MS7.3 Rooms unchanged. Retained fingerprint audit passed before B; final post-QA comparison is pending.

Remaining: full C provider authorization/revocation/logout/disconnect/multi-tab/races; D widths320/390/430/768/1440/1728+landscape, keyboard/reduced motion/long names, performance/resource counts; E full regression/build/secret scan/data audit and recovery handoff. Resume from this exact local checkpoint; do not repeat temporary-token creation or provider configuration. Both temporary management tokens22319/22320 are revoked401. See correction receipt below. Preserve unrelated Design/Art/Web WIP and two older handoff hunks. **Stop before canonical for founder review.**

## FP1 wave authorized — provider preflight · 10 October 2026

**Corrected capability configuration verified:** existing `tosker:*` publish/subscribe unchanged; explicit `tosker:live:*` now contains presence/publish/subscribe so the more-specific rule does not lose existing operations. Application key value, revocable flag, other key properties and both unrelated keys unchanged. Correction used the same authorized temporary read:key/write:key workflow; replacement token22320 revoked immediately, then `/v1/me`401 verified. Original22319 remains revoked. Runtime tokens request only presence/subscribe for the exact Live context (never Live publish). Real A/B acceptance follows the full-operation assertion, not presence-only success.

**Correction during B:** the stricter implementation probe found the first preflight incomplete: Live received presence but not subscribe; the earlier probe checked only presence. The explicit Live rule must retain publish/subscribe alongside presence. No non-Live presence expansion. First temporary management token remains revoked (401); repeat the same approved Read Key / Write Key workflow, immediately revoke, and require both Live operations before A/B acceptance. Earlier PASS wording below is historical and not a current complete grant claim.

**Narrow capability gate PASS.** Founder additionally approved temporary Read Key / Write Key management access. Matched existing app/key to the local credential in memory; Control API changed only capability from `{"tosker:*": ["publish", "subscribe"]}` to the same map plus `"tosker:live:*": ["presence"]`. Full before/after comparison verified the application secret, revocable-token flag, all other key properties and other keys unchanged (except modification timestamp). Management token was revoked immediately after use; subsequent authenticated `/v1/me` returned401. No token or key printed, committed or saved. Fresh60s exact-context token probe verifies presence granted on Live and omitted on non-Live conversation channel. No connection/join/publish occurred in that probe. Billing not touched. Dashboard global-usage report is an embedded analytics frame; remaining usage check precedes provider A/B QA.

Founder explicitly approved the9–12h local FP1 wave and narrowly scoped Ably presence permission, preserving Free plan/restrictions and stopping before canonical. Recovered exact checkpoint A `4db2474`; branch and unrelated WIP unchanged. Fresh canonical/main remain `35a6f86` / READY `dpl_4jNvKenubueFoVCm24GVZiUDE3Dg`;29 hashes/catalog, seven ownership guards and all35 retained table fingerprints pass. No DB mutation or QA fixture creation.

Pre-change probe granted subscribe only; the dashboard's shared operation list could not safely express the narrow change, so the approved scoped Control API workflow above was used instead. This historical dependency is resolved, not pending. The account remains **Free $0**. Fresh account Limits page shows1,015/6,000,000 monthly messages,4/200 connections,12/200 channels,32KiB/28.6GiB transfer and21days to reset. Provider QA budget: at most10,000 delivered events; stop on storms or quota errors. No Geoapify calls are needed.

Implementation B is now in progress. New files are local only; no production migration, fixture write, application push or deployment has occurred. Next save-state is a coherent, typechecked/tested B implementation, then C authorization/A/B, D responsive/performance and E candidate. Preserve unrelated WIP.

This authorization supersedes A's awaiting-wave-approval wording below. No canonical cutover, paid service, media, email or continuous-location permission is added. Continue through B/C/D/E only after the exact presence grant is verified; do not bypass the gate with synthetic presence.

## A — Architecture complete; awaiting approval · 10 October 2026

**STOP at the founder's execution-time gate.** [Architecture decision](MS7-4-ARCHITECTURE-ADR.md) covers Live, active coordination and notification foundations and the nine FP1 selection criteria. Recommended ONE slice: genuine Join/Leave + authorized roster + recovery, without media/email/location. Estimated **9–12h** after the presence capability dependency is resolved, exceeding eight hours. B implementation, C A/B/auth, D responsive/performance and E candidate remain NOT STARTED. No new feature or acceptance pass is implied by checkpoint A.

R commit is `a605dd5`, based on recovery `08e6164`; A is the commit titled `docs: record MS7.4 architecture gate and presence dependency` on `codex/ms74-foundation` (resolve with `git log -1`). Remote main and canonical remain exact `35a6f86182e36a2f31eca84a9280e965d71f17cd`, READY `dpl_4jNvKenubueFoVCm24GVZiUDE3Dg`. Migration count29 and all R database invariants/QA inventory remain unchanged; no DB writes occurred in A. No push or deployment.

### Completed audit and bounded probe

Read existing Live preview, workspace/controller/companion, realtime token/provider/hook, exact-context authorization, Room/Subroom/Personal revocation, profile projection, notification/send/unread/schema, map privacy and rate-limit paths. Primary-source research covers Ably presence/recovery/capabilities/pricing, WebRTC/SFU/mobile capture, LiveKit/Daily and Resend/SES. The UX review informed explicit participation and failure/navigation states; it did not authorize a redesign.

One server-only diagnostic resolved QA A and an authorized retained QA primary conversation using `resolveQaActors` and `scopeForConversation`; a60s token requested `[presence, subscribe]` for only `tosker:live:<that conversation ID>`. **Granted operations were `[subscribe]` only.** No token was saved/printed; no channel connection/enter/publish, participant mutation or provider setting changed. This is a capability dependency, not a passed Live smoke. The local key was tested; no assumption is made about every deployed key.

Founder approval is needed for both the9–12h implementation wave and narrowly enabling existing-key presence on `tosker:live:*`, preserving other restrictions/Free budgets. No procurement is necessary for this proposed FP1. If narrow configuration cannot be represented safely, stop rather than broadening permissions. Future media and email providers remain recommendations only.

### Verification and restart boundary

R recovery checks are complete; final scoped documentation/JSON/diff checks apply to A. No application changes means no new app build or MS7.4 performance figures are claimed. Full future acceptance matrix and proposed measurable budgets are in the ADR. No new fixtures to clean. Retain both founder Rooms listed below. Unrelated WIP stays unstaged.

On resume: read A/ADR and inspect Git; recover exact A commit; verify canonical still FP8 and migrations still29. **Do not start B, change Ably permissions or deploy without the requested founder decision.** Once authorized, validate the real presence grant before implementing; do not replay old MS7.3 disposable fixtures or expensive provider tests. Any production migration/canonical cutover still requires separate approval. MS7.1/MS7.2/MS7.3 LOCKED; MS7.4 GATE1 COMPLETE / architecture awaiting approval; MS8 NOT STARTED.

## R — Recovery and formal MS7.3 lock · 10 October 2026

Founder authority: MS7.4 Live Coordination Foundation directive, attachment `f77eae28-c79c-4846-af3e-6901ddda98a6`. MS7.1, MS7.2 and **MS7.3 LOCKED**. [Durable lock receipt](MS7-3-LOCK-RECEIPT.json). MS8 not started. No application changes during lock.

Recovered HEAD `08e61640ce6a49c8b898b98b2124e60ed8c19d62`; new local branch `codex/ms74-foundation`. Fresh remote main is `35a6f86182e36a2f31eca84a9280e965d71f17cd`. Canonical `https://toskerapp.vercel.app` is still READY Production `dpl_4jNvKenubueFoVCm24GVZiUDE3Dg`, immutable host `tosker-743mjmjfd-pangea6.vercel.app`, exact application SHA. HTTP307 to `/app`, final200. Scoped runtime error/fatal window 06:25:04.118–06:40:04.118 UTC empty. Final FP8 live A/B evidence remains applicable; it was not replayed and no road/geocoding tests were repeated.

### Completed recovery checks

- `git diff --check`, Git HEAD/remote main, application/schema diff against canonical: pass; only recovery documentation/testing differs.
- `scripts/verify-migration-history.mjs`: 29 exact hashes; 35 tables, 253 columns, 128 constraints, 15 enums.
- `scripts/audit-ms73-fp3-ownership.ts --post-cutover`: seven guards; zero orphan/mirror/duplicate-position failures.
- `scripts/audit-fp8-release-recovery.ts --after`: protected founder resolves uniquely; all retained non-fixture table fingerprints match; no database writes. The ignored verification receipt timestamp is refreshed by this audit.
- `scripts/audit-ms5.mjs`: relational invariants pass. 8 users/profiles/Sandboxes, 6 Rooms, 11 memberships, 5 Personal Chats, 34 messages, 12 Board notes, 2 Board pins, 3 capability rows, 6 accepted connections and 48 notifications. Map totals: 5 plans, 8 Routes, 19 cards/memberships, 5 comments, 108 receipts and 2 Map Pins.
- Vercel names/types/targets checked without values: separate browser/server Geoapify credentials assigned to Development and Production; server Production key sensitive. Ably key assigned to Production, existing local Development configuration retained. Database/Clerk assignments preserved. No secrets printed, configuration changed, plan upgraded or provider purchased. Dashboard restrictions and account usage are not newly certified.

### Data and WIP preservation

Retain `ms73-founder-review-904a9dea` for Founder Walk and `ms73-qa-bfff9475` for protected founder-authored content, both containing exact TID `8V3X7P1`. FP8 disposable `ms73-qa-1fed56ad` was already deleted; do not reseed it, repeat deletion or restore its backup. No new MS7.4 fixtures yet.

Unrelated modified `docs/CROSS-PROJECT-INHERITANCE.md`, two older handoff hunks, and untracked design-skill/Art/Web documents, `docs/design-hub/`, `docs/research/`, `experiments/`, `toskerArt/` remain untouched. Stage only explicit MS7.4/lock documentation and the new handoff hunk.

### Recovery instructions and pending gates

Read this ledger and the latest handoff first; verify current branch/HEAD/main/canonical before resuming. R is documentation-only. A must audit Live, coordination and notifications and report the realistic execution estimate before implementation. If material architecture change, new procurement or more than eight hours is needed, stop after A for founder approval. Otherwise only the authorized bounded local slice may proceed through B implementation, C A/B/auth, D responsive/performance and E candidate. No MS7.4 canonical deployment or production migration without further explicit approval; no unfinished push. At R, B–E and all new Live acceptance remain pending.
