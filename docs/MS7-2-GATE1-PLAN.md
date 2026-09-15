# MS7.2 Gate 1 — Profile, Settings and identity governance

Date: 2026-09-15. Status: RESEARCH / AUDIT / PROPOSAL ONLY. Gate 2 awaits founder approval.

Authority: `TOSKER_MS7_2_PROFILE_SETTINGS_GATE1.pdf` (43 pages), followed by the founder's typography and website/brand addenda. This report does not authorize implementation. Existing Git and deployed-state evidence take precedence over historical summaries. No product code, schema, migration, environment, provider configuration, dependency, font asset or deployment was changed in this Gate 1 pass.

## 1. Recovered baseline and boundaries

| Item | Fresh observation |
| --- | --- |
| Repository | `/Users/ryanc/Developer/toskerapp` |
| Branch / HEAD | `main`, `324e2f43b9508309a878c8de8f0bbfdc85140b87` — `feat: begin MS7.2 owner profile foundation` |
| Canonical Git remote | `https://github.com/Ryanx-ai/toskerapp`; remote `main` verified at `5ae54fb0ff7d0dc6ab5d026ada8a69f25e34e70a` |
| Divergence | Local ahead 1, behind 0. MS7.2.1 is local-only. No fetch, commit or push performed. |
| Tracked WIP entering this audit | `CODEX-HANDOFF.md` and `docs/CROSS-PROJECT-INHERITANCE.md`, documentation only; preserved |
| Existing untracked work | `docs/DEV-DESIGN-SKILLS.md`, Art audit/system/Design Hub/Web audit/parked-refinement documents, `docs/research/`, `experiments/`, `toskerArt/`; preserved |
| Canonical deployment | Vercel `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp`, READY, Git `5ae54fb…`; alias `https://toskerapp.vercel.app/`, fresh HTTP 200 |
| Immutable deployment URL | `https://tosker-etjmuljhj-pangea6.vercel.app` |
| Locked application baseline | FP4 `f3ab7d017ce92bee34a473fbb22230b26cffdaa4`; deployment checkpoint `5ae54fb…` records the subsequent documentation-only lock. Previous live acceptance is historical evidence, not a fresh two-user test this turn. |
| Backend environment | Canonical Vercel production target still uses Development Clerk / Neon / Ably. Separate Preview/Production databases are not provisioned. No credentials read into the report. |
| Migration verification | Fresh read-only `verify-migration-history.mjs`: all 16 migrations `0000`–`0015` and its catalog/invariant checks PASS: 24 tables, 149 columns, 74 constraints, 9 enums and declared indexes. No migration execution or metadata changes. |

Historical `0006` remains checksum `41d5ed1602ac800592de8b441b54ca6a1708f662ee88e34ebd08a35bed1224af`. Its omitted Hall backfill was NOT rerun. Latest `0015` remains `fcca3e437519e1188a45065d1c43195c6204edc4504e8c27d1a2b67325ab3077`.

This Gate 1 adds this plan and a narrow typography memory section to the existing untracked Design Hub migration document. It does not overwrite the existing handoff or inheritance WIP. `toskerArt/` stays untouched and untracked.

Roadmap drift to resolve in a later authorized documentation alignment: central `docs/ROADMAP.md` still carries the older MS11 desktop / MS13 web ordering. The latest founder direction and existing Design Hub sequencing place MS11 ToskerWeb, MS12 desktop, MS13 native. No later milestone starts here.

## 2. Fresh local inspection versus inherited acceptance

The existing local server at `http://localhost:3000` was inspected with the existing isolated test-A browser profile. No new user, Room, invitation or message was created. No profile, status, nickname, pin, mute or ordering action was saved. Opening conversations may perform their normal read acknowledgement; this is not a claim that browser navigation causes zero database writes.

An initially stale local session displayed “Refresh your workspace”; its normal recovery control restored the authenticated workspace. No bypass, cookie clearing or provider/environment change was used. This recovered local-session symptom alone does not establish a product auth defect.

Freshly observed:

- Own Profile → Edit Profile opens the real Identity/Status editor; current saved name, read-only username/TID and finite manual status are rendered.
- Identity and Status navigation works; Cancel returns keyboard focus to Edit Profile.
- Another person's Namecard renders canonical identity, coarse status, private-nickname entry, Personal Chat Settings and only the current mutual Room shown in the inspected case.
- Personal Chat Settings categories and Room Settings Overview/People/Structure/My preferences open and respond.
- The real Room sidebar overflow shows Pin to top; the owner-only Subroom order menu shows Move earlier / Move later. Neither operation was invoked.
- Screenshots were visually inspected for mobile Profile, Namecard, Personal Chat Settings and Room People, not just checked for HTTP success.

The saved-name mutation/reload/cross-user checks and type/lint/build PASS in `docs/MS7-2-PROFILE-SETTINGS.md` belong to MS7.2.1 on 2026-09-14. They were not repeated as Gate 1 mutations. Failed-save simulation, physical-phone keyboard behavior and screen-reader acceptance remain unverified. The founder's phone findings are not invalidated by viewport emulation.

## 3. Mobile and frame audit

Actual DOM geometry, pixels, at 390×844 and 1440×900:

