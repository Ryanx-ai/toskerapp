# MS7.3 Gate 2 — execution ledger

**2026-09-30 integrated update:** [release ledger](MS7-3-RELEASE.md) supersedes the historical slice-A statuses below. Shared Map/cards/routes and bounded Search cleanup pass local engineering acceptance; canonical release/live smoke next, then Founder Walk stop. Not locked.

2026-09-29 · **IN PROGRESS — local slice A checkpoint; not deployed, not locked.**

Authority: founder's `TOSKER_MS7_3_GATE2_MAP_EXECUTION.pdf` and “lfg codex! MS7.3”. This supersedes Gate 1's execution stop. MS7.1 and MS7.2 remain locked. No MS7.4/MS8 expansion.

## Recovery and approved decisions

Recovered main and fetched origin: `bf791dfcc9cd7f7729d9dbcc9aae5ffc0969e12e`, 0/0 divergence. Canonical `dpl_35pSmVjb6xUsQWQNmpy5JtQqt3nM`, READY, exact same SHA and `toskerapp.vercel.app` alias, HTTPS 200. Source checkpoint underneath the docs-only commit is `0e02dfeedf5d7a23215d9cf2d2a7cd1d37143579`.

Confirmed defaults: one parent-Room Map, all current members collaborate, ordered places canonical, reversible archive, MapLibre renderer and replaceable provider boundary, core Map/cards before companion Chat. Founder subsequently selected **Geoapify Free for bounded MS7.3 Development evaluation**, not permanent production use. Gate 2 adds route sets, private overlay visibility, straight/geodesic planning lines and previewed local distance suggestions. These are not road navigation or provider route optimization. Live remains prime-only; do not enable device location or six-second telemetry.

Five supplied Dashboard PDFs were rendered and visually read. Adopted Map-dominant area, cards below and optional later Chat rail—not screenshot colors, placeholder white Board, imaginary routes or unlicensed photography. Discord nameplate reference supplies overlay/scroll behavior, not branding.

## Slice A implemented

- `hall` remains the URL/storage/event key; visible app wording is **Board**, including menu, errors, notifications and Settings. No persisted message, note, route or enum rewrite. Existing capture asset filenames remain historical.
- Primary surface is URL-owned: Chat / Board / parent-Room Map; exactly one mounted. Map has current-member server authorization and no Personal/Subroom/Sandbox variant. Map navigation opts out of prefetch; Map component has a dynamic import boundary. Map is not treated as reading Chat.
- Map shell uses the existing Tosker fonts, shell planes, control/radius/spacing tokens; Location Cards have their own lower region. Provider-unconnected state and disabled place search are explicit. **No functional search, save, pin or route is represented as complete.**
- Floating bottom nameplate, opaque existing surface styling, expanded/collapsed geometry, safe inset, measured bottom list padding, scroll padding and focus clearance. Existing reduced-motion rules apply. No new animation/glass language.
- No new provider package, credential, account, Map schema or migration; no custom chat, local fake plan or duplicated message storage.

## Verification

Local optimized production build, not a canonical deployment. Browser A/B used retained test users through normal Clerk Development sign-in, not an auth bypass.

- TypeScript and production build pass. Lint has zero errors and the pre-existing unused `eq` warning in `scripts/cleanup-fp4-qa.ts`.
- `scripts/verify-ms73-workspace.ts`: surface eligibility/resolution, retained Board route, opt-in Map boundary, source auth guard and Chat-attention separation pass. Source assertions are explicitly not runtime authorization proof.
- `scripts/browser-ms73-workspace.mjs map`: 320/390/430/768/1440/1728, single selected Map surface, no Chat/Board mounted, truthful disabled search, no page/Map horizontal overflow; zero browser errors and zero observed map-provider requests. All six Map captures visually reviewed.
- `surfaces`: settled existing Room Chat/Board, Personal Chat/Board, Subroom Chat, Sandbox; correct tab eligibility; retained member B can open parent Map. Unknown Room, Personal Map and Subroom Map paths denied. No destructive mutation or new QA content.
- Additional browser proof: retained nonmember denied a different existing Room's Map; client Chat → Map → Board → Chat retains an unsent draft (original restored); Map menu has no misleading Chat-unread action; emulated reduced motion has zero nameplate transition duration.
- `nameplate`: eight size/collapse combinations spanning all six widths. Synthetic DOM-only long lists; focus on final row fully clears plate, plate within viewport, no horizontal page overflow. Copies removed after each case. This tests layout, not creation of real conversations.
- Read-only DB audit: 8 users/profiles/Sandboxes; 4 Rooms, 5 memberships, 5 Personal conversations, 29 messages, 9 notes, 2 pins, 3 capabilities, 6 accepted connections, 32 notifications; all five legacy integrity checks zero. All 20 migration hashes and current 25-table/164-column/78-constraint/15-enum catalog match. `db:check` passes.
- Secret scan: source/new code and 27 client bundles pass; local environment ignored; no credentials printed. Diff whitespace check passes.
- Local runtime caveat: explicit `127.0.0.1` binding caused self-proxy request timeouts; restarting with normal `npm run start` restored HTTP 200 and all walkthroughs above. No application/auth fix is claimed from this environmental recovery.
- After the final rebuild, the retained browser session returned to the normal Sign in gate. Normal reauthentication followed by the full six-width Map repeat passed with zero browser errors. Do not mistake a login screen or HTTP 200 from the auth gate for a successful Map render. Session longevity remains Development-service debt, not fixed by this slice.

