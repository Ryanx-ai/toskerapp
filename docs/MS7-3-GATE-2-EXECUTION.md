# MS7.3 Gate 2 — execution ledger

2026-09-29 · **IN PROGRESS — local slice A checkpoint; not deployed, not locked.**

Authority: founder's `TOSKER_MS7_3_GATE2_MAP_EXECUTION.pdf` and “lfg codex! MS7.3”. This supersedes Gate 1's execution stop. MS7.1 and MS7.2 remain locked. No MS7.4/MS8 expansion.

## Recovery and approved decisions

Recovered main and fetched origin: `bf791dfcc9cd7f7729d9dbcc9aae5ffc0969e12e`, 0/0 divergence. Canonical `dpl_35pSmVjb6xUsQWQNmpy5JtQqt3nM`, READY, exact same SHA and `toskerapp.vercel.app` alias, HTTPS 200. Source checkpoint underneath the docs-only commit is `0e02dfeedf5d7a23215d9cf2d2a7cd1d37143579`.

Confirmed defaults: one parent-Room Map, all current members collaborate, ordered places canonical, reversible archive, MapLibre/Geoapify only a conditional Development candidate, core Map/cards before companion Chat. Gate 2 adds route sets, private overlay visibility, straight/geodesic planning lines and previewed local distance suggestions. These are not road navigation or provider route optimization. Live remains prime-only; do not enable device location or six-second telemetry.

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

## Stop / next step

[Provider approval request](MS7-3-PROVIDER-APPROVAL.md) records the required account/key, budget/overage risk, rights, attribution, privacy and origin restrictions before external provisioning. No Terms accepted, account created or provider call made.

On founder approval: finish schema/service implementation and forward-migration proof; evaluate provider coverage/rights; implement real search/direct-pin/cards, route sets/ghosts/archive, planning line and local Quick order; realtime/auth race tests; responsive/accessibility proof; optional existing-Chat companion only after core proof. Then full regression → scoped commit/push → exact canonical SHA/READY/HTTP → live A/B smoke → **founder review, not auto-lock**. Local slice A must not be mistaken for a complete Gate 2 release.
