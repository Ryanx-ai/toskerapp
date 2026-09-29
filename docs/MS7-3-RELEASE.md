# MS7.3 — integrated founder-review release

## LIVE — Founder Walk gate — 2026-09-30

Local engineering acceptance and canonical A/B smoke passed. Application commit **`fab1a7b7a61a91b8d175d6a9105c7b94c1bcda47`**, Vercel Production **READY** deployment **`dpl_B4S4YQow7UZCpeLwUapurt4SQ9rT`** (`tosker-krkoju4ds-pangea6.vercel.app`), exact `toskerapp.vercel.app` alias and HTTPS200 verified. A later documentation-only closeout may redeploy identical application source. **STOP FOR FOUNDER WALK. MS7.3 is not locked; do not start MS7.4 or Live.** This ledger supersedes incomplete slice statuses in the earlier Gate 2/continuation reports.

Live smoke used normal Clerk sign-in for retained isolated A/B, not an auth bypass or founder identity. Actual browser basemap/attribution and server Singapore lookup passed; result list did not auto-select/save; explicit Marina Bay Sands preview and confirmation returned its existing canonical UUID without duplicate cards. Shared Stop toggle reached B and was restored, both reloaded the same two IDs. Existing Map+Chat companion contextual search jumped without replacing the map; mobile390 Map/Places, Board checklist and same canonical Chat passed. Fresh Chat performed no Map/provider resource work. No browser errors; deployment error/fatal/5xx log queries each returned zero entries. This is bounded smoke, not long-term monitoring certification; external drains/alerts were not provisioned or certified.

Final pre-deployment secret scan: **465 source/owned files +39 generated client/worker bundles, PASS**, server credential included, no credentials printed. Provider dashboard reread Sep30 showed20requests/16credits,3000daily allowance,14geocoding/6tile requests. Its own explanation confirms asynchronous aggregation; this is an observed lagging total, not an exact real-time consumption claim. No quota/plan/billing/restriction weakening. Final live database audit retains the same counts and zero integrity violations recorded below.

### Delivered scope

- MapLibre and replaceable Geoapify boundary; Singapore-filtered/bias search, user-selected preview, explicit Add to trip. Direct pins retain clicked coordinates and require confirmation; reverse context is not asserted to be an exact venue.
- Canonical shared places, reversible archive, multiple named/colored routes, independent route order/Stop membership, solid active and optional dashed ghost planning lines. Lines are not road directions, ETA or provider routing. Quick order is a local preview with explicit Apply and revision-guarded Undo.
- Member-authorized server mutations, Room serialization, expected revisions, payload-bound idempotent receipts, canonical IDs and duplicate prevention. Private camera/selection/route/ghost state is scoped per viewer/Room. Existing Ably reconciliation, no parallel collaboration store.
- Optional desktop Map/Board companion reuses the existing Room Chat/composer/draft infrastructure. No duplicate conversation or hidden mobile companion.
- Post-Map Search addendum: sidebar remains name/username/TID navigation with one outer-field focus ring. Editable top-bar Chat search uses an anchored dropdown (compact expansion on mobile), debounce/IME/stale-response guards, explicit retry and keyboard selection. Results jump to the canonical message with bounded surrounding history, not a filtered transcript. Map/Board companion uses the same controller and keeps geographic search separate.

### Acceptance evidence

