# MS7.3 FP5 post-release safety and conformance audit

Date: 2026-10-07 Singapore. Result: no demonstrated FP5 application regression or restart-induced loss. Application source, schema and canonical deployment are unchanged. The bounded audit passed with the explicit operational and evidence caveats below. This is not production certification or founder/Jenn acceptance.

## Exact release and recovery

| Item | Verified state |
| --- | --- |
| Canonical application and fetched origin/main | `0d6f367e0dbfaac180990a2aa5f3b54074286f95` |
| Canonical deployment | `dpl_EqFA8D7XnkzLp4SHjD1tTjfx5LeY`, READY, Production |
| Alias | `toskerapp.vercel.app` |
| HTTP and auth | Root307 followed to200; normal isolated A/B sign-in passed |
| Starting local HEAD | `36fea622397c901708c64adaab74dd28310e07b4`, one recovery/docs/test checkpoint ahead; no application difference |
| Database | 28 exact migration hashes;35tables,252columns,127constraints,15enums; seven enabled ownership guards |
| Worktree | Unrelated Design/Art/Web/inheritance work preserved; audit added only evidence scripts and documentation |

Canonical identity was checked before writes and again after live checks. No migration was replayed, rolled back, restored or introduced. Old FP5 shadow namespace and deleted release fixtures remain absent. No duplicate/partial migration, orphan card/comment/Pin/preference/receipt, duplicate order, or lost ownership was found. Retry receipts pointing to deliberately deleted result objects can be legitimate idempotency records; they were not treated as orphans or purged. Rollback tests confirm replay behavior.

## Brief conformance matrix

Numbers refer to the fully read and rendered four-page FP5 brief. **Fresh** means canonical behavior exercised in this audit. **Same SHA** means durable release evidence plus fresh source/contract review, not a repeated live scenario. **Service** means fresh actual-database tests whose writes were fully rolled back. This distinction avoids presenting the entire prior torture suite as rerun.