| Surface | Mobile x / width / height / top | Desktop result | Finding |
| --- | --- | --- | --- |
| Own Profile: Identity | 8 / 374 / 631.05 / 204.95 | Width 840, height 558.86, top 170.56 | Fits horizontally, but height depends on content |
| Own Profile: Status | 8 / 374 / 411.48 / 424.52 | Width 840, height 521.30, top 189.34 | Mobile frame jumps about 219.56 px on section change |
| Personal Settings: Overview | 8 / 374 / 631.55 / 204.45 | Source shares the same shell | Six-category mobile grid consumes three rows |
| Personal Settings: Communication | 8 / 374 / 440.67 / 395.33 | Same shell | About 190.88 px change from Overview |
| Personal Settings: Privacy | 8 / 374 / 462.23 / 373.77 | Same shell | Another different frame height |
| Read-only Namecard | 8 / 374 / 364.09 / 471.91 | Compact-card behavior | Compact read view is reasonable; nested editor needs a deliberate transition |
| Room: Structure | 8 / 374 / 575.48 / 260.52 | Width 840, height 473.48 | Section-dependent frame |
| Room: My preferences | 8 / 374 / 469.23 / 366.77 | Width 840, height 445.30 | Section-dependent frame |

Room loading also changed the frame: a captured loading Overview was only 217.30 px high on mobile, whereas loaded desktop Overview was 501.67 px. People was still loading invitation content during some captures; its measured height is not asserted as a final settled layout. Loading must not collapse the frame. No horizontal document overflow was reported in these measured Room states.

Source causes in `settings-shell.tsx`, `globals.css`, `own-profile-editor.tsx`, `personal-chat-settings.tsx`, `room-details.tsx`, `namecard-dialog.tsx`, and `use-mobile-viewport.ts`:

- The outer Settings panel has max-height and `overflow-y:auto`, not a stable explicit frame height. Its body remains overflow-visible. Desktop minimum content height disappears on mobile.
- Header, category navigation and optional actions scroll with the entire panel; there is no consistent content-only scroll region.
- All category buttons wrap into a two-column mobile grid. Expanding account Settings to eight categories would worsen this.
- The mobile viewport hook exists, but more-specific Settings max-height rules use `dvh`; keyboard-visible VisualViewport constraints are not consistently carried through to the frame.
- Settings actions lack a dedicated safe-area contract. Some other mobile product regions already handle safe areas; reuse the approach rather than create another global viewport system.
- Native dialog focus/Escape/return behavior exists. Dirty edits can currently be discarded by Cancel/close/Escape without a guard. Error preservation exists in code, but was not failure-tested this turn.
- Compact Namecard, nested private-nickname edit, own Profile editor and account/context Settings lack a clearly differentiated presentation contract.

These are structural usability issues, not a request to redesign Chat or introduce new workspace chrome.

## 4. Proposed shared Settings contract

One reusable frame, explicit scope, independently scrolling content. Preserve the current native dialog, visible focus, dark palette, restrained controls and people-circle / Room-rounded-square distinction.

| Viewport | Proposed initial geometry for Gate 2 verification |
| --- | --- |
| Desktop ≥1024 px | Centered width `min(840px, viewport − 48px)`, explicit height `min(720px, available viewport − 48px)`; 174 px category rail; header and action region outside body scroll |
| Tablet 641–1023 px | Width `min(840px, viewport − 32px)`, height `min(800px, available viewport − 32px)`; approximately 160 px category rail where it fits; never force a minimum height beyond available space |
| Phone ≤640 px | 8 px horizontal gutters, near-full available VisualViewport height less 16 px and required safe-area clearance; stable on category changes; fixed header, compact category selector, body scroll, stable action region |
| Short/landscape viewport | Same available-height constraint, no desktop minimum; reduce nonessential header spacing, keep Close and focused control reachable; avoid nested page + dialog scroll |

These are proposed starting dimensions, not claimed tested CSS. Safe-area padding must be applied once, not subtracted and padded twice. Keyboard appearance may resize available height; ordinary category/loading changes must not.

Mobile category selector: current category button opens an internal category list within the same frame, with native buttons, Escape/back recovery and focus return. Avoid horizontal clipped tab strips and eight-category grids. Desktop category navigation remains visible. Do not call these buttons ARIA tabs unless implementing the corresponding tab keyboard contract.

Read-only Namecards remain compact bounded cards. Opening an editor deliberately enters the shared editor frame and returns to the invoking card/control; do not force every read-only Namecard into a full-height Settings sheet. The editing frame, however, must not resize per field group.

Interaction contract:

- Explicit Save for multi-field identity forms; save only changed fields. Retain drafts on server/network failure, expose a concise error and retry, prevent duplicate submits.
- Dirty close, Escape, Back or category navigation offers Keep editing / Discard. After successful save, clear dirty state and announce completion. Do not persist private drafts in localStorage by default.
- Small independent preference toggles may save immediately with pending state, rollback/error recovery and accessible state announcements; do not mix unexplained autosave into an explicit-Save form.
- Stable loading/error frame; body skeleton/status only. Use `min-height:0` on flex/grid scroll children. Body scroll padding keeps focus and validation errors above actions/keyboard.
- 16 px mobile form text; visibly compact but approximately 44 px touch targets; keyboard-visible focus; labels rather than color-only meanings. Close remains reachable even during failure; busy handling must not trap users indefinitely.
- `/profile` remains self presentation. Account Settings categories should have authenticated addressable paths such as `/settings/profile`, with `/settings` resolving to the initial category and browser Back behaving normally. Room/Personal Settings remain contextual overlays; category switches there must not create a browser-history maze.
- Display names and content are direction-isolated, wrap safely and never determine layout width. No automatic text shrink-to-fit as a long-name fix.

