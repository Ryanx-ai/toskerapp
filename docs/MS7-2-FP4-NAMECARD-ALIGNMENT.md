# MS7.2 FP4 — Namecard / trip alignment

2026-09-25. IN PROGRESS — not released or founder-ready. Founder execution PDF (68 sections) read fully. MS7.1 locked; MS7.2 unlocked; MS7.3 not started. No paid provisioning, historical migration edits or Art/Web inheritance writes.

## Recovery

Baseline `3fcf0b4f92584dde400c9d5a790e6616a0003fcb`, main/origin equal after fetch. Canonical READY `dpl_5t3sKkGhWWYQicfuUL9X3gjEPyoa` aliases toskerapp.vercel.app at exact baseline SHA. FP3 app `2c205f4`. Preserve two unrelated tracked documentation edits and pre-existing untracked Design skills/Art/Web/research/experiments/toskerArt. Explicit staging only.

Read-only pre-change database verification: all20 migration hashes/catalog match;25tables/164columns/78constraints/15enums. Invariants8users/8profiles/8Sandboxes/4Rooms/5memberships/5Personal conversations/29messages/9Hallnotes/2pins/6accepted connections/32notifications, all duplicate/orphan checks0. The fourth Room is retained founder data, not an old QA fixture.

## Research / design decisions

Audience: existing groups planning trips together. Core tasks: recognize someone, message/connect, control your identity and privately organize your conversations. Preserve circular person/rounded Room distinction, Montserrat functional text, existing presets, durable authorization and viewer isolation.

