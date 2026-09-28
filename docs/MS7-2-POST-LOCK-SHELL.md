# MS7.2 post-lock shell amendment — 2026-09-28

## Authority and recovery

Founder brief `TOSKER_MS7_2_LOCK_TOPBAR_MS7_3_MAP_PRIME.pdf`, Phase A only, and supplied geometry reference. This is neither FP6 nor a reopened milestone. MS7.1 and MS7.2 remain LOCKED. Phase B follows canonical acceptance and is Gate 1 research only, never Map implementation.

Recovered `main` / `origin/main` at `14e25cf9e96163adbe0f68955ebf0ab732fa87f4`, divergence0/0. Canonical `dpl_BARcdnfgGfiEpSoqRuwDTsYrTEQz` READY, exact SHA/alias, root307→`/app`200. All20 migration hashes/catalog match;8 users/profiles/Sandboxes,4Rooms,5memberships,5Personal,29messages,9notes,2pins,3capabilities,6connections,32notifications; checked duplicates/orphans0. Unrelated historical handoff/inheritance and untracked Art/Web/Design/research/experiments preserved.

## Design / implementation

Existing Night `#080D10`, raised plane `#10181C`, shelf `#0D1418`, Ivory `#F4EFE6`, Gold `#C89C5D`, viewer-specific accent remain authoritative. Mermaid expressive headings and Montserrat functional text unchanged. No new type, palette, animation or design system. Targeted local reference supported shrinkable long labels with accessible reveal; generic search results about images/breadcrumbs were rejected as unrelated.

```
╭ Identity       Centered context search       Utilities ╮
╰──────────────── floating top plane ────────────────────╯
   Chat    Hall    Map (existing future label)    tab shelf
```

Conversation header wraps one real `.conversation-topbar` above the existing navigation. Top plane uses18px fillets, existing shell color and restrained4px/12px shadow; shelf uses quieter raised-background tone,8px vertical breathing room and44px tab targets. No hard dividing rule or decorative motion. Search is centered by symmetric side columns on wide desktop,120–160px at tablet,44px compact control on phones. Utility workspace headers follow the same centered grid without inventing tabs. Long identities shrink/reveal inside their column and never overlap search or overflow. Existing labels, dialogs, tooltips, privacy, tab URLs and controller state stay unchanged.

Story under test: top-bar search → existing authenticated conversation endpoint → authorized Neon history → plain-text matching results; tab links reuse current Chat/Hall routes. No backend/index/schema/provider/dependency changes. Existing full lock evidence remains inherited, not rerun.

## Verification / release

First production acceptance passed320/390/430/768/1440/1728 across Sandbox, Personal, Room and Subroom: true desktop centering, tablet width120–160px, mobile44px control, balanced identity inset, separated shelf, no collisions/page overflow, correct search scope, keyboard Enter, overflow menus, Chat/Hall navigation, authorized retained search, reduced motion and expanded/collapsed desktop sidebar. Both browser error collections empty. Retained long names exercise truncation/reveal without changing identity records. Mute remained beside identity at all six widths and was restored immediately. No message/Room/Hall fixtures created.

The extra utility-header test exposed a768px search/Create overlap: a text action occupied the44px icon column. Corrected that utility column to `auto`, keeping the conversation utility column44px. Final build/recheck and canonical acceptance follow; do not hide the caught failure as an uninterrupted pass.

TypeScript, ESLint (one pre-existing unused `eq` warning), Drizzle check and recovery DB/hash audit pass. The fresh production server rendered authenticated Sandbox, meaningful controls, the two layers and centered search with no browser errors. Normal retained A/B login passed. Captures: `/Users/ryanc/.codex/artifacts/tosker-topbar-20260928/`. Browser viewport checks are not physical-device/screen-reader certification. No new runtime dependency or service configuration.

Final production rebuild, TypeScript and source/client secret scan PASS. All six widths repeated against the final build across all four contexts; both browser error collections empty. Supplemental mute six-width check restored initial unmuted state. Utility top-bar geometry passes320/768/1440/1728, including the corrected tablet Create slot. Independent snapshots taken during active navigation briefly showed an empty document; the settled route assertions and final captures subsequently passed without a product/authentication change. The transient is not evidence of uninterrupted loading. Final DB verification and diff check PASS. Canonical release pending; preserve MS7.2 LOCKED throughout.

## Canonical acceptance

Phase A LIVE: application **`0e02dfeedf5d7a23215d9cf2d2a7cd1d37143579`**, deployment **`dpl_2p1NKhzJJuX3WMZ3mR1cwo1iAdCR` READY**, exact Git SHA, canonical `toskerapp.vercel.app` alias, root307→`/app`HTTP200. Scoped four-file commit, normal push, origin0/0. Intentional production hosting of existing Development Clerk/Neon/Ably unchanged.

Fresh normal live A/B authentication PASS. Small canonical A1440/B320 smoke covers all four headers, centered/compact search, keyboard, overflow, Chat/Hall navigation, existing authorized history (two retained results), reduced motion and desktop expanded/collapsed sidebar. Both browser error collections empty. Anonymous search401. Runtime error/fatal query found no matching logs. Final retained DB counts/invariants unchanged, no fixtures created or removed. **MS7.1 LOCKED; MS7.2 REMAINS LOCKED.** Phase B may now proceed as MS7.3 Gate 1 product/design/architecture only, no Map code or procurement. A later documentation-only commit may be canonical; application source remains this SHA.

Gate 1 closeout: [canonical Map plan](MS7-3-GATE-1-MAP-PLAN.md) complete; no development or provisioning. Later deployment-scoped5xx query over the preceding hour also found no matching logs (an empty query result is not universal reliability certification). Frontend design guidance kept this patch on existing Tosker tokens/geometry; UX strategy guidance shaped the Map plan's explicit selection, collaboration/conflict and recovery contract rather than introducing speculative features.
