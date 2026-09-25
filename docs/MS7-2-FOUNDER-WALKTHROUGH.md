# MS7.2 — walkthrough preparation

**FP3 FOUNDER WALK3 — LIVE / VERIFIED / NOT LOCKED.** FP2 signup gate is verified; application `2c205f4` passed canonical two-user smoke. Use the [FP3 release ledger](MS7-2-FP3-FOUNDER-PATCH.md) for exact evidence, cleanup and reliability caveats. Historical pending decisions below are superseded, not new requests. MS7.3 has not started.

## Founder Walk3 opening sequence

1. Open the canonical build; verify `MS7.2 FP3`. Compare floating sidebar, separate top bar and rounded working area. Collapse/restore using pointer and keyboard, then reload.
2. Start Chat: one quiet search/focus treatment, exact TID finds the existing person and reuses the conversation.
3. Create a trip Room: name → optional short label → create. Edit the label in owner Room Settings; confirm the sidebar follows. No Map runtime is implied.
4. Check Profile, Namecard, Settings and Notifications. Change one Personal Brand preset and a separate private appearance preset; save/reload/reset. The other user's app theme must not change.
5. Check Personal/Room/Subroom Chat and a pinned Hall source with another user. Review practical loading and small-screen behavior, not just still screenshots.
6. Signed out: inspect normal Sign in/Create account, alternate sign-in methods, outside click/Escape retaining the form and explicit close. Development identity/provider labels remain truthful.

Founder decides whether MS7.2 can lock after this walkthrough. No automatic MS7.3 start.

## Decisions RESOLVED / remaining release gate (2026-09-16)

1. Full Clerk panel remains gated; no provider setting change. Coordinated account lifecycle revisited MS15.
2. Contact support uses the founder-approved monitored email destination. Opens the email app; nothing silently sent.
3. Six retained Development users transitioned to canonical TIDs without aliases; founder explicitly accepts breaking old test-era references. Non-TID data unchanged; four non-A/B users preserved because they have retained shared/authored history.

Normal fresh-user registration is waiting for human verification in Clerk. No test account created. Finish registration→Profile→Namecard→lookup, safe cleanup and remaining integrated release gate before push/deploy. No need to ask the three resolved decisions again.

## Founder desktop walkthrough after deployment

- Profile/global name and optional bio: edit, save, reload; change status/audience; examine as self/friend/current co-member/Personal-only peer. Confirm privacy withholding and private aliases remain private.
- Room identity: choose nickname, open parent/child history and Namecards, inspect global-name fallback. Owner resets another member; that member chooses again. Old draft must not overwrite a reset; leave/rejoin must not resurrect old nickname. Private Personal name stays independent.
- Settings: nine categories, stable frame, dirty Keep/Discard, category URLs and Back/Forward, readable long names, keyboard focus/Escape/Close, slow/error recovery. Desktop is primary; compare mobile/tablet emulation separately from physical phone/assistive checks.
- Personal Brand: choose a restrained accent, preview/save/reset; verify authorized Namecard framing changes, not anyone else's app theme or status colors. No unlicensed fonts or fake uploads.
- Notifications: Quiet/all/direct+mentions; compare transient banner with persistent bell/Chat/Hall unread and Room/Subroom mute/mention behavior. Refresh/foreground another same-user tab; dirty drafts remain safe.
- Account/Support: only the founder-approved safe provider entry and real monitored help destination; no dead credential, deletion, theme, language or delivery controls.
- TID after approved transition: seven ASCII uppercase alphanumeric characters, exact lowercase-normalized lookup, copy7only, stable after every presentation edit, no authorization from knowledge of an ID.

## Engineering release checklist still required

- Resolved decisions implemented locally; no legacy aliases authorized.
- Existing-ID transition/collision/lookup/copy pass. Finish normal-browser new-user acceptance (human challenge), retaining all current relationships.
- Run integrated current migrations/catalog/invariants, authorization/history/Room/Subroom/Hall/attention regressions, full failure/reconnect and desktop/mobile/keyboard/reduced-motion checks. Existing slice passes are not a substitute for the combined gate.
- Remove only exact disposable MS7.2 fixtures after their last use; leave real users/Sandboxes/Personal/history intact. Recheck counts and orphan/duplicate constraints.
- Review staged source/secrets and document exact Git/deployment SHA. Normal push only after the full local gate; canonical Git-backed deploy; bounded live A/B plus post-cleanup integrity verification.
- Then present the build for founder walkthrough. Founder alone locks MS7.2; do not start MS7.3.
