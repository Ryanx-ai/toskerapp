# MS7.2 FP2 — execution and evidence ledger

## Recovery / authority

2026-09-25: main `47ef294`, ten ahead/zero behind origin `5ae54fb`; canonical READY `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp`, Git-backed MS7.1. No later application work. All19 migration checksums/catalog pass (25tables/161columns/78constraints/12enums); Development invariant audit passes: six users/profiles/Sandboxes, four Rooms, seven memberships,29messages,9Hallnotes,2pins,32notifications. Unrelated handoff/inheritance and Art/Web/research/experiments preserved. No provider/credential change. Human fresh-signup gate remains required BEFORE push/deploy; MS7.2 not locked, MS7.3 unstarted.

## Reference decisions / design check

ADOPT: deliberate profile preview → save ([Discord Custom Profiles](https://support.discord.com/hc/en-us/articles/4403147417623-Custom-Profiles)); viewer-only, cross-device appearance ownership ([Slack themes](https://slack.com/help/articles/205166337-Change-your-Slack-theme)). ADAPT: curated identity presets instead of unrestricted colors; existing Tosker profile audience applies to all shared expression. Existing TethrLink/LunaVault inspection in CROSS-PROJECT-INHERITANCE supplies hierarchy/ownership principles only, not verified reusable infrastructure. REJECT: Nitro monetization, animated profile effects, arbitrary CSS/fonts, per-Room brand variants, uploaded media and theme governance.

For ordinary group members on desktop/responsive Web: make personal identity expressive but names, actions and privacy clear. Retain Night #080D10, Ivory #F4EFE6, Gold #C89C5D and existing pink action fill. Mermaid remains expressive headings; Montserrat remains functional identity/body/control text. Compact, left-aligned identity hierarchy and stable Settings frame; variation confined to card banner/avatar accents and viewer controls. Focus/danger/status colors are protected. No global MS8 redesign.

## Before-code visual sweep

Local authenticated A,390/768/1440. Captures `/tmp/tosker-fp2-qa.k1VdZs/before-*`; audit script `scripts/browser-ms72-fp2-audit.mjs`. Loading captures prompted additional settled-state checks, not false claims of loaded acceptance.

| Finding | Classification / disposition |
|---|---|
| Account sign-out left-aligned, quiet ordinary text | FP2 CLEANUP: center and semantic danger treatment |
| Username and TID share one dense line | FP2 CLEANUP: distinct secondary/tertiary identity hierarchy |
| Own Profile brand controls absent from direct edit; Namecard accent too slight | FP2 CLEANUP + authorized customization: live preview, save/reset, shared banner/frame presets |
| Account appearance has no durable preference | Authorized FUNCTIONAL addition: bounded viewer-only preset using current revision model |
| Notifications says caught up before initial authenticated activity resolves | FUNCTIONAL DEFECT: explicit loading/error state, no false empty success |
| Sidebar currently has no rendered Now/Available now text | Preserve; verify attention/menu/pin/long-name layout |
| Context Settings stable loading frame works | Preserve; check settled content, failure and keyboard states |
| Whole-app depth/type/radii/animations; Hall redesign | MS8 REDESIGN, not this patch |
| Media uploads, custom fonts, calls, translation, location/providers | DEFERRED INFRASTRUCTURE MS7.6 / separate font rights; no fake implementation |

## Implementation / validation

IN PROGRESS. No full FP2 acceptance, push or deployment claimed.

### Slice 1 — durable customization foundation

Forward Development migration `0019_ms72_fp2_customization` APPLIED through normal migrator. SHA256 `852b81c5fc3cfcee069dd108069a9b65fd7fb9c45ba6022262617ed2b9ee4eb0`; three finite enums/columns, no backfill or historical edits. All20 checksums/catalog pass:25tables/164columns/78constraints/15enums. Existing revision trigger covers new fields and old writers; no new concurrency mechanism. Shared banner/frame withheld before serialization under existing details audience; interfaceAccent never included in peer projection. Private preference-only invalidation goes only to owner. No communication mutations.

Fresh service tests PASS:30 identity combinations,3 interface presets, defaults/save/reset, owner-only validation/forgery/invalid values, stale revisions, audience withholding, unchanged peer and activity counts, synthetic fixtures rolled back. Profile/privacy,Room identity and Settings suites PASS. TypeScript/lint/build PASS; preexisting unused `eq` warning in unrelated cleanup script remains. Credential scan PASS (383source/owned files,26client bundles), no values logged. Browser customization is underway, not a completed release gate.

Contrast: primary white/default fill Tosker6.05/Iris6.34/Tide6.10; worst existing1.15brightness hover4.81/5.13/4.90. Selected text≥4.5; protected gold focus≥3; danger text≥4.5. Full rendered preset/keyboard/responsive acceptance still tracked separately.
