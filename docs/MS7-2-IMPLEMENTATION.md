# MS7.2 — Gate 2 execution ledger

2026-09-15. **IN PROGRESS — local only, not founder-ready or locked. MS7.3 has not started.**

## Authority and recovered baseline

Founder Gate 2 plus documentation, canonical-font, seven-character TID and desktop-primary platform addenda supersede the Gate 1 waiting instruction. Preserve [the Gate 1 proposal](MS7-2-GATE1-PLAN.md) as historical decision evidence, not current execution status. Baseline `324e2f43b9508309a878c8de8f0bbfdc85140b87` already contains MS7.2.1. Fresh remote main was `5ae54fb0ff7d0dc6ab5d026ada8a69f25e34e70a`; canonical Vercel `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp` READY with that Git SHA, alias `toskerapp.vercel.app`. No MS7.2 push/deploy yet. Canonical review still uses Development Clerk/Neon/Ably, not separately provisioned Production infrastructure.

Fresh read-only migration check at entry passed all16 historical checksums and current catalog/invariants (24 tables,149 columns,74 constraints,9 enums). No migration, schema, provider, credential, font or stored identity change in the frame slice. Historical0006 and its deliberately omitted backfill remain untouched.

## MS7.2.2 — shared frame and sidebar entry points

Implemented:

- Stable centered desktop Settings frame (840×720 maximum), visible category rail; tablet capacity-aware dimensions; phone eight-pixel gutters and in-frame category selector. Header/navigation/actions stay outside the independently scrolling body. Loading/errors/section changes do not shrink the outer frame.
- Settings-scoped VisualViewport handling, short-height spacing, safe-area footer, native dialog/focus, 44px expanded controls. Read-only Namecards remain compact; nested nickname editing deliberately enters the full frame and returns focus to the card.
- Dirty close/Cancel/Escape/category guard: Keep editing preserves mounted drafts; Discard resets before category change. Native page-exit warning while dirty. Failed saves retain input. This does not claim a new application-wide browser-history interception system.
- Owner Profile and Room editing, Personal Settings and private nickname reuse the frame. Profile/Room/nested nickname save actions use the fixed footer. Context-specific management actions remain in their appropriate content section.
- Sidebar no longer renders fake `Now` labels. Personal/Room/Sandbox/Subroom overflow menus compose existing authorized settings, Namecard, mute, unread, invite and membership flows. Sandbox excludes mute/leave/pin; Subroom excludes independent leave/private pin, shows inherited mute, and restricts shared ordering controls to owners.
- Private pin ordering is unchanged. Shared Subroom ordering is unchanged. Selected Mark Chat unread pauses reading before navigating home. No Chat/history/attention persistence rewrite.

Design review used UX Designer, frontend-design and UI/UX Pro Max as advisory checks, preserving Tosker tokens and desktop density; React/Next.js checks preserved existing server authority and native modal architecture. No new design system, provider or package.

### Fresh validation

- `browser-ms722.mjs` PASS at320×740,390×844,430×932,768×1024,1440×900,1728×1117 plus844×390. Profile Identity/Status frame height and top match, no horizontal overflow; Cancel restores Edit Profile focus. Dirty keep/discard/category recovery and intentionally aborted real save request retain draft and frame; reopening confirms no profile mutation.
- `browser-ms722-contexts.mjs` PASS Room Overview/People/Structure/preferences across all six principal widths. Failed Room read stays in frame, Retry recovers. Personal six categories, dirty alias guard and full nested Namecard edit/return-focus pass.390×360 short-viewport input/footer is reachable. This is viewport emulation, **not physical keyboard/device or screen-reader certification**.
- `browser-ms722-sidebar.mjs` PASS authenticated A/B: Sandbox scope; private pin/move/reload with B unchanged; original A pins restored; owner shared child reorder with B seeing new order; non-owner lacks order/leave/pin; original child order restored; inherited mute cannot be overridden by child; B's mute unchanged; original mute restored; selected unread exits; Room Settings/Invite/Leave confirmation-cancel; explicit collapse/expand recovery; no fake Now.
- `verify-ms721-profile.ts` PASS owner-only partial writes, forged/invalid fields denied, peer/identifiers/private alias preserved and metadata-only behavior; synthetic transaction rolled back.
- TypeScript, ESLint (0errors; existing unused `eq` warning in unrelated `cleanup-fp4-qa.ts`), production build and `git diff --check` PASS. Rerun relevant checks after subsequent slices; these are not full MS7.2 release acceptance.
- Screenshots visually inspected for mobile/desktop Room frame and short nickname viewport. Local captures `/tmp/tosker-ms722.GM5Sv1`; not public artifacts. An accessible-label mismatch in the browser test's Open Namecard locator was corrected; no product defect inferred from that harness timeout. Normal B “Reload workspace” recovered its existing local Clerk session; no auth bypass/provider change.

### QA fixture boundary

`scripts/ms722-fixtures.ts` explicitly created only two owner-A Rooms (`ms722-frame-qa`, `ms722-second-qa`), two children and four conversations with current real A/B memberships. IDs use `f7220000-2026-4000-8000-…`; no new users or recreated FP4 fixtures. No messages/Hall notes added. Test pin/mute/order changes restored; Leave was cancelled. Keep these contexts only while MS7.2 acceptance needs them. Guarded exact cleanup must run before final release closeout. Never run old one-shot FP4 seed/cleanup suites or delete real user/Sandbox/Personal history.

## Remaining ordered execution

1. Global profile/audience service and server projections: validated NFC/name/bio, details/status audiences, owner-only partial writes with stale-save conflict, metadata invalidation, identity hierarchy and privacy tests across every consumer.
2. Parent membership nickname: own edit/reset, owner reset/accountability, inherited child projection, no Personal alias leakage; transactional stale membership/role tests.
3. Account/Settings navigation, safe provider-owned account controls, curated Brand accent, in-app banner preferences and truthful Appearance/Language/Support. No verified monitored support destination has been supplied; report that founder action without blocking independent Development work.
4. TID dependency/rollout audit before any existing-ID change. Current relationships/routes use UUIDs, but old canonical code still generates legacy TIDs against the same Development DB; don't apply a strict format constraint/backfill without accounting for simultaneous old writers and externally shared identifiers. New contract is exactly `[A-Z0-9]{7}`, cryptographic server generation, DB uniqueness/retry, exact normalized lookup, immutable under presentation edits. No TID migration performed yet.
5. Existing font stack remains unless actual deployment permission is verified; contacting a creator is not a grant. DK Longreach preferred; verified Super Bouncer ALL CAPS only as fallback, one display role. Preserve direction for MS8/MS10/MS11; no website/Art implementation.
6. Integrated service/browser/privacy/attention/history/layout/keyboard gate; current schema/checksums/invariants; secret and source scan; exact fixture cleanup; implementation/walkthrough/debt/roadmap memory; normal push, Git-backed canonical deployment, bounded live A/B and fresh deployed-SHA verification. Do not claim release from partial checks.

Desktop web remains primary; mobile/tablet must be genuinely usable without flattening desktop into a touch layout. Future platform memory: MS11 ToskerWeb, MS12 desktop, MS13 native/mobile/foldables research. No future implementation. Preserve all unrelated Design Hub/Web/Art/research/experiments WIP and untouched/untracked `toskerArt/`.
