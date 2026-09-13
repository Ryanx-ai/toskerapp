# MS7.1-FP3 — approved Gate 2 implementation

Baseline `15a1dc4` (preserve preceding `6da3c75` migration integrity and Room-history regression). MS7.1 remains **unlocked**, no MS7.2. Unrelated Design Hub/Web/Art WIP is excluded. Fonts and `toskerArt/` are untouched.

## Slice A — Nuke / content and attention retraction

Author-only, currently authorized transaction retains only the existing content-free message receipt (ID, scope, author, original timestamp, removal timestamp); clears body/reply/edit metadata and exact reactions, mentions, notifications and source Hall pins. No migration, recovery payload or message archive. Repeated Nuke is safe. Independent replies/notes/comments and unrelated/manual unread remain. Hall pins now record their source notification message ID.

History returns bounded, authorized removal IDs for the loaded window and draft/source targets. A monotonic content-free client set prunes stale rows/quotes and delayed responses. Draft source previews are gated during initial/foreground reconciliation; independently typed text survives. Stable pending send IDs remain idempotent even after Nuke. Removed source URLs quietly clear their locator. Open Search reconciles on existing refresh/foreground plus a modal-only interval. No transport or global polling replacement.

Notifications no longer project message bodies at the server boundary; single/burst/mention entries and toast use actor and destination context. Source-specific removal preserves unrelated notification events. No private message body in toast.

### Fresh evidence (local Development, 2026-09-13)

- `verify-fp3-nuke.ts`: 11 initial groups, Room/Subroom/Personal/Sandbox, author denial, revoked selected access, exact cleanup, unchanged native Hall positions, standalone replies, removed cursor, receipt retry, edit/reaction/pin races, manual unread and pure stale-client/draft checks. Fixtures deliberately retained for integrated QA; one-shot refuses repeat setup.
- `verify-fp3-nuke.ts --reply-race`: production source-share-lock helper used by send; accepted concurrent reply remains independent or loses safely, later source reply denied.
- `verify-room-history.ts`: 21 fresh retained-history/access/Search/Hall/rejoin groups passed and that suite's exact temporary Room/content cleaned. Current membership, not join time, remains authority.
- Browser normal isolated Clerk A/B: Room send → B Hall pin and sent reply + unsent reply text → A Nuke → B source/pin/quote disappear; unsent text preserved through reload; removed source URL clears quietly. Open Search removes another user's Nuked result.
- Browser fault injection limited to an owned test tab: accepted send with response deliberately dropped and history reads blocked → second authenticated tab Nuke → original stable-ID UI retry returns terminal removal/empty draft → restored fetch/reload no resurrection. No auth/provider bypass.
- TypeScript, ESLint and production build passed again after the final helper/draft refinement. Read-only verification matches all 15 migration hashes and the full current catalog; invariants pass (6 users/profiles/Sandboxes; zero duplicates/orphan pins).
- Legacy read-only audit: zero soft-deleted rows containing body/reply/edit metadata, zero unlinked historical Hall-pin notifications. No data repair was needed or executed.

Harness limitations: two initial assertions targeted the wrong Reply control/duplicate test label; narrowed menu selector and unique reply labels, then reran successfully. Older recorded test passwords were rejected; normal Clerk email-code sign-in was used per [Clerk test-email documentation](https://clerk.com/docs/guides/development/testing/test-emails-and-phones), without account resets. No physical-device or screen-reader claim.

### Owned retained QA fixtures

Room `f7300000-2026-4000-8000-000000000001` / `fp3-founder-review`; child `...0002`; parent/child conversations `...0003` / `...0004` (same full prefix). `verify-fp3-nuke.ts` records exact deterministic message/note/comment IDs, including sparse race IDs. Browser records are confined to this QA Room so far. Existing A/B Personal conversation and A Sandbox are **preserved**; only exact fixture messages/notes there may be cleaned, never whole conversations/users. Final cleanup awaits integrated acceptance.

## Slice B/C — contextual Settings

Room Settings now groups real controls into Overview, People, Structure and My preferences. Owner/member controls retain existing server actions and permissions. Leave remains a distinct, explicit personal withdrawal confirmation. Personal Chat Settings exposes resolved identity, accepted-connection private nickname and own mute. Mark unread stays in contextual overflow. Shared `SettingsShell`/`SettingsSection`/danger/preview and nickname form are UI primitives, not a settings framework. No shared customization/appearance/media state was added.

Fresh local: owner/member information and management visibility; Room mute toggle/restore; Leave/Cancel; private nickname save/restore; Personal mute toggle/restore; deliberately failed Room save retains input and offers successful explicit retry; original Room name restored. Native Escape dismissal passes. All four Room sections fit 320×844, 390×844, 430×932, 768×1024, 1440×900, 1728×1117 without horizontal overflow. Desktop screenshot visually inspected. TypeScript/lint/diff checks pass. The design skills informed scope grouping, visible focus, familiar tokens and compact mobile navigation; no visual redesign or font changes.

Harness: a premature second run navigated the shared test tab during nickname restoration. Tests are now serialized; the QA-only nickname was removed to restore the previously visible canonical name, and the full nickname test passed again with its baseline explicitly retained. Save revalidation can replace transient feedback; assertions verify persisted/current values rather than requiring that short-lived text. All recorded QA mute/name changes are restored.

## Remaining Gate 2

Non-operational Personal Brand preview, Development-only scheduler disclosure, central `MS7.1 · FP3` version. Then remaining Personal/prime width/keyboard regression, integrated validation, exact fixture cleanup, canonical commit/push/deploy/live A/B smoke. No release or founder-ready claim yet.