Gate 2 must verify 320, 390×844, 430×932, 768, 1440×900, 1728×1117, short landscape, zoom and an actual phone with its software keyboard. Current Gate 1 evidence covers only the stated 390/1440 cases.

## 5. Sidebar audit and object-specific action matrix

`messaging-app.tsx` renders `item.time`; authenticated Room, Subroom and Personal navigation mapping currently supplies literal `"Now"`. This is not a real activity timestamp and is not needed in these navigation rows. Exact “Available now” was not found in current source/inspected DOM; the founder's report is retained without inventing its origin. Remove these redundant row labels rather than replace them with invented presence/time.

Existing `SidebarPinRow` reserves a compact trailing slot and uses an approximately 28×28 px control. Unpinned rows show …; pinned rows use a grip. Personal and top-level Room rows participate; Sandbox and Subrooms do not. `SubroomOrderRow` is a separate owner-only shared-order control. A dormant generic row menu in `ConversationRow` has `hasActions=false`; do not revive it as a universal object menu.

Proposed … controls keep primary row navigation separate from menu activation. Touch hit area grows without increasing visible icon size. Persistent pin/unread/selected states retain a reserved layout slot; long and Unicode names truncate with accessible full names. Keyboard Enter/Space opens the menu, Escape closes and restores focus. Do not accidentally navigate or start dragging while opening a menu.

Legend: WORKING = real current implementation (not necessarily freshly mutated in this audit); NEEDS = bounded MS7.2 entry/composition; DEFERRED = no new active control; N/A = semantically invalid.

| Object | Action and current state | MS7.2 outcome / authority |
| --- | --- | --- |
| Sandbox | Open WORKING; own Profile/Settings reachable elsewhere | NEEDS scoped … entry to own Profile/account Settings if useful; owner-only |
| Sandbox | Leave, invite, remove members, mute incoming activity | N/A; no generic destructive/social menu |
| Sandbox | Pin to top | N/A for this fixed permanent entry; do not duplicate it in private pins |
| Personal Chat | Open / Namecard / Chat Settings / mute / mark unread WORKING in existing surfaces | NEEDS real shortcuts in row menu using the same authorized actions; Namecard respects current relation |
| Personal Chat | Private nickname WORKING for accepted connection; private Pin/Unpin/reorder WORKING | Reuse; nickname entry conditional on eligibility; pin/order only changes the viewer's sidebar |
| Personal Chat | Leave Room, manage members, Room identity | N/A; no generic conversation delete/clear-history shortcut |
| Room | Open, Invite, Room Settings, mute, mark unread WORKING in current header/settings | NEEDS menu composition; preserve existing invitation permissions, membership checks and parent mute inheritance |
| Room | Private Pin/Unpin/reorder WORKING | Reuse; not shared Room order |
| Room | Edit own Room nickname | NEEDS new membership-owned capability, subject to policy below |
| Room | Leave as ordinary member / owner remove-member WORKING in Room Settings | Reuse confirmation and authorization; row Leave only for eligible non-owner |
| Room | Owner leave/transfer, delete/archive Room | DEFERRED unless an existing supported lifecycle explicitly permits it; no new lifecycle system in MS7.2 |
| Subroom | Open / contextual settings / mute / mark unread WORKING across current communication surfaces | NEEDS appropriate menu entry; show inherited mute truthfully, never offer an ineffective Unmute |
| Subroom | Shared reorder WORKING for owner | Reuse separate shared-order authority and boundary-disabled moves; label scope clearly |
| Subroom | Own Room nickname | Inherited from parent; link to parent identity editing, no child override |
| Subroom | Independent Leave, private pin, own member management | N/A or DEFERRED in this slice; membership follows parent, do not imply otherwise |

Do not add an action solely to fill the menu. Existing explicitly deferred FP4 call/media affordances are outside this bounded patch; their presence in a snapshot is not evidence of a newly implemented service.

## 6. Global identity and field contract

Current foundation: user UUID and TID on `users`; profile `displayName`, unique `username`, `avatarUrl`, legacy status text, finite `presenceStatus`, nullable `namecardBio`, timestamps. Existing owner update accepts only displayName/presenceStatus, derives actor server-side and rejects forged fields. No bio, brand, public links or Room nickname editing is currently implemented.

