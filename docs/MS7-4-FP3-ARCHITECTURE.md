# MS7.4 FP3 — proposed architecture and approval gate

13 October 2026 SGT. Proposal only, not implementation approval. [Recovery evidence](MS7-4-FP3-EXECUTION.md).

## Estimate and scope

| Workstream | Engineering hours |
|---|---:|
| Worldwide discovery, normalized projection and world-camera/coverage handling |3–4|
| Reliable broad-area labels, data source and disclosure handling |2–3|
| Shared-location consent, authorization/revocation, lifecycle and privacy tests |6–9|
| Map title/canvas controls, icon affordances and two Live layouts |3–4|
| Integrated A/B, reconnect, responsive/accessibility, security and save states |4–6|
| **Local total** |**18–26**|

Not a promise of elapsed completion time. Provider restrictions, boundary licensing, revocation failures or a required storage/permission dependency can trigger a new stop/re-estimate. Canonical release is excluded; reserve roughly1–2additional hours after separate approval. Do not silently begin a reduced subset under the eight-hour gate.

## Global discovery, not fictitious global routing

Keep MapLibre and replaceable `PlaceProvider`. Current `src/server/maps/provider.ts` restricts both requests AND projected results to SG/MY within `inPlanningRegion`; changing a placeholder/filter alone is insufficient. Remove discovery-only geographic rejection, validate finite coordinates/country/source identity and retain provider place ID, attribution and licensing. Preserve explicit selection → preview → confirmation, duplicate handling and Route-owned instances. No auto-save of the first result.

