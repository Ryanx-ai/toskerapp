# MS7.3 FP6 execution and recovery

## R — recovery and estimate, 2026-10-07

Full four-page `TOSKER_MS7_3_FP6_FOUNDER_WALK_MAP_WAYFINDING_EXECUTION.pdf` read and visually inspected. This is the active founder brief; FP5 audit is complete. Estimated 8–12 hours through implementation, regression and canonical verification. Bounded existing architecture, no planned migration or procurement. Proceed under the brief; stop for destructive migration, paid procurement or materially larger architecture. MS7.3 remains unlocked; MS7.4/MS8 untouched.

Starting HEAD `a85a2819c33d3d141fcc62300b42f1358c54411a`; freshly fetched origin/main and canonical application `0d6f367e0dbfaac180990a2aa5f3b54074286f95`. The two local commits are FP5 audit/recovery only, with no application/schema/dependency delta. Vercel `dpl_EqFA8D7XnkzLp4SHjD1tTjfx5LeY` READY Production, canonical `toskerapp.vercel.app`. Separate browser/server Geoapify assignments exist for Development and Production, checked metadata-only. No credentials printed or changed.

All 28 migration hashes and catalog (35 tables,252 columns,127 constraints,15 enums) pass. Seven ownership guards enabled. Founder TID8V3X7P1 uniquely resolved; both protected Rooms remain. Profiles/messages/Board/Map Pins still match the verified protected backup; MBS Map Pin remains saved/revision2. Current retained data has legitimately advanced to 4 plans,8 routes,18 cards,4 comments,one owned Sandbox plan; receipt count changes during founder use. Preserve this, never restore old counts. General DB invariants pass. No FP6 fixture created. All FP5 receipts are historical/deleted and must not be replayed.

Provider app counters observed UTC2026-10-07: geocoding5/120, roads54/60. These exclude browser tiles and are not account-wide dashboard verification. Conserve the remaining road allowance; use mocks for repeated tests and defer real calls if quota unavailable. Never reset counters or raise limits to complete QA.

## Research and bounded architecture