| Field | Proposed MS7.2 treatment |
| --- | --- |
| User UUID | Immutable internal authorship/authorization key, never resolved from display labels |
| TID | Stable read-only support/discovery identifier; never changed by profile edits |
| Username | Keep read-only this milestone. Existing provisioning lowercases/sanitizes to an ASCII identifier with collision handling. No rename/cooldown/alias registry now; if renames are later authorized, reserve uniqueness and recovery atomically rather than treating username like display text. |
| Global display name | Owner-editable, 1–80 after trim; reuse partial updates. Add a consistent normalization/control-character policy without bulk rewriting historical profiles. Preserve legitimate scripts/emoji. |
| Avatar | Preserve existing authorized/provider image and deterministic fallback; no file, base64, remote-URL or object-storage upload editor |
| Bio | Proposed opt-in plain text, max 160, no HTML or automatic link expansion; reuse `namecardBio`; audience-controlled, not silently public because the column exists |
| Manual status | Existing finite Online / Idle / Away / In a meeting; owner-only, coarse self-selected metadata, not a claim of live activity; add audience contract if approved |
| Personal Brand | Proposed one curated accent enum; default neutral; affects own identity presentation only |
| External links | Defer editing/public projection until URL safety, ownership and audience policy are defined; no placeholder editor |
| Private nickname | Existing viewer-owned accepted-connection alias, never a global name or shared Room nickname |
| Room nickname | Proposed current parent-membership property, not a profile field |

Validation should normalize new input to NFC, reject control/bidirectional override abuse while retaining legitimate joiners/scripts, and agree on the same length units in UI/server/database validation. Do not silently change the meaning of an existing 80-character limit. Test combining marks, RTL, emoji, empty/whitespace and long names. Existing validation currently excludes C0/DEL but not all C1/bidi formatting characters; this is a targeted hardening proposal, not a claim that current names are malicious.

Current partial writes protect unrelated fields, but same-field stale saves remain last-writer-wins. Add optimistic revision checking to new multi-field profile/nickname editors; show a recoverable conflict rather than overwriting a newer edit.

## 7. Visibility matrix — proposed policy, not current authorization

Current `readNamecard` permits self, accepted friend, existing Personal conversation or current shared Room. An existing Personal conversation can continue to grant basic Namecard/status access after other relations end. Friends projections also include coarse status for connection rows. New privacy policy must therefore cover every projection, not only hide one Namecard label.

Recommendation: distinguish core identity required for existing authorized discovery/history from optional profile details and status. Use two small audience settings, not a separate checkbox for every field:

- Optional details (bio + accent): `self`, `friends`, `shared_context`; default `self`, with deliberate sharing by the owner.
- Status: same audience vocabulary; recommended default `shared_context` = accepted friends OR current shared Room members, subject to founder approval because it narrows some current Personal/pending access.
- An existing Personal conversation alone does not newly grant optional details/status. It can continue to display necessary canonical identity. Friendship independently grants its approved audience even if a Room membership ends.

| Field | Self | Accepted friend | Current co-member, not friend | Stranger / discovery result | Former member, no remaining friendship/shared Room |
| --- | --- | --- | --- | --- | --- |
| Canonical name / username / TID | Yes | Existing authorized identity | Existing authorized identity | Current minimal authenticated discovery only | Minimal identity only where existing conversation/history authorization allows |
| Avatar | Current authorized image/fallback | Authorized projection | Authorized projection | Deterministic fallback/minimal discovery; no new rich profile disclosure | Existing basic identity projection, no new media permission |
| Bio / accent | Yes | If details audience includes friends | Only if `shared_context` | No | No, unless another qualifying relation remains |
| Manual status | Yes | If status audience includes friends | Only if `shared_context` | No | No, unless another qualifying relation remains |
| External links | Not editable this slice | No new projection | No new projection | No | No |
| Common Rooms | Only own authorized context | Intersection of viewer + target current memberships | Same intersection | Not a public graph | Exclude departed Rooms; remaining mutual current Rooms only |
| Room nickname | Own current membership | Only in an authorized matching Room context | Matching parent Room context | No | No current override after departure; canonical identity fallback |
| Private nickname | Viewer's own alias only | Viewer-resolved, never disclosed to the target as their canonical identity | Not a shared Room label | N/A | Existing private relation rules only |

Common Rooms already filters both memberships before ordering/limiting. Preserve that SQL boundary, bounded result and privacy-safe “more” behavior; do not return private Room counts, hidden Subrooms or graph data and then hide it client-side. No public profile URL, open directory expansion or new unsolicited-DM policy is authorized here. MS7.3 receives these field/audience contracts; discovery/blocking/invitation privacy requires its separate policy review.

## 8. Room identity: minimal, accountable and inherited

Recommend one nullable nickname on `(parent roomId, userId)` membership. Member may edit/reset their own; owner may reset an inappropriate override to global identity, but may not assign a new persona to someone else. Reset copy identifies the scope and affected member; only show controls to eligible actors.

