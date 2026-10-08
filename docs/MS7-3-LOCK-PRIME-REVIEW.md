# MS7.3 lock prime review

FP7 is live for Ryan and Jenn's walkthrough at [Tosker](https://toskerapp.vercel.app). The engineering release gates passed. **Recommendation: HOLD the formal MS7.3 lock until Ryan and Jenn complete the checklist below and the founder explicitly approves lock.** No known release-blocking defect remains from the executed FP7 acceptance matrix. This is a bounded founder-review build, not MS15 production certification.

## Verified release

Application commit `ef00cef1c001595a6246448e34e3fb9da34b91d8`, Vercel deployment `dpl_4BseJveHyFiT3FL5GTDcyqK5q2NK`, READY Production, exact canonical alias. Build took approximately 39 seconds. Normal fast-forward push; no forced update. The release contains no schema, dependency, provider configuration, billing or quota change. All 28 migration hashes and live catalog match.

Canonical root redirects to HTTP 200; the anonymous protected route renders the sign-in shell. An unauthenticated same-origin lookup receives 403. Normal Clerk A/B login and actual database/realtime updates passed. Twenty deployed client JavaScript assets passed the configured server-secret scan; browser basemap access and visible attribution passed. No browser page exceptions or exact-deployment error/fatal logs were found in the inspected post-release window through 13:21 UTC on 2026-10-08. This is a bounded observation, not continuous monitoring or an all-request census.

Detailed save states and test evidence are in [FP7 execution](MS7-3-FP7-EXECUTION.md). Source implementation checkpoint is `c448c71`; the release checkpoint adds tests and evidence. The final documentation checkpoint is local and deliberately separate from the deployed application identity.

## Capability inventory

| Area | Available behavior |
| --- | --- |
| Planning | Context → Map → Route → Location Cards → Wayfind. Shared Route numbering and independent Route-owned cards remain authoritative. |
| Search and Add | Existing context suggestions, bounded Singapore/southern Johor search and explicit result preview. Manual pins likewise require confirmation; no first-result autosave. Atomic first Add creates Route1 when needed. |
| Personal origin | Locate adds a compact private You card before shared destination1. Separate explicit consent enables the real Walk/Drive leg. OFF, reload, expiry, access loss and changed routing inputs invalidate private state. |
| Direct actions | Marker inspector offers Home, Work, Favourite and independent Star. Names are unchanged by tagging. Provider POIs cannot be renamed or geographically moved; manual checkpoints can be named/repositioned with context preserved. |
| Route controls | Reorder, position locks, Quick Order, viewer-private Hide, shared Skip/Include, archive/Nuke confirmation, collapse tray and optional companion Chat. Order mode is planning geometry, not road directions. |
| Copy a place | Choose another Route in the same authorized context. New destination-owned card, source unchanged; duplicate identity/coordinates selects the existing card. Archived duplicates require restoration. Lost acknowledgements retry the same request. |
| Share a Route | Explicit independent copy to an authorized Personal Chat, Room, Subroom or own Sandbox. New Route/card IDs, ordered active places, collision-safe name, compatible color/tags/shared notes. Destination routing recalculates. No public share link or automatic chat message. |
| Comments and Pings | Location comments remain scoped to their card. Existing !/?/heartbeat Pings remain explicit, Locate-gated and ephemeral, not copied Route content. Chat and Board regressions pass. |
| Retained place memory | FP4B Map Pin data/provenance remains intact. Its primary Saved Places shelf is removed from routine planning; it is not a competing workflow. |

## Provider limits

Geoapify remains replaceable behind Tosker's provider boundary; MapLibre remains the renderer. Free-plan use here is approved only for bounded development/founder review, not a permanent production-provider commitment. MS7.6 can reassess coverage, rights and cost.

The approved account allowance is 3,000 credits/day. Tosker applies stricter separate budgets: 120 geocoding requests/day and 60 conservative road credits/day, plus actor pacing. On 2026-10-08 after FP7, counters were 15/120 and 36/60. FP7 made exactly two real road requests, consuming six road credits; canonical smoke did not repeat them. Browser tiles and account-wide totals are not represented by these app counters and were not freshly dashboard-measured.

Real changed-path checks returned private-origin→MBS 2,089 m / 184.268 s and independently copied three-stop Drive 4,929 m / 403.79 s. These confirm the tested geometry/identity/metric paths, not universal accuracy. Existing FP6 SG→JB, long Drive, three-stop Drive and short Walk evidence remains applicable. MRT queries can resolve localities rather than station entrances; postal/POI variants need user selection. Long cross-island Walk remains a limitation. Cross-border estimates do not include immigration queues, tolls, live traffic or permission to enter. Endpoint validation fails closed when geometry cannot be trusted.

Road calculation is bounded to 2–8 eligible points within Singapore/southern Johor. Quota/provider failures leave the saved trip intact. Attribution remains on the Map; canonical/private names and addresses are not navigation guarantees. Approximate locality labeling is local-only, not continuous tracking or device reverse-geocoding.

## Security and privacy boundaries

