# MS6A validation and release

2026-09-07. MS6A released and live-verified; awaiting founder walkthrough. MS6B requires founder review/lock.

## Scope and recovery

Resumed the existing WIP at `f38808a` on main; preserved every useful implementation file and prior checkpoint. No reset/stash/reconstruction. The migration was already applied to Development Neon, not newly provisioned here. No dependency/provider additions; the existing 12-second polling bridge remains.

Explore is a nested product experience, not a redirect-only removal: `/explore` contains Gizmo discovery and future-community previews; shared navigation opens Create / Studio inside Explore at `/explore/create`. Marketplace/Studio are not primary destinations. Legacy URLs redirect for compatibility. No commerce, contribution backend or SDK was built. Inspection found no need for an IA rewrite. One dead Create banner action now links to discovery.

## Fresh engineering gate

- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run build` — PASS, Next 16.3.3, all routes generated.
- `npm run db:verify-ms6a` — PASS; isolated temporary fixture cleaned by the suite.
- `npm run db:check` — PASS.
- `npm run db:verify` — PASS; 11 migrations, 44 foreign keys, 14 verified indexes.
- `npm run db:audit-ms5` — PASS; zero invalid Sandbox owners, duplicate TIDs/memberships/personal pairs or orphan Hall pins.
- `git diff --check` and final scope review — PASS.

Migration `0010_handy_argent.sql` adds `messages.deleted_at`, `message_reactions`, and `hall_comment_reactions`; composite actor/target/emoji keys and cascading cleanup. No destructive migration. Server actions derive the Clerk actor, enforce target scope and own-only mutation, and validate standard Unicode emoji. Database tests cover duplicate/concurrent retry handling, actor-only removal, forged/cross-scope/outsider denial, owners-only Subroom denial, tombstone body clearing, Hall-author edits, reorder, custom tags and metadata not creating notifications.

React review: client/server boundaries preserved, emoji data loaded lazily in the picker, keyed conversation remounts prevent cross-conversation state reuse, timers/listeners have cleanup, native dialogs provide inert background/focus restoration. No messaging rewrite or new polling loop.

## Browser acceptance

Two isolated Clerk A/B users were used. Previously passed tests were retained, not reimplemented.

- Chat: both users exchange messages; one same-emoji chip counts both actors; A removal leaves B only; both clients reload with correct count/selection. Full Unicode search, skin-tone composer insertion and full-picker reaction work; the new skin-tone reaction survives reload. Own edit propagates through polling; own delete leaves a stable tombstone with no controls; other users lack Edit/Delete.
- Message interactions: physical right-click, Shift+F10 and explicit mobile More work. Found/fixed native auto-popover closing on right-button release; outside press/Escape/focus return retested. Native category type-to-select works without focus being hijacked. Translation truthfully reports unavailable. Copy calls the real clipboard writer with the expected message and resolves successfully; browser clipboard read/paste cannot be verified by this runner.
- Failure/reply: deliberate offline send shows an error and leaves no ghost message. Found/fixed reply target being cleared on failure. Repeated offline test retains both draft and reply; online retry creates one message, quote survives reload, successful send clears draft/reply.
- Hall: B creates/edits its note; A sees the edit but has no Edit action. Comment creation and two-user 🎉 stacking/removal survive reload. Pointer drag uses the entire approximately 307×332 card image, reordered and persisted. Keyboard reorder and narrow-screen Move later persist after reload.
- Dialogs: New Note above all chrome at desktop, 390×844 and 320×640; background cannot take focus, Tab remains inside, Escape restores focus. Backdrop pointer click dismisses without activating the underlying header. Upload affordance explains no upload/save occurred. No media service.
- Structure: child Chat/Hall are empty and independent of parent content; parent return works on desktop/mobile, also after the popover correction. Rail is parent-first, one level. B's direct restricted ONIC Management Chat/Hall URLs return 404 and restricted content is absent from its rail/menu. That seeded fixture uses selected-member access; owners-only denial is separately covered by the server suite. B has no Add Subroom action. +Add contains Gizmos/capabilities only.
- Creation/Explore: accepted Friends preload and Chat opens the canonical existing personal conversation; earlier TID search and two-user create/invite/join evidence retained. Narrow Room name/tag/capability steps and Back/close work, including Just Chilling and custom tags. Explore section navigation and legacy routes work; Create/commerce remain explicitly future previews.
- Responsive: Chat at 320/375/390/430/768/1024/1440/1728 has no horizontal document overflow and keeps the composer visible. Mobile inputs are 16px. Long-name desktop greeting wraps within its container; mobile uses the conversation list instead. Explore checked from 320 to 1728. Equivalent 200% effective layout at 720×450 remains usable. White-on-action-pink contrast is 6.05:1. A clipped narrow placeholder was shortened to `Message…` while retaining its contextual accessible name.

## Known limits, not hidden completions

Physical-device virtual keyboards/long-press and native browser zoom were not tested; viewport/effective-layout checks are not a claim of physical-device acceptance. Clipboard read/paste is an automation restriction despite successful native write. B stayed authenticated through repeated reloads. A's automation browser twice returned to `about:blank`; normal test-email reauthentication recovered it. Earlier local Clerk refresh/HMR issues are not established as an MS6A regression; auth/proxy were not changed. No production-auth or realtime claims.

No realtime, websocket/SSE infrastructure, media storage, AI, native app, Gizmo SDK, developer backend, commerce or ToskerWeb entered the patch. `toskerArt/` remains untouched and untracked.

## Release verification

Built-app smoke (`next start` after the fresh build): authenticated B reload, persisted reactions/reply, message menu, Hall/order, New Note dialog and unavailable drop handling PASS; no page exceptions.

- Product commit: `f6ada068aeadbcc882a7b268b5c5eba6438e5fda` — `feat: complete MS6A foundational interactions`; pushed to origin/main.
- Product deployment: `dpl_B9FBLZhWr4weR3cuYWbJQp9frJrN`, READY, approximately 32-second build. [Immutable deployment](https://tosker-nbhmqo3hv-pangea6.vercel.app/), [canonical app](https://toskerapp.vercel.app/).
- Canonical alias confirmed on this deployment; HTTP 200, visible `Version MS6A - Dev Proto`.
- Authenticated A logged in through normal Clerk Development verification. Its live reaction mutation produced one 👍 chip/count 2 with both actors; isolated B saw the change through existing polling. Live reload retained correct reactions and reply quote. Hall order/content, New Note top-layer modal, Explore discovery/community and legacy Studio → nested Create navigation passed. Browser page exceptions: none.
- Vercel grouped runtime-error scan for the post-release window: clean. No new monitoring/drain infrastructure configured.
- Canonical target is Vercel production **using Development Clerk/Neon**, not newly provisioned production auth/database infrastructure.
- Temporary QA Room `5a7bf857-8364-4756-8b30-98ff7638cbd8` removed after smoke, guarded by exact Room, conversation, message, note, comment and Subroom content/ID assertions. Removed one test Room/Subroom, two conversations, three test messages, two notes, one comment and five notifications, with cascading fixture metadata. Founder data untouched; no UI undo for test cleanup. Suite fixtures already cleaned independently.

This documentation follow-up does not change product code. Later documentation-only Git deployments can have newer IDs/SHAs while retaining the product checkpoint above. `toskerArt/` and unrelated newly appeared `docs/TOSKER-ART-SYSTEM.md` remain untracked and untouched by MS6A.

**STOP for founder walkthrough. MS6A is not founder-locked yet; do not begin MS6B.**
