# MS7.2 FP1 — execution / release ledger

## Recovery, 2026-09-25

Before application mutation: local main `4d39801d36d313d67be3cacde430b50c7c2d36e2`, seven commits ahead/zero behind freshly fetched origin `5ae54fb0ff7d0dc6ab5d026ada8a69f25e34e70a`. Canonical `toskerapp.vercel.app` still READY deployment `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp`, Git SHA `5ae54fb…`. The screenshots therefore show old MS7.1, not deployed MS7.2.

All 19 migration checksums aligned; catalog 25 tables / 161 columns / 78 constraints / 12 enums. Development invariants: six retained users/profiles/Sandboxes, four Rooms, seven memberships, five Personal conversations, 29 messages, nine Hall notes, two Hall pins; no duplicate TID/membership/Personal or orphan pin/bad Sandbox owner. TID transition already applied; never rerun the reset. QA Rooms `ms722-frame-qa` and `ms722-second-qa` remain for scoped acceptance then guarded cleanup. Clerk full-account panel remains gated and founder Support email is approved.

Preexisting unrelated handoff/inheritance hunks and untracked Design Hub/Web/Art/research/experiments remain preserved. `toskerArt/` untouched/untracked. No local dev server or active browser sessions at recovery. Current test server was started by this execution; A/B normal Clerk Development sign-in only, no bypass.

## Research decisions

[Pivot research and inheritance](MS7-2-FP1-PIVOT-RESEARCH.md) separates verified competitors, mock HUDL source and proposed product opportunity.

