# MS7.4 FP2 — architecture and execution gate

12 October 2026 SGT. Save state **A**, research complete. **No implementation authorized.** [Recovery R](MS7-4-FP2-RECOVERY.md) records canonical FP1 `7dc332e`, local checkpoint `96ac3ad`, database evidence, preserved work and the server-credential incident. [Provider research](MS7-4-FP2-PROVIDER-RESEARCH.md) owns costs and open procurement questions.

## Recommendation

Split FP2 into **FP2A: workspace composition and bounded Map UX**, then **FP2B: separately approved real-media evaluation**. Keep FP1's one authenticated-workspace Ably transport and exact-context authorization. Move participation ownership out of visual panels; do not create a second transport to make a companion panel work. No fake Mic, Camera or push-to-talk controls.

FP2A is **14–20 engineering hours locally**, not an eight-hour patch. This exceeds the brief's execution gate: stop for founder approval of the full window or a smaller explicitly chosen deliverable. Canonical deployment is not authorized by this estimate. MS8 typography/art redesign, continuous shared location, procurement and unrelated milestones are excluded.

## Recovered architecture and why a layout-only patch is insufficient

The authenticated workspace layout already owns `WorkspaceRealtimeProvider`; `workspace-realtime-owner.ts` serializes scoped leases and reauthorization around one lazy Ably SDK instance. `use-conversation-realtime.ts` creates the conversation's `LiveSession`. `live-panel.tsx` activates that session on mount and deactivates it on unmount. Deactivation currently leaves presence. Therefore conditionally hiding the existing panel would violate the new requirement.

`workspace-surfaces.ts` models Chat/Hall/Map/Live, with Board still represented as Hall internally. `use-chat-companion.ts` stores a viewer/context-specific Chat companion preference and currently uses a 1100px desktop threshold. `messaging-app.tsx` conditionally mounts surface content, so Map/Board navigation needs deliberate state preservation. Search/read marking currently follows visible Chat/companion state; a joined Live session must never imply that hidden Chat was read.

The local-location hook currently obtains one position with a five-minute lifetime; it does not watch continuously. The Map currently derives the temporary origin and marker from the same location. Private road geometry requires separate provider-coordinate consent. Source findings are implementation evidence, not a claim that the proposed FP2 behavior already exists.

## Explicit composition model

Use a discriminated union/reducer, not independent booleans. Only these nine states are legal:

| Primary | Companion | Layout |
| --- | --- | --- |
| Map | none | Map alone |
| Board | none | Board alone |
| Live | none | Live alone |
| Chat | none | Chat alone |
| Map | Chat | Map + Chat |
| Map | Live | Map + Live |
| Board | Chat | Board + Chat |
| Board | Live | Board + Live |
| Live | Chat | Live + Chat |

Map + Board, Chat + Live with Chat as primary, duplicate surfaces and three-panel combinations normalize to a legal state; arbitrary URL values never create panels or join sessions. Retain existing primary deep links, including Hall-to-Board compatibility, and add one validated companion parameter. URL state expresses layout, never participation. Viewer/context-specific session preferences may remember layout, not Join intent or private coordinates.

| Action | Deterministic result |
| --- | --- |
| Choose Map/Board while Map/Board is primary | Replace primary, retain valid Live/Chat companion |
| Choose Live/Chat with Map/Board primary | Open that companion; replace the other companion; clicking the selected companion closes it |
| Choose Chat from Live alone | Live + Chat |
| Choose Live from Chat alone | Live + Chat |
| Choose Chat in Live + Chat | Close Chat, yielding Live alone |
| Choose the active primary | No-op, not an implicit Leave |
| Choose Map/Board from Chat alone | Chosen primary + Chat |
| Choose Map/Board from Live alone or Live + Chat | Chosen primary + Live; hidden Chat retains its draft |
| Explicit Open alone / expand action | Selected surface alone; hide others without discarding drafts or leaving same-context Live |
| Browser Back/Forward | Restore validated layout; never auto-Join |

Use compact existing icons and accessible names for Open alone and return actions. No drag layout editor or new settings surface. Reducer tests must cover every state/action pair, including invalid persisted state and unavailable surfaces. Sandbox and context capability restrictions still apply: do not invent Live support merely because the reducer supports Live elsewhere.

## Participation is independent of presentation

Place a bounded, exact-context participation controller above visual panel remounts, integrated with the existing workspace owner. It owns join intent, session generation, recovery, observers and cleanup; visual Live views subscribe to it. There is at most one joined context per authenticated workspace document. Multiple views must not acquire duplicate presence subscriptions or SDK instances.