- Owner reset records minimal room/actor/target/action/time information for accountability, not a retained archive of nicknames or a moderation dashboard. No public notification/message/unread event is created.
- Enforce current membership, actor role and target scope inside the mutation transaction using existing access/locking patterns. A removed member or stale owner cannot write through an open editor.
- Leaving removes the active override with membership; rejoining starts with global identity. Subrooms inherit the parent override, including private/owner-only child access checks; no child nickname table.
- Room-rendered identity resolves current parent nickname → canonical global name → safe fallback. Existing message authorship remains UUID-based; no rewriting message bodies or stored authors. Retained history may display today's resolved name, not a fabricated historical snapshot.
- Explicit copied/quoted text remains authored content. For structured author labels in history, replies, search, mentions, Hall notes/comments/pins, member selectors and authorized notification previews, use the same contextual resolver.
- Personal Chat/Friends keep viewer-private alias → global name → safe fallback. A Room-context Namecard can disclose canonical identity as a secondary line and a clearly private “You call them…” line; private aliases must not silently replace shared Room identity.
- Add a narrow metadata invalidation, not a fake message/Hall activity. A rename must not reorder conversations, generate unread or erase current selection.

## 9. Account Settings IA and truthful functionality

| Category | Scope / proposed useful content | Boundary |
| --- | --- | --- |
| Profile | Name, coarse status, optional bio, audience summary, avatar/fallback presentation, read-only username/TID | Explicit Save; no upload or username rename |
| Account | Existing Clerk-owned identity/security management and sign out | Do not build custom password/email/MFA backend. Expose only provider capabilities configured and safe for Tosker. Account deletion must not bypass Tosker retention/ownership cleanup; do not enable an unreviewed destructive provider control. |
| Appearance | Explain current Tosker appearance and retain genuinely implemented device preferences | No fake theme/density selectors or broad theme rewrite; a noninteractive current-state row is honest |
| Notifications | Small real account-level in-app banner preference, with context/mute explanation | No claim of email/push/browser permission delivery without a real path |
| Privacy | The approved details/status audiences and concise scope descriptions | No nonfunctional “block strangers” or invite/privacy wall |
| Language | Current English and distinction between interface language and translation | Read-only until locale/service work exists; no decorative selector |
| Personal Brand | Curated identity accent with preview/reset | One restrained real capability, not arbitrary CSS/font/media or a website builder |
| Support | At least one monitored feedback/report route before beta; existing help content and safe support identifiers | Current `/help` has disabled feedback/problem/feature controls and no verified destination. Founder must supply/confirm a monitored email or external form; no new mail service is necessary for that minimal route. |

Provider Account UI should be integrated within the existing authenticated workspace using the installed Clerk SDK, not experimental APIs or a second identity system. Review which account-management sections are actually enabled before exposing them. Editing Clerk account credentials must not unexpectedly replace Tosker's owner-managed display name, TID, Room memberships or authorship.

Account-level UI must never be confused with Room Settings or private Personal Chat Settings. Show scope briefly at entry; do not repeat long engineering explanations under every field.

## 10. Personal Brand and notification contracts

Personal Brand recommendation: a small approved palette enum (e.g. neutral plus four accessible Tosker accents), preview + explicit Save + Reset. Token mapping is controlled by the application. Accent is decorative identity framing, not body-text color, global app theme, Room wallpaper or presence meaning. The viewer's accessibility/appearance preferences take priority. Contrast, neutral fallback and audience withholding must work without a new asset pipeline. LunaVault's ownership/provenance principle transfers; its entire brand editor does not.

Notification recommendation: initially implement an **in-app banner preference**, not a new definition of durable unread. Options: All eligible updates / Direct conversations and mentions / Quiet. Keep support/security errors outside this setting; a quiet banner preference must not suppress required consent or failure recovery.

Current authoritative behavior, verified in source:

- `/api/workspace` applies own/inherited mute to non-mention message/Hall note/Hall pin activity.
- Direct mentions bypass the existing context mute filter.
- `deriveAttention` excludes muted entries from the bell count but still counts destination-unread activity; manual unread is additive.
- Parent Room mute covers Subrooms; a child cannot unmute its parent. Separately muted children stay muted when the parent is unmuted.

Proposed precedence for banners: current authorized activity → existing context/parent mute policy (including existing mention exception) → global banner choice → current visibility/read state. No context setting can force a banner past global Quiet. Global banner choice does not delete notification rows, acknowledge surfaces, change bell/destination unread, or add transport subscriptions. If the founder intends a global bell-count or durable-notification policy instead, decide that explicitly before schema/UI; do not silently widen this recommendation.

Account preference should persist server-side per actor and synchronize across the user's clients. Existing private context preferences remain on their current model. MS7.3 Friends/Search and future Room notifications must consume this same contract rather than add independent conflicting defaults.

## 11. Research translation: adopt, adapt, reject

The references below were inspected as primary documentation or first-party design material. They inform recommendations, not claims that Tosker already behaves like those products. No competitor assets or UI were copied.

