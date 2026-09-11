# MS7.1-FP1 — founder walkthrough navigation and UX patch

2026-09-11. Bounded follow-up to `e9ba349` (product baseline `fd76555`). **Not a milestone lock. No MS7.2/MS8 implementation.** This record covers the local commit gate; canonical deployment/live verification must follow it and be reported separately.

## Implemented in FP1

- Friends/Requests attention now requires a canonical incoming pending connection. Historical notifications remain in the bell; they no longer establish pending-request state. Older notifications cannot stand for a later re-request. Requests also intersects its rendered pending list, preserving existing view acknowledgement.
- Evidence before editing: Development contained **two unseen request notifications with no matching pending connection**. A's normal Requests view was already clean; the founder's precise screenshot was not reproduced. All ten supplied screenshot paths were unavailable. Written direction, source, real data and fresh browser captures supplied the evidence instead.
- Selected Room family only in the sidebar, for Chat and Hall. Personal/Sandbox/destinations hide those children; returning restores them. Existing server access filtering, selected-child context and parent aggregate unread calculation are unchanged.
- Separate `Chat / Hall / +` strip below identity and utilities for Room, Subroom, Personal and Sandbox; no surface reordering or default changes. Links retain navigation/`aria-current` semantics, not fake tab widgets.
- `+` opens the existing top-layer popover with genuinely disabled **Gizmos — Planned / Pages — Planned** entries. No new routes, editors, installations or hidden mutations. Empty-action popovers focus their labelled panel; Escape restores the trigger.
- Invite moved from the header identity row to Room options; existing authorized invitation workflow reused.
- Shared first-name Sandbox title with whitespace/empty fallback; descriptor removed; existing Lucide Box in restrained gold rounded-square frame. Personal avatars remain circular; Room identity unchanged. No Tosker Art.
- Sidebar notification/Add/collapsed-search controls share 36px centered hitboxes, 18px strokes, 9px radius and consistent focus/hover treatment. Attention remains attached to the actual control.
- Composer retains its dark rounded surface with a subtle gold container focus border, no inner rectangular outline, and 16px mobile text. Legacy mobile tab `!important` conflict corrected locally to retain 14px labels.

UX Designer informed hierarchy/context/recovery once; frontend-design informed the narrow geometry/focus treatment once. Existing Tosker tokens/identity remain authoritative. React review checked derived state, semantic controls, focus and unchanged data boundaries. UI UX Pro Max and new design-system/Art tooling were unnecessary.

## Targeted validation

- TypeScript, ESLint, production build and `git diff --check` passed on the product patch. `scripts/verify-fp1-navigation.ts` passed pending/unknown/resolved request eligibility, independent bell/Chat attention, safe Sandbox naming and Room-family selection.
- Real authenticated A/B browser sessions retained; no auth or visibility bypass. Incoming QA request lit Friends/Requests, Requests viewing acknowledged it, and accepting **only the QA request** removed it without reload. An unrelated founder pending request remained untouched.
- Re-request/removal fixture verified a genuinely unseen historical notification stays in the response with `requestPending:false`; neither Friends nor Requests lights and opening Requests invents nothing. There is no Decline control in the existing product; FP1 does not invent one. Decline/removal state eligibility is covered through removal, not claimed as a shipped Decline workflow.
- Room/Subroom Chat/Hall, Personal and Sandbox navigation; parent A→child→Hall→Personal/Sandbox→parent B→parent A disclosure; owner-only child absent for B; existing Invite action produced a usable link inside the owned QA Room.
- Browser matrix **320/390/430/768/1440**: long Room/Subroom header, utilities contained, strip below identity, no horizontal overflow, disabled + entries, Space/Escape/focus return, rounded composer focus and mobile16px. Screenshot review found the mobile9px conflict; final label metrics are14px.
- One small real bidirectional send through the existing transport: `FP1 send 1789132428815 A/B`, two unique rendered messages without reload. Neon/message history/retry/dedupe/transport/polling unchanged.
- Browser startup had meaningful authenticated content, no framework error overlay and no sampled browser errors. Viewport emulation/keyboard automation are not physical device, screen-reader, OS-background or WCAG certification.
- Final native keyboard PASS: Tab/Enter Chat→Hall navigation, Tab-reachable + with visible focus, Space/ArrowDown/Escape Room options and trigger restoration. Navigation resets document focus, so the harness traverses normally rather than assuming focus survives a route change. Final tab14px metrics passed at all five widths; collapsed Bell/Add/Search controls measured36×36px, centered18px icons, shared9px radius.

Harness limits/corrections: the first Accept selector was ambiguous and did not act; the exact QA button was then used and verified, with the founder request still pending. A later repeat started from Requests and correctly auto-acknowledged the arrival before the test expected a dot; this is not a failed product state or a full repeat PASS. Fixture initially omitted the owner access row normally created by the real Subroom action; the exact QA access row was completed before the layout pass. No production authorization rewrite resulted.

`scripts/fp1-fixtures.ts` owns only its fixed, guarded FP1 fixture identities: one non-login QA profile/request and one Room with two children. Do not mutate founder rows or rerun old giant fixtures. Retain this tiny Room only through live smoke, then run its guarded `cleanup` once; it removes its own messages/invite/children/request notifications. Browser commands are in `scripts/browser-fp1.mjs` (`AGENT_BROWSER_BIN` required; `FP1_ORIGIN` selects the canonical target). Cleanup is permanent test-data removal, not recoverable UI deletion.

## Deferred follow-up — not implemented

**Next Room-management pass:** invite existing Friends with a picker; add/manage people via Settings; one active share invite per Room; generating a new one supersedes the old, revocation invalidates and removes it from the normal active list. Requires backend/authorization QA. Add Subroom drag ordering in sidebar/management, not this patch.

**Notifications:** aggregate bursts by recipient + sender + destination + bounded time window; distinguish direct mentions. Persisted attention/read semantics must remain correct; this is not merely visual grouping.

**MS7.5 architecture:** configurable Room surfaces, explicit default and order, permissions, Apps/Gizmos and Pages. Consult Design Hub before implementation. Sandbox is future personal staging/experimentation with eventual capability installation/migration into Rooms. Room owner/moderator/member architecture remains future work; no moderator roles added now. Pages are visual-first creation primitives/microsites, not predefined guild/event documents. FEIYUE/LARK are platform inspiration; Shengqu develops the supplied example. No source-project integration is authorized.

**MS7.6 provisioning:** private attachments/object storage remains P-001. No upload facade, storage provisioning, AI, realtime-provider or credential changes.

**MS8 polish:** comprehensive rounded/layered visual-system refinement remains later. No global CSS cleanup, Hall/Settings redesign, shadow system, landing or Art changes in FP1.

## Release boundary

Local validated checkpoint first → push canonical main → verify exact deployed SHA/alias → tiny live A/B smoke → exact owned fixture cleanup → **STOP FOR FOUNDER REVIEW**. The canonical founder-review target still uses Development Clerk/Neon/Ably; this is not a newly provisioned production data stack. All pre-existing Design Hub/Web/Art/research/experiments WIP must remain excluded from this patch.
