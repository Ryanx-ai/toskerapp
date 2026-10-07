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

R recovery/research/estimate → A search/default-route → B naming/popup/collapse → C local origin/consent → D SG/JB/provider truth → E integrated regressions → F release candidate → scoped commit/push/canonical → live A/B → exact-owned cleanup → STOP.

Pending: all FP6 implementation/QA. Each checkpoint must record HEAD, migrations, fixtures, passes/pending and restart instructions. Before release: typecheck, lint, build, migration/catalog/invariants, all auth scopes, atomic Route1/idempotency, aliases/latency, naming, marker/card/focus, Locate/consent privacy, roads/metrics/stale cases, SG/JB, Hide/Skip/locks/comments/move, seven viewports, secret scans and diff check. Do not cut tests to fit time.

Recovery: read this latest section plus handoff, fetch/verify canonical before resuming. Preserve unrelated design/art/inheritance WIP and old handoff hunks. Do not run old FP5 fixture wrappers or migrations. Use fresh exact-owned FP6 receipts and include exact-resolved founder in every QA Room. Never clean Founder Review or founder-content Room bfff9475.
