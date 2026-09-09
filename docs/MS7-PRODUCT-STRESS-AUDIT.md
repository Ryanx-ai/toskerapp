# Post-MS6B product stress audit — founder review

Historical audit snapshot. Current state/order is governed by [CODEX-HANDOFF.md](../CODEX-HANDOFF.md) and [ROADMAP.md](ROADMAP.md): MS6 locked, MS7.1 in progress at local `8b6d29c`, private attachments moved to MS7.6 backlog. Audit-time “not begun”/authorization statements below are historical, not current recovery instructions. The 2026-09-09 alignment update starts no development.

2026-09-07. **REPORT ONLY: MS7 implementation has not begun.**

Closeout annotation: founder approved this report. Its validated audit fixes were preserved and shipped with the bounded final MS6B attention/discovery patch `f005f6d`, deployed and live-verified; see `docs/MS6B-ACCEPTANCE.md`. References below to local/uncommitted fixes describe audit-time status. MS6/MS6A/MS6B are now locked; MS7.1 still requires subsequent explicit authorization. Other findings and policy decisions remain open.

Canonical: https://toskerapp.vercel.app/. Audited product baseline `a3e94a8bee718f4b43a309ed8cedf0c2d9efc168`. MS6B was implemented, validated, committed, pushed, deployed (`dpl_EG1JiM7p7ANoTPL2K9NrvEUkddCm`, READY) and live-smoke-tested before this audit began. Its release evidence is in `docs/MS6B-ACCEPTANCE.md`.

## 1. Executive assessment

**A credible shared-chat foundation, not yet a coherent public beta.** Real identity, durable communication, Room/Subroom access, realtime delivery and Hall collaboration are demonstrably useful. The biggest gap is not another technology platform: the product still presents management actions, settings, customization and capabilities which are absent or prototype-only.

Prioritize truthful, complete communication and identity workflows before growing the catalogue. Do not confuse successful realtime transport with production readiness of every surrounding control.

Findings: **0 P0 identified; 3 P1 findings (1 locally fixed, 2 open)**. Of the open P1s, one is a functional menu problem and one is an operational public-beta gate, not an observed data breach. Three P2 findings received surgical fixes. Other items below remain recommendations, not authorization to build them.

### Method and coverage limits