| FP5 requirement | Implemented? | Evidence | Canonical verified? | Issue or debt |
| --- | --- | --- | --- | --- |
| 00 Recovery and execution gates | Yes | Exact Git/deployment/catalog recovery; execution ledger A–F and approved expanded window | Fresh | No restart loss found |
| 01 Group-first, explicit safe add | Yes | `trip-workspace.tsx` preview/token/selected Route; authenticated `trips/actions.ts` | Fresh manual flow; same-SHA search | No first-result autosave |
| 02 Trip-planner research | Yes | `MS7-3-FP5-RESEARCH.md` official planner sources and ADOPT/ADAPT/REJECT | Documentary | Not new competitor account testing |
| 03 Game-map research | Yes | Research ledger separates official material, walkthroughs and unavailable articles | Documentary | No game IP copied |
| 04 Remove primary Pin shelf | Yes | Secondary `showMemory`, no mandatory Pin mutation | Fresh default UI and Saved places | Existing memory deliberately retained |
| 05 Sandbox desktop/mobile defaults | Yes | `messaging-app.tsx`, `use-chat-companion.ts`, explicit `sandbox--` scope | Fresh desktop Map+Chat and390mobile single surface | Explicit user Chat choice remains respected |
| 06 Marker and Card synchronization | Yes | Local `selectedId`, horizontal reveal, stable marker registry | Fresh both directions and A/B selection isolation | Long Card titles disclose in inspector |
| 07 Compact contextual inspector | Yes | `trip-point-inspector.tsx`; canvas coordinate clamp and ResizeObserver | Fresh seven viewports | Internally scrolls for enlarged text; not routine modal |
| 08 Bounded icon grammar | Yes | Nine-category schema constraint and shared symbol; separate You/avatar | Fresh shared meetup icon, labelled controls; service invalid-icon denial | Native compact selector, not new art or huge library |
| 09 Manual naming and Rename | Yes | `nextCheckpointName`; service rejects provider POI Rename | Fresh Checkpoint1 and A/B Rename; service POI protection | Coordinates only in Info, not normal titles |
| 10 Primary Location Cards and preserved actions | Yes | Card/route controls; comments service; FP4A contracts | Fresh strip, tray, selection; same-SHA drag/comments/Hide/Skip/locks | Full prior suite not repeated |
| 11 Locate ON/OFF | Yes | One `getCurrentPosition`, generation guard, no watch | Fresh emulated ON/OFF, late callback and reloadOFF | No actual founder device location requested |
| 12 Private origin outside shared numbering | Yes | Browser-only avatar/You and unmeasured dotted GeoJSON connector | Fresh peer isolation and request-body/storage checks; source | No road request or estimate for personal connector |
| 13 Compact truthful Route summary | Yes | Canvas summary consumes only matching current validated DTO | Fresh Order summary; same-SHA live Drive | No invented distance/ETA in Order/failure |
| 14 Provider leg metrics | Yes | `road-projection.ts`; exact leg count/order/finite values/unit/sum checks | Same-SHA true Drive/Walk; fresh controlled tests | Invalid legs omitted, never split from total |
| 15 Adjacent emphasis and quiet others | Yes | `routeLegPresentation`, .95/.25 opacity, local selection | Fresh selection; start/middle/end/ghost contract tests | No prefix emphasis or shared camera state |
| 16 Bounded long-distance evidence | Yes with caveat | Existing Drive50,487m/2491.774s; shortWalk3,765m/3579.708s | Same-SHA canonicalDrive1,857m/163.981s; original long tests local | Long west/north→Changi Walk returned provider400; not forced or claimed successful |
| 17 Map-first hierarchy | Yes | Compact toolbar/summary/inspector; secondary memory; optional Chat | Fresh screenshots at all widths | No new management shelf |
| 18 Wording and micro-consistency | Yes in audited product surfaces | Source/rendered sweep; spacing, mode arrow, controls, attribution | Fresh | QA fixture names/notes are data, not product copy; left protected data unchanged |
| 19 Direct Pin to selected Route | Yes | Signed preview followed by explicit `add` with active routeId | Fresh real reverse lookup and manual Add in private Sandbox | No Route uses existing smallest create/select flow; same-SHA evidence |
| 20 FP4B compatibility | Yes | Source Pins untouched, secondary memory, independently authorized transfer | Fresh read-only MBS provenance; service lifecycle/independence | No automatic Pin conversion or founder backfill |
| 21 FP4A routing/ordering contracts | Yes | `routingPlaces`, shared Skip/locks, private Hide, debounce/abort/key matching | Fresh pure contracts; same-SHA browser tests | No extra live road calls during audit |
| 22 Immediate spatial response | Yes | Selection→marker/Card→contextual actions, meaningful icons | Fresh keyboard/pointer selection | No animation/game theme expansion |
| 23 Deferred waves | Preserved | Source/diff and ledger review | Same SHA | Pings, peer Live, Share Route implementation, email and MS8 deferred |
| 24 Migration safety | Yes | Immutable0027; backup hashes/rehearsal/cutover evidence; fresh catalog | Fresh public28 and retained-row comparison | No migration needed for audit |
| 25 Core A/B playtest | Yes | Release suite plus bounded audit fixture, security probes | Fresh A/B Rename/icon, direct Add, Locate, reload/offline reconciliation | Earlier4–6point/Drive/Hide/Skip suite retained as same-release evidence |
| 26 Jenn mental-model acceptance | Implementation supports it; human acceptance pending | Direct loop and contextual UI | Fresh automated flow only | Founder + Jenn must conduct actual comprehension/playtest |
| 27 Responsive and accessibility | Bounded pass | Seven screenshots; keyboard marker/Card, Info/Escape/focus, long name/150% inspector text, reduced motion | Fresh320/390/430/768/1440/1728 and844×390 | Not formal WCAG certification or every assistive technology |
| 28 Privacy and performance | Bounded pass | Lazy Map;700ms search debounce; coalesced routing; no render-time geocoding; local Locate | Fresh body/storage privacy;20live asset secret scan | Browser tile traffic still uses provider; account-wide quota/restrictions not freshly dashboard-audited |
| 29 Renderer and routing capabilities | Yes | MapLibre retained behind browser-provider; Geoapify isolated server adapter | Fresh maps render; source/controlled adapter tests | Provider remains replaceable and temporary founder-review choice |
| 30 Save states | Yes | Git R/A/B/C/D/E/F and release/recovery ledger | Git checked | Historical sections are superseded, not instructions to replay |
| 31 Build/security/regression release gates | Bounded recheck passed | Typecheck, lint, production build,28hash/catalog, invariants, secret scans and diffcheck | Fresh local build and canonical assets | One existing unrelated lint warning |
| 32 Canonical, cleanup and STOP | Yes | Exact SHA/READY/alias; new audit-only fixture cleaned; protected data equality | Fresh | MS7.3 remains unlocked; no new deployment required |