- [Geoapify autocomplete](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/) supports partial queries; use one debounced/cancellable request, not each character. Local current-context suggestions and small exact aliases appear immediately; typed text stays unchanged. Context candidates are reauthorized/re-signed by ID before confirmation, not trusted from client metadata. No persistent query/location cache.
- [Geocoding filters](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/) support AND-combined country and rectangle filters. Restrict SG/MY to an explicit Singapore/southern-Johor rectangle, project only valid regional results, retain country/locality in address. Do not change global search to unrestricted.
- [Routing](https://apidocs.geoapify.com/docs/routing/) returns road geometry and per-leg metrics. Retain whitelist validation, current-input keys, quotas and provider boundary. Private origin is a separate consented two-point leg; shared totals/order stay unchanged. No border waits, immigration, toll or traffic accuracy claims.
- [Privacy policy](https://www.geoapify.com/privacy-policy/) states API request metadata retention. Consent must disclose precise coordinates sent via Tosker to Geoapify and link its policy; do not promise provider deletion. Locate alone performs no reverse geocode. A local approximate locality label avoids a new disclosure. Consent clears on Locate OFF, reload, context/route/first-stop changes and access loss.
- [MapLibre popup options](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/PopupOptions/) provide focus/max-width/anchor options. Preserve Tosker's existing React-clamped inspector and stable DOM markers/focus handling; refine transparency, not replace the renderer.
- [Geoapify Place Details](https://apidocs.geoapify.com/docs/place-details/) provides place details/wiki references, not a blanket photo license. No verified photo storage/display rights: omit external imagery, use neutral token-based treatment, no image requests/procurement.

## Checkpoints and release gates

### A and B local implementation

R commit d6dc871. Implemented atomic Route1+first add under existing scope/revision/receipt locks, immediate current-context suggestions, two exact aliases, cancellable autocomplete, bounded component-local five-minute cache and server re-signing of authorized context IDs. No migration/fixture/provider call. Baseline remote path: minimum700ms debounce + network; new local path synchronous, remote450ms + conservative1200ms request gap. Typecheck/diff passed after A. Provider names remain protected; manual names keep address. Inspector now offers first Add directly, no create-route detour. B glass refinement uses existing tokens with opaque fallback, and icon-only tray control retains44px target/labels. Browser visual/latency/reorder reproduction remains pending; do not claim acceptance from source checks.

### Founder addendum integrated during A

Read the complete pasted addendum `5b631309-e2f8-48b2-a421-c0d30357d03f/Pasted text.txt`. It extends FP6 without restarting or reopening FP5. Revised total estimate 12–18 hours, longer execution explicitly authorized. Pings are now in scope (supersedes original FP6 deferral): Locate-gated, explicit clicked point, ephemeral current-context signal using existing Ably, no durable history/Route/Card/memory/comment. Add !/?/pulse, identity, expiry, A/B/auth/reduced-motion. Investigate and reproduce POI/manual/locks/Quick Order/drag/fallback/move/concurrent routing failures before changing those paths. Add 20m nearby-place context without snapping/conversion, compact summary, correct per-leg midpoint tags/collision handling, separate YOUR LEG, Settings About attribution supplement, expanded bounded road matrix. Preserve all original gates and quotas.

[Ably ephemeral messages](https://ably.com/docs/pub-sub/advanced) support `extras.ephemeral: true` and exclude persisted history; no new provider needed. [Geoapify Free attribution](https://apidocs.geoapify.com/docs/maps) remains on-map together with applicable OpenMapTiles/OSM credit. Settings supplements, never substitutes.

R recovery/research/estimate → A search/default-route → B naming/popup/collapse → C local origin/consent → D SG/JB/provider truth → E integrated regressions → F release candidate → scoped commit/push/canonical → live A/B → exact-owned cleanup → STOP.

Before release: typecheck, lint, build, migration/catalog/invariants, all auth scopes, atomic Route1/idempotency, aliases/latency, naming, marker/card/focus, Locate/consent privacy, roads/metrics/stale cases, SG/JB, Hide/Skip/locks/comments/move, seven viewports, secret scans and diff check. Do not cut tests to fit time.

### C/D + addendum implementation checkpoint, 2026-10-07

Based on A/B commit `b3f6890`. No migrations: 28 unchanged. Implemented local origin chip + separately consented, memory-only private road leg; explicit SG/southern-Johor provider envelope; compact route summary + validated midpoint leg labels with hidden-incident-leg/collision handling; required on-map attribution preserved, Settings About supplements. No external imagery introduced. Bounded reverse lookup considers five candidates, contextual names only for named amenities/buildings within20m with matching source/license; original clicked coordinates and manual type stay authoritative.

Pings: Locate-gated !/?/pulse, click/centre-button keyboard path, 8s expiry, eight-marker bound, reduced-motion-safe halo, server-derived identity and reauthorized Room/Personal/Subroom publication using existing Ably `extras.ephemeral`, six/actor/min counter only (no coordinate/content storage). Sandbox local only. Disconnect/access loss/context disposal clear current signals. No live-location broadcast. These are implemented, not yet fully accepted.

Fresh disposable fixture: `ms73-qa-a26cdbb5`, receipt `.git/fp6-recovery/fixture.json` (0600); purpose FP6 A/B reorder/search/origin/ping acceptance; A+B+uniquely resolved founder8V3X7P1 included. Keep through QA; exact guarded cleanup after release. Existing Founder Review `ms73-founder-review-904a9dea` and founder-content `ms73-qa-bfff9475` remain protected and available for Founder Walk.

Evidence: `verify-ms73-fp6-addendum.ts` PASS rollback-only consent/region/nearby20m/multiple nearby amenities/expiry/midpoint; POI and manual reorder, locked positions, stale B revision, move/Skip invalidation; Room/Subroom/revoked/Sandbox ping authorization, server sender, ephemeral flag, rate limit. No external provider calls or retained test writes. `browser-fp6.mjs` PASS actual QA Room UI provider-backed MBS reorder, geographic move absent, native card drag, checkpoint reorder/movement followed by matching automatic Drive recalculation with controlled provider responses; Order hides metrics. Original first-slot MBS was locked; unlocked reorder succeeds. No behavior change to order/move paths without a reproduced defect. Controlled responses are NOT real-provider quality evidence.

Typecheck passed; lint zero errors (old cleanup script unused import warning; avatar warning subsequently removed using unoptimized existing-image component). Pending: real A/B pings, private origin privacy/consent browser matrix, responsive/visual sweep, search latency/remote quality, larger real road matrix, full integrated regression/security/build/secret scans and release. UTC Oct7 road quota remains a hard gate; do not reset/raise it. No push or FP6 canonical deployment yet. Canonical remains `0d6f367`.

Restart: inspect git status, read latest ledger and full addendum, preserve unrelated design/art/handoff WIP, verify canonical/remote again. Local dev localhost3000; isolated browser sessions fp6-a/fp6-b use normal Clerk QA email-code authentication. Tests take only the current receipt; never replay old fixture scripts. Browser script road responses are test-controlled and unroute on exit. Rerun failing/pending gates before any release claim.

Recovery: read this latest section plus handoff, fetch/verify canonical before resuming. Preserve unrelated design/art/inheritance WIP and old handoff hunks. Do not run old FP5 fixture wrappers or migrations. Use fresh exact-owned FP6 receipts and include exact-resolved founder in every QA Room. Never clean Founder Review or founder-content Room bfff9475.