- Browser-first, using two normally signed-in, isolated Clerk Development users A and B. Desktop A; desktop/mobile B. Source inspection followed observed behavior and supported the dead-control/security/architecture inventory.
- Live two-user Personal, Room and Subroom communication; new audit Room with custom tag, invitation, member join and owner-only child; Hall creation/edit/comment/reaction/reorder/archive/delete; Friends search/nickname/status; every visible Settings row; Profile, Help, Notifications, Explore and Create/Studio.
- Viewports: 1440×900, 1728×1117, 390×844, 430×932. Desktop screenshots and mobile Hall/modal screenshots were inspected. Mobile-web results are Chromium emulation, not physical iOS/Android certification.
- Local MS6B acceptance also contributes: real provider permission-denial tests, two-user delivery without the old 12-second receiver timer, offline/background recovery, safe retry and 55-message gap reconciliation. See the acceptance record for exact boundaries.
- Not rerun exhaustively: fresh account registration, a third-user cross-request race, hundreds of Friends, 10,000-message history, every color combination, physical IME/virtual keyboard/long-press, screen-reader speech, native apps, prolonged offline/OS eviction, provider outage or high-load abuse. These are explicit acceptance gaps, not passes.
- One automation window became `document.hidden` despite accepting commands. Notifications correctly resumed when foreground state was restored with CDP focus emulation. An initially empty hidden-tab notification list was **not** counted as a product failure. Actual offline/background recovery was separately tested before this audit. Page visibility behavior is documented by [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
- Fixtures were isolated by exact Room/actor/content IDs. User A's status and B's private nickname were restored. Cleanup/release completion is recorded at the end.

## 2. Beta-readiness scorecard

These are evidence-weighted judgments, not numerical test scores.

| Area | Readiness | Reason |
|---|---|---|
| Chat delivery / persistence | Promising, guarded | Live A/B delivery, edit, reply, reaction, tombstone and recovery work; latency and long-history limits remain |
| Room / Subroom core | Partial | Create/join/access isolation work; lifecycle management controls are misleading |
| Hall | Partial | Useful bulletin board; destructive permissions and archive recovery need a decision |
| Identity / profile | Not beta-ready | Stable TID/username, but Edit profile is disabled; recovery guard fixed an observed identity/sample-state mismatch |
| Settings / Help | Not beta-ready | Five disabled setting categories and three disabled help actions |
| Friends / discovery | Partial | Stable accepted connections, search and private nickname; duplicate/filter issues fixed; no real profile opening/removal workflow |
| Explore / Gizmos | Not beta-ready | Discovery previews and installation records, not functional capabilities |
| Desktop / mobile web | Usable foundation | No sampled horizontal overflow; small targets, truncation and physical-phone acceptance remain |
| Authorization | Positive bounded evidence | Scoped tokens, denied restricted child, actor-owned edits; not a penetration-test certificate |
| Public operations | Not beta-ready | Canonical deployment still uses Development Clerk/Neon/Ably; no separate production/preview data stack |

## 3. Wave 1 — Chat / Rooms / Hall

### Observed working

- A/B exchange Personal, Room and Subroom messages on canonical; typing appears; offline receiver catches up; viewed-surface read state clears. Hall and Chat indicators identify the affected tab. Notification delivery resumed correctly on foreground and showed a newly sent message without reload.
- Own message edit propagated; B could not see Edit/Delete for A's message. B could reply and delete its own reply, producing a tombstone. Two same-emoji actor reactions formed one `👍 2` chip, with both actor names exposed accessibly.
- Full emoji picker search for “thumbs up” returned named skin-tone variants; keyboard selection inserted the emoji. Empty/whitespace send is disabled. A roughly 1,500-character message remained within the mobile workspace with the composer visible.
- Sending is single-flight: Enter during an in-flight send does not queue another send. A rapid automated sequence replaced its unsent second draft with a third; this was **not evidence of a server losing an accepted message**. The second message sent successfully after readiness. The distinction between unsent draft and accepted message needs to remain clear.
- New Room creation, WORK/custom Audit tags, selected Poll installation, secure invitation and B join worked. Reopening the invitation offered Open Room instead of duplicate joining. An owner-only child was absent for B and its exact URL returned 404. Parent/child switcher and separate Hall contexts held.
- Hall note create/edit, B comment, comment reaction, desktop handle drag, mobile Move earlier/later and reload persistence worked. Dragging the text area did not move a card; dragging the explicit handle did. Do not claim full-card dragging works.
- Pin from Chat created a Hall reference; Unpin removed only that reference, leaving the original message and reactions. Archive removed a note from both views. Member Nuke required confirmation and removed an owner-authored test note.

### Issues

| ID / severity / type | Surface and reproduction | Expected → observed | Recommendation | Small fix? |
|---|---|---|---|---|
| F01 **P1 BUG / UX** | Authenticated sidebar Room menu: choose Mute, Mark unread, Manage Room or Leave Room; reopen / reload | Meaningful durable action or no control → menu dismisses without the claimed operation. Source `ContextMenu` has no handlers for these actions; Pin/Archive/Nuke use the prototype store | Build the minimum durable lifecycle controls or remove them from authenticated beta. Do not imply Room deletion/leave/mute has occurred | No; requires lifecycle/product decisions |
| F02 **P1 BUG** | Local cross-origin session recovery into `/friends`: frontend Clerk signed in but server identity null | Real identity or explicit recovery → sample Mika/Jordan Friends rendered without a Demo marker. Opening `/app` recovered the real B identity | Fail closed when signed in but canonical identity is missing | **Yes**: AuthGate now shows Reload workspace; explicit Demo remains separate. Render-branch tests added. Intermittent Clerk timing trigger is not claimed eliminated |
| F04 **P2 UX / PRODUCT DECISION** | Archive a Hall note, then inspect Hall and menus | Retained information should be recoverable/discoverable → no archive browser or restore control | Provide a small archive/restore path, or omit Archive until its contract is complete | No |
| F05 **P2 SECURITY / PRODUCT DECISION** | B member opens A note menu, archives it; separately confirms Nuke on another A test note | Explicit collaboration/destruction policy → members can archive/delete another author's note but cannot edit it; authority is not explained | Founder choose author/owner destructive scope versus shared-editor board. Prefer recoverable deletion and owner moderation before public beta | No; observed current policy, not proven authorization bypass |
| F06 **P2 UX** | Send `https://example.com` in real Chat | Safe navigable link → message body is plain text with no anchor | Add safe http/https linkification and external-link treatment; never enable unsafe schemes or arbitrary HTML | No |
| F15 **P2 UX / COPY** | Open Voice, Video, Calendar, Settings, More, Attach/image/file, Translate | Working function or intentionally absent entry point → later/not-connected explanations | Hide deferred capabilities from beta toolbars; retain truthful boundaries where an explicit user attempt needs explanation | No |

Additional acceptance work before lock: server-backed leave/remove/invite revocation, simultaneous own-edit conflicts, repeated rapid sends under throttling, context change with an unsent draft, realistic long history and scroll anchoring. Do not solve these with a wholesale messaging rewrite.

## 4. Wave 2 — Profile / Settings / Customization

Own Profile shows canonical name, username, TID and a disabled Edit profile control. The unusually long test names stay bounded but are truncated heavily in compact contexts. Avatar display is largely initials/patterns; this audit did not find a working avatar customization flow.

Manual status selection is genuinely durable: A set meeting, then Away; B saw the corresponding labeled status. Reload retained it. A was restored to Online. Nickname is explicitly introduced as private; B's nickname survived reload and did not alter A's canonical identity. It was removed after testing.

| ID / severity / type | Reproduction | Expected → observed | Recommendation | Small fix? |
|---|---|---|---|---|
| F07 **P2 UX / PRODUCT DECISION** | Own Profile → Edit profile | Basic identity editing → disabled | Complete a restrained name/avatar/profile contract before advertising customization; determine username change policy separately from immutable TID | No |
| F08 **P2 UX / COPY** | Settings and Help, every visible row | Working preferences/support → five disabled setting categories and three disabled Help actions | Ship a small honest Settings screen and an actual support channel; remove disabled promises | No |

### Every visible setting

| Setting/control | Classification | Scope/persistence and beta recommendation |
|---|---|---|
| Your status | WORKING | User/profile metadata, visible to other authorized viewers; durable; not inferred live presence |
| Account | PROTOTYPE | Disabled; build minimal identity/account entry, not another settings hierarchy |
| Appearance | PROTOTYPE / NOT NEEDED FOR BETA | Disabled, “eventually” copy; omit until a real preference is ready |
| Language / English | MISLEADING / PROTOTYPE | Disabled preference; no working chooser; remove the implied setting |
| Notifications | PROTOTYPE | Disabled; must align with real mute/read policy, not pretend preference controls |
| Privacy | PROTOTYPE | Disabled; do not suggest privacy choices exist |
| Log out | WORKING control, limited retest | Existing Clerk SignOut path. This audit used real sign-ins and reload recovery, but did not redo a full new signup/logout matrix |
| Communication Settings gear | PROTOTYPE | Opens “More settings are coming later”, not Room administration |

### Future ownership/privacy contract

| Category | Data | Audience / appearance | Persistence / update contract |
|---|---|---|---|
| Public/discoverable identity | Display name, stable TID, discoverable username; avatar if offered | Explicitly defined minimal search/namecard/Room identity projection, not unrestricted account data | User-owned server mutation; propagate canonical changes to authorized consumers |
| Coarse status | Online/Idle/Away/meeting | Current labeled dots in Friends/communication; make visibility policy explicit | Manual override now; future ephemeral automation separate; never surveillance-style last-seen by default |
| Private user preference | Density, theme, locale, notification preference, rail state | Only the user's workspace; never pretend another person sees their theme | Durable per-user if cross-device is promised; label device-only state where used |
| Viewer-scoped data | Private Friend nickname | B's labels for A; not A's canonical profile and not visible to A/third parties | Connection/viewer-owned, consistent in visible text and accessible names |
| Shared Room identity/config | Room name, tags, capability configuration | Authorized Room/Subroom audience | Explicit owner/member role, server authorization, reload and multiplayer consistency |

**Answer to “can others see what I customized?”** Status: yes in tested authorized views. Private nickname: no change to the subject's identity. Profile customization: no working editor was found, so there is no honest customization-sharing promise yet. Sidebar collapse is a local UI preference, not public profile data. No large privacy system was implemented.

## 5. Wave 3 — Friends / people search

Exact TID and partial-name discovery returned the known accepted user. Reopening an existing Personal Chat reused the conversation. The Add friend banner only focuses the search field, rather than opening a separate flow. A no-match query produced a blank list without a clear “No people found” message. Friends' authenticated names are static text; the More menu offers nickname but not remove Friend or open a real profile. No recommendation/ranking algorithm is needed to fix this.

| ID / severity / type | Reproduction | Expected → observed | Recommendation | Small fix? |
|---|---|---|---|---|
| F09 **P2 BUG** | Search an accepted friend's exact TID | One identity → existing Friend plus identical discovery row | Deduplicate accepted identities across the two result sets | **Yes**; local exact-TID result is one row |
| F10 **P2 BUG** | A selects Away; B selects Online | Only manual-online Friends → Away still shown | Apply the Online filter to authenticated connections too | **Yes**; Away excluded. Add friend now resets All before focusing discovery |
| F11 **P2 ACCESSIBILITY** | B saves a nickname, inspect Friend action names | Spoken and visible identity match → buttons still named canonical display name | Use viewer-resolved nickname for accessible action names | **Yes**; verified “Message Audit private A” and “More actions for Audit private A” |
| F12 **P2 UX / PRODUCT DECISION** | Add friend, no-result search, click authenticated name / More | Understand discovery, view identity, manage connection → focus-only banner, blank miss, no real namecard/remove control | Minimal mixed search with clear sections, empty/loading/error states, real profile opening and remove/decline policy | No |

Smallest useful beta model: exact TID first, exact username next, then bounded prefix/substring display-name matches; stable user ID deduplication; self exclusion; minimal identity projection; explicit Add/Pending/Confirm/Friend states. Debounce, cancel/ignore stale responses, show failed-search feedback. Protect enumeration/abuse with bounded result limits and rate policy. No speculative recommendations.

Unverified here: A/B already had an accepted connection; no existing founder relationship was removed merely to force a new-request test. Fresh add/accept, cross-request races and many-Friend ranking remain mandatory MS7.3 tests. Existing server acceptance evidence is not relabeled as new browser evidence.

## 6. Wave 4 — Explore

Explore is the current umbrella. Featured/For trips changed the displayed concept set; community category filters exist. Static concept cards use a non-pointer cursor and have no fake card button. `/explore/create` exposes disabled Create something/App/Skin/Template/Game choices. Prices and fictional community creators still make the lower catalogue resemble commerce, despite a preview-only disclaimer. Legacy `/marketplace` and `/studio` are compatibility routes, not a reason to restore separate destinations.

| ID / severity / type | Reproduction | Expected → observed | Recommendation | Small fix? |
|---|---|---|---|---|
| F13 **P2 PRODUCT DECISION / COPY** | Browse Explore and Create/Studio | Real beta discovery → concept previews, priced future-community examples and disabled creator workflows | Explore should list only launch-ready capabilities; remove fake prices/creators and hide Create/Studio until actionable. Optional roadmap belongs outside the install catalogue | No |
| F14 **P2 ARCHITECTURE / UX** | Select Poll during Room creation; Add Schedule; reopen Add | Installed capability can be used → durable Added state, only Chat/Hall tabs, no functional Poll/Schedule surface | Bridge registry/install records to actual first-party tools before exposing install. Keep duplicate prevention | No; Gizmos explicitly forbidden during this audit |

Beta Explore should answer “what can I add to this Room now?” Compatibility, installed state and permission-denied feedback must be real. Community/Create can remain hidden. No separate Marketplace or Studio beta destination.

## 7. Wave 5 — Gizmo foundation

Current bounded source evidence: `room_capabilities` stores `(room_id, capability_key)` as its composite primary key, `installed_by_id`, and timestamp. Server install has an allowlist, checks Room membership and inserts idempotently. It is **not** a registry/runtime/configuration/data model. It has no version, instance state, uninstall lifecycle or explicit Subroom-install scope.

Recommended contract, not implementation:

| Need | Minimum first-party foundation |
|---|---|
| Identity/version | Stable namespaced key, manifest version, state schema version and controlled migrations |
| Installation | Installation ID plus Room/scope, creator, version, active/removed state; define singleton versus multiple instances |
| Subrooms | Explicit supported scope; Room-wide installation must not leak selected-child data; never infer scope from whichever tab is open |
| Configuration | Validated server-side configuration with defaults; keep private preferences separate |
| Permissions | Read, contribute, configure, destructive/admin operations checked on every server action |
| Persistence | Neon owns durable state, transactions and idempotency; no localStorage authority |
| Navigation | Stable URL/tab identity, compact overflow and readable mobile route; clear uninstall recovery |
| Reliability | Empty/loading/error/offline states, retry IDs, conflict/version handling, accessible feedback |
| Multiplayer | Versioned invalidations after commit; authorized refetch/reconciliation; never let untrusted client events become durable truth |
| Realtime | Reuse minimal scoped namespace for an active installation; payload validation, authorization and quota budget. Ably capabilities are resource/operation based, not a substitute for Tosker authorization ([Ably capabilities](https://ably.com/docs/auth/capabilities)) |
| Ownership | Room owns shared data; define export/delete/retention and creator departure behavior |
| Developer boundary | Future untrusted code isolation, permissions and review; **first-party only for launch**, no community execution/SDK now |

## 8. Coming-soon / dead-control inventory

UI inspection plus targeted user-facing source scan; internal names such as `prototypeStore` are not themselves visible-copy defects. A=build for beta, B=remove from beta UI, C=keep clearly non-interactive, D=post-beta. These are recommendations, not mechanical deletions.

| Surface/control | Current truth | Class |
|---|---|---|
| Sidebar Mute/Mark unread/Manage/Leave | Enabled but no real operation | A for minimal core lifecycle; B until done |
| Sidebar Pin/Archive/Nuke | Prototype-store behavior in authenticated menu | A if promised, otherwise B |
| Voice / Video | Opens later explanation | B + D |
| Calendar utility | Not connected | B; a future Schedule Gizmo is separate |
| Conversation Search utility | Explanatory popover, no functional search input | A for scoped history search or B |
| Conversation Settings / More | Later/tools-will-live-here copy | B until actual menu exists |
| Chat Attach / image / file | Later explanation | B + D until object storage and access controls authorized |
| Translate / translation options | No backend, explicit privacy reassurance | B + D; do not silently call a service |
| Hall image/file zone | aria-disabled, still focusable for explanation | B or C as a genuinely inert boundary, not a fake uploader |
| Add Poll/Schedule/Map/Board | Durable installation marker without working tool | A only for approved launch set; B otherwise |
| Photo Wall in Add | Disabled | B + D until storage |
| Profile Edit | Disabled | A minimal profile editing |
| Settings categories | All five disabled | A only essential categories; B for the rest |
| Help Send feedback / Report / Request feature | Disabled “Coming later” | A one working support route; B duplicate dead forms |
| Explore concept cards | Correctly non-interactive but featured as tools | B for beta catalogue; C only in explicitly separate roadmap |
| Community fake prices/creators | Preview commerce | B + D |
| Create/Studio starter buttons | Disabled | B + D |
| Notifications Mentions | All message notifications assigned here, not actual mentions | A correct taxonomy or B misleading filter |
| Version “Dev Proto”, sample Demo | Truthful development/demo boundary | C in founder review; keep explicit Demo separate from beta accounts |

## 9. Responsive / platform findings

| Interaction | Desktop quality | Mobile-web survivability | Native translation risk |
|---|---|---|---|
| Chat / composer | Stable sampled widths, contextual actions | 390/430 readable, long body wraps, composer inside viewport | High: keyboard/IME, safe areas, backgrounding, push and attachment sheet |
| Room / Subroom navigation | Parent-first switcher; explicit sidebar recovery | Long Room title truncated to very few characters; switcher remains usable | Medium: nested navigation and gesture/back semantics |
| Hall | Board layout, handle drag and menu fallback | Single column and action-menu reorder work; editor fits as a bottom sheet | High: touch drag, text selection, keyboard avoidance, destructive confirmation |
| Friends / search | Functional bounded list | Name/action density needs real large-list acceptance | Medium: search focus, contacts privacy, action sheet |
| Profile / Settings / Help | Consistent banner shell but much unavailable content | No sampled overflow; same functionality gaps | Low layout risk, high missing-contract risk |
| Explore / Create | Legible desktop catalogue, misleading availability | 390/430 no overflow; large cards create a long scroll | Medium: installation workflow and detail navigation, not an embedded web catalogue |
| Notifications | Durable list, context links | Text wraps; many identical Open controls and date-only timestamps | High: push permissions, OS notification routing and privacy |

The six destination responsive checks ran against the local production build after small fixes; live mobile Chat/Hall used baseline MS6B. No claim that every popup was checked at every dimension.

## 10. Accessibility findings

- Emoji buttons have meaningful names; reaction chips expose count/actors; status has labels rather than color alone. Sidebar collapse → focus Expand sidebar → Space restored the sidebar. Hall offers non-drag Move earlier/later, important under [WCAG dragging guidance](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).
- F11 nickname/action-name mismatch fixed. F01 inert actions remain keyboard-focusable, so keyboard access alone does not make them functional.
- Native dialog editors fit mobile. Tab reaches title, body and the unavailable attachment explanation. One sampled Tab traversal reached browser/body focus; a complete screen-reader and focus-wrap review remains necessary. Do not report WCAG conformance from this audit.
- **F18 P3 UI / ACCESSIBILITY**: small tertiary copy, short utility targets and heavily truncated mobile Room titles. Reproduce at 390px Hall/Chat and inspect title/actions. Expected legible identity and comfortable activation; current screenshot is geometrically contained but dense. Recommend enlarge touch targets selectively and retain full names in switchers; no fix applied. WCAG's minimum target criterion includes size/spacing exceptions; 44px is not a universal AA requirement ([W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- Contrast was visually sampled, not exhaustively measured against every gradient. Physical keyboard/IME, reduced-motion behavior and screen-reader announcements need explicit beta acceptance.

## 11. Performance findings

- Local MS6B A→B pre-click-to-render samples ~3.5s Personal/~3.9s Room; provider signal itself tens of milliseconds. These include Clerk/Neon work and are not SLAs. A later canonical navigation sample showed ~45ms TTFB/~628ms DOMContentLoaded, not proof that full authenticated data was ready then.
- **F19 P2 PERFORMANCE / ARCHITECTURE**: notification retrieval loads the full history and reauthorizes each distinct conversation; browser renders the resulting full list. Reproduce with growing notification/conversation history (20 rows observed; scale risk confirmed in `listNotificationsAction`). Expected bounded, paginated work; current cost grows with history. Recommend pagination, batched authorization and measured action-to-render budgets. No scale benchmark or optimization applied.
- Retain MS6B fallback until failure recovery is proven under realistic traffic. No transactional outbox currently; best-effort invalidation plus canonical reconciliation is an explicit reliability limit.
- Unavailable/hidden-tab UI must not be mistaken for empty data. Foreground checks matter when evaluating timing.

## 12. Security / privacy findings

- Real token scope/TTL/revocation, forged publishing/identity denial and unauthorized Subroom rejection passed MS6B tests. Browser B's owner-only child deep link returned 404. This is strong scoped evidence, not comprehensive adversarial security certification.
- F02 prevented accidental sample-workspace rendering when canonical identity was absent. Server actions still independently authorize; the observed issue was identity/draft confusion, not demonstrated access to another user's private records.
- F05 requires a destruction-policy decision. For now, membership permits more Hall destruction than edit access; do not market stronger author ownership than implemented.
- **F03 P1 ARCHITECTURE / PRODUCT DECISION — public-beta gate**: canonical founder-review URL still uses Development Clerk/Neon/Ably and test users. Reproduction: environment/release record and Clerk Development sign-in. Expected separate real production identity/data/provider environments and operational recovery plan; current review stack is not that. Founder must authorize provisioning, migration, backup/recovery, abuse limits, key rotation policy and account lifecycle before public beta. **No provisioning or infrastructure changes made by this audit.**
- No detailed last-seen tracking added. Nickname is viewer-owned. Discovery should return only approved identity projection to strangers; friends/Room membership do not imply permission to see private preferences.
- No authorization claim is made for an as-yet nonexistent member-removal UI. Future removal must revoke scoped realtime credentials as documented in MS6B, alongside durable access changes.

## 13. Cross-product visual / UX inconsistencies

- **F16 P2 COPY / UX**: Notifications call ordinary messages “Mentions”, use repeated “New Hall note”/“Open” with no Room name, and date-only timestamps. Reproduce All/Mentions with the audit message and note notifications. Expected accurate category, readable context and useful relative time; observed generic list makes similar events hard to distinguish. Recommend truthful Messages label plus Room/Subroom context and accessible Open names. No fix applied.
- **F17 P2 UX / ERROR RECOVERY**: Friends no-match query is blank; initial Notifications can say “caught up” before data is known; async search/request handlers lack consistent visible error/retry states. Reproduce a no-match query and inspect first load; source supports the missing failure path. Expected loading/empty/error distinction; current surface can imply success or absence. Recommend a small shared state vocabulary, not a new visual system. No fix applied.
- F18: desktop expressive banners occupy much more visual hierarchy than dense functional copy. This is not a reason to redesign approved banners. Normalize readability and spacing only where task completion suffers.
- Hall has a proper in-board New Note card; preserve it. The upload-shaped area remains the strongest misleading affordance inside the otherwise restrained editor.
- Room icons and personal circular avatars are distinguishable. Mobile parent title truncation and “Room” accessible naming for Subroom rows deserve refinement, not another identity system.

## 14. Recommended starter Gizmos

**Twelve candidates, not twelve launch commitments.** Recommendations are product judgments based on distinct capability archetypes, not claims of market research. “Realtime” means useful cross-user invalidation, not a new provider or continuous heartbeat. L/M/H are relative implementation complexity within Tosker, not schedule estimates.

| Candidate | Use case / archetype | Multiplayer + backend | Realtime need | Mobile / build | Beta merit / launch |
|---|---|---|---|---|---|
| Poll | Decide dinner/date; constrained voting | Actor-scoped votes, options, close policy, unique vote constraint | Results invalidation | L / M | Exercises identity and aggregation; **launch** |
| Checklist / Tasks | Trip preparation; shared item list | Item CRUD, completion actor, optional simple assignee, conflict version | Shared mutations | L / M | Common use, distinct from retained Hall notes; **launch** |
| Schedule | Pick a meeting time; availability matrix | Timezone-aware slots, per-actor responses, finalized choice | Responses / finalization | M / M–H | Tests time and per-user input; **launch after smaller tools** |
| Countdown | Shared departure/deadline; read-mostly timer | One timestamp/timezone/config record; client display from timestamp | Only config changes | L / L | Small complete tool; no DB heartbeat; **launch** |
| Links / Bookmarks | Keep destinations/resources; shared collection | Validated URLs, labels, ordering; no scraper initially | Collection invalidation | L / M | Useful resource archetype without media storage; **launch** |
| Random Picker / Wheel | Choose player/restaurant; shared command/result | Persist one server-generated result, request ID, participant/options snapshot | Broadcast accepted result | M / M | Tests fair one-shot command and replay; **launch** |
| RSVP / Attendance | Know who is coming; actor roster | Actor-owned yes/no/maybe and event context | Roster updates | L / M | Good next candidate; overlaps Schedule at launch |
| Scoreboard | Casual games; shared counter | Authorized atomic score events and correction history | Score updates | L / M | Exercises contention; optional first expansion |
| Map | Trip places; spatial collection | Licensed map provider, saved coordinates, access/rate limits | Pin changes, not location tracking | H / H | Strong Tosker fit; gate provider and cost first |
| Photo Wall | Shared memories; media collection | Object storage, signed access, moderation, quotas, deletion/retention | New item invalidation | H / H | Valuable but not justified before media foundation |
| Watchlist | Films/books/places; ranked collection | CRUD, stable ordering and optional completion/vote | Changes | L / M | Useful but similar to Links/Tasks; defer to avoid catalogue padding |
| Lightweight Kanban | Small work flow; state-transition board | Cards, columns, moves, conflict/ordering and permissions | Shared moves | H / H | Useful later; duplicative with Tasks and risks Hall/Notion confusion |

Recommended initial launch: **Poll, Checklist, Countdown, Links, Random Picker, Schedule**. Build in that risk order, with Schedule last. Launch fewer if any remain incomplete. Do not replace Hall with a new Shared Notes/Board Gizmo; Hall already serves that role. A standalone Simple Calendar duplicates Schedule until calendar semantics/integration are explicitly desired. Files/Resources should follow the storage/ownership foundation, not become a fake early catalogue tile.

## 15. Proposed MS7 implementation waves

Retain the founder's sequence. Add an operational gate across it; do not turn it into a new milestone.

1. **MS7.1 Chat + Rooms** — resolve F01 lifecycle scope, Hall recoverability/destruction policy, safe links, truthful communication utilities, message/draft/scroll/error edge cases. Revalidate realtime authorization and removal behavior. Gate: two-user adverse-path stress test → founder walkthrough → lock.
2. **MS7.2 Profile + Settings + Customization** — minimal real profile editing; public/private/viewer-owned contract; status/privacy wording; only working settings; one working support path. Gate: cross-user visibility + reload/logout/privacy tests → walkthrough → lock.
3. **MS7.3 Friends + Search** — bounded discovery, true profile opening, connection lifecycle, request races, ranking/dedup, loading/error/empty states. Preserve private nicknames. Gate: new/accepted/cross-request/removed/stranger matrix → walkthrough → lock.
4. **MS7.4 Explore** — remove prototype commerce/creator promises, publish compatibility-aware real catalogue and installation navigation. Can ship an intentionally small catalogue. Gate: every visible item works or is absent → walkthrough → lock.
5. **MS7.5 Gizmo foundation + selected first-party tools** — versioned registry/install/data/permission contract, then one complete archetype at a time. Do not build six at once. Gate each tool through multiplayer/offline/mobile/error/uninstall acceptance, then founder walkthrough → lock.

Production separation, observability and abuse/recovery policies must be resolved before any public-beta promotion. This report does not authorize those changes or start any wave.

## 16. Beta blockers

- Open P1 F01: enabled authenticated management actions that do not do what they say.
- Open P1 F03: Development review infrastructure and test accounts are not public-beta operations.
- Fixed P1 F02 still needs broader Clerk/session-recovery acceptance across real devices; UI now fails closed instead of falling into sample state.
- Product scope blockers: own-profile editing, honest settings/help, Hall destruction/recovery decision, and a real rather than decorative capability/Explore story.
- Acceptance blockers: physical phone/keyboard/screen-reader pass, fresh signup/new friendship matrix, bounded-load/reliability measurement. These are known coverage limits, not newly invented feature work.

## 17. Post-beta / deferred list

Voice/video, automatic presence, detailed last-seen, translation service, media pipeline/Photo Wall/Files, external calendar integration, community uploads/runtime, paid Marketplace, creator Studio, large privacy/settings framework, recommendation engine and native apps. Map remains a provider/cost/privacy gate. No Tosker Art or website refinement during this audit.

## 18. Founder decisions required

1. Which Room lifecycle controls must be real at beta: leave, member removal, invite revocation, mute, manual unread, private archive, owner deletion? Remove the rest from visible beta rather than promise them.
2. Hall: may any member permanently delete another person's note? Is Archive recoverable, and by whom? Recommended default: recoverable shared archival, tightly scoped permanent deletion.
3. Profile: minimal editable fields and audience; username mutability; avatar/storage timing; coarse-status visibility. Keep TID stable and nicknames private.
4. Friends: remove/decline/block expectations and minimal stranger-discovery projection. Do not imply block/privacy controls exist until they do.
5. Approve Explore as real-only catalogue with no fake pricing/Create/Studio, and the six-tool launch shortlist (or fewer).
6. Authorize separate production/preview resources and an operational owner before public beta. Existing Development review deployment remains intentional until then.

### Small fixes and release discipline

- Friends: authenticated Online filtering; accepted-user result deduplication; Add friend resets All; nickname-aware accessible action names.
- AuthGate: signed-in/null-canonical-identity recovery screen instead of unmarked sample workspace. No automatic retry loop, new auth service, schema or permission changes.
- `scripts/verify-audit-ui.mjs` covers canonical identity, missing identity, signed out, explicit Demo and join-boundary render cases. These mocks test UI branching, not Clerk or server authorization.
- TypeScript, ESLint, production build and `git diff --check` pass; local browser verifies the Friends corrections, canonical auth, signed-out gate and explicit Demo. React/Next guidance kept these changes within existing client boundaries; no new effects/fetching system.
- The small audit fixes remain validated local changes, not a new release. The founder addendum ends this work at report/cleanup/validation/STOP. MS6B's deployed baseline remains `a3e94a8`. No MS7 implementation, new Gizmo, schema/provider provisioning or visual-system rewrite was made.

## 19. Mature-chat convention benchmark

Official documentation reviewed on 2026-09-07; this is a convention benchmark, **not** a hands-on certification of every competitor client/version. Older feature announcements establish the described affordance, not universal current platform parity. Recommendations below are Tosker judgments, not vendor requirements.

| Product | Documented convention | Tosker implication |
|---|---|---|
| Discord identity | Unique username, global display name, private Friend nickname and server nickname have distinct meanings. Profile inspection reveals the username despite a server nickname. Self-change and manage-other-nicknames are separate permissions. ([Identity](https://support.discord.com/hc/en-us/articles/12620128861463-New-Usernames-Display-Names), [server nicknames](https://support.discord.com/hc/en-us/articles/219070107-Server-Nicknames)) | Separate account identity from contextual presentation; make canonical identity discoverable. Do not import a full role editor just for nicknames. |
| Discord actions | Reply is available through desktop hover, ellipsis/right-click and mobile long press. Reaction menus provide quick choices, a full picker and inspection of who reacted. ([Replies](https://support.discord.com/hc/en-us/articles/360057382374-Replies-FAQ), [reactions](https://support.discord.com/hc/en-us/articles/12102061808663-Reactions-and-Super-Reactions-FAQ)) | Keep equivalent explicit, keyboard and touch paths. Existing aggregated Tosker reactions fit this expectation; hover must remain supplementary. |
| Discord composer | The composer separates text, emoji and attachment entry points; file drag/drop is supported. ([Sending messages](https://support.discord.com/hc/en-us/articles/360034632292-Sending-Messages)) | Preserve a clear Send control and emoji picker. Do not imply that Tosker's attachment icon or a dropzone uploads before storage exists. |
| Telegram identity/context | Profiles provide shared photos, videos and links. March 2026 member tags add group-specific role context, with admin control over self-assignment. Tags are not evidence of a replacement account name. ([Profiles](https://telegram.org/blog/new-profiles-people-nearby), [member tags](https://telegram.org/blog/member-tags-disable-sharing-and-more)) | Useful shared context belongs behind an identity entry point. Distinguish a Room nickname from a role badge; neither confers authorization. |
| Telegram messaging | Quick reactions coexist with a larger selection; translation can be exposed in a message context menu. Its FAQ describes replies, edits, deletion, search, group permissions and explicit cloud/read check semantics. ([Reactions/translation](https://telegram.org/blog/reactions-spoilers-translations), [FAQ](https://telegram.org/faq)) | Reuse familiar placement, not automatic translation calls or another product's read-receipt promise. Tosker's unread markers do not prove that another person read a message. |
| Telegram hierarchy | July 2026 Communities link groups/channels/bots, allow an expandable chat-list entry and distinguish visible from hidden chats. ([Communities](https://telegram.org/blog/communities-editor-invisible-messages)) | Learn progressive disclosure and hidden-context boundaries. Do not import this broader hierarchy or automatic joining into Tosker's selected/owner-only Subrooms. |
| WhatsApp identity/context | January 2026 member tags let people describe their role differently per group. Common-group discovery and admin join controls are documented separately. ([Member tags](https://about.fb.com/news/2026/01/whatsapp-group-chats-member-tags-text-stickers-event-reminders/), [groups in common](https://blog.whatsapp.com/getting-more-out-of-groups-on-whatsapp)) | A shared-context profile is familiar. Group-specific tags support contextual identity, but are not the same as Discord-style nickname replacement. |
| WhatsApp messaging | A sent message can be edited through long press within a defined window and is marked edited. Chat filters distinguish All/Unread/Groups. Message translation was introduced as an on-device, language/platform-dependent feature. ([Edit](https://blog.whatsapp.com/now-you-can-edit-your-whatsapp-messages), [filters](https://blog.whatsapp.com/find-messages-faster-with-chat-filters), [translation](https://about.fb.com/news/2025/09/introducing-message-translations-whatsapp/)) | Make edit/delete scope and unread meaning explicit. Keep Tosker translation unavailable until a real privacy-reviewed path is approved; never claim on-device processing by analogy. |
| WhatsApp community | Communities organize groups beneath an umbrella with announcement/admin controls; reactions avoid extra reply noise. ([Community model](https://blog.whatsapp.com/sharing-our-vision-for-communities-on-whatsapp)) | Retained shared information belongs in Hall. A capability need not become another conversation or group. |

Discord also documents mutual-context information within its profile-privacy model; that disclosure policy is **not** automatically appropriate for Tosker. ([Profile privacy](https://support.discord.com/hc/en-us/articles/38859942749463-Profile-Privacy-Setting-on-Discord))

### Adopt conventions, not visual design

- Avatar/name opens identity; explicit message menu works without discovering hover; reply retains source context; copy returns actual text; edit is marked; deletion has clear scope; selected reactions show own participation and aggregate by emoji.
- Keep drafts through failure, show pending versus failed versus accepted accurately, retry idempotently, and reconcile after reconnect. Do not claim recipient delivery/read from server acceptance. Competitor failure animations and every desktop shortcut were not independently verified here; these are Tosker acceptance requirements.
- Readable URLs, deliberate attachment picking, no silent upload, coherent consecutive-message grouping with discoverable author/time/actions. Existing Tosker grouping must never merge ownership or conceal edited/deleted state.
- Coarse status remains user-selected metadata, separate from network connectivity. No detailed last-seen inference or automatic presence implementation is recommended in this audit.

### Intentionally do not copy

No channel sprawl, deeper hierarchy, duplicate Hall/notes tools, paid basic identity, upsells in the composer, automatic join to hidden spaces, or disclosure of all memberships. Do not copy Telegram's deletion semantics into Tosker's existing tombstones or treat WhatsApp encryption/translation guarantees as Tosker guarantees. Preserve **Room → optional Subroom → Chat / Hall / Gizmos**: add capabilities to a place before inventing more places.

## 20. Identity opening and richer namecard feasibility

**Additional browser evidence (F12, not a new severity count):** in B's authenticated local production-build session, clicking A's Personal Chat header avatar left the route unchanged and opened no dialog. Clicking A's Friends avatar likewise opened nothing. Both are static spans, default cursor and not keyboard stops. Authenticated Friend name text is static too. Own profile navigation exists; the demo Friend namecard must not be mistaken for a real authenticated person surface.

This is a missing familiar affordance, not an intentional structural difference. Do not make the avatar look clickable until it opens an authorized real profile. MS7.2 should establish one canonical namecard entry pattern; MS7.3 should reuse it for Friends/search. On mobile use an accessible sheet/full view; on desktop a compact anchored card can expand if needed. Preserve focus return, Escape/close, keyboard activation, URL/context where appropriate, and never open multiple stacked identity dialogs accidentally.

Current schema evidence (`src/server/db/schema.ts`): `users` has stable ID/auth subject/TID; `profiles` has display name, unique username, avatar URL, bio and constrained manual status. `connection_nicknames` is keyed by connection and viewer. `room_memberships` has Room/user/role/joined time, **no Room nickname**. `subrooms` and `subroom_access` represent visibility/access, not a separate global identity. Messages and Hall retain canonical author IDs.

Existing fields do not imply an authorized other-person profile endpoint exists. Add a bounded server projection only after policy approval: canonical user ID, display name/username/TID, approved avatar/bio/status, viewer's private alias, permitted Room identity and eligible actions. Never return Clerk subject, email, provider credentials or another viewer's nickname. A shared Room permits contextual identity, not unrestricted personal data. Friend, co-member, former member and stranger projections need explicit tests.

## 21. Proposed global / private / Room identity contract

**Recommendation only; no migration or implementation.**

| Layer | Owner and scope | Suggested behavior |
|---|---|---|
| Canonical identity | Account owns global profile; immutable user ID/TID anchors records | Global display name is editable subject to safety rules; username policy decided separately. Never key permissions or authorship by a name. |
| Private nickname | Viewer owns alias on an accepted connection | Preserve current private nickname → global display name → safe fallback in Friends/Personal. Never publish the alias to the other person or a Room. |
| Room nickname | Member chooses presentation within one Room | Prefer a nullable `display_name` on the existing membership plus update metadata; composite Room/user identity already exists. Do not reuse private connection nicknames. A separate Room-profile table is justified later if avatar/style/retention needs outgrow this. |
| Role | Server-authorized membership role, not arbitrary display text | Owner/mod badges must come from permissions. A nickname such as “Admin” never grants or visually certifies authority. |

Proposed display resolution, pending founder approval:

- Shared Chat/Hall default: **Room nickname → canonical display name → safe fallback**. Subroom inherits the parent Room identity; no per-Subroom alias at beta.
- Personal/Friends: preserve viewer-private alias precedence. In a Room namecard, show “Your nickname” privately as secondary context, not a shared replacement that makes members see incompatible Room author labels. This proposed Room-specific precedence is a deliberate policy choice, not a silent change to current code.
- Namecard: Room nickname labeled “In this Room,” global name, username/TID and coarse status; private alias labeled “Only you.” Canonical identity remains one click away for safety. Do not list aliases from Rooms the viewer cannot access.
- Chat messages, replies, Hall note/comment attribution and reaction actor lists resolve by canonical author ID. Nickname changes are metadata: no unread, notification, Hall activity, conversation reorder or message insertion.

**Permissions:** allow members to change/reset their own Room nickname freely by default; validate length, Unicode/control characters and abuse/impersonation rules on the server. Current roles are owner/member, not a moderator framework. Recommend owner ability to reset an abusive nickname with a recorded reason/actor rather than silently assign a different persona. If founder wants assignment/override, require a distinct permission, visible moderation provenance and a conflict rule; do not sneak role management into nickname work. Ordinary members cannot mutate another user's Room/global identity.

**Leave/rejoin/history:** default to removing the active membership override on departure; rejoin starts from the global name. Preserve canonical authorship of existing content. For beta prefer current-name resolution with global fallback for former members rather than inventing historical nickname snapshots. This means historical labels can change, not authorship; disclose that in the design. If immutable historical display is required, choose scoped snapshots/retention explicitly before implementation. Moderator records must not appear as public activity. Never leak a departed member's aliases from other Rooms.

**Concurrency and delivery:** bounded membership update with expected version/timestamp; server resolves actor and Room access, not submitted owner IDs. Publish metadata invalidation after Neon commit to authorized Room viewers only; refresh profiles without creating activity. On access loss, refetch must deny and cached context must clear. No extra connection, heartbeat or global nickname broadcast is necessary.

## 22. Shared-context feasibility and privacy matrix

“Shared” must mean **currently authorized overlap**, not everything both people ever touched. A visible count can leak a hidden Room just as a title can; filter before computing counts, not in the browser afterward.

| Surface | Existing data / missing work | Storage / relative query cost | Privacy requirement | Placement |
|---|---|---|---|---|
| Common Rooms | Two membership sets and Room identities already exist; new actor-bound intersection query/projection | No object storage; low with user index, composite key, bounded pagination | Both current members; no other memberships, invite tokens or inaccessible counts | MS7.2 compact namecard section; MS7.3 discovery reuse |
| Common Subrooms | Parent membership, visibility (`everyone`, `selected`, `owners`) and explicit access exist; intersect effective access for both people, not just access rows | No object storage; moderate joins; batch by parent | Viewer AND target must have current effective access; parent access required. Same 404/hidden behavior as direct routes | MS7.3 if common Rooms proves useful; otherwise later |
| Shared media | No durable message-media collection; profile avatar URL is not a shared media system | Authorized object storage, metadata/thumbnails/quotas/retention; moderate–high operations cost | Source-conversation access on list and every signed download; revocation/deletion, malware/moderation policy | Later media milestone |
| Shared files | Durable attachment model/upload pipeline absent | Object storage plus file metadata, scanning, limits and signed delivery; high operations responsibility | Same source authorization; no public reusable blob URL, guessed-ID access or deleted-file leakage | Later attachment/resource milestone |
| Shared links | Text message bodies and source conversation/author IDs exist, but no link index | No blob storage for plain links; new parsed index/backfill and pagination. Repeated full-history scans are too costly | Reauthorize source; update/remove index on edit/tombstone; never reveal links from restricted child. No automatic URL fetch/preview initially | Safe linkification MS7.1; aggregated profile links later unless separately prioritized |
| Mutual Friends | Accepted connection graph exists; no approved third-party relationship-disclosure policy | No object storage; moderate intersection; avoid per-person query fan-out | “Both know X” reveals X's social graph. Default absent until third-party privacy/block policy is approved; counts also sensitive | MS7.3 design decision, not required beta panel |
| Shared activity | Message/Hall metadata exists, not an authorized person-wide activity feed | Potentially expensive cross-scope aggregation | No last-active timeline or profiling across Rooms; use explicit shared-context links instead | Defer; not needed for useful identity |

Performance: fetch context on deliberate profile opening, not for every avatar in history or every hover. Bound and paginate results; batch identity lookup. `listConnectionsAction` already does per-connection profile/nickname reads; do not extend that fan-out with Room/media queries. User-specific cache keys must include viewer/target/context and be invalidated on membership/privacy changes; never public-cache this projection. Cardinality and query-plan measurement remain future acceptance work, not asserted benchmarks.

Required privacy negatives: A/B share Room R but only A can see child S → no S title/count for B; B loses R → old namecard URL/cache cannot reveal it; forged target/scope IDs do not bypass checks; personal chat content never appears through merely sharing a Room; viewer-private nickname never reaches target; no results panel is shown solely to look feature-complete.

## 23. Micro-interaction consistency addendum

This consolidates the browser evidence in sections 3–10. **Sampled, not exhaustive**: no claim that every control/state combination or physical long press has passed.

| Interaction | Evidence / gap | MS7 acceptance target |
|---|---|---|
| Hover, cursor, focus | Explicit Chat/Hall menus, sidebar control and picker work; real other-person avatars are inert. Static Explore concepts correctly lack pointer treatment | One tonal surface lift, text brightness, icon surface response; equivalent focus, no layout shift. Avatar becomes a button/link only with real action |
| Selected / pressed | Filters change state; own reaction toggles; Add shows persisted Added | Persistent selection distinct from transient press; expose `aria-pressed`/expanded state; do not confuse Installed with functional |
| Disabled | Whitespace Send disabled; future features often disabled/explanatory | Hide unsupported beta promises, distinguish temporary pending from permanent unavailable; do not add hover-only explanations |
| Loading / failed / retry | Draft and idempotent retry evidence exists; Friends/search/Notifications empty-versus-loading gaps remain | Preserve content/draft, ignore stale search responses, explicit actionable retry, no false “empty” while loading |
| Unread / notification | Chat/Hall dots and durable notification/recovery verified | Surface-specific indicators clear on view; no own activity or profile-status unread; meaningful destination labels, no false read receipts |
| Right-click / ellipsis / long press | Desktop context actions and mobile explicit More exercised; physical long press not certified | Same allowed actions across entry points; text selection remains possible; touch never depends on hover |
| Drag/drop | Hall handle and repeated drag-over/drop sequence persisted; full-card text-start did not reorder; move fallback works | Clear grip/cursor/target; keyboard and touch alternatives; no destructive accidental drag and no fake file upload |
| Destruction / optimistic state | Chat own delete tombstone; Hall Nuke confirmation; other-author Hall destruction currently allowed | Explain target and shared scope; settle owner/member policy and restore path; failed optimistic mutations visibly reconcile |
| Tooltips / hitboxes / icons | Accessible action names, reaction actor labels and presence labels sampled; dense utility targets/mobile title truncation remain | Restrained labels available to keyboard too; comfortable invisible target around small icon; measure contrast/centering rather than declare full compliance |
| Modal/menu stacking | Hall editor/mobile bottom sheet fit sampled viewports; complete focus-wrap/screen-reader pass outstanding | Single active layer, Escape/back closes correct layer, focus returns to trigger, no obscured Send or offscreen menu |

A familiar-app user should recognize message actions, reactions and contextual identity without learning Tosker-specific gestures. Hall's retained-information role and capability tabs are intentional differences. Dead management controls, inert person avatars, fake installed tools and unexplained empty states are missing completion, not product differentiation.

## 24. Wave placement, free-customization guardrail and decisions

Keep the approved order. MS7.1 defines Room lifecycle and identity-display contracts while hardening Chat/Hall; **do not implement Room identity halfway across surfaces**. MS7.2 owns the minimal global/Room identity model and consistent Chat/Hall/namecard integration; MS7.3 reuses authorized shared context in Friends/search. MS7.4 makes Explore truthful. MS7.5 builds the first-party foundation and selected complete tools. Media/files/aggregated links remain separately gated. Every wave: implement → abuse/stress → founder walkthrough → lock.

**For the community, by the community.** Ordinary Room nickname changes, basic profile identity, community participation and expected messaging affordances remain broadly free. Future optional paid Gizmos, skins/packs and creator economics may extend the experience, not unlock trustworthy identity or baseline chat. Keep authorization independent of future entitlement checks for these basic actions. No billing schema, pricing gates, paid roles, SDK or monetization service is introduced or authorized by this recommendation.

Additional founder decisions:

1. Approve Room nickname as shared primary label, with private alias secondary in Room namecards and unchanged private-first Personal/Friends resolution?
2. Approve free self-change and owner reset-only for abuse, or require explicit owner/mod assignment/override? If override, decide provenance and user recourse first.
3. Approve parent identity inheritance, no child-specific aliases, and reset-to-global on rejoin? Are current-name historical labels acceptable, or are retained scoped snapshots necessary?
4. Approve minimal other-person projection and common Rooms for MS7.2? Keep hidden-child counts and all non-overlap memberships excluded.
5. Defer mutual Friends until third-party privacy policy exists, and defer media/files/link galleries until infrastructure is real?

## 25. Closeout / exact restart state

- MS6B remains released at `a3e94a8` on `main`/`origin/main`; its canonical live two-user evidence is recorded separately. No post-audit commit, push or deployment was made. Small audit fixes and this report remain local for founder review.
- Guarded cleanup completed: one audit Room, one child, six fixture messages, 73 earlier MS6B acceptance messages and three remaining test Hall items, plus exact related/cascading fixture metadata. Earlier browser deletions had already removed other test notes/references. Only exact actor/content/scope-asserted QA data was removed; founder content was preserved. This test cleanup has no UI undo.
- A's manual status restored to Online; B's temporary private nickname removed. Post-cleanup `db:audit-ms5` passes: no duplicate TIDs/memberships/personal pairs, invalid Sandbox owners or orphan Hall pins. Shared Development data continued changing during the audit; unknown/new user data was not treated as a fixture or removed.
- Small source patch: `src/components/auth-gate.tsx`, `src/components/messaging-app.tsx`; UI render regression script: `scripts/verify-audit-ui.mjs`. TypeScript, lint, production build and local browser checks passed; the final UI script/lint/diff and database invariant checks passed. The build preceded documentation-only additions, not further product edits.
- Known limits remain in sections 1/9/10/16: physical mobile/IME/screen reader, fresh friendship races and realistic load/security/operations acceptance. The audit is complete within those stated limits, not a claim of public-beta readiness.
- Next action: **founder reviews this report and chooses MS7.1 scope/policies**. Do not implement any MS7 wave, release the local audit fixes, provision infrastructure, or touch `toskerArt/` without subsequent instruction. Unrelated Website/Art documents and experiments remain preserved and unstaged.