- Actual local optimized-build A/B: real Singapore search → private preview → explicit confirmation → same canonical peer UUID; reload, card/pin selection privacy, archive/restore, direct-pin Cancel/Confirm, shared edits.
- Independent routes, shared reorder, native drag, Stop state, private ghost/active route, Quick order preview/Apply/Undo. Simulated pre-commit failure and lost acknowledgement preserve one durable result on retry. Provider failure/retry and revision conflict recovery passed in separate bounded reruns; no claim that the first composite harness attempt passed uninterrupted.
- Owned 200-place fixture: canonical limit/read/reorder and browser pins/cards/selection/mobile access; actual B membership withdrawal removes access. Fixture deleted after exact-owned cleanup.
- Original Chat/Board companion: one composer/conversation, peer message, draft preserved through close/reopen and surface changes, safe shared Board note.
- Search owned 80-message fixture: oldest result outside initial50 loads surrounding context; existing loaded context retained; A/B IDs deduplicated; reload and bounded older/forward traversal. Actual A UI edit/Nuke reconciles B search; removed target does not resurrect. B withdrawal gives403 for search/history and clears the browser surface. Mocked503 retry, IME and deliberately late stale response passed without provider calls.
- Final Search/dropdown and sidebar checks at320/390/430/768/1440/1728; visual review caught and fixed the tablet dropdown anchor. Final Map/Places six-width regression, attribution, bounded card popover and reduced-motion configuration passed. Map and Board search selections remain on the same primary surface and preserve the renderer/card state.
- Typecheck, optimized build and lint passed; only pre-existing unused `eq` warning in `cleanup-fp4-qa.ts`. Message-format regression, provider/source/workspace guards and signed-candidate/founder-failure tests passed. All22 migration hashes and31-table/207-column/99-constraint/15-enum catalog match. No historical migration rewrite.
- Secret scan passed464 source/owned files and39 generated client/worker bundles before release documentation; exact/encoded server credentials checked, no public reuse. Final documentation/commit scan is required before deployment.

Captures: `/Users/ryanc/.codex/artifacts/tosker-ms73-20260929/` (`trip-layout-*`, `trip-places-*`, `search-layout-*`, `sidebar-search-*`, `map-search-companion-final.png`, `hall-search-companion-final.png`). Earlier captures document historical intermediate states, not additional current fixtures.

### Provider / environment boundary

Founder-approved bounded canonical configuration only: existing separate `GEOAPIFY_SEARCH_KEY` (sensitive server secret) and `NEXT_PUBLIC_GEOAPIFY_MAP_KEY` (intentionally public renderer config) now assigned to Vercel Production. Separate Development assignments remain; no Preview assignment. Exact canonical HTTPS Referer added to existing browser key; localhost preserved; canonical and localhost200, unrelated/look-alike domains401. No server key printed, billing/plan change, new key or permanent production-provider commitment. See [provider report](MS7-3-PROVIDER-APPROVAL.md) for official terms, stopped comparison, observed Singapore postal/POI inaccuracies, source licensing and restriction caveats.

Free3000 credits/day is the vendor allowance; internal evaluation ceiling500/day remains. Server geocoding is separately capped120/day,12/actor/minute with1.1-second global spacing and no automatic provider retry. This is not an account-wide tile meter. Last observed provider dashboard20requests/16credits may lag; no stronger current total is claimed. Browser restriction is not secret protection; server egress/API-specific restriction control was not invented.

### Fixture inventory / retained data

ONE retained Room: **MS7.3 Founder Review — Singapore Trip**, `/room/ms73-founder-review-904a9dea/map`. Owner A, isolated B and exact-resolved founder **TID8V3X7P1** are members. It remains available for Founder Walk with Marina Bay Sands, a clearly synthetic QA waterfront meeting point, Day1/Day2, one safe Chat message and one Board checklist. **Never auto-delete this Room.** No cleanup scheduled.

Deleted whole exact-owned disposables: `ms73-qa-07148c6b`, `ms73-qa-5f5557a1`, `ms73-qa-9aacd278`, `ms73-qa-dc29faba`, `ms73-qa-b04cc204` (200-place), `ms73-qa-6d3d6f27` (search/history). No active disposable remains. Founder membership remained until each whole-Room deletion; no founder-authored content removed. Search cleanup required a fresh connection after an initial stalled WebSocket; ownership checks were repeated before applying. Receipts are historical and must not be replayed.

Final retained baseline:8users/profiles/Sandboxes,5Rooms,8memberships,5Personal conversations,30messages,10Board notes,2pins,3capabilities,6accepted connections,36notifications. All existing integrity counters zero. Delta from pre-MS7.3 is the one review Room and safe QA content/notifications. Founder identity, profile, Sandbox, Personal Chats and unrelated Rooms were not repurposed for testing.

### Release closeout / outstanding gate

Application commit/push and exact canonical release completed without force. Only MS7.3 code/tests/reports and the new handoff section were staged; unrelated Design/Art/Web/inheritance/research/experiments WIP remains untouched. The deployment skill kept release verification tied to target/alias/source metadata and a bounded runtime-error scan. UX guidance kept Search to the founder's anchored-search/context-jump contract rather than a new navigation system. **STOP FOR FOUNDER WALK**, not milestone lock or MS15 production certification.
