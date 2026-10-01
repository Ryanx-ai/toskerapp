# MS7.3 FP4 — approved Map Pin prime / next-deployment marker

Founder approved 2026-10-01 for implementation **after founder playtest**. **NOT STARTED. Not part of FP3.** Do not interrupt or expand FP3; do not implement without the post-playtest continuation. This is no authorization for MS7.4, MS8, paid resources or provider commitment.

## Target

**MAP PINS: ❤️ Favourite · 🚩 Want to go · ✓ Been here · 📍 Saved + Add to Route.**

- Map Pin = a persistent place saved directly to the context Map, independent of every Route.
- Route Location = a distinct Location Card instance owned by one Route.
- Find/select place → Pin to Map → choose one of the four states.
- Pins remain visible on the Map independently of Routes, with recognizable icon/state treatment and compact state selection. Use existing Tosker colors/filleted UI; no large new management surface.
- From a Map Pin: Add to Route → currently selected Route → create a NEW route-owned Location Card referencing that geographic place.
- Nuke/delete Route does NOT delete an independent Map Pin.
- Remove Map Pin does NOT delete existing Route Location Cards created from it.

## Required pre-schema audit

Before implementation, resolve persistence ownership and context boundaries; A/B/shared-versus-private semantics; authorization and access loss; duplicate provider/coordinate behavior; same pin with differing states; selected-route absence; references/independent destruction; attribution/provider-field storage rights. Approval of the feature is NOT a resolution of these semantics.

Audit the then-current route ownership migration state first. Do not convert legacy plan-wide card rows into Map Pins automatically. Test independent two-way deletion, new card IDs on Add to Route, retry/concurrency, A/B visibility according to the approved privacy decision, reload/reconnect, Personal/Subroom boundaries and founder-accessible exact-owned QA.

## Deployment gate

Carry this marker into the next post-playtest execution ledger. Publish only after the future scoped implementation/tests/canonical gate; no promise of FP4 deployment in FP3. Share Route, navigation, live location and image procurement remain separately deferred.