Evidence: `/Users/ryanc/.codex/artifacts/tosker-ms73-20260929/` contains source-reference renders, canonical baseline and six-width Map / long-list nameplate captures. Stress images deliberately repeat DOM-only rows; they are not product data.

## Slice B schema/service review — design only, not applied

The additional real-basemap slice below is now verified locally. This schema/service section still describes the next unapplied work; no trip tables or saves exist yet.

Reviewed current Room membership authority and lifecycle serialization. Existing removal takes the Room row lock; new mutations must take that same lock **before** reauthorizing membership, not rely on a page-level check. Reads must check current membership and return a consistent revisioned snapshot. Nothing below has been generated/applied or claimed tested yet.

| Object | Proposed authority and constraints |
| --- | --- |
| `trip_plans` | One row per parent Room (unique Room FK), monotonically increasing revision, timestamps. Created explicitly, not by page load. No Subroom or Personal owner. |
| `trip_places` | One canonical UUID per card/pin, plan FK; validated finite latitude/longitude and bounds; user-authored title/note; optional allowed provider field subset with provenance; reversible archive. No raw provider payload/photos. |
| `trip_routes` | Plan-scoped ID/name, controlled Tosker color, timestamps/archive. Route existence/name/color are shared. |
| `trip_route_places` | Route membership references the canonical place. Plan-scoped composite foreign keys prevent cross-plan references; unique route/place and bounded order. Numbering derives from current ordered active membership. |
| `trip_mutation_receipts` | Actor + request UUID + plan scope and payload hash, committed revision/result identifiers only. Same request/same payload returns prior result; changed payload rejects. Authorization precedes receipt replay. |
| viewer selection | Active route/ghost visibility are viewer-private, scoped by user/Room; never shared route columns. Decide local preference persistence versus existing private preference infrastructure before adding another table. |

Service contract before DDL: normalize/validate input → lock parent Room → current-member check → scoped receipt check → compare expected plan revision → validate scope/caps → atomic mutation + revision + receipt → content-free Ably invalidation after commit. Failed/ambiguous response retries cannot duplicate a place/route. Never blindly replay a conflict. Archive retains route membership so restore can recover it; hide archived places consistently from active pins/order/line. Route Nuke is omitted. Parent Room destruction cascades only after explicit FK review and a disposable-fixture cascade proof.

Required tests still outstanding: A/B simultaneous add/order/archive, changed-payload retry, cross-Room ID injection, removal-vs-write, receipt replay after removal, rollback and lost response, stale snapshot recovery, route/archive/restore references, bounded reads/no N+1. Provider fields and attribution need the evaluation gate below before finalizing durable card storage. This review is not release proof.

## Founder provider approval / credential handoff — 2026-09-29

[Provider decision report](MS7-3-PROVIDER-APPROVAL.md) records the stopped LocationIQ comparison, official-source findings, imperfect Singapore demo cases, durable-field rights, privacy/attribution, quotas and restrictions. Founder reports creating Geoapify `tosker` Free project/key; Codex created neither and made no billing change. Anonymous-demo evidence is not configured-provider smoke. Selection is reversible at MS7.6; MapLibre remains the renderer.

Recovery confirms source checkpoint `a2f5b20`. Founder saved `GEOAPIFY_SEARCH_KEY` in linked Vercel Development. Secure pull into ignored `.env.development.local` (0600) preserved existing `.env.local` and local-only secrets. No public Geoapify variable. Actual-key smoke completed once: 8 Singapore-filtered/bias forward + 2 manually chosen reverse requests, HTTP200 throughout, no retry, estimated 10 credits. Known postal failure (018953 → Museum) persists; reverse responses give context, not exact pin identity. All selected fields/provenance and exact references recorded in sanitized evidence linked from the report. Retain clicked coordinates rather than snapping to reverse result coordinates. Account dashboard usage/restrictions remain unverified.