Server-side authorization checks both source and destination before copying and before receipt replay. Sandbox ownership, accepted Personal Chat participation, Room membership and Subroom visibility are preserved. Destination objects receive new IDs. Comments/history, private Hide, origin coordinates/leg, Pings, authorization and stale geometry/metrics are excluded. Shared notes and tags are intentionally transferable; the chooser discloses that contract. Source and destination Nuke independence, revocation, forged scopes, duplicate handling and lost acknowledgements passed rollback/browser tests.

Current location is ephemeral client state. Raw coordinates are sent to the server/provider only for an explicitly consented private leg; they are not persisted in the trip, local/session storage or peer broadcasts. Locate expires after five minutes and is not MS7.4 Live location. Browser/server Geoapify credentials remain separate; server credentials are not public configuration. No restrictions or billing settings were weakened.

After exact cleanup, protected profiles, messages, Board content and Map Pins match the verified baseline. Founder TID8V3X7P1 uniquely resolves. Seven ownership guards remain enabled; no orphan cards, projection mismatches or duplicate Route positions remain.

## Remaining debt and safe deferrals

- Formal founder/Jenn usability acceptance remains required. Browser coverage includes320/390/430/768/1440/1728, short landscape, enlarged text, reduced motion and keyboard/focus. It is not physical-device or screen-reader certification.
- Share and Copy use bounded modal choosers. Long text scrolls; selection is always explicit. An uncertain Share acknowledgement keeps the request available for exact retry; reloading can abandon that UI recovery state. Do not assume a failed acknowledgement means no copy exists.
- Independent copies do not synchronize future changes. Duplicate-place selection can retain the destination's existing note/tags rather than overwrite them. Archived source cards are omitted; routing Skip/locks reset to destination defaults.
- Two QA-style titles remain inside the protected Founder Review Room. They are deliberate safe planning content, not verified venues or permission to rename retained founder data. No new raw-coordinate title was introduced by FP7.
- Retained FP4B place-memory data has no primary planning shelf. A future secondary presentation is deferred, not deleted or silently repurposed.
- One pre-existing unused-import lint warning remains in `cleanup-fp4-qa.ts`; no lint errors. Clerk Development infrastructure remains intentional for this bounded review.
- Continuous Live location, email notifications, MS8 visual overhaul and unrelated milestones remain unstarted. No additional feature sprint is proposed here.

These are safe deferrals for founder review. A discovered privacy/access-control failure, stale/wrong road metrics, lost user content or reproducible blocked core flow would instead be a lock blocker and must be reported before lock.

## Retained rooms and cleanup

| Room | Purpose and disposition |
| --- | --- |
| [MS7.3 Founder Review — Singapore Trip](https://toskerapp.vercel.app/room/ms73-founder-review-904a9dea/map) | Primary retained Founder Walk Map, with safe planning content and founder8V3X7P1 membership. Available after release; never automatically cleaned. |
| `ms73-qa-bfff9475` | Earlier QA Room containing legitimate founder contributions. Founder membership retained; not disposable and no automatic cleanup scheduled. |
| `ms73-qa-809fbd3f` | FP7 source acceptance Room with A/B/founder. Deleted after canonical passed, with fresh exact identity/member/contribution guards. |
| `ms73-qa-9c38272c` | FP7 independent-copy destination Room with A/B/founder. Deleted under the same guards. |

Only those last two Rooms and their owned QA content were removed. No in-app undo is available. Ignored test/cleanup receipts remain for audit, not as a promise of full data restoration. No founder profile, Sandbox, Personal Chat, legitimate message, Board content or settings were changed to facilitate testing.

## Ryan and Jenn playtest checklist

1. Ryan can open the retained Founder Review Map with his normal account. Its verified membership is A/B plus founder; Jenn's access is not claimed. For joint tests, use a Room both normal accounts are authorized to access or arrange the appropriate membership first. Do not Nuke retained content for testing.
2. Select a marker, then Home/Work/Favourite/Star. Confirm clear selected states and peer reconciliation without renaming the place. Restore your intended tag afterward.
3. Enable Locate. Confirm the private You card precedes shared#1 without renumbering it, and the other participant cannot see it. Decline route consent once; then optionally consent to one short leg within the remaining quota. Clear Locate and reload to confirm disappearance.
4. Preview a known place or manual checkpoint before Add. Check name/address context. Reorder a provider POI; rename/reposition only a disposable manual checkpoint. Confirm Skip changes routing while Hide stays private.
5. Copy a disposable card to another Route, then repeat to check existing-card selection. Confirm comments/private state do not follow it. Use only disposable copies for deletion checks.
6. Share a disposable Route into an authorized context. Confirm independent ownership, order/tags and fresh routing when requested; future source edits must not change the copy.
7. Try collapsed tray, optional Chat, Info/comments and phone Map/Places switching. Check text size, long names, focus, touch controls and recovery messages on your actual devices.
8. Report blockers separately from small papercuts. Founder explicitly chooses LOCK or HOLD after both participants finish.

MS7.1 LOCKED. MS7.2 LOCKED. MS7.3 FP7 FOUNDER-REVIEW BUILD LIVE, LOCK-PRIMED / UNLOCKED. MS7.4 and MS8 NOT STARTED. Awaiting Ryan + Jenn playtest and founder lock decision.
