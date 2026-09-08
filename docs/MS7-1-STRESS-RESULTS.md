# MS7.1 — shared stress results

Use [the unchanged numbered scenario script](MS7-1-STRESS-SCENARIOS.md) for engineering and founder walkthrough. This ledger is evidence, not a substitute for the script. **Not run ≠ pass.** Partial checks do not certify an entire scenario. Repeat affected scenarios after each internal patch and the complete applicable suite before canonical deployment. Founder approval is required for lock.

## Current run — MS7.1.1 local checkpoint (2026-09-08)

- Commit: local checkpoint based on `c6286b9`; exact new SHA is recorded in the subsequent active-slice entry. No canonical push/deploy.
- Scope: safe plain-text HTTP(S) links; remove unsupported Chat utilities, translation, composer/Hall uploads and Gizmo installation/starter choices; hide fake authenticated conversation lifecycle/reorder actions; two-step Room creation with Just Chilling selected; actor/conversation-scoped tab-local draft/reply/idempotency recovery; distinct Chat loading/fetch-error states.
- Schema changes: none. No migrations applied by this patch.
- Bugs fixed: unsafe schemes stay text; deleted messages no longer open actions through Shift+F10; prototype pin preferences no longer reorder authenticated roots. No transport/authorization policy changed.
- Test fixture: `MS7.1 QA Japan Trip 2027`, slug `ms7-1-qa-japan-trip-2027-6f6ae6`. Created by existing A using normal UI. Retain for subsequent wave scenarios; do not delete founder/demo accounts or existing Rooms. No invite bearer token in this document.
- Static gate: TypeScript, ESLint, production build, diff whitespace and 15 parser cases pass. Parser tests verify exact text preservation, punctuation/brackets, invalid/credential URLs, unsafe schemes and 8,000-character input.
- Browser baseline: normal distinct A/B retained Clerk sessions inspected canonical before edits. Local production build starts and renders. Both initially hit the known Clerk session refresh recovery; one reload reached the workspace. Later B Join clicks were not valid evidence because the target was below the automation viewport; explicitly scroll targets into view. Log out then worked. B completed normal Clerk email-code sign-in and joined successfully after scrolling the control into view. Do not attribute those offscreen clicks to a product Join defect. No auth bypass or credential changes. Development test-code flow follows [Clerk's official test guidance](https://clerk.com/docs/guides/development/testing/test-emails-and-phones).
- Read-only data evidence: `scripts/verify-ms711-fixture.ts ms7-1-qa-japan-trip-2027-6f6ae6` passes for all three tags, no installed capabilities, exactly A/B membership and one canonical link message. Run with the existing react-server / dotenv / tsx development harness.
- Current debt: remaining Room/Hall lifecycle, history/draft/loading/error work and full abuse/responsive gate. Do not claim the hidden Room actions as implemented. Detailed results below are partial until all scenario expectations are exercised.
- Founder review: not requested yet; pending complete engineering wave.

### Continuation evidence

- Reproduced defect: an unsent reply disappeared after Chat → Hall → Chat. Fixed with bounded, validated sessionStorage recovery (24-hour restore expiry), isolated by actor/conversation; blocked storage falls back to memory. This is draft recovery only, never message or authorization authority. Successful acknowledgement clears only its own pending send, preserving newer typing.
- `verify-chat-drafts.ts` PASS: isolation, reload/reply/UUID recovery, delayed acknowledgement, malformed/expired/overlong data, blocked-storage fallback, demo separation.
- `browser-ms711-recovery.mjs` PASS using real A/B UI: navigation and reload retain reply/draft; B offline send removes optimistic ghost and retains text/reply; online retry yields exactly one canonical message on both clients and after both reload. Error clears.
- `browser-ms711-actions.mjs` PASS: A sends, B replies; both add 👍/❤️, A removes 👍, B retains the sole 👍 and selected state; two unique chips and exact actor selections survive both reloads. A edit updates both canonical quotes; A deletion updates both source/quote tombstones. Initial harness attempted Delete before Edit dialog dismissal; corrected the wait and reran with a fresh source successfully. No product Delete failure was established.
- TypeScript/ESLint/production build passed after draft/loading fixes. No server/schema/auth changes. Exact QA Room retains these test messages for the current wave; cleanup is still pending.

| Scenario | Engineering evidence / status | Founder |
|---|---|---|
| 01 Personal Chat | PASS: real A/B typing, bidirectional messages, typing clears and both reload without duplication; B in Hall receives Chat-only attention, opens Chat to clear it and receives exactly one message; A has no self unread | Pending |
| 02 Rapid fire | PASS: simultaneous A 1–5/B A–E followed by 20 rapid A sends; all 30 accepted IDs/body/order/grouping identical on A/B and after both reloads | Pending |
| 03 Failed send/retry | PASS: real offline B reply, retained draft/quote, no optimistic ghost, one retry record on A/B and both reloads; delivery error clears | Pending |
| 04 Edit/reply/delete | PASS: real A source/B reply/A edit/A delete; canonical quote updates and tombstones on A/B; B has no Edit/Delete for A | Pending |
| 05 Reactions | PASS: two users add 👍/❤️; counts 2/2, A removes 👍 leaving B's 1; two chips, actor labels and selected state persist on both reloads | Pending |
| 06 Message actions | PARTIAL: real right-click/release, explicit menu, Enter, Shift+F10, Escape/focus return and 390px explicit action path PASS; B has no Edit/Delete on A; own edit/delete exercised. Clipboard write resolves, but automation read-back is denied, so exact clipboard contents require founder check. Physical touch long-press untested | Pending |
| 07 Links | PASS: A/B safe HTTPS link, new-tab label/noopener/noreferrer, unsafe javascript remains text; B reload preserves message; real click opens separate HTTPS Example Domain tab and original Chat stays. 15 parser cases PASS | Pending |
| 08 Long messages | PASS: 500 chars, 1,500+ readable chars, 1,500 unbroken W characters, multiline and emoji-heavy content delivered to both users; exact trimmed text; 1440/390/320/430 geometry fits composer, messages and actions. 430 screenshot visually inspected. Initial harness incorrectly expected trailing whitespace that sending trims; corrected expectation, verified the same existing records without resending | Pending |
| 09 Long history | Not run | Pending |
| 10 Create Room | Partial: two-step create, Just Chilling default + Travel/Osaka selection, immediate rail/open, no starter Gizmos. Read-only DB verifies name/tags/no capabilities; B reload retains Room/message. Full fresh-room/loading regression pending | Pending |
| 11 Invite/join | Partial: B joins through normal invite UI, Room immediately appears; DB confirms exactly one membership per A/B. Reopen/duplicate race/member display pending | Pending |
| 12 Room Chat | PASS: real bidirectional Room send/reply; while B views Hall A sends, Chat alone indicates activity, opening Chat clears it and shows one message; no self unread | Pending |
| 13 Subrooms | Not run | Pending |
| 14 Restricted Subroom | Not run | Pending |
| 15 Activity while switching | Not run | Pending |
| 16 Leave | Pending lifecycle slice; currently hidden | Pending |
| 17 Remove member | Pending lifecycle slice; currently hidden | Pending |
| 18 Revoke invite | Pending lifecycle slice | Pending |
| 19 Owner edge | Partial: no owner Leave control; server lifecycle acceptance pending | Pending |
| 20 Hall create | Not run | Pending |
| 21 Hall comments/reactions | Not run | Pending |
| 22 Hall reorder | Not run | Pending |
| 23 Hall archive/restore | Pending Hall slice | Pending |
| 24 Hall delete policy | Pending Hall slice | Pending |
| 25 Chat pin reference | Not run | Pending |
| 26 Independent attention | Not run | Pending |
| 27 Background/recovery | Not run | Pending |
| 28 Offline gap | Not run | Pending |
| 29 Long names | Partial: existing long A display name and fixture Room fit sampled Chat; full matrix pending | Pending |
| 30 Empty Room | Partial: quiet fresh Chat, no sample messages; loading/error distinction remains debt | Pending |
| 31 Busy Room | Not run | Pending |
| 32 Responsive | Partial: 1280 screenshot, 390 screenshot/geometry, 320 Chat/composer geometry show no horizontal overflow. Other widths/flows pending | Pending |
| 33 200% | Not run | Pending |
| 34 Keyboard | Partial: message actions keyboard open/Escape/focus return pass; full route/modal traversal pending | Pending |
| 35 Access loss | Pending lifecycle slice | Pending |
| 36 Latency trace | Not run | Pending |
| 37 No dead controls | Partial: changed Chat header/composer/A/B menus and authenticated rows inspected; Hall editor has only working text inputs, no upload placeholder. Remaining Hall/later management sweep pending | Pending |
| 38 Error states | Partial: local Clerk recovery observed; product failure simulations pending | Pending |
| 39 Founder free-play | Founder-only qualitative evidence; cannot be certified by engineering | Pending |
| 40 Would I use this? | Founder-only decision; cannot be certified by engineering | Pending |

## Patch record template

### MS7.1.1 — Chat/action truthfulness checkpoint

Scope and fixes: controls/links plus the reproduced navigation draft-loss fix, reply/idempotency recovery, loading/fetch-error distinction, real date headings and same-author/minute/day grouping. No schema, migration, auth or transport changes. Targeted parser/draft/date suites, fresh TS/lint/build/diff check and MS6A database authorization/reaction/tombstone regression PASS. Temporary DB-suite fixtures cleaned by exact IDs. Browser scenarios 01–05, 07–08 and 12 PASS; 06 is PARTIAL only for clipboard read-back/physical touch limitations, with explicit/right-click/keyboard/mobile menus and mutations exercised. New production build visually checked: historic Personal messages correctly show 3 Sept 2026 separate from Today; both retained sessions reload, connect and report no captured browser errors. Screenshot references are local `/tmp/tosker-ms711-checkpoint.png` and `/tmp/tosker-ms711-long-mobile.png`.

Remaining debt: owner/member Room lifecycle and access withdrawal, Hall moderation/recovery, older history/scroll bounds, measured latency and full responsive/adverse-path suite. No full-wave pass or founder lock claimed. Continue MS7.1.2; no canonical deployment yet.

For each **completed and validated** internal version, append: version / commit / scope / changed behavior / bugs found and fixed / schema and migration state / scenario numbers and exact results / evidence locations / deferred issues / founder-review status. Preserve failures even after fixes, recording the retest. Do not increment a version merely because time passed.

## Founder observations (39–40)

Not yet run. Keep qualitative observations separate from pass/fail automation results; record date, version, actor/device and observations in founder wording.