## Security and lifecycle findings

`src/server/trips/scope.ts` authorizes Sandbox by exact conversation kind and owner, with no Room/Subroom parent. Personal Chat still requires the exact two participants, matching direct key and accepted connection. Room membership and selected/owner-only Subroom access remain independent checks. The schema has an explicit unique Sandbox conversation owner field and exactly-one-context constraint; it is not fake Personal Chat.

Fresh public28 rollback tests prove A read/write, manual names/icons, provider name protection and receipt replay. The extended audit probe rejects B read, comments read, Rename, comment write, reorder, checkpoint move, lock, Card Nuke and Route Nuke, as well as copying into A's Sandbox. B target discovery omits A's Route. A forged Sandbox context pointing to a Room fails. Server code authorizes before returning plan or receipt data. Existing FP4B rollback lifecycle checks passed Room removal, selected Subroom loss, exact Personal pair/connection revocation and provenance filtering. Independent Pin/Route copies and deletion survived the fresh lifecycle test.

Locate exists only in the local hook/canvas. All source references were inspected: no DB, log, realtime, browser-persistent-storage, mutation or routing payload path receives those coordinates. The canonical emulated test verified no coordinate values in fetch bodies or persistent storage, no peer marker, late callback ignored after OFF and OFF after reload. Unmount invalidates callbacks; access denial clears local location and protected state. Existing same-SHA access-loss browser evidence remains applicable; logout unmounts the authenticated workspace. This does not claim zero provider basemap tile requests.

## Visual and interaction evidence

Fresh canonical screenshots are retained privately under `.git/fp5-recovery/audit-{320,390,430,768,1440,1728,844}.png`, plus `audit-long-text.png` and `audit-sandbox-mobile.png`. All were visually inspected. No objective new clipping, horizontal overflow, primary toolbar-edge collision or inconsistent geometry was demonstrated. The320px inspector fits within278px; larger widths use300px. Desktop keeps the Map dominant with a separate Chat companion; mobile shows one main surface. Category selection is secondary to routine inspection. Focus has a visible outline and meaningful controls have labels; numbers/shapes accompany color state.

Enlarged text uses the existing scrollable inspector. The first automation click on a newly enlarged, nested Info control did not capture an open inspector; the acceptance check was corrected to scroll/focus the real control and use Enter, assert `details[open]`, then verify Escape/visible marker focus. This is bounded keyboard/scroll proof, not a claim that the first screenshot was valid. Native mouse/pointer inspection also passed at normal scale. No application change was made to satisfy a test.

Wording checks found no prohibited developer terms in normal FP5 planning copy. Legal attribution, useful unavailable/permission/accuracy states and private-connector explanation remain. The disposable QA address contains clearly labelled synthetic test wording; the retained Founder Review has founder-authorized QA notes. Those are content, not template copy to rewrite.

## Build, provider and runtime evidence

