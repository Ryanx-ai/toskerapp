# MS7.4 lock candidate — Founder Walk decision

27 October 2026. **Candidate, not a milestone lock.** Read the final [FP4 release receipt](MS7-4-FP4-RELEASE-2026-10-27.md) for canonical verification. Automated engineering evidence does not establish Ryan/Jenn product acceptance.

## Milestone coverage

| Slice | Delivered foundation | Current Beta boundary |
| --- | --- | --- |
| FP1 | Authorized context presence, Join/Leave, reconnect/transport ownership | Architecture/data retained; Live entry points removed from FP4 Beta. |
| FP2A | Map/Board composition, Chat/Live companions, state continuity | Superseded visually by permanent Map with Chat/Board toggles, not by a new auth model. |
| FP3 | Explicit broad/precise five-minute latest-state sharing, single Locate, durable deletion and rescue | Private by default, no Sandbox sharing, no history/background tracking/continuous movement. |
| FP4 | Full-background Map, translucent responsive panels, eight Location actions including atomic same-context Move, red confirmed Nuke, improved Map hierarchy, atomic request accounting | Existing Owner/Member model; no general Room deletion, Admin/GODMODE, provider migration or media. |

Historical Live participant-card/Join/Leave evidence remains valid at its original release layer. FP4 tests verify no Beta Live activation/channels and preserved authorization; they do not claim visible FP4 Live Join/Leave functionality. Media remains FP2B research only.

## Founder Walk checklist

- [ ] Open a Room and Sandbox: Map immediately, only Chat | Board workspace toggles, no Map tab/Live UI.
- [ ] Toggle each panel, Expand/Minimize/Close, switch panels, return to Map on mobile; preserve Chat draft, Board content, route/card selection and camera.
- [ ] Inspect Map color, controls, overlays and attribution at phone/tablet/desktop sizes, including landscape and keyboard focus.
- [ ] Select/search → preview → explicitly confirm. Test Info, Star, Copy to Route, Move to Route, Lock, Hide, Skip, Nuke using safe QA content only. Nuke should be red, scoped and cancellable; private Hide must not become shared Skip.
- [ ] Check Room settings hierarchy and normal Owner/Member boundaries. Founder is a normal explicit member, not a superuser.
- [ ] Optional location: Locate → Broad default / explicit precise / Keep Private; verify disclosed audience, origin card, OFF/Stop, five-minute expiry and fresh consent. Only share location knowingly with the shown members.
- [ ] Test two authorized participants, reload/reconnect and removed access. No peer snapshot should survive the authorized freshness/removal boundary.
- [ ] Decide whether remaining limitations are acceptable for bounded Founder Review; record Ryan and Jenn decisions separately.

## Remaining debt and honest limits

- Sidebar version footer still says FP3 / Development. Exact deployment receipt is release authority; update label in a separately authorized patch, not an untested last-minute rebuild.
- Current limits are a tiny Founder Walk allowance, not beta-scale certification:100new consents/day,2000reads/day,30session checks/10seconds. At3s/read,2000reads≈1.67aggregate viewer-hours/day. Fixed approval expires **2November2026,20:05SGT**; stale health/capacity must fail closed. No automatic renewal.
- Local Singapore→US database latency caused safe peer-marker flicker; hosted finite samples passed without visible gaps. Not a global latency/p95 SLA. Geolocation accuracy, provider POI/search and roads remain approximate; previews/confirmation stay mandatory.
- Healthy active-row deletion target60s is not all-copy erasure or an outage guarantee. Six-hour Neon recovery history/WAL remains, and already disclosed recipient coordinates cannot be recalled. Preserve hosted consumers/rescue on application rollback.
- Responsive and keyboard/reduced-motion/200%-computed-text tests are bounded browser evidence, not full assistive-technology, hardware GPS, native mobile or full WCAG certification.
- Independent Map Pins remain separate from Route-owned Locations. Move refuses duplicates/locked-position disruption rather than merging data. No general retained-Room deletion.
- Invitation/Map/read/mute historical founder activity is preserved with provenance qualifications; no pristine all-history hash claim. Current audit excludes only documented owned QA scope and qualifies exact QA rate changes.
- Current notification inbox reads full history and has historical Hall link semantics to audit in MS7.5; push/email/media are not connected. No next milestone implementation is authorized by this report.

## Recommendation and stop

Recommend **Founder Walk and conditional MS7.4 lock review**, not automatic lock. On a critical privacy/security/regression finding, preserve evidence and authorize a bounded fix; do not conceal it with relaxed expiry, permissions or quotas. If accepted, record exact app SHA and founder decision in a separate lock receipt. [MS7.5 notifications handoff](MS7-5-NOTIFICATIONS-ARCHITECTURE-2026-10-27.md) is research only. Stop development after FP4 closeout; no FP5, media, movement or MS8 work.