| Event | Participation outcome |
| --- | --- |
| Open Live panel | Observe current authorized roster; do not auto-Join |
| Explicit Join | Fresh server authorization, then join exact context |
| Hide/reposition Live, same-context Map/Board navigation, viewport resize | Keep joined; display a compact persistent In Live indicator with an explicit Leave action |
| Explicit Leave | Clear intent, leave presence, detach owned observation as appropriate |
| Switch Room/Personal Chat/Subroom context | Leave old context; no background cross-context call or automatic Join in the new context |
| Logout, session replacement, membership revocation | Immediately retire intent/lease and stale responses; apply existing authorization and reconciliation gates |
| Reload | No restored Join intent; explicit Join required |
| Actual document backgrounding | Preserve FP1's leave behavior for FP2A; hiding a panel is not document backgrounding |
| Temporary transport outage | Existing bounded recovery, generation checks and fresh scope authorization; prolonged outage remains truthful and user-recoverable |

The persistent indicator is necessary: joined users must not disappear into an invisible session they cannot leave. Future media may need a different background policy; that is an explicit FP2B privacy/product decision, not a side effect of this refactor. Ably's roster-size display bound is not an admission limit.

## State, layout and responsive preservation

Keep Chat drafts keyed by viewer and exact conversation using existing persistence behavior. Preserve Map camera, route selection, selected card and tray state; preserve Board selection/filter/scroll and unsaved local editing state across same-context composition transitions. Use bounded context state/snapshots or stable ownership where justified, not an unbounded tree of hidden mounted Maps with provider requests still running. Cancel superseded asynchronous loads; never restore a previous user's state after session replacement.

Search remains owned by its context: Chat message search does not turn into Map place search because a panel moved. Room membership and URLs remain authoritative. Only genuinely foreground/visible Chat may advance read markers. Ephemeral private origins/positions/geometry must not enter URL, localStorage, sessionStorage, analytics or shared reconciliation payloads.

At desktop widths, primary takes the larger region and companion uses the existing readable communication width. Below the existing 1100px threshold, preserve the logical pair but show one foreground pane with compact accessible surface navigation. Opening a companion foregrounds it; closing/back returns to primary. Do not squeeze two desktop panels into 320px. Resizing changes presentation only, not draft state or participation. Focus moves to the opened pane's heading/control and returns to its trigger on close; hidden content is not keyboard-focusable or announced as visible.

Preserve Inter, Tosker's existing colors, filleted geometry and compact selected states. This is a structural/reliability change with small UI adjustments, not MS8.

## Map contract

1. Manual checkpoint name: replace the large reset button with an accessible revert icon beside the name. Preserve default-title source, optimistic revision handling, save/retry errors and concurrent-edit behavior. Do not make provider POI names editable.
2. Locate always says **Locate**. Active styling and `aria-pressed` communicate state; no label-width jump.
3. Current-location card uses standard Location Card width/height rules at each breakpoint, with the same truncation/overflow grammar. Remove **Route from here**. Do not solve sizing with a second arbitrary fixed dimension.
4. On successful Locate activation, capture a **fixed, private, temporary initial origin** separately from `currentPosition`. Later explicit refreshes update the displayed marker only. Off clears both; a new activation captures a new origin. Context exit, expiry and permission loss clear the relevant private state and pending requests. Do not extend the original origin lifetime just because the marker refreshed.
5. Split the data all the way through origin request keys, first-leg geometry, source rendering, fit/camera behavior and labels. Changing currentPosition must not silently invalidate/recalculate the fixed-origin route. A route/first-stop change must invalidate the appropriate consent/request key, not move the origin.
6. Local position permission is **not** consent to send coordinates to Geoapify. In Order mode, capture can remain local without a road request. When Walk/Drive first needs the temporary leg, retain a clear one-time contextual provider disclosure and explicit allow action; declining keeps the local origin/marker without road geometry. Bind consent to the origin/context/route-first-stop contract and abort stale responses. Removing the old button must not remove this safety gate or imply that an empty checkbox grants consent.
7. Keep current one-shot/manual-refresh collection for FP2A. A continuous `watchPosition` would require a separate privacy/battery, accuracy, background, lifetime and device acceptance gate. No continuous local watch or sharing is silently added. Existing Ping consent stays separate and unchanged.

