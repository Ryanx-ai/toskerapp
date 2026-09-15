# MS7.2 — walkthrough preparation

**NOT YET FOUNDER-READY / NOT LIVE / NOT LOCKED.** This checklist is a preparation artifact, not a release certificate. Canonical remains locked MS7.1; [local evidence and gaps](MS7-2-IMPLEMENTATION.md). MS7.3 has not started.

## Decisions before the final release gate

1. Provider Account: Clerk permits self-service account deletion. Keep the full panel gated, or disable that capability deliberately before safe provider-panel integration. No custom credential backend or unreviewed deletion workflow.
2. Support: supply the monitored destination (URL/email) that Help/Support may actually use. Nothing is silently sent today.
3. Existing TIDs: six legacy identifiers have been displayed publicly, but DB relationships/routes/invitations use UUIDs. Confirm whether those strings were shared externally. If shared/uncertain, approve preserving exact old lookups as aliases during a forward transition to seven-character canonical IDs. No existing ID has been regenerated.

## Founder desktop walkthrough after deployment

- Profile/global name and optional bio: edit, save, reload; change status/audience; examine as self/friend/current co-member/Personal-only peer. Confirm privacy withholding and private aliases remain private.
- Room identity: choose nickname, open parent/child history and Namecards, inspect global-name fallback. Owner resets another member; that member chooses again. Old draft must not overwrite a reset; leave/rejoin must not resurrect old nickname. Private Personal name stays independent.
- Settings: nine categories, stable frame, dirty Keep/Discard, category URLs and Back/Forward, readable long names, keyboard focus/Escape/Close, slow/error recovery. Desktop is primary; compare mobile/tablet emulation separately from physical phone/assistive checks.
- Personal Brand: choose a restrained accent, preview/save/reset; verify authorized Namecard framing changes, not anyone else's app theme or status colors. No unlicensed fonts or fake uploads.
- Notifications: Quiet/all/direct+mentions; compare transient banner with persistent bell/Chat/Hall unread and Room/Subroom mute/mention behavior. Refresh/foreground another same-user tab; dirty drafts remain safe.
- Account/Support: only the founder-approved safe provider entry and real monitored help destination; no dead credential, deletion, theme, language or delivery controls.
- TID after approved transition: seven ASCII uppercase alphanumeric characters, exact lowercase-normalized lookup, copy7only, stable after every presentation edit, no authorization from knowledge of an ID.

## Engineering release checklist still required

- Resolve the three decisions above and implement their approved bounded paths.
- Complete existing-ID migration/compatibility and new-user/collision/lookup/copy acceptance; all current user relationships preserved.
- Run integrated current migrations/catalog/invariants, authorization/history/Room/Subroom/Hall/attention regressions, full failure/reconnect and desktop/mobile/keyboard/reduced-motion checks. Existing slice passes are not a substitute for the combined gate.
- Remove only exact disposable MS7.2 fixtures after their last use; leave real users/Sandboxes/Personal/history intact. Recheck counts and orphan/duplicate constraints.
- Review staged source/secrets and document exact Git/deployment SHA. Normal push only after the full local gate; canonical Git-backed deploy; bounded live A/B plus post-cleanup integrity verification.
- Then present the build for founder walkthrough. Founder alone locks MS7.2; do not start MS7.3.