Use deliberate non-GPS bias: neutral worldwide by default, optionally explicit map-view/region preference. Do not silently infer country from server IP or send private Locate coordinates for search ranking. Geoapify distinguishes hard filters from soft biases and documents `countrycode:none` for avoiding default IP-country prioritization. [Official geocoding documentation](https://apidocs.geoapify.com/docs/geocoding/), [autocomplete documentation](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/).

Retain validated SG/Johor Walk/Drive coverage until independently proved elsewhere. `road-contract`, road-provider/projection and private-origin eligibility currently rely on the regional boundary; do not globally remove that guard with discovery changes. Worldwide saved places may use truthful Order/planning lines; unsupported road routes must say unavailable without fabricated ETA or provider retries. Test antimeridian, high-latitude/camera limits, mixed supported/unsupported stops, missing results, ambiguous names and provider failures.

Existing server120geocode/day,12actor/minute,1100ms spacing and60road-credit/day reservations remain. Geoapify Free3000/day, browser tile costs and account-wide use are separate from server reservations. Bound the future synthetic worldwide query matrix before calls; do not repeatedly rerun expensive road tests. No plan upgrade, provider migration, key/restriction weakening or permanent production-provider commitment.

## Reliable area labels

Replace `localOriginArea`'s hardcoded Bukit Timah rectangle. A rough box is not geographic evidence. Derive a conservative city/region label from verified administrative hierarchy or a versioned, licensed boundary dataset. Singapore West/Central/East require an appropriate documented region source; no invented naming from longitude. If evidence is absent, show a generic private current-location label rather than false specificity.

Keep precise fixes in private volatile state. Prefer local boundary lookup where practical. Any reverse-geocoder path must disclose provider processing before sending a private fix, minimize precision and calls, and not run automatically merely because Locate is ON. A returned street/building/postcode is not suitable for a broad shared label. Persist neither precise fixes nor a label history. Final data-source rights/coverage and geographic fixtures must pass before declaring examples supported.

## Dedicated shared-location privacy/authorization gate

**Recommended first scope for founder review:** short-lived, explicitly shared snapshots with manual refresh, not continuous tracking. Locate remains private and independent. Broad area is the default disclosure; precise peer Map markers require a separately worded, explicit choice. Confirm this product choice before implementation; do not assume the brief authorizes precise sharing by default.

Proposed contract:

- Per-context consent names the audience, precision, expiry and effect of sharing. No carry-over between Room, scoped Subroom or Personal Chat; Sandbox sharing prohibited server-side. Live Join is not consent.
- Visible sharing indicator and Stop available outside hidden pane/Activity boundaries. Suggested absolute five-minute expiry with no silent renewal. Manual refresh only while visible and authorized; backgrounding, context/session change, permission loss and expiry stop sharing. Reconnect must not revive expired/revoked consent or replay location history.
- Keep coordinates out of durable application tables, mutation receipts, URLs, analytics, logs, crash reports, retry queues, diagnostics and database backups. A non-coordinate consent/expiry lease may require a narrowly scoped migration; decide before schema work, with backup/rehearsal if needed. No new storage provider is approved.
- Do not put precise coordinates in Live presence data or generic conversation events. Candidate delivery is server-authorized, per-recipient ephemeral fan-out over existing user subscriptions, with context/version/expiry envelopes, instead of a broad channel whose stale token may still receive coordinates. Reuse the existing workspace connection, not a second transport.
- Recheck exact source and recipient authorization at dispatch and every refresh; serialize against existing membership/session revocation locks. Never trust client audience/user IDs. Test removed members, scoped membership, Personal relationship withdrawal, stale tokens, malicious clients and in-flight send/revoke races. Budget fan-out for group size before enabling.
- Recipient UI must discard expired/revoked data and revalidate access before restoring a hidden/reconnected view. Immediate revocation means prevent further authorized access/disclosure and promptly clear cooperating clients; it cannot make an already authorized recipient forget or erase copied coordinates. Do not promise that impossible guarantee.
- Ably ephemeral messages skip history/rewind and are delivered only to currently connected clients; they are not a general claim of zero provider processing/log retention. Provider privacy/logging suitability must be checked at this gate. [Official ephemeral-message explanation](https://ably.com/blog/introducing-ephemeral-messages-for-lightweight-updates).
- Token TTL alone is not immediate revocation. Existing revocable-token and membership locking behavior must be verified, not weakened. Ably documents near-immediate revocation with reauth margin disabled and continued responsibility for fresh token authorization. [Official revocation documentation](https://ably.com/docs/auth/revocation).
- Preserve existing private-origin routing consent, fixed private origin, local Ping and explicit sharing boundaries. Shared snapshots must not silently become route origin, broadcast Ping coordinates or start browser `watchPosition`.

**Gate exit:** approved precision/audience/expiry contract; demonstrated authorization and revocation races; no coordinate persistence/logging/history; no new provider permissions or dependency without approval. If the existing infrastructure cannot satisfy this, stop that slice and report the exact gap—do not substitute weaker privacy.

## Map and Live presentation

Remove only Map's redundant workspace action/title row, retaining labelled region semantics. Move functional Expand/restore into the canvas with safe attribution/zoom/popup spacing and keyboard focus restoration. Preserve search, routing, cards, selection, companions and camera. Do not accidentally strip other surface controls.

Use existing Lucide icons and Tosker tokens. Every icon-only action needs an accessible name, visible keyboard focus and discoverable tooltip on hover/focus, plus a touch-safe affordance; native hover-only `title` is not sufficient for touch. Inventory Play, Ping, Locate, Fit, Expand, cards and Share rather than adding new actions. Keep hit areas generous, avoid overlay collisions and preserve reduced motion.

Live companion becomes a compact vertical participant roster; primary/expanded Live becomes participant-focused with meaningful empty/loading/reconnect states. A compact real Join/Leave dock may reserve structural extensibility for future media, but no fake or disabled Mic/Camera/PTT promises. Presence-only copy remains truthful. Existing `useLiveParticipation` ownership stays outside Activity visibility; one existing workspace transport, exact-context leases and current background/leave rules remain authoritative.

UI/UX and frontend-design skills inform spacing, touch target separation, focus/tooltips and layout hierarchy, not a new theme. Discord is interaction inspiration only. No new icon dependency, artwork, typography system or MS8 redesign.

## Local acceptance and release boundaries

Exercise Map+Chat, Map+Live, Board+Chat, Board+Live, Live+Chat and supported single surfaces at320/390/430/768/1440/1728px. Check toggles, drafts, Map camera/selection/cards, Live Join/Leave/reconnect, listener/transport counts, session/context change, background expiry, keyboard/focus/tooltips, reduced motion and mobile browser limitations. Synthetic geolocation only for automated QA; never broadcast founder coordinates.

Add world search/projection tests, truthful regional road rejection, reliable area fixtures and missing-data fallbacks. Shared-location A/B tests must cover opt-in OFF, per-context isolation, stale authorization, revoked members, malicious subscription, Stop, expiry, reconnect and no persistence/log leakage. Preserve exact founder memberships and retained data; do not recycle protected Founder Walk content.

Run TypeScript, lint, production build, migration/catalog integrity, server-secret/client-bundle scans and existing Chat/Board/Map/Live regressions. Record failed attempts and limitations honestly. Save B/C/D/E checkpoints after integrated green slices. **No push/canonical deployment without new explicit approval. FP2B remains research only; no media capture/procurement, paid resources or MS8 work.**