- TypeScript, full lint and optimized Next production build passed. Lint has zero errors and the pre-existing `scripts/cleanup-fp4-qa.ts` unused `eq` warning. Final whitespace check passed. No `src`, migration, dependency or public asset difference from canonical.
- Exact configured server-secret comparisons passed against source/owned files,40client/worker bundles and20canonical client assets. Values were neither printed nor passed to the browser. Local environments remain ignored; no server credential reuses a NEXT_PUBLIC variable.
- Vercel metadata confirms separate Production and Development assignments for encrypted `NEXT_PUBLIC_GEOAPIFY_MAP_KEY` and sensitive `GEOAPIFY_SEARCH_KEY`. Rendering proves canonical browser origin compatibility; it does **not** prove the strongest allowed-origin/API restrictions. No accessible provider dashboard was available in the browser inventory. Restriction settings and complete account/tile usage remain unverified by a fresh dashboard audit; no restrictions, credentials, billing or plan were changed.
- The audit used one real manual reverse lookup, no new live routing calls. App counters forUTC2026-10-06 end at geocoding10/120 and roads50/60. These exclude browser tiles; the founder-approved account cap remains3000credits/day.
- Fresh controlled road adapter/metric tests passed mode/order identity, finite nonnegative metrics, units, malformed leg rejection, stale-key exclusion and sanitized provider outage/rate errors. One invocation lacked its provider environment and failed; the corrected existing-environment invocation passed with fetch mocked and zero provider requests.
- Runtime error clusters were empty, but exact-deployment CLI5xx filtering found **one `/api/realtime/token`503 at2026-10-06T17:39:53.381Z**. Do not report this window as5xx-free. Only Clerk informational telemetry text accompanied it; that notice is not a diagnosis. Both authenticated A/B token checks later returned200 without printing tokens, and actual reload/offline-reconnect reconciliation passed. Cause remains unconfirmed; no ongoing failure or FP5-specific regression was reproduced. The final30minute error/fatal CLI query was empty. The MCP log query returned400 and is not counted as clean evidence.

## Cleanup and retained founder data

Fresh disposable audit Room `ms73-qa-2d947361` contained A/B plus founder TID8V3X7P1 resolved uniquely server-side. Ownership, creation identity and contribution guards passed before deletion. The exact new A-private plan `ba3f99de-978d-44e3-b2df-71326c98340d` and Route `4027bc45-fd3e-4f68-a425-6644de25ba93` were deleted; A's parent Sandbox/account/profile stayed intact. The ignored audit receipt is now historical: **never replay it**. All other service fixtures were rolled back, not retained. An initial fixture setup error retained no successful receipt; its cause was not captured. The guarded retry produced only this one fixture, and final inventory returned to baseline.

| Retained Room containing founder8V3X7P1 | Purpose | Founder Walk | Cleanup |
| --- | --- | --- | --- |
| `ms73-founder-review-904a9dea` | MS7.3 Founder Review — Singapore Trip, representative Map/Routes/Cards/Board/Chat | Available | Never automatically delete |
| `ms73-qa-bfff9475` | Protected founder-authored retained QA content | Available | Protected, not disposable |

Final inventory:3plans,7routes,16cards/16memberships,4comments,84Trip receipts;8users/profiles/Sandboxes,6Rooms,11memberships,5Personal conversations,34messages,12Board notes,2Board pins,3capabilities,6accepted connections,48notifications. Ownership/orphan/duplicate checks passed. Profiles, messages, Board rows and all retained Map Pins compare equal to the protected pre-FP5 backup. Founder Review MBS Pin `009e5547-5a05-4ae7-a511-11f46c7599b0` remains **saved, revision2**, with provenance intact.

## Final disposition

No application code change, migration, push or redeployment was justified. Audit-only scripts and this report preserve reproducible evidence without expanding product scope. Remaining caveats are the isolated recovered realtime503, unverified current provider-dashboard restrictions/account-wide usage, accepted long-Walk provider limitation, and pending founder/Jenn human acceptance.

MS7.1 LOCKED. MS7.2 LOCKED. MS7.3 FP5 CANONICAL AUDITED, UNLOCKED. MS7.4 NOT STARTED. MS8 NOT STARTED. STOP awaiting founder + Jenn playtest.
