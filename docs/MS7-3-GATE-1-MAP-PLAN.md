# MS7.3 Gate 1 — Collaborative Trips / Map + Location Cards

2026-09-28 · CANONICAL PRODUCT / DESIGN / ARCHITECTURE PLAN · **Gate 1 complete; development NOT started.**

Locked product thesis: **Collaborative trip planning made fun.** Desktop Web is primary; responsive Web must stand on its own. Later MS13 native mobile can revisit device capabilities without making this milestone depend on native-only APIs.

This is the research deliverable for Phase B of the founder's `TOSKER_MS7_2_LOCK_TOPBAR_MS7_3_MAP_PRIME.pdf`. It is not approval to execute its proposed slices, provision services or apply a migration. Phase A shipped first: [post-lock shell evidence](MS7-2-POST-LOCK-SHELL.md), application `0e02dfeedf5d7a23215d9cf2d2a7cd1d37143579`, canonical READY `dpl_2p1NKhzJJuX3WMZ3mR1cwo1iAdCR`. A documentation-only deployment may be newer. **MS7.1 and MS7.2 remain LOCKED.**

## 1. Decision in one paragraph

Recommend a native **Map** surface in a parent Room: find a place, save a durable shared Location Card, select the matching pin, add a short note, and collaboratively arrange places into an intended visiting order. Keep the existing Chat for discussion and Hall for durable decisions. Start with **ordered places, not calculated directions or optimization**. Every current Room member can contribute; conflicts are explicit and archive is reversible. Evaluate MapLibre plus a licensed hosted tile/search provider, with Geoapify as the first candidate because it advertises storage permission; coverage, exact data rights and privacy still need an approved Development evaluation. No provider is selected or provisioned. Prove the core before adding the optional desktop Chat panel. The approval table in §13 is the execution gate.

## 2. Baseline and inherited evidence

Read-only source inspection and the founder's supplied images are different evidence classes. No old project was changed, imported, installed or run.

| Reference | What was actually established | ADOPT / ADAPT / REJECT |
|---|---|---|
| Current Tosker | `schema.ts`: Room UUID, owner, membership, tags, child visibility, canonical conversations. `authorize.ts`: member/owner checks. `rooms/lifecycle.ts`: Room row locking, membership withdrawal and realtime revocation. `subroom-order.ts`: expected-order conflict check. `realtime-contract.ts`: opaque-ID channels and change signals. Existing Room creation adds TRIP and optional label. | **ADOPT** Room authority, existing identity projection, authorized service patterns and Neon authority. **ADAPT** order/conflict patterns for member collaboration. **REJECT** a new Party account system or duplicate messaging/sync service. |
| Floating Tosker shell | Phase A six-width local production review and live A/B checks: identity/search/utilities above a subordinate tab shelf. | **ADOPT** shell, spacing, palette, type, private accents, collapsed sidebar. **ADAPT** first-class Chat / Hall / Map tabs. **REJECT** legacy Dashboard/global-app duplication and copying screenshot colors. |
| HUDL / TethrMap source | `/Users/ryanc/Desktop/devproject/HUDL/tethr/tethr/Views/Map/LocationCardView.swift` distinguishes numbered stops and ordinary places. `tethrMapView.swift` combines pin/member annotations. `ViewModels/ViewModels/MapViewModel.swift` calls `loadMockData()` in initialization and refresh. `architecture.md` proposes MapKit/CoreLocation and Supabase. | **ADOPT** card↔pin identity and compact place information. **ADAPT** mobile map/cards relationship into responsive Web. **REJECT** mocked members as real location, automatic tracking, SwiftUI transplantation, Supabase migration and HUDL lime branding. The architecture document is a proposal, not proof of a deployed collaborative backend. |
| Tethr by Pangea circa 2024 | Founder screenshots `2026-09-28 at 6.09.17 PM` and `6.09.25 PM`: map dominates, cards below, optional Chat on right; dark/light examples and route lines. Prior Sept25 references show the same lineage. | **ADOPT** spatial hierarchy and visible cards. **ADAPT** to current Room/surface shell and narrow layouts. **REJECT** assuming route lines prove a licensed routing backend, fixed desktop columns on phones, mandatory imagery, calendar/call/Pro upsell scope. |
| Separate TethrMap / 2024 runtime | Bounded inventory of Desktop/devproject and Developer, plus filename search in HUDL/Pangea/tethrLink, established the HUDL TethrMap view but did not establish a separate runnable 2024 Map repository. | Use supplied visual evidence, not an invented runtime claim. Founder can supply another repository later; this does not block the Gate 1 conceptual comparison. |

