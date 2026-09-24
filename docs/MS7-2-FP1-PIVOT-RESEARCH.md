# Room + Map: proposed trip-coordination direction

2026-09-25. Research and founder-review proposal, **not permission to implement Map, Fleet or MS7.3**. Sources checked on this date. Existing Tosker Room/Chat/Hall remain the foundation; Map is the first proposed flagship Gizmo, not a separate product or fleet-management rewrite.

## Evidence and competitive interpretation

| Reference | Verified capability | Adopt / adapt | Reject / opportunity hypothesis |
|---|---|---|---|
| [Samsara routing](https://www.samsara.com/uk/products/telematics/routing) | Route progress, late/missed stops, remote rerouting and driver messages | Legible route state and explicit changes | Do not import telematics/compliance hardware. An occasional group organizer may need a smaller setup; untested hypothesis. |
| [Motive route management](https://helpcenter.gomotive.com/hc/en-us/articles/30896048036253-Creating-Managing-Routes) | Manual jobs, CSV, stop ordering and driver/vehicle assignment | Coordinator-owned plan and understandable stops | No commercial dispatch/job/asset hierarchy now. Manual control is not absent from the market. |
| [Onfleet pricing/capabilities](https://onfleet.com/pricing) | Delivery optimization, dispatcher chat, proof of delivery, status/ETA notifications; Launch listed at $619/month | Shared execution context | Reject proof-of-delivery and delivery-business operations for this wedge. Price is an observed commercial offering, not proof of willingness to pay Tosker. |
| [OptimoRoute](https://optimoroute.com/pricing/) | Driver app, route history and planning; Lite $35.10/driver/month billed annually, Pro $44.10 | Ordered itinerary and role clarity | Reject logistics scale/optimization contest. Pricing and plans can change; recheck before procurement. |
| [Wanderlog](https://wanderlog.com/) | Collaborative editing, itinerary/map, distances/travel times, route optimization | Places and list/map stay coherent | Strong direct overlap. “Chat plus collaborative trip map” alone is not a defensible differentiation claim. |
| [Ride with GPS](https://support.ridewithgps.com/hc/en-us/articles/4415462488475-Route-Planning-101) | Route editing with control points and turn-by-turn navigation | Deliberate route control | Do not claim route editing is missing. No cycling navigation engine or safety claims in Tosker's first Map. |

The founder's coordination pain is a discovery input, not market validation. Proposed initial segment: adult hobby/community organizers coordinating occasional multi-stop day trips with a small group. Not military/reservist operations, regulated transport, enterprise fleets, emergencies or children-focused tracking. Validate this choice with organizers before committing the next milestone's backlog.

## HUDL / TethrMap inheritance audit (read-only)

Verified local source: `/Users/ryanc/Desktop/devproject/HUDL/tethr/tethr/`.
`Views/Map/LocationCardView.swift` distinguishes numbered stops from unnumbered places and an optional real card action. `Views/Map/tethrMapView.swift` combines member and pin annotations. `ViewModels/ViewModels/MapViewModel.swift` explicitly calls `loadMockData()` at initialization and refresh. `architecture.md` proposes iOS/MapKit/Core Location with Supabase, not a proven deployed service contract.

Adopt the place-card ↔ map relationship, explicit sharing and organizer/context clarity. Adapt Party to existing Room membership; retain canonical person identity, server permissions and shared state. Reject copying lime/black HUDL branding, mock/live ambiguity, Swift client code as Web architecture, Supabase migration, automatic location sharing and marketplace expansion. No separate TethrMap repository was established by the bounded path scan; the verified TethrMap view lives inside HUDL. Screenshots are interaction references, not runtime acceptance. No HUDL source was modified or integrated.

## Bounded first Map hypothesis (MS7.3, only after approval)

One Room, one authorized shared plan: add/edit/remove named places, order stops, see the same places on map and list, invite existing people, retain the agreed brief in Hall and discuss in Chat. Start with one trip plan per Room and a clear organizer/editor policy. Persist durable plan state and revisions in Neon; use existing authorized invalidation patterns only where useful. Existing Room UUID/membership remain authoritative. Do not create vehicles/fleets/accounts or a generic Gizmo SDK just to host a map.

Gate route drawing, directions and geocoding against provider licensing, coverage, quotas, storage/attribution terms and cost before choosing a provider. A numbered plan is not guaranteed turn-by-turn navigation. Prefer an explicit handoff to a navigation app if justified; no driving-interaction encouragement.

Planning precedes live execution. MS7.4 may evaluate optional session-based location sharing, rally/progress states and route-change acknowledgement after the planning loop is useful. Membership is never location consent. Any later sharing must be explicit, scoped, revocable and time-bounded, show stale/disabled state, minimize retained coordinates and support leave/revoke/reconnect correctly. No background collection, permanent breadcrumbs, covert tracking or inferred safety assurance. PTT/voice/video remain later service decisions, not FP1 work.

## Positioning candidates, not marketing claims

- Plan the day. Keep your people in the same Room.
- Your group, your stops, one shared plan.
- From “where next?” to a plan everyone can follow.
- A Room for the people and places you're bringing together.

Validate with 5–8 civilian organizers and two real small-group planning trials: observe today's tools, recreate one actual plan, test invitation/list-map comprehension and changed-stop recovery. Measure time to agreed plan, clarification messages, invited-member completion and whether they choose Tosker again for a second trip. No repeat use or unclear advantage over Wanderlog/chat is a stop/rethink signal, not justification for more features.

## Roadmap disposition

Founder huddle replaces the old MS7.3 Friends/Search destination wave with proposed Collaborative Trips/Map Coordination; relationships/search remain cross-product capabilities. Old MS7.4 Explore is deferred in favor of proposed Trip Execution only after planning evidence. MS7.5 becomes completeness and bounded extensibility around the proven Map; Pages and broader Gizmos are later, not a launch catalogue. MS7.6 retains service/ops provisioning. MS8 UI/UX, MS9 generalization/ToskerBot prototype, MS10 Art, MS11 Web, MS12 desktop, MS13 native/adaptive, MS14 destruction, MS15 launch, MS16 beta, MS17+ evidence-led growth retain order. No milestone is silently marked complete.
