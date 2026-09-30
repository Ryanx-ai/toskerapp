# FP1 provider and sharing decisions — 2026-09-30

## Roads: bounded Development evaluation passes

The founder FP1 brief specifically requests investigating real road routing within the existing Free account. No account/key/plan/billing/restriction changes were made.

Official sources checked today:

- [Routing API](https://www.geoapify.com/routing-api/): GeoJSON road geometry; routing results may be stored and redistributed. Base cost one credit per leg, with longer routes/options costing more.
- [Developer reference](https://apidocs.geoapify.com/docs/routing/): drive/walk modes, ordered waypoints and MultiLineString output.
- [Pricing](https://www.geoapify.com/pricing/): Free 3,000 credits/day, 5 requests/second, required attribution. Current FAQ permits commercial production within limits.
- [Terms v5, February 2024](https://www.geoapify.com/terms-and-conditions/): commercial development allowed; production remains qualified. OSM and Free-plan Geoapify attribution required. Do not interpret newer FAQ as Tosker production certification or a permanent provider choice.

One server-key smoke: Marina Bay Sands → Merlion → National Gallery, walking, 2 road legs / 134 geometry points, passed. Base estimate 2 credits; conservatively reserved 4. No raw response/credentials stored or logged. Observed road shape is useful for a planning preview, not proof of access, navigability, current closures or ETA accuracy.

Implementation boundary: replaceable `RoadProvider`, existing server-only key, explicit user request, 2–8 points in the bounded Singapore area, walk/drive only. No optimization, elevation, traffic, avoid options, directions UI or device geolocation. Reserve 2 credits/leg, 60/day, 3 explicit requests/actor/minute; no polling or automatic drag-triggered calls. This sub-budget is inside the existing 500/day evaluation ceiling, with basemap usage still monitored at account level.

Canonical place order remains authoritative. Geometry is ephemeral viewer state keyed by exact ordered IDs/coordinates and travel mode. Order changes immediately invalidate it; stale/failure views show planning lines and a refresh action. Provider errors do not delete saved places. Reauthorize the exact Room/Subroom after external I/O; reject a changed route. No coordinates/queries/URLs are logged. MapLibre remains renderer. Attribution remains visible. MS7.6 reassesses rights, coverage, privacy and cost before any production commitment.

## Share / Send prime, not a fake working link

Current routes are already visible to authorized members of their exact Room/Subroom. External Share is explicitly deferred. Future contract: stable opaque route-share ID; creator/current-member authorization; explicit live view versus immutable licensed snapshot; no implied recipient membership; reauthorize on every read; expiry/revocation; remove revoked/Nuked references; no public exposure of private coordinates by default. Snapshot retention and provider attribution need a separate rights review. Nuke invalidates live place references and never silently recreates content. The present affordance creates no link, message, permission or billing resource.

## Search prime

Geographic search remains its own Singapore-filtered preview/confirmation flow. Sidebar search remains navigation. Context search currently searches authorized Chat messages; cross-type Location Card and Board results require typed destinations, exact Room/Subroom authorization, stale-result handling and verified jump targets. No broad cross-context search is claimed by this patch until separately implemented and tested.