Current retained Development baseline after Phase A: 8 users/profiles/Sandboxes, 4 Rooms, 5 memberships, 5 Personal conversations, 29 messages, 9 Hall notes, 2 pins, 3 existing capabilities, 6 connections, 32 notifications; checked duplicates/orphans zero. All 20 migration hashes/catalog passed. No Map table/API/provider exists by virtue of this plan. Existing Development reliability and production-environment separation debt remain in MS7.6; canonical hosting is not launch-production certification.

## 3. Market evidence, hypotheses and validation

Primary vendor/help sources checked **2026-09-28**. These establish advertised workflows, not independent demand, retention, reliability, regional quality or willingness to pay. No vendor growth claims are treated as Tosker traction.

| Evidence | Product implication / limit |
|---|---|
| [Wanderlog](https://wanderlog.com/) advertises itinerary and map together and real-time collaborative editing. | This combination is established, not a novel moat. Tosker must prove lower coordination friction through Room context, not merely show pins. |
| [Google Maps lists](https://support.google.com/maps/answer/7280933?hl=en) provide saved-place lists and sharing. | A list of places alone is a weak differentiator. Do not claim Maps has no collaboration. |
| [Roadtrippers Trip Collaboration](https://support.roadtrippers.com/hc/en-us/articles/360025547291-Trip-Collaboration) describes collaborative trips as a Pro/Premium perk, with free-account collaborators. | Group route planning has a commercial product precedent; this is not evidence Tosker users will pay or want the same route scope. |
| [Ride with GPS club route library](https://support.ridewithgps.com/hc/en-us/articles/4423179692187-Part-2-Club-Route-Library) organizes and shares routes with members. | Clubs are a plausible cohort, but dedicated route/navigation tools are strong incumbents. Avoid replicating their specialist stack in V1. |

**Founder observation:** reference designs and the direction identify a desired shared trip workspace; earlier conversations also suggest fleet/group-movement interest. Those are qualitative founder inputs, not a market study. No fleet TAM, customer interviews, paid pilot or demand measurement was supplied or independently established.

**Working hypothesis:** groups that currently juggle chat + maps + documents can make and recover a shared place/order decision more easily when conversation, durable decisions and spatial planning share Room membership. **Unproven:** repeat use, reduced switching, onboarding willingness, search coverage, collaboration frequency and payment intent. The absence of these measurements is not a reason to expand the feature set.

Primary research cohort proposal: friends arranging a local road trip or supper run, with motorcycle/car groups next. Secondary discovery: school/field trips and small event/logistics groups; later operators only after consumer collaboration evidence. Do not encode these cohorts into role enums or a fleet schema. Exclude enterprise dispatch, driver scoring, vehicle telemetry, military operations and optimization from this milestone.

After approved implementation, observe at least three small groups on a real upcoming trip: organizer creates Room, invites another member, both add places, one revises order, the other recovers that change next visit. Capture task completion, duplicate/wrong-place choices, conflicts recovered, which surface they use to find the agreed plan, and whether they return voluntarily. Proposed discovery success is both members completing that loop without coaching and explaining the saved order correctly; it is not a statistical product-market-fit threshold. Ask whether they would use it again before adding more features. Do not silently collect message bodies, search text or coordinates for analytics. Expect possible organizer overload and collaborator uncertainty as **design assumptions**, not observed emotional facts.

## 4. Mental model and core loop

**A Room is the group. A Map is its shared spatial plan. A Location Card is a saved place, not a moving person.** A stop flag expresses intent to visit, not arrival, reservation, assigned driver or confirmed ETA.

```
Trip Room → Map → Search / choose location → Preview → Add place
                                                      ↓
                         Shared Location Card ⇄ Selected pin
                                  ↓
                       Note + optional stop intent + order
                                  ↓
                    Other member sees canonical saved plan
```

Each successful save is one durable change, not separate pin/card writes. Search results are temporary candidates until explicit Add. Selecting a card focuses the corresponding pin; selecting a pin selects and reveals that card. Selection/camera are private ephemeral view state; do not drag every member's camera when someone else clicks.

**V1 information architecture:** Chat | Hall | Map. Future Live is an independently approved surface, not a disabled promise now. “Gizmo”, “plugin” and “Beta extension” are not customer-facing Map labels. One parent-Room Map; no Personal/Sandbox/Subroom-owned Map in V1. A Subroom may link to its parent's Map with an explicit parent label, but never imports restricted child content. Recommend availability to current parent Rooms without using editable TRIP/custom tags as an authorization boundary: “Trip Room” describes use, not a new Room type. Removing a tag must not hide or delete an existing plan.

Chat contains discussion and ordinary authorized links. Hall holds decisions/notes worth keeping. Map owns places/order. Do not copy every place into Hall or every edit into Chat. V1 can share a Room-scoped deep link through existing message creation; server reauthorizes on opening. Rich embedded cards, automatic activity messages and new Hall object types are deferred unless specifically approved. A deep link does not confer access or expose a private title in unauthenticated previews.

### Interaction / recovery contract

| State/action | Proposed behavior |
|---|---|
| Empty Map | “Add your first place” with search and a usable empty list; no mock group markers, fake itinerary or device-location prompt. |
| Search | Explicit location-search label distinct from top-bar conversation search; keyboard combobox, result name + locality/address; bounds bias may be changed. Search does not add a pin automatically. |
| Add | Preview the selected identity/position, confirm once; pending state on that card; canonical receipt replaces pending state. Duplicate result offers existing card, not another silent copy. |
| Edit | Short label/note/category/stop intent. Dirty draft stays local in memory during recoverable errors. No per-keystroke durable write. |
| Reorder | Drag plus Move earlier/later buttons; preserve exact IDs and expected revision. A conflicting reorder offers refreshed order and retry, never silently overwrites another member. |
| Archive | Explicitly named Archive, undo/restore, actor/time attribution. Focus moves to next card or list heading. No misleading permanent Delete action. |
| Offline / timeout | Saved list can remain visibly stale while mounted; no claimed offline product or background queued edits. Failed draft is not “Saved”; retry uses the same operation ID. Full reload offline may be unavailable. |
| Provider unavailable / quota | Existing licensed durable cards remain available and editable; map/search show specific recoverable status. No fabricated coordinates or endless spinner. |
| Access lost | Clear cached plan, selection, draft and provider candidates; stop subscriptions; unavailable state and return to accessible Room list. No clipboard/download fallback that leaks content. |
| Conflict | Keep the actor's unsaved input in memory, show latest authorized record, offer deliberate reapply/discard. A removed/archived target cannot be silently recreated by stale save. |

## 5. Responsive composition and accessibility

The new shell remains authoritative. Top-bar conversation search stays scoped to conversation history; Map location search lives inside Map's working surface. They must not share an ambiguous placeholder or hijack each other's query state.

| Available space | Proposed composition |
|---|---|
| Wide desktop, 1440/1728 | Map primary; cards below in a keyboard-accessible strip/list; optional existing Room Chat panel on right only when enough actual content width remains. Hiding Chat returns that space to Map. Shell/sidebar collapse still works. |
| Tablet, around 768 | Map plus cards drawer/list switch. Chat opens as a separate overlay/surface, not three compressed columns. Preserve current selection when changing views. |
| Phone, 320/390/430 portrait | Map / Places view switch within the Map surface, one selected detail sheet at a time. Search expands above keyboard; cards list offers the full workflow without canvas gestures. No permanent right panel or forced horizontal page scroll. |
| Phone/tablet landscape and short viewport | Prefer map/list split only if usable height/width remain; otherwise the same switch. Sheets and search scroll internally with close/submit reachable above safe area/keyboard. Reflow on rotation without resetting draft/order. |

These are planning targets, not newly implemented breakpoints. Proposed acceptance matrix: 320, 390, 430, 768, 1440, 1728 plus 844×390 and 1024×768; expanded/collapsed shell; browser zoom/text enlargement, reduced motion and narrow software keyboard. Reuse existing radii, 44px interactive targets, inset tokens, balanced header, focus rules and private accent. Do not use place photos or new visual art to mask empty content.

Map canvas is supplementary to semantic Places list: every pin has text identity, category/stop state is not color-only, order has a textual number, and all edit/reorder/archive actions work by keyboard. Search supports arrows, Enter and Escape with result status announcements; async saves/conflicts announce concise status without constantly stealing focus. Selection stays synchronized between pin and card within this user's view, not across members; camera movement is reduced or instant under reduced motion. Trap focus only inside actual modal sheets and restore it to their trigger. Visible labels, contrast, attribution and gesture-free controls must survive provider failure. Future QA must include a real screen-reader pass; Phase A viewport evidence is not that certification.

### Bounded Map visual grammar (proposal, not a new design system)

| Element | Tosker treatment / meaning |
|---|---|
| Ordinary pin | Small high-contrast place marker with text equivalent; not an avatar or live person. Shape remains legible against map detail. |
| Selected pin | Visible outline/halo plus selected card border and accessible selected label; no bouncing animation or color-only state. |
| Numbered checkpoint | Optional stop intent shown with a number and “Stop” label. Number derives from the stop subsequence of shared card order; ordinary places remain unnumbered. This is planned intent, not proof of arrival. |
| Location Card | Existing rounded raised surface, name first, address secondary, short note and category, stop/order information and bounded ellipsis actions. Photos are not required. |
| Map toolbar / search | Compact rounded inset controls using existing icon/target sizes; location search is clearly named. Fit places / zoom controls have accessible labels; no implicit locate-me request. |
| Order controls | “Move earlier”, “Move later”, “Make a stop” / “Remove stop”; no Autosort or navigation-looking Start button in ordered-only V1. |
| Empty / loading / failure | Plain “Add a place”, stable loading region, specific retry/error copy and usable list fallback; reuse existing state styles, no mock pins. |
| Collaboration indicator | Canonical “Saved” / “Saving…” / “Couldn't save” and last-editor attribution on relevant detail; conflict explicitly names changed content without exposing private identity. No fake co-presence dots or live cursors. |

Use human labels such as Place, Stop, Add to trip and Meet here when they describe a real action. Avoid Asset, Operational waypoint, Dispatch route and Fleet object. “Let's go” implies execution and is therefore deferred in planning-only V1. Preserve Tosker's warm/playful tone without implying navigation or tracking. Larger illustration, typography and motion decisions remain MS8.

## 6. Location Card and proposed forward-only schema

**Proposal only. No SQL, Drizzle schema, migration, API route or dependency was added.** Existing 20 migrations are immutable. No backfill into existing Rooms is required: an empty plan can be created on the first authorized explicit save after implementation approval. PostGIS is not required merely to store a bounded set of coordinates and order it.

| Proposed entity / fields | Constraints / lifecycle |
|---|---|
| `room_map_plans`: UUID, unique parent `room_id`, stream revision, order revision, created/updated timestamps | FK to existing Room; one plan per Room. Lock Room then plan consistently. Revisions are server-managed. |
| `map_places`: stable UUID, plan FK, provider namespace + place reference (nullable for genuinely user-authored dropped pin), latitude/longitude, saved display name/address, short note, category, `is_stop`, position, creator/updater UUIDs, created/updated timestamps, item revision, archivedAt/archivedBy | Finite coordinates with lat ±90/lon ±180; bounded strings and application category vocabulary, not cohort-specific DB enum. Initial proposed bounds: name160, address500, note1000, category40; max200 active places/plan. UUID authority, never username/TID. |
| Provider provenance on card: source type, permitted stored fields, fetchedAt, optional expiresAt, attribution reference / license mode | Persist only fields licensed for this use. A provider ID alone does not license an indefinite coordinate/name/address copy. Expiring provider projection must refresh or show unavailable, never silently turn into user-authored content. User-authored notes remain separate. |
| `map_mutation_receipts`: plan/actor/operation UUID key, action, payload digest, result ID/revision, createdAt | Proposed bounded retry window, e.g.24h, then opportunistic scoped expiry; no new job provider. Reusing ID with different payload fails. No raw notes/search/provider response stored in receipts. Beyond retry window require refetch before a new mutation. |

Parent Room is derivable through plan; all queries enforce that relationship, not a client-supplied Room ID alone. Index plan/active/order/id and provider-reference lookup. Partial uniqueness of active `(plan, provider, providerRef)` prevents concurrent exact-provider duplicates. A nearby or similar-name match is only a warning: different businesses may share an address. Manual pins get coordinate/name proximity suggestions, not automatic merging. Active positions are normalized transactionally, tie-break by UUID; avoid a non-deferrable unique-position constraint that breaks an in-place reorder. A restored card goes to the end unless the actor deliberately moves it. Restore colliding with an active provider duplicate offers the existing card; no silent data merge.

Archive hides from active pins/order, preserves notes and identity, is visible in a bounded/paginated archive and can be restored by current members. No per-card irreversible deletion in V1. Creator departure does not erase group-authored planning. Room destruction must include plan/cards/receipts in its existing authorized transaction/lifecycle, with appropriate cascade/explicit cleanup and tests; user/account deletion remains the MS15 policy gate, not an unreviewed cascade from profiles. Reassess total archived-record quota/retention in MS7.6 before beta: a max-active cap alone does not cap storage.

Optional future direction data is not smuggled into these cards. If approved later it needs provider/mode/input-order revision, licensed geometry lifetime, stale state and failure handling as a derived projection, not durable authority for the intended stop order.

## 7. Authorization, concurrency and synchronization

| Actor | V1 recommendation |
|---|---|
| Current parent Room owner/member | Read; search; add; edit shared fields; reorder; archive/restore. Attribution is visible. Ownership does not make the owner's stale write override another member. |
| Owner only | Existing Room identity/membership/destruction controls; no new enterprise role editor. |
| Pending invite, expired invite, removed/left member, unrelated signed-in user, anonymous visitor | No plan/search/mutation access. Pending invitations are not membership. Return unavailable without private name/address leakage. |
| Member with restricted Subroom | Parent Map remains parent-scoped; never infer access to a child conversation or pull child messages into its optional Chat panel. |

Use `requireRoomMember` on every read/provider search and again inside every write transaction. Enforce same-origin/authenticated mutation boundary, input limits, server-side provider-result validation and exact ownership of plan/place IDs. A client cannot attach a place to another Room by changing hidden fields.

**Locking proposal grounded in current lifecycle:** Room row lock → plan row lock → affected card rows. Current withdrawal already locks the Room; new mutations must serialize with it and recheck membership after acquiring the lock. Do not acquire the actor-token advisory lock after a Room lock: withdrawal takes actor-token lock first. If a new token path needs both, preserve that existing order. This is a plan to implement/test, not a claim all existing services already meet new Map races.

Use item revision for card edits and expected order revision + exact active-ID set for reorder. Add/archive/restore increment order revision; every mutation increments stream revision. A note edit should not unnecessarily invalidate a reorder. Transaction checks, canonical returned projection and idempotent receipts prevent duplicate effects after response loss. One winner + explicit409 conflict for stale overlapping writes; no silent last-writer-wins, client timestamps, collaborative text CRDT or optimistic “Saved” before commit. Publish only after successful commit.

**Neon is authoritative. Ably remains invalidation only.** Prefer a content-free `map.changed` event on the existing authorized parent conversation channel, containing only opaque plan ID/revision, after verifying that channel's capability issuance and revocation are equivalent to parent membership. Never send coordinates, addresses, names, notes or provider payload in events. A separate channel is warranted only if that boundary cannot be proven, using the same provider/auth pattern—not a second synchronization platform. Clients coalesce events and fetch an authorized bounded snapshot; focus/reconnect/gap recovery reconciles revisions. A failed publish must not lose a committed place. Server responses and access-loss reconciliation remain decisive even while an old realtime token is being revoked.

## 8. Search, provider strategy and data rights

Renderer, geographic data, place search, directions and optimization are different dependencies. [MapLibre GL JS](https://maplibre.org/) is a renderer, not a hosted POI database or free tile entitlement. Do not use demonstration tile URLs as Tosker production infrastructure.

| Candidate | Evidence checked 2026-09-28 | Gate 1 decision |
|---|---|---|
| MapLibre + Geoapify hosted tiles/search | [Platform](https://www.geoapify.com/) advertises saving API results; [API catalog](https://www.geoapify.com/maps-api/) separates geocoding, Places and routing; [terms](https://www.geoapify.com/terms-and-conditions/) govern service usage. | **First evaluation candidate, not selected.** Verify exact POI/name/address/coordinate storage and shared-display rights, attribution and regional quality under intended plan. Brand-name POI search must be tested separately from address autocomplete; category search alone is insufficient. |
| Mapbox maps/search | [Search Box](https://docs.mapbox.com/api/search/search-box/) limits returned data to temporary use; [Geocoding v6](https://docs.mapbox.com/api/search/geocoding/) supports permanent intent but no longer includes POI data. | Strong integrated alternative, but do not pretend permanent address geocoding grants permanent POI rights. Requires an appropriate explicit license or a different licensed durable-place strategy. |
| Google Maps + Places | [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) restrict caching/storage with place-ID exception and impose display/attribution requirements. | Evaluate if POI coverage proves materially better; saved IDs plus policy-compliant refreshed projection changes outage/cost behavior. Do not persist all returned fields forever or assume permission to render them on another provider's map. |
| MapLibre + MapTiler | [Client documentation](https://docs.maptiler.com/client-js/) says not to store or redistribute Cloud API data and instructs client-side geocoding use. | Tiles remain a candidate class; standard search usage is not assumed to satisfy durable cards. Need compatible license/provider combination, not a generic server-proxy transplant. |
| Public OSM endpoints | [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) prohibits client autocomplete and limits heavy usage; [public tile policy](https://operations.osmfoundation.org/policies/tiles/) is an independently constrained service. | **Reject as the default hosted product dependency.** Open data is not unrestricted free public infrastructure. Self-hosting is also not a hidden V1 shortcut. |

A vendor FAQ is evidence of a candidate, not complete contractual clearance. Approval must cover durable field storage, attribution, permitted map pairing, regional coverage, deletion/refresh, request-data handling and cost. If no candidate meets durable POI requirements, stop for a product/provider decision; do not strip core search silently or disguise copied provider data as manually entered.

**Proposed search contract:** bounded query 2–200 characters, ~300ms debounce, abort stale requests, 5–8 results, deliberate selection/details fetch, no full-region crawling. Use map viewport or explicit trip region as visible bias, not browser location permission or IP-based “near me” by default. Address/POI name, locality and coordinates must resolve the exact selected item; ambiguous results require choice. Validate NaN/out-of-range coordinates and missing result identity. Retain provider namespace/ref and provenance; normalize category without persisting the complete raw response. Manual dropped pin remains a separate explicit source with editable user label and optional address, never invented geocoding success.

Server search is authorized, quota-limited and timeout-bounded when the chosen provider permits this architecture; it sends query/region only, not Room name, TID, member names, notes or chat. Restrict endpoint hosts; never fetch an arbitrary result-supplied URL. No private search queries in application logs. Rate limits must be multi-instance safe with existing database/platform facilities, not in-memory counters alone. Proposed pilot limits require approval/tuning, e.g.20 requests/minute/actor and a shared daily budget; clear429 recovery, no unbounded retry loops.

Browser tile keys are intentionally public only if scoped/restricted. Separate server search credentials from browser tile credentials where supported; origin/referrer/API restrictions are abuse reduction, not authentication. [Geoapify key controls](https://myprojects.geoapify.com/help/api-keys/) provide environment/key restrictions; confirm chosen plan's exact behavior. Do not print/store secrets in docs, screenshots or Git. Separate Development/Preview/Production usage and allowlists; canonical review currently uses Development services, so an approved Development key cannot be silently promoted to real launch Production.

Privacy is material even without live tracking: map requests reveal viewed region and search reveals intent. [Geoapify privacy policy](https://www.geoapify.com/privacy-policy/) states request body, headers, IP and timestamp are retained, with successful-request retention generally no longer than24h for aggregation. Do not claim no provider logging. Approve data handling and disclosure before account/key provisioning; redact application diagnostics. Keep required provider/OpenStreetMap attribution visible even with drawers/panels; verify underlying dataset obligations rather than equating paid plan with waived attribution.

**Cost model, not a quote or purchase:** [Geoapify pricing details](https://www.geoapify.com/pricing-details/) currently list tile requests at0.25 credits and geocoding/reverse/autocomplete at1 credit. Example assumption: 100 sessions ×40 tiles +500 autocomplete/geocode requests =1,500 credits, **excluding** POI/details, style assets and other request classes. This is arithmetic for evaluation, not measured traffic or guaranteed coverage under a free tier. Measure real tile churn/search requests and check [current plan limits](https://www.geoapify.com/pricing/) before approval. Set hard application quotas, provider alerts and a founder-approved monthly ceiling; alerts alone do not cap charges. No subscription, key, account, external contact or provider API query was initiated in Gate 1.

## 9. Ordering ≠ directions ≠ optimization

| Capability | Meaning | Recommendation |
|---|---|---|
| Ordered places / stop intent | Human-chosen sequence and optional planned-stop flag. Numbers are list positions, not navigation instructions. | **V1.** No ETA/distance promise. Prefer pins without route line; if a connecting line is later approved it must explicitly say planning order, not roads. |
| Provider directions | Travel-mode-specific route geometry/time between an input sequence; may fail or be stale and has separate licensing/cost. | Defer pending founder decision and proof that ordering alone is insufficient. External navigation may later be explicit handoff, not a claim Tosker navigates. |
| Route optimization | Reorders stops against an objective/constraints, potentially vehicle/time-window dependent. | **Not V1.** A dragged list is not optimization; no fake Autosort. |

No Live location, navigation, background tracking, offline maps, public GIS, booking, gallery/media upload, voice/PTT, AI itinerary/agent, dispatch or plugin marketplace. Per-card images, attachments, ETA, completion tracking, live presence, comment threads and votes are not V1. No Calendar or Call surface because the historical screenshot shows one.

## 10. Performance and implementation boundaries

Keep shell and Chat/Hall usable without Map SDK. Lazy-load the renderer only on Map selection, with a stable placeholder; do not remount global shell/providers or add geographic SDK weight to sign-in/Chat. Map view lifetime may preserve camera on surface switches without retaining an uncontrolled WebGL context for every Room. Dispose listeners/requests/context on actual Room exit.

Initial authorized snapshot: bounded plan + active cards + batched creator projection, no per-pin SQL or provider details N+1. Do not reverse-geocode all saved cards on each render. Fetch selected details only if licensed/needed, with cancellation and allowed cache lifetime. Archive paging is separate. Use a single bounded source/layer strategy before speculative clustering; measure200-place behavior and prevent unbounded DOM marker rerenders. Reconciliation coalesces duplicate events and compares revision; no whole-workspace refresh per pan or keystroke.

Proposed measurable gate: zero map-network/SDK work on ordinary Chat route; stable navigation and no new console/runtime errors; representative200-place first paint/pan/card interaction traces on desktop and mid-range phone; no query count growth proportional to pin count; provider timeouts leave list/Chat usable. Establish measured budgets on the authorized spike, rather than claim timings now. Existing Development stalls remain measured separately from new provider latency.

Live location is a later MS7.4/MS7.6 decision: explicit scoped/time-limited consent, visible sharing indicator, manual start/stop, stale/precision state, revocation on membership loss, minimal retention, abuse controls and no surveillance default. Browser background suspension, native permission lifecycle, battery and connectivity require real device evidence; membership never implies tracking consent. No device position is requested for this planning-only V1 by default.

## 11. Proposed slices — NOT EXECUTION AUTHORITY

| Slice | Bounded work after approval | Acceptance before next slice |
|---|---|---|
| A · provider boundary + shell | Authorized provider/coverage/licensing spike; lazy native Map surface, list fallback, same shell | No Chat SDK payload; working permitted search/tiles, region tests, attribution, quota/key isolation, outage behavior. |
| B · service + schema | Reviewed forward migration, Room-scoped plan/cards/receipt contract, lifecycle integration | Fresh schema/hash review; two-user persistence; unauthorized IDs/pending/removed denial; idempotency and Room-destruction cleanup. |
| C · search → pin/card | Exact result preview/add, duplicate handling, text list | Correct saved provider identity/coords; canonical pin/card equality, keyboard search, wrong-result recovery, no raw response retention. |
| D · edit/order/archive | Notes/intent/order/revisions/restore | Concurrent conflicting edits/reorder/add/archive; stale retry; no silent overwrite, drag/button parity. |
| E · realtime / authorization | Content-free invalidation + authorized reconciliation | Two browsers, reload/reconnect/lost publish, removal races and cache clearing; no second sync system. |
| F · optional existing Chat panel | Only after core proof and founder inclusion decision | Same parent conversation/controller/send/unread/history, no duplicate subscription/messages; hide/show preserves drafts; narrow surface fallback. |
| G · responsive / recovery / a11y | Six widths + landscape, low height, keyboard and screen reader, slow/failing provider | Usable list without canvas; no overflow/collision; focus/contrast/reduced motion, retry/quota/error distinctions. |
| H · regression / acceptance / release | Exact scoped QA fixtures, engineering/security/schema checks, normal commit/push/canonical/live smoke | All current identity/Room/Chat/Hall regressions; founder review; explicit eventual lock, not automatic completion. |

Existing locked services may be extended only at the reviewed integration seams necessary for Map authorization/lifecycle. A discovered unrelated defect is not permission for a broad transport, identity, visual or account rewrite. No slice starts until §13 is approved. Provider authorization may require an additional approval even after product scope approval.

## 12. Roadmap / procurement handoff

[MS7.6 ledger](MS7-6-PROVISIONING-BACKLOG.md) records P-009–P-014 for tiles/rendering, search/data rights, optional directions, later optimization, live-location lifecycle and shared quotas/privacy/attribution. Private media remains P-001. Credentials and paid resources remain unprovisioned; a selected Development provider becomes a current MS7.3 execution dependency only after founder approval. Do not defer active Map authorization defects to MS7.6.

MS7.3 Gate 1 is complete, implementation not started. MS7.4 remains evidence-dependent Live Coordination; MS7.5 bounded completeness; MS7.6 provisioning/backend polish; MS8 larger type/art/motion/design system; MS9 generalized extension/ToskerBot only after Map proves the model; MS15 launch environments/account lifecycle. This plan does not advance those waves.

## 13. Founder decisions / stop gate

| Decision required before execution | Recommended default | What a different answer changes |
|---|---|---|
| V1 ordered places vs provider directions | **Ordered places only**, no ETA/road route | Directions adds licensed derived geometry, travel modes, cost and failure/staleness acceptance. Optimization stays out either way. |
| Parent Room vs Subroom Maps | **One parent Map**, available to current parent Rooms; TRIP is descriptive | Subroom Maps add separate authorization, data ownership and navigation; do not inherit silently. |
| Collaboration authority | **All current members add/edit/order/archive/restore**, owner retains Room administration | Owner-only structure reduces conflicts but makes collaborators dependent on organizer; requires different action visibility/tests. |
| Removal semantics | **Reversible archive**, no card hard-delete V1 | Permanent removal needs retention, audit/reference and irreversible confirmation policy first. |
| Development provider authorization | **Authorize a bounded evaluation only**, with explicit data-disclosure acceptance and spending ceiling; no paid upgrade by default | Without credentials/provider authorization, no real-provider implementation can pass acceptance. Gate 1 did not request or create an account. |
| Provider strategy | **Evaluate MapLibre + Geoapify first**, conditional on licensed durable POI coverage; compare Google/Mapbox if it fails | Selecting another provider requires its own storage/display/cost contract, not just replacing a URL. |
| Desktop Chat side panel | **After core planning proof**; retain normal Chat tab in first core acceptance | Including it in the first acceptance adds sliceF/controller/focus/responsive regression, never a second messaging system. |

Approval can adopt these defaults as a set or amend specific rows. An evaluation budget/provider account choice and exact environment allowlist remain explicit details to resolve before provisioning; “free tier” does not authorize billing or accepting vendor terms on the founder's behalf.

**STOP: MS7.3 DEVELOPMENT NOT STARTED. Awaiting founder approval for Map execution.**
