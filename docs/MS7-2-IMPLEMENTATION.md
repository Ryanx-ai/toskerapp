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

## MS7.2.3 — global profile and audience enforcement

Implemented locally, not deployed:

- Opt-in160-unit plain-text bio, NFC name/bio normalization, C0/C1/bidi-control rejection while preserving legitimate RTL/joiners/emoji. Native maxlength uses existing UTF-16 units. Empty bio clears to NULL; no HTML, remote URL or upload field.
- Details audience defaults `self`; status defaults `shared_context`. `self / friends / shared_context` are finite DB enums. Identity accent has a finite neutral-plus-four enum foundation; the Brand editor/display treatment follows in the Account slice.
- Central SQL projection in `server/profiles/projection.ts`, before serialization. Self/friends/current co-members are distinguished; Personal alone does not grant optional details/status. Namecard, pending/accepted Friends and Personal navigation/header use it. Connections and Personal navigation are now one query each rather than per-peer fetches. Common Rooms retains intersection-before-limit.
- Multi-field owner saves require the loaded revision at the Server Action boundary. Partial updates never touch user identifiers, provider identity, private aliases or peer profiles. A DB trigger advances revision for every profile update, including the deployed old status writer, so stale forms cannot bypass conflict detection. Draft state is independent of background identity props; explicit conflict recovery discards/reloads only by user action.
- Content-free `profile.changed` on existing authorized user channels; no message/Hall/notification/unread rows. Best-effort post-response work uses installed Next.js `after`, max500 related recipients in ten-wide batches; canonical polling/revalidation remains fallback. No new transport or polling retirement. Open Namecards/Friends refresh via existing invalidation; selected history uses existing canonical refresh.
- Forward migration **0016_ms72_profile_audiences** applied to Development. SHA256 `381021a146c279abf5df4ca04d31e10d6ddea552101718f85d58852b6586c91e`. Four additive profile columns/two enums and `tosker_profile_revision` trigger. No existing content/identifier backfill, historical migration change or omitted Hall backfill. All17 hashes/catalog PASS (24tables,153columns,74constraints,11enums). The custom trigger is explicitly tested in the new service suite, in addition to the snapshot catalog check.

Fresh `verify-ms72-profile-privacy.ts` PASS: self/friend/co-member/pending/Personal-only/stranger; audience transitions; former-member removal; hidden Common Rooms; private alias isolation; Friends/Personal projections; forged fields/finite enums/length/Unicode; stale revision including simulated legacy writer; stable UUID/auth/TID; zero communication/attention writes. All six synthetic actors/contexts rolled back. Existing owner partial-write regression also passes.

Fresh `browser-ms72-profile-privacy.mjs` PASS with real isolated A/B: global rename, private bio withholding, friend sharing, status metadata, revocation without reload, Personal header and reload withholding; two A tabs produce a real stale-save conflict, keep draft and explicitly reload. Original A name/bio/status/audiences restored through UI; no private aliases/other users changed. New full Profile frame/failure suite passes all six widths plus short landscape. Type/lint/build remain part of the slice gate, not a claim of final MS7.2 acceptance.

Harness caveats: local Clerk occasionally settles into the pre-existing Reload workspace state; normal reload used, not provider/auth changes. One failed browser cleanup exposed that the automation tool's empty-string `fill` cleared the DOM without notifying React. Real Backspace clears correctly; the test now uses a real key event and the QA bio was verified cleared in Neon. A subsequent full run passed and restored all original fields. A failed early run lost the Namecard during local recovery; no claim of uninterrupted sessions or zero transient errors. Physical keyboard/device/screen-reader and final integrated production acceptance remain outstanding.

TID read-only inventory: six real users, all legacy format; zero TID foreign keys, other TID columns or stored message references. Current links/authorization use UUIDs; old docs describe TID as stable public identity. Existing canonical bootstrap still generates legacy TIDs. No existing TIDs have been changed; finish safe compatibility/rollout handling before that migration.

## Remaining ordered execution

1. Global profile/audience slice is implemented above; integrate its contracts into remaining identity/Account surfaces and repeat full acceptance after subsequent changes.
2. Parent membership nickname: own edit/reset, owner reset/accountability, inherited child projection, no Personal alias leakage; transactional stale membership/role tests.
3. Account/Settings navigation, safe provider-owned account controls, curated Brand accent, in-app banner preferences and truthful Appearance/Language/Support. No verified monitored support destination has been supplied; report that founder action without blocking independent Development work.
4. TID dependency/rollout audit before any existing-ID change. Current relationships/routes use UUIDs, but old canonical code still generates legacy TIDs against the same Development DB; don't apply a strict format constraint/backfill without accounting for simultaneous old writers and externally shared identifiers. New contract is exactly `[A-Z0-9]{7}`, cryptographic server generation, DB uniqueness/retry, exact normalized lookup, immutable under presentation edits. No TID migration performed yet.
5. Existing font stack remains unless actual deployment permission is verified; contacting a creator is not a grant. DK Longreach preferred; verified Super Bouncer ALL CAPS only as fallback, one display role. Preserve direction for MS8/MS10/MS11; no website/Art implementation.
6. Integrated service/browser/privacy/attention/history/layout/keyboard gate; current schema/checksums/invariants; secret and source scan; exact fixture cleanup; implementation/walkthrough/debt/roadmap memory; normal push, Git-backed canonical deployment, bounded live A/B and fresh deployed-SHA verification. Do not claim release from partial checks.

Desktop web remains primary; mobile/tablet must be genuinely usable without flattening desktop into a touch layout. Future platform memory: MS11 ToskerWeb, MS12 desktop, MS13 native/mobile/foldables research. No future implementation. Preserve all unrelated Design Hub/Web/Art/research/experiments WIP and untouched/untracked `toskerArt/`.