Acceptance must prove fixed origin versus changing marker with synthetic coordinates and intercepted provider requests, not repeated expensive road calls or real founder movement. Denied permission, unavailable GPS, timeout, stale result after Off, expiry, changed first Stop and failed provider response each need a truthful recoverable state.

## FP2B media boundary and recommendation

Recommend evaluating LiveKit Cloud voice-first after a separate founder provider/budget decision, with Daily as the cost/implementation alternative. Ably remains Chat and presence; it is not an audio relay. Define an internal media-session adapter for connect/disconnect, publish permissions, mute state and participant events, with server-issued exact-context tokens. Do not double-implement managed media signaling on Ably.

Presence and media authorization share Tosker's current membership/session checks, but media credentials, revocation and admission are separate. No provider secret reaches the client; a short-lived participant token may. Hidden-panel continuation, explicit Leave, context switch, reconnect and revocation must all stop/preserve actual tracks exactly as specified, not just update roster UI. No capture until explicit user action, no camera/PTT until functional and tested, no recording/transcription by default. Detailed retention, supported browser versions and real Singapore mobile-network quality remain provider-evaluation gates.

## Acceptance plan — not executed in this research pass

| Gate | Required evidence after approval |
| --- | --- |
| Reducer and routing | All nine states, toggle/replacement/Open alone, deep link normalization, Back/Forward, restricted surfaces |
| Draft/state preservation | Chat draft survives every transition and reload under existing semantics; Map camera/route/card/tray and Board editing/selection survive same-context switches; search/read scope correct |
| A/B Live | A joins once; B sees continuity while A hides/moves Live and changes same-context primary; explicit Leave disappears; no phantom rejoin after reload/context exit |
| Transport regression | One workspace SDK; one exact-context Live observation; 20 transition/reconnect cycles with no listener/channel/connection growth; rerun FP1 Join latency and immediate reconnect navigation gates |
| Authorization | Room/Subroom/Personal scope; nonmember denial; removal/logout/session replacement; stale async event rejection; no client wildcard/Live publish expansion |
| Map/privacy | Rename/default/revert/retry/concurrent revision; immutable POI; Locate label/highlight; card geometry; fixed origin/moving marker; no provider-coordinate call without consent; no persistence/broadcast/extra calls |
| Responsive/accessibility | **320, 390, 430, 768, 1440, 1728**; each legal composition, keyboard/touch, focus return, screen-reader labels, overflow and reduced motion. Real mobile interruptions require device checks, not merely viewport simulation |
| Release candidate D | Targeted tests, typecheck/lint/build, relevant full regression, secret/client-bundle scan, 29 migration hashes unchanged unless separately approved, exact protected-data attribution, provider-usage receipt and owned-fixture inventory |

Retain founder TID `8V3X7P1` in every owned collaborative QA fixture, resolved uniquely server-side. Reuse retained FP1 review Room where safe; never mutate founder identity or legitimate content to simplify tests. No fixture creation/cleanup occurred today. Canonical A/B and deployment receipts are a later separately authorized release gate, not part of local C.

## Estimate and stop gates

| FP2A work | Engineering hours |
| --- | --- |
| Composition reducer, URL/navigation, compact layout controls | 2–3 |
| Participation ownership and lifecycle separation | 3–4 |
| Context state preservation and mobile presentation | 2–3 |
| Map naming/Locate/card/fixed-origin consent changes | 2–3 |
| A/B, responsive, privacy, reconnect, regression and save states | 5–7 |
| **Local FP2A total** | **14–20** |

These are focused engineering estimates, not promises of unattended wall time; debugging, physical-device access and external approval can extend elapsed time. Secret remediation is separate. A later authorized canonical rollout/smoke is approximately 1–2 additional hours if local D is green. FP2B voice-first is provisionally 16–24 hours after provider/privacy decisions; camera/PTT expansion requires re-estimation and approval, not spare-time implementation.

Save B after integrated workspace implementation, C after evidence-backed local acceptance, D after the release-candidate audit. Commit only owned changes, preserve recovery notes at each boundary, and stop on authorization/privacy ambiguity, regression of FP1 ownership/latency, unapproved schema/provider changes, budget exhaustion or required scope exceeding the approved window. **No push/deploy without explicit founder approval.**

The exposed server Geoapify credential documented in R is a separate remediation gate before implementation/provider QA. Do not silently rotate, revoke or redeploy canonical under this research authorization.

**End state:** FP1 canonical live; FP2 architecture/research complete; FP2A awaiting execution approval; FP2B media provider decision pending; MS7.4 unlocked; MS8 not started.