The initial server-only handoff ended without app/schema/deployment changes. Its browser-key gate is now resolved by the founder's next message and the verified slice below. Do not repeat provisioning. Preview/Production remain unconfigured, server egress controls unverified. Final regression → scoped commit/push → exact canonical SHA/READY/HTTP → live A/B smoke → **founder review, not auto-lock**. This is not a complete Gate 2 release.

## Provider / real-basemap slice — local acceptance 2026-09-29

Founder confirmed 3,000-credit daily Free allowance and saved the separate browser key. Screenshot shows11credits across the selected Aug29–Sep29 period, not a fresh final usage reading. Secure repull preserved all local secrets and exact server credential; exact public variable name verified, values distinct. Three style tests: localhost3000 and127.0.0.1:3000 return200; unapproved example origin returns401. CORS `*` is not the access-control proof. No Preview/Production keys, paid resources or billing changes. Internal500/day ceiling remains.

Implemented pinned `maplibre-gl@6.11.2`, provider-neutral browser configuration boundary with Geoapify Development style, lazy SDK only inside the existing Map surface, exact same-origin generated worker/shared files plus upstream license. The documented MapLibre6/Next worker integration is necessary: first browser render exposed a missing-worker failure despite successful build/style response; copying both runtime files via prebuild/predev and explicit `setWorkerUrl` fixed actual tile rendering. Generated assets are ignored by Git/lint, included in secret scanning, and byte-compared against installed package. Only generated public `/maplibre/` assets bypass auth middleware; Room page/member guards unchanged.

Map has stable loading geometry, sanitized failure, renderer/listener/ResizeObserver disposal,20-second initial timeout, max2explicit retries, no retry/poll loop or device geolocation. Keyboard pan,44px zoom controls and Singapore reset; source attribution always expanded and not duplicated. Label colors inherit existing Tosker text/surface tokens. Actual provider attribution remains in the style; required credits are verified in the rendered browser. Map/toolbar/cards inherit existing fonts, shell planes and spacing; workspace scroll preserves cards on short displays. Search/save remain visibly unavailable until shared-plan services exist—no fake pins, saved data or route claims.

Verification:

- TypeScript, optimized build (explicitly loaded Development env for local production-mode build), source/provider guards and diff check pass. Lint:0errors, only pre-existing unused `eq` warning. Production dependency audit:0vulnerabilities; overall install reported4moderate development-tool findings, no force-upgrade applied.
- Six real-map screenshots320/390/430/768/1440/1728 visually reviewed; no horizontal page overflow, single Map primary,44px controls, visible Geoapify/OpenMapTiles/OpenStreetMap credits.320x568 scroll reaches entire Location Cards region. Keyboard pan/reset with reduced-motion preference exercised.
- Actual retained A and B use normal Clerk Development sign-in and load shared-Room basemap. Unknown Room returns404 without map requests. Existing membership service not changed; full trip mutation authorization/race proofs still belong to next slices.
- Fresh existing Chat and Board loads make0provider/MapLibre-worker resource requests. Browser-only injected map fetch failure removes renderer; restoring fetch then explicit retry returns to the real map. No page errors on these checks. Initial network-route test did not inject a failure and was not counted as proof; browser fetch injection supplied the actual failure evidence.
- One initial test command collided with a legacy helper's `layout` branch and timed out before any mutation; new basemap-prefixed arguments avoid those branches. No fixtures/messages/Room state created or deleted.
- Secret scan passes438source/owned files and38client/generated-worker bundles, including Geoapify server key. No credential text in screenshots/logs/source. Stats capture during one later page lifecycle recorded22provider resources; this is not a complete account-wide bill/delta. No routing, optimization, live location, background provider polling or extra geocoding smoke.

Evidence: existing artifact directory, `basemap-{width}.png`, `basemap-failure.png`, `basemap-short-scroll.png`. Repeatable read-only tests: `verify-ms73-map-provider.ts`, `browser-ms73-basemap.mjs basemap-layout|basemap-isolation|basemap-failure` with `AGENT_BROWSER_BIN` and `MS73_CAPTURES`. The layout/failure modes expect the real Map already open in `ms73-local-a`; use normal login, not an auth bypass. Next: reviewed forward-only schema/services, then real server search and confirmation/saved-place slice. No push/canonical deployment or milestone lock yet.
