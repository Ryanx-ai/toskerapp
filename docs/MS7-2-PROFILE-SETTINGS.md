# MS7.2 — Profile + Settings

Status: IN PROGRESS. Starts from locked MS7.1 application `f3ab7d0`, recovery checkpoint `5ae54fb`. Canonical FP4 remains the founder-reviewed Chat/Room baseline. No MS7.3+ work.

## MS7.2.1 — bounded profile foundation

Internal design decision: make the existing own Profile's disabled Edit control real, using the shared scoped Settings shell. Edit only global display name and existing coarse manual status. Username/TID stay read-only; avatar remains the current authorized identity image. No new public bio/link projection, username rename policy, upload, privacy toggle, shared Room nickname or Personal Brand persistence.

Reuse the [FP4 identity contract](IDENTITY-NAMECARD-CONTRACT.md), existing official Chat-app convention research, TethrLink's compact identity/action hierarchy and LunaVault's ownership/scope separation. Design Hub guidance remains canonical; existing Tosker type/palette/shape language stays. No competitor UI, art or font is imported.

Account Settings gets a real Profile entry and truthful noninteractive future-boundary copy in place of its disabled prototype wall. Existing contextual Chat/Room Settings remain separate. Profile edits use an owner-only server boundary; no client-selected target ID. Save only fields actually changed, validate finite status/display-name bounds, show pending/error recovery and keep unsaved input on failure. Do not send chat/notification events for identity edits.

Acceptance: service owner isolation/forged extra-field rejection/invalid input/no identity or communication-row changes; normal owner edit/reload/exact restoration; another viewer's deliberate Namecard read resolves current global name without replacing private alias; mobile/desktop editor bounds and keyboard recovery; fresh type/lint/build. Coherent local checkpoint only; do not deploy a partial MS7.2 wave as if complete.

## MS7.2.1 acceptance — 2026-09-14

- `verify-ms721-profile.ts`: PASS owner-only partial updates; empty/invalid/forged fields rejected; stable identifiers/bio/avatar and peer profile preserved; viewer-private alias retained; no messages/notifications created. All synthetic fixtures rolled back.
- `browser-ms721.mjs`: PASS normal A global-name and manual-status saves, reload persistence and B's deliberate Namecard reads; exact original name/status restored. Cancel restores focus to Edit Profile. Real Settings → Profile navigation; no old disabled Settings-button wall; A/B browser errors empty.
- 390×844 and 1440×900 editor bounds and screenshots PASS. Browser QA found native dialog inherited workspace content gutters and clipped left on mobile; exclude `.modal-layer` from content geometry, preserving existing banner/frame layout. Rechecked both widths. Native input/select focus uses Tosker's visible gold outline.
- Fresh TypeScript, ESLint, production build, `git diff --check` and source/client secret scan PASS after the final CSS change. No schema or migration changed; locked FP4's all16-migration catalog/invariant evidence remains applicable, not claimed as a new MS7.2 migration run. React review: controlled fields, explicit pending/error paths, owner-only server action, partial field writes, stable native modal focus recovery, no per-avatar fetching or new realtime subscription.
- Stale local Clerk QA sessions required normal test-user sign-in; no auth bypass or environment/provider changes. Local simulated network-save failure and physical-device/screen-reader certification were not performed. Error handling preserves drafts by code inspection; no claim of full MS7.2 acceptance.

Checkpoint: `feat: begin MS7.2 owner profile foundation` (resolve exact local SHA in Git). Local only, not pushed/deployed. Canonical remains FP4 lock checkpoint `5ae54fb`, deployment `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp` READY, identical application source to the live-tested FP4 `f3ab7d0`. Next work is the founder-policy review below, not speculative schema or new infrastructure.

## Founder policy gates / next slices

- Room nickname: plan one optional parent-Room name, inherited by Subrooms; never reuse viewer-private Friend aliases. Decide owner/member editing and moderation before schema/UI.
- Public identity: decide bio/link visibility, discoverability, block/restrict rules and status privacy before projecting more fields.
- Username/TID: stable existing identifiers; rename/reservation/recovery rules need explicit policy.
- Personal Brand: separate public expression from the viewer's local appearance; determine governance and asset ownership before persistent controls. DK Longreach remains unlicensed for this use.
- Avatar/media: private storage and authorized delivery remain MS7.6 P-001; no uploads now.
- Further Settings categories/preferences and cross-user identity hardening remain subsequent MS7.2 slices. No transport/history/Room architecture cleanup.