| Source | Adopt / adapt | Reject / boundary |
|---|---|---|
| [Discord Custom Profiles](https://support.discord.com/hc/en-us/articles/4403147417623-Custom-Profiles) | Generous banner/avatar/name hierarchy; progressive disclosure | Paid-cosmetic shop, copied chrome and sprawling profile widgets |
| [Discord contextual profiles](https://support.discord.com/hc/en-us/articles/4409388345495-Per-Server-Profiles) | Distinguish global identity from contextual name | No extra per-Room appearance system now |
| [WhatsApp privacy](https://faq.whatsapp.com/3307102709559968/?cms_platform=web) | Explicit audience boundaries, coarse status separate from bio | No last-seen surveillance; no automatic audience widening |
| [Linktree social icons](https://linktr.ee/help/en/articles/5434155-how-to-add-social-icons-to-your-linktree) | Secondary compact links when intentionally supplied | No creator dashboard/link marketplace or arbitrary embedded content |
| TethrLink local README, public template, routes (read-only) | Identity-first card, optional personality, clear primary action | Its public-by-default page/UUID sharing is incompatible with Tosker's current authorized-only namecard |
| Founder Tethr 2024 screenshots | Floating modular shell, native surface selection, future map + side context + Location Cards | Do not port light dashboard, map mock data or route operations |
| Founder portrait-card reference | Deliberate visual zones and confident identity | No borrowed portrait, oversized link list or fake social icons |

Instagram official-help search did not return usable evidence in this pass; do not claim verified current Instagram behavior. Existing reference supports composition only. UI/UX skill lookup yielded heading hierarchy and unrelated breadcrumbs; adopted hierarchy, rejected unnecessary breadcrumbs. Existing Tosker design remains authoritative.

**Naming:** Profile Card replaces Personal Brand in visible Settings; internal fields unchanged. Recommend **Gather** for a future joinable trip voice space (inviting, not a phone call). Alternatives: Live (short but ambiguous with location/status), Link Up (friendly but longer), Comms (functional but technical). No voice tab/service shipped now.

## Implementation and scope decisions

- Namecard rebuilt around banner/avatar, display name, handle, secondary TID, status/bio, primary actions, authorized common Rooms, private controls. Existing owner/private nickname semantics retained. Relationship projection is scoped to viewer-target pair after namecard authorization; request/accept use existing server actions.
- Surface strip keeps Chat/Hall; Room Map is static Coming next, not a button. Generic Add, standalone deferred Call/Video removed. Search/management retained.
- Viewer interface accent controls outgoing bubbles/focus/tab underline/copy actions/create shadow. Card accent controls identity artwork/ring only; semantic gold remains for logo/Sandbox/trip category, not viewer selection.
- Default /app selects the existing authenticated Sandbox; no new Sandbox creation path. Root enters /app. Previous marketing component/assets parked, not deleted; MS11 rewrites trip narrative.
- Form groups/readonly identifiers get deliberate spacing and placeholders. Profile Card previews remain unsaved until explicit Save.
- Pinned top-level chats/Rooms support full-row drag plus existing earlier/later controls; unpinned order remains the current automatic list, Sandbox remains anchored. No new ordering schema.
- Navigation audit found page-level MessagingApp instances and whole-workspace loading fallback. Replace blank fallback with neutral matching frame; prefetch only the hovered/focused conversation route, no history fanout. Must measure; not claiming persistent shell remounts are solved.

## Optional features: decision gates (not fake controls)

- Public sharing deferred: current Namecard is deliberately access-controlled; no public policy, indexing/preview consent or revocation contract. Keep Copy TID and existing exact discovery.
- Social links deferred from this UI slice pending bounded owner/revision/audience data contract and link safety acceptance; no freeform URLs or icons masquerading as working links. Proposed max5 HTTPS links, no credentials/non-HTTPS/local addresses, safe external rel and no server fetching. Requires new forward migration, never bio parsing.
- [Clerk profile image API](https://clerk.com/docs/reference/clerkjs/user#setprofileimage) supports provider-hosted avatar updates, but returns a publicly accessible media URL. Existing avatar sync supports provider images. Do not claim that existing profile-detail privacy protects the image URL. Avatar/banner media policy and safe upload acceptance remain a separate evaluated gate; no fake picker.
- Light/System deferred: current legacy surfaces include fixed dark colors; a partially light shell would violate the all-major-surfaces gate. Dark remains default, existing accents retained.
- Optional Personal Chat tags not implemented in first slice; require private persistent model, stale-write/authorization/zero-activity tests. Do not reuse shared Room tags or localStorage authority.
- Future appearance cascade: global viewer default → explicit future Room override → Subroom inherits Room unless explicit later policy; Personal Chat may have viewer-private override. Only current global viewer + public-audience-controlled identity presets implemented.

## Validation

Completed locally (2026-09-26):

- TypeScript, production build, ESLint (0 errors; one pre-existing unused `eq` warning in unrelated `cleanup-fp4-qa.ts`). All20 hashes,25tables/164columns/78constraints/15enums match; DB verification and invariants pass; source/client secret scan passes without printing credentials.
- Profile authorization: self/friend/co-member/pending/Personal-only/stranger, incoming/outgoing relationship flags, former-member withdrawal, hidden details, private alias isolation, NFC/RTL/long-name/control limits, forged/stale updates including legacy writer, stable IDs and zero communication activity. Transaction rollback leaves retained users untouched.
- Customization services cover all30 identity combinations/3 interface accents, owner/audience/stale/reset isolation; minimum measured contrast4.81:1. Browser A/B preset save/reset/reload, peer appearance isolation, two-tab stale-save recovery, failed-save retry, six-width Settings/Card bounds; exact original presets restored. Room identity, Settings and Trip service suites pass.
- Browser at320×844,390×844,430×932,768×1024,1440×900,1728×1117: own Sandbox, mobile list recovery, Create Chat/single focus, Room preview, Namecard/Escape/focus, Settings/Profile/Notifications, Personal/Room/Hall and collapsed rail geometry. No browser errors in that matrix. Native auth signup form (not submitted) preserves input on outside/Escape, explicit X and reopen work at all six widths.
- Normal new-session Clerk A/B sign-ins pass. A separate sign-in to the exact Subroom Hall path with a query string retained both after an explicit workspace retry. No auth bypass, credential change or new user created.
- Actual browser-created `fp4-review-d88466`: Room creation with JB Supper Run; owner changed label to Malacca Weekend and verified reload/sidebar. Exact A-owned QA Subroom `23b70de2-e152-4504-92c8-8e4c2b42b98c`, B membership only. Full-row pointer drag emits native drag/drop, saves/reloads, B order unchanged; Move earlier alternative; exact original pins restored. Mute icon/peer isolation/unmute and mark-unread/list recovery pass; Sandbox stays anchored.
- Room identity browser: member nickname save/reload/metadata, owner reset/stale draft recovery, long RTL name at six widths, scoped Namecard, Subroom mention inheritance; B's exact original blank Room nickname restored.

Discovered/fixed: legacy nested drag behavior prevented full-row drag; old avatar ring selector missed the new content wrapper; nickname return requires persistent private disclosure and post-mount focus; default Sandbox needed explicit list recovery for mobile Back/mark-unread; composer label needed the real viewer name; mute needed a persistent row icon. Automation fixes: scroll native radio controls inside the modal before check; allow the final Chromium dragover after dragenter; wait for asynchronous unread refresh. Hidden collapsed tooltip pseudo-elements increase scrollWidth intentionally; rendered rail bounds pass and tooltip overflow is not clipped as a workaround.

Performance/reliability evidence: completed cold route observations ~3.3–10.1s including automation/load, not a fast-navigation benchmark. Neutral loading preserves three-plane geometry; only intent-driven route prefetch is enabled. A later Development run reported destination-stream closure / Neon connection termination; normal workspace retry recovered. One fresh local Clerk session later appeared signed out and was not silently treated as authenticated. These interrupted attempts are not passes; current Development reliability remains an MS7.6 issue, not claimed fixed by CSS. No provider or pool rewrite in this patch.

Final-build repeats now pass: all six sizes with message history fully loaded before capture (earlier geometry captures included loading and are superseded); nickname/private disclosure/focus, exact original alias restoration; Chat/Hall/parent/Subroom switching; per-conversation draft isolation; reload/background return; simulated history transport rejection retains shell/draft and Retry recovers; exact QA draft cleared; root opens the viewer's existing Sandbox. One slow reload exceeded45s and settled afterward; the explicit continuation verified its retained draft rather than counting the timeout as a pass. Network-route interception was ineffective in this native session; the deterministic failure test rejects only the browser's history fetch and restores it in `finally`, never modifies React state or durable data. Completed loaded matrix timings ~3.3–12.6s, including tool/navigation overhead.

Local tiny smoke PASS: Personal/Room/Subroom A→B delivery, peer reload, reply composer/cancel, B reaction→A display→reload persistence→toggle off, A Nuke→peer reload. Room pin→Hall reference→source Nuke retracts Hall reference. Receipts: Personal `fa328951-d923-4646-a3f9-f4824ede02cb`, Room `12447996-3fda-472c-90cb-f489e1bcd963`, Subroom `8d985763-b2a7-4000-a80d-6a1c498e019c`; all already nuked in UI, exact cleanup still pending. No retained source used as disposable data. Final React review: hooks unconditional/cleanup, one existing workspace preference projection for mute, no new client credential or dependency, intent-only prefetch, native controls/focus and separate identity/viewer colors. No systemic messaging rewrite.

LOCAL ENGINEERING GATE COMPLETE. Still pending: normal scoped commit/push/exact canonical deployment/live smoke and guarded QA cleanup. Do not represent local acceptance as release completion.