[Discord profile documentation](https://support.discord.com/hc/en-us/articles/4403147417623-Custom-Profiles) supports separating compact identity viewing from deliberate editing; [server nicknames](https://support.discord.com/hc/en-us/articles/219070107-Server-Nicknames) preserve canonical identity behind context. Adopt that distinction, not Discord visuals, Nitro widgets or permissions hierarchy. Existing Tosker native dialog, Settings shell, Lucide and CSS are adequate; no component library/dependency needed.

Gate 1 username decision remains read-only: Tosker handle is discovery identity, not the independently configured [Clerk sign-in identifier](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options). No username rename/cooldown/alias registry or provider configuration in FP1. New provisioning uses lower-case ASCII letters/digits/internal hyphens, 3–24 characters, reserved-name protection and DB uniqueness with bounded collision retry. Existing handles, UUIDs and seven-character immutable TIDs remain unchanged. Global display name, Room nickname and viewer-private alias stay distinct.

[Next navigation guidance](https://nextjs.org/docs/app/getting-started/linking-and-navigating) and installed Next 16.3.3 docs support native history for local Settings categories. Keep native Back/search-parameter synchronization and draft guards; no full workspace request just to choose a category. Parallelize only independent actor-scoped navigation reads after membership lookup. No public/shared identity cache or fabricated auth state.

## Implementation / control inventory

Implemented and locally tested. **Release blocked on normal fresh-user registration; not founder-ready or locked.**

| Surface/control | Disposition |
|---|---|
| Own Namecard / Edit Profile / Friends / Settings | Real compact identity entry points, owner edit only |
| Other Namecard / Message / Private nickname / Chat Settings | Existing server-authorized actions retained |
| Own Room identity / owner reset | Existing member edit and owner-reset-only services; contextual self entry point added |
| Profile, Status, Privacy, Notifications, Personal Brand | Existing durable revision-checked edits; explicit Save and discard recovery |
| Account | Safe provider/account status and logout; full account management gated |
| Help / Support | Help inside Settings Support; founder mailto from replaceable constant |
| Appearance / Language | Empty categories removed; truthful capability note consolidated in Support |
| Explore | Removed from primary desktop/mobile navigation; routes/data not deleted |
| Friends | Available beside own identity and from own Namecard/Profile; requests retain attention marker |
| Uploads, themes, translation, account deletion | Deferred, no new affordances or provider; MS7.6/MS15 respectively |

Visual scope: compact Profile/Namecard, current warm dark tokens, small functional Montserrat names, restrained Settings tonal elevation. Long names reveal within a fixed line on deliberate hover/focus; full DOM name/title, touch scroll and reduced-motion fallback. No new font/license assumptions, Art or website work. UX Designer/front-end design informed hierarchy; UI UX Pro Max checks are advisory, not a replacement brand system.

## Baseline performance

Local Next dev, 1440×900, real User A, three samples. Wall-clock UI trigger to ready assertion includes CLI/poll overhead; not pure server latency. Cold compilation may affect first sample. `scripts/browser-ms72-fp1-timings.mjs` reproduces the comparison.

| Flow | Before (ms) |
|---|---|
| Authenticated Profile reload | 5461 / 4758 / 4834 |
| Settings open | 895 / 355 / 350 |
| Settings category | 823 / 851 / 803 |
| Namecard open | 1886 / 1874 / 1863 |
| Room Settings open | 3397 / 3527 / 3365 |

Initial normal A sign-in passed; B required waiting for the provider's alternate-method link before selecting email code. This is automation/provider readiness, not evidence of a Tosker credential defect. Fresh-account human-verification gate from the prior checkpoint must be honestly rechecked, not bypassed or called passed.

## Local acceptance, 2026-09-25

- TypeScript, ESLint, production build and diff whitespace check pass. Lint retains one unrelated preexisting unused `eq` warning in `cleanup-fp4-qa.ts`.
- Fresh profile-privacy, Room-identity, Settings/banner policy, TID collision/exhaustion, new username normalization and real bootstrap service suites pass. Synthetic data rolled back/cleaned. No migration/schema/provider changes; all19 hashes and complete catalog match.
- Real isolated A/B normal sign-in passes. Profile save/reload, friend-only sharing and revocation, private alias isolation, manual status, stale two-tab save/recovery pass. Originals restored through UI.
- Room nickname save/reload, contextual Namecard, owner reset, stale member recovery and inherited Subroom mentions pass. Own contextual Namecard → Room identity editor → Escape/focus return also passes. B nickname restored to blank in the exact QA Room.
- Sidebar private pins/order/reload and B isolation; shared Subroom ordering; inherited mute; mark-unread navigation; Settings/Invite/Leave-cancel and explicit sidebar recovery pass. Original pins/order/mutes restored.
- Seven Settings categories, six widths (320/390/430/768/1440/1728), dirty keep/discard, peer accent visibility/revocation, Quiet persistence and B isolation pass. Compact Profile/Namecard/Settings also pass 844×390. Room load failure remains in-frame; Retry recovers. Nested private nickname flow, short viewport and focus return pass.
- Long real global name: deliberate hover and native keyboard focus reveal, fixed geometry, reset on leave, reduced-motion scroll alternative pass. Focus selector corrected to handle deliberate focus independently of browser pointer-modality heuristics; original name restored. Communication-header nested text explicitly inherits functional type, avoiding legacy tiny-span CSS. Two harness errors were corrected: a read-only member was initially used for an owner-form test, and the generic button helper searched an underlying dialog instead of the top Namecard; neither required weakening product permissions.
- Small locked-core smoke: A→B Personal, Room, Subroom message delivery, peer reload, author Nuke and peer removal pass. Room Hall pin and source-Nuke retraction pass. Exact three empty QA send receipts subsequently verified and removed by `ms72-fp1-smoke-cleanup.ts`; no undo, real content untouched. Final DB counts return to six users/profiles/Sandboxes, four Rooms, seven memberships, five Personal conversations, 29 messages, nine notes, two pins, 32 notifications; all invariants pass.
- Final A/B TID copy and exact lowercase/trim discovery, negative partial/legacy discovery, peer Namecard, Support mailto and gated Account checks pass. No server-secret matches across 375 source/owned files and 26 client bundles; local environment ignored, no credential output. Later script-only changes do not alter the built client.

Captures: `/tmp/tosker-fp1-qa.QoDX4M/` (Profile/Namecard/Settings at all widths, Room editor/people, short viewport, registration challenge). Desktop Profile and narrow Namecard visually inspected; no physical-device or screen-reader certification claimed. Browser sessions `fp1-a` and `fp1-b`, normal Development identity. The owned Next dev process remains on localhost:3000 for founder verification.

## Final local timing comparison

| Flow | After (ms), same method |
|---|---|
| Authenticated Profile reload | 6259 / 3469 / 3681 |
| Settings open | 862 / 351 / 353 |
| Settings category | 842 / 848 / 846 |
| Namecard open | 1914 / 1885 / 1884 |
| Room Settings open | 2925 / 2917 / 2903 |

Median reload improves 4834→3681ms; Room Settings 3397→2917ms in this small local sample. First-load variance remains large; this is not a production latency guarantee. Namecard is unchanged. Category wall-clock time is dominated by the CLI helper and does not demonstrate a latency gain; native-history selection removes the unnecessary workspace navigation/request by construction, with Back behavior browser-tested. No fake instant auth or cross-user caching. Repeated fresh-registration/sign-in-to-first-workspace and canonical timings remain part of the release gate.

## Exact release blocker / resume

Normal new registration for `tosker.ms72.fp1.20260925+clerk_test@example.com` reaches a Cloudflare human-verification widget. Do not automate the challenge or change Clerk protections. Read-only Clerk lookup after the attempt confirms **zero** accounts created for that exact address. Screenshot `registration-human-gate.png`. Founder human assistance was requested; no reply received at checkpoint. Normal A/B authentication is a different passing test and does not replace fresh-registration acceptance.

Resume with founder completing normal fresh-user registration in their browser. Verify stable User/Profile/seven-character TID/Sandbox across reload/logout, Profile edit/Namecard/discovery and safe exact cleanup of only the newly created disposable user if appropriate. Recheck saved data and final build/secret gate if code changes. Keep the two empty QA Rooms until final acceptance; `ms722-fixtures.ts inspect` then guarded cleanup, never blind reseed/delete. Do not touch six retained users or real history.

Then normal push of canonical main, Git-backed READY deployment / exact SHA / canonical alias / HTTP verification, live A/B smoke and live timing samples. **No push/deploy occurred in FP1.** Final read-only Vercel check still returns `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp`, READY, Git `5ae54fb…`, canonical alias. Do not claim FP1 live or MS7.2 locked. MS7.1 remains locked; pivot is researched/proposed for founder review; MS7.3 is not started. No new services, media, font, Art, Website or source-project changes.