| Reference | Adopt / adapt for Tosker | Reject / limitation |
| --- | --- | --- |
| [Discord identity](https://support.discord.com/hc/en-us/articles/12620128861463-New-Usernames-Display-Names) and [server nicknames](https://support.discord.com/hc/en-us/articles/219070107-Server-Nicknames) | Distinguish account identity, display name and contextual identity; expose canonical identity behind an alias | Do not import Discord's role hierarchy or arbitrary owner assignment of another member's name |
| [Discord profile privacy](https://support.discord.com/hc/en-us/articles/38859942749463-Profile-Privacy-Setting-on-Discord) | Explicit optional-profile audience separate from other activity settings | Do not copy broad public profile/graph assumptions into a shared-Room product |
| [Discord notification settings](https://support.discord.com/hc/en-us/articles/215253258-Notifications-Settings-101) | Explain global versus contextual preferences and exceptions | Preserve Tosker's tested mention/unread semantics, not Discord's exact taxonomy |
| [Telegram FAQ](https://www.telegram.org/faq) | Make username, display identity and privacy understandable | A discoverable username is not permission to expose rich profile fields or expand unsolicited messaging |
| [WhatsApp privacy](https://www.whatsapp.com/privacy) | Human-readable audience choices; separate identity visibility from group-admission concepts | No phone-number identity migration, detailed last-seen surveillance or copied security claim |
| [Clerk UserProfile](https://clerk.com/docs/nextjs/reference/components/user/user-profile) | Provider-owned account security under the existing auth boundary | No new auth system, automatic exposure of account deletion, or speculative tenant reconfiguration |
| [DesignCode view/transition curriculum](https://develop.designcode.io/swiftui2-dynamic-new-view/) | Consistent presentation, purposeful transitions, dismissal and accessible state | Public curriculum inspected, not a paywalled lesson implementation. Native gestures are not automatically suitable web controls. |
| [recent.design](https://recent.design/) | Study type hierarchy, spacing and restrained interface/motion references | Catalog is inspiration, not proof of keyboard/mobile correctness for any chosen pattern |
| Padlet-like spirit, from founder | Welcoming ordinary-language identity, approachable expression and space for personality | No copying Padlet's typography or visual system; no claim of a live Padlet audit here |

TethrLink was read-only inspected for concise avatar/name/bio hierarchy and editing-versus-presentation separation. LunaVault principles were read for ownership, provenance, bounded customization and safe inheritance. Neither source app was launched, modified, imported or certified production-ready. No need for a Lark audit to decide this bounded contract.

## 12. Display-font decision and evidence

Founder preference is clear: DK Longreach first; Super Bouncer in ALL CAPS as temporary fallback. Contacting the creator is not a licence grant. No new permission email, invoice or explicit licence grant was found among the supplied files and bounded adjacent font-file inspection.

| Candidate | Evidence inspected | Gate 1 recommendation |
| --- | --- | --- |
| DK Longreach | Supplied OTF; adjacent two-page Hanoded licence/FAQ; embedded font licence text; [official seller licensing page](https://www.myfonts.com/collections/longreach-font-hanoded?tab=licensing). Local evidence restricts software/web embedding without the appropriate special licence and redistribution. | Founder-preferred candidate, **not cleared for integration**. Await creator permission covering the actual Tosker web/development deployment and delivery model. |
| Super Bouncer | Supplied TTF and archive inventory; no accompanying licence in the archive or embedded licence metadata. [Author's DaFont note](https://www.dafont.com/super-bouncer.font) says personal and commercial use are free. | Preferred temporary candidate, **not yet verified for the intended web embedding/distribution**. Commercial-use permission is positive evidence, but does not clearly settle self-hosted web embedding, repository/CDN delivery or conversion/subsetting rights. Seek explicit terms; do not call it commercially prohibited. |

File identities: Longreach SHA-256 `2b73ddef6b026ecaa75848d099ba29a7fc739a21804ab37ed289fd41a8c062ce`; supplied Super Bouncer SHA-256 `403cef0118a798a041f707be24ebdbf12559bd1c5ce7acc87639f50c658af1a3`. Embedding flags were inspected but are not legal permission. No fonts were copied into the repo, installed, converted, subsetted or rendered into substitute assets.

Ask for written terms covering Tosker self-hosted web use, localhost/preview/Vercel/canonical domain delivery, whether repository inclusion is allowed, and any conversion/subsetting/attribution limits. Future desktop/native rights may require separate permission; do not infer them from a web grant. This is an evidence-based deployment gate, not a legal opinion.

**Gate 2 default: retain the current font stack. Typography does not block functional development.** If adequate rights arrive, use exactly one display face through a semantic display role, never a global `h1`/name selector. Longreach takes precedence; otherwise cleared Super Bouncer uses ALL CAPS. Mermaid/current serif remains secondary expressive type; Montserrat remains functional UI/body/chat. Do not apply display faces to messages, usernames, Room/user-generated names, forms, long descriptions or utility controls.

Design Hub retains the app targets, future website targets and MS8/MS10/MS11 narrative/motion direction in its dedicated typography addendum. No website development is included in Gate 2.

## 13. Engineering impact map — proposed, approval-dependent

| Area | Classification / concrete impact |
| --- | --- |
| Shared Settings | REFACTOR `settings-shell.tsx`, scoped `globals.css`, existing viewport/modal integration; migrate own Profile, Personal Chat and Room Settings to stable frame slots. No workspace-shell rewrite. |
| Profile presentation | REUSE `identity-card.tsx`, `identity-avatar.tsx`, `own-profile-editor.tsx`, `namecard-dialog.tsx` / context; fix status-versus-role labeling consistently. NEW small bio/audience/accent editors only after policy approval. |
| Account routing | REUSE authenticated `(workspace)` layout and current `/settings`, `/profile`; NEW bounded category routes and provider Account entry. Preserve existing links/return context. |
| Identity services | REUSE `profiles/owner-profile.ts`, owner actions and `requireCurrentActor`; REFACTOR consistent validation/partial updates; NEW centralized viewer projection and scoped identity resolver, with explicit output fields. |
| Profile schema | REUSE existing displayName/presenceStatus/namecardBio/avatar fields. NEW constrained details/status audience and accent fields plus revision only if their approved capabilities ship. No arbitrary settings JSON blob. |
| Room nickname | NEW nullable parent-membership nickname and conflict revision; small owner-reset audit record if approved. REUSE membership authorization/locking. No separate Subroom identity or message-author duplication. |
| Account preference | NEW minimal actor-owned persisted banner preference; enum/default constraint. Do not move existing conversation mute/read data into a replacement schema. |
| Sidebar | REFACTOR `messaging-app.tsx` row metadata and bounded menu composition; REUSE `sidebar-pin-row.tsx`, `subroom-order-row.tsx`, mute/unread/leave services. Preserve private versus shared ordering. |
| Projection consumers | REFACTOR Namecard, Personal bootstrap, connections (including pending states), existing discovery, Room member/Chat/search/Hall/mention/notification author labels to use authorized projections. Do not add one network request per avatar. |
| Revalidation | REUSE current transport/access channels. NEW small identity/preferences metadata invalidation after durable commit; content-free IDs, bounded authorized fanout, visible-projection refresh. No `message.changed` impersonation, new unread, duplicated subscriptions or heartbeat service. |
| Tests | Extend existing profile/namecard/membership acceptance and browser harnesses with visibility, aliases, conflict, dirty-form, metadata side-effect and viewport cases. Use isolated fixtures with exact cleanup, not broad production cleanup. |

Forward-only migration numbering starts after current `0015` if Gate 2 approves new fields. Define exact SQL and indexes per coherent slice after checking the current schema again; do not create speculative migration files in Gate 1 or modify historical checksums. Bio already has a column; do not duplicate it. Existing online member/profile lists should batch the extra projection fields, not introduce N+1 membership/profile queries.

On metadata changes, render only newly authorized projections; revocation clears stale open views and cannot leak optional text in event payloads. Disconnected/reconnected clients refetch durable state. Same-user other tabs must reconcile preferences without overwriting a dirty editor. Existing Chat/Hall/notification mechanics remain outside the implementation blast radius except these named identity/metadata consumers.

## 14. Ordered implementation slices and checkpoints

| Slice | Objective / surfaces | Schema and principal risk | Required validation before checkpoint |
| --- | --- | --- | --- |
| MS7.2.1 — PRESERVE | Existing owner name/manual-status foundation at `324e2f4` | No schema; do not repeat or squash completed foundation | Reuse recorded acceptance as baseline, rerun regressions when touched |
| MS7.2.2 — Frame + navigation | Shared mobile/desktop Settings bounds, loading/error slots, category selector, dirty-form/focus recovery; truthful row metadata and scoped … menus | No schema required; highest risk is mobile keyboard/focus or accidentally invoking row navigation | All current Settings callers, narrow/landscape/zoom/keyboard, loading/error, dirty Cancel/Back, pin/mute/unread/leave existing behavior; type/lint/build + diff check |
| MS7.2.3 — Profile and audience | Central projection, bio/status audiences, canonical/private identity clarity, minimal account Profile page | Approved constrained profile fields/revision; privacy leaks through secondary consumers | A/B/friend/co-member/stranger/former matrix; forged actor/fields; pending-friend status; common-Room filtering; stale saves; reload/reconnect; zero message/unread/notification side effects |
| MS7.2.4 — Room identity | Self-edit/reset parent nickname; owner reset only; inherited child labels and canonical disclosure | Membership fields/minimal reset audit; race with leave/remove, impersonation | Owner/member/nonmember requests, leave/rejoin/reset, child/private-child scope, historical UUID preservation, all named label consumers and no shared alias leak |
| MS7.2.5 — Useful Settings + Brand | Provider-safe Account, real banner preference, approved accent, truthful Appearance/Language, monitored Support path | Minimal actor preference/accent fields if not already included; account deletion/attention semantics/support ownership | Account credential flow without identity loss; A/B and same-user tab isolation; parent/child/mention/Quiet matrix; durable unread unchanged; accent contrast/default/audience; real support destination |
| MS7.2.6 — Release gate | Integrated regression, documentation, Design Hub review, founder walkthrough candidate | No speculative new scope; migrations/release environment must be rechecked | Fresh migration/history/catalog invariants, type/lint/build/security scans, two-user acceptance, physical-phone evidence, scoped-control ledger, clean coherent checkpoint and explicit release authorization |

Do not commit an incomplete or unvalidated slice merely to save progress. Gate 2 should keep small coherent checkpoints and preserve existing history. If interrupted, write an honest WIP checkpoint. This Gate 1 does not authorize any commit, push or deployment, including the currently local-only foundation. Later release authorization must distinguish local checkpoint, canonical deploy and live acceptance.

Design Hub review points: (1) first working stable mobile frame/category navigation and account-versus-context IA; (2) Namecard/global/Room identity hierarchy plus one restrained accent; (3) integrated typography only if licensed, otherwise existing-stack consistency before final walkthrough. No need to route every small backend/spacing fix through another design gate.

## 15. Founder decision table

Approval of Gate 2 should explicitly accept these defaults or replace them. Typography may remain unresolved without blocking functional slices.

| Decision | Recommendation / reason | Blocked work if unresolved |
| --- | --- | --- |
| Shared Room nickname authority | Member edits self; owner may reset, not assign; parent inherited; leave clears; minimal reset record | MS7.2.4 schema and UI |
| Optional profile visibility | Bio/accent default self; owner can share with friends or friends + current co-members; no stranger projection | MS7.2.3 optional details |
| Status visibility | Default friends + current co-members; separate audience; existing Personal alone no longer sufficient | MS7.2.3 policy rollout across all current status projections; existing behavior must not silently change before approval |
| Username | Keep read-only; no rename/cooldown machinery this milestone | Nothing if accepted; requested rename requires a separately bounded policy |
| First Personal Brand capability | One curated accent, neutral default, controlled tokens, no media/font/CSS editor | MS7.2.5 brand fields/editor |
| Privacy scope | Details/status only; preserve existing common-Room authorization; broader discovery/blocking/invite privacy handed to MS7.3 | Expanded privacy controls, not frame/foundation work |
| Global notifications | In-app banners only: all eligible / direct + mentions / quiet; existing bell, unread and context mention exception preserved | MS7.2.5 preference semantics/schema |
| Support destination | Founder confirms a monitored email or external report form; use a real route before beta | Support completion/beta readiness, not other Settings work |
| Display face | Longreach preferred if rights verified; otherwise cleared Super Bouncer ALL CAPS; otherwise current stack | Font integration only; no functional blocker |

## 16. Risks, provisioning handoff and acceptance evidence

Release risks and controls:

1. Privacy fanout: do not protect only the card while Friends/bootstrap/events expose fields. Central server projection and revocation tests are required.
2. Identity impersonation: context label never changes UUID, private alias never becomes shared; owner reset does not become owner rename.
3. Mobile loss of work: stable frame and VisualViewport keyboard handling, dirty guards and real-device testing take priority over cosmetic polishing.
4. Preference ambiguity: exact context/parent/mention/banner precedence and same-user synchronization; no acknowledgement side effects.
5. Storage/font licensing: no upload workaround, hotlinked identity media editor, font conversion or outline-image workaround. Retain safe existing assets/stack.
6. Migration integrity: only additive/forward approved changes, verified historical checksums, no old backfill or metadata edits.
7. Scope drift: no Chat rewrite, new realtime provider, AI/translation, calls, attachments, Gizmo runtime, website or Art production; no MS7.3 execution disguised as privacy preparation.

MS7.6 handoff candidates only, not provisioning: private avatar/media storage with authorization/deletion; operational support delivery if a simple monitored external route becomes insufficient; durable account-deletion/ownership-transfer lifecycle; production Clerk/Neon/Ably environment separation; broader notification channels. Reconcile with existing `docs/MS7-6-PROVISIONING-BACKLOG.md` rather than create duplicate provisioned tasks. No service was created or configured.

Gate 2 acceptance checklist:

- Fresh local/remote/deployment state; all historical migrations align; new migration and catalog invariants pass if schema is added.
- TypeScript, ESLint, production build and secret/client-bundle checks after final changes, not inherited PASS labels.
- Real A/B edit/reload/reconnect; same-user two tabs; owner-only forged targets/extra fields; rollback and stale-save conflict; profile edits leave identity keys and communication rows intact.
- Accepted friend, pending connection, co-member, stranger, former member, existing Personal without shared relation, private Subroom and revoked membership cases.
- Common Rooms does not disclose inaccessible names/counts; optional details withheld server-side; status/brand cannot create activity or unread.
- Room override edit/reset/leave/rejoin; current history labels consistent; source message/Hall bodies and UUID authorship unchanged.
- Sidebar long names, selected/pinned/unread combinations, pointer/touch/keyboard menu behavior, private/shared ordering distinction and no invalid object actions.
- Account/Personal/Room/Sandbox editing at 320/390/430/768/1440/1728 widths; short landscape, large text/zoom, safe areas, actual phone keyboard; fixed frame across loading/error and category changes.
- Close/Escape/Back/Save/Cancel/category navigation with dirty drafts, pending requests, failure and focus return; screen-reader names/order/status/error announcements.
- Notifications: global options × Personal/Room/Subroom mute × parent inheritance × mention exception; no loss of durable bell/destination state.
- Account provider actions are safe and real; Support reaches a confirmed monitored destination; no fake active language/theme/upload/privacy controls.
- Final Design Hub checkpoints and founder walkthrough evidence; release only under the subsequent authorized workflow.

Gate 1 evidence captures are temporary at `/tmp/tosker-ms72-gate1.p9SW7e` (PDF page renders and named mobile/desktop screenshots); measured findings are retained above so recovery does not depend on temporary files. This report distinguishes fresh read-only/browser evidence, historical acceptance and proposed future validation.

MS7.2 GATE 1 COMPLETE
NO DEVELOPMENT PERFORMED
AWAITING FOUNDER APPROVAL TO EXECUTE
