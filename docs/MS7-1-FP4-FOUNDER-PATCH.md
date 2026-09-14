# MS7.1 FP4 — execution ledger

Status: IN PROGRESS. Baseline `16c5e4d05ebcd638a6565cec59d99e575a297d74`, equal to origin/main on 2026-09-14. MS7.1 is not locked; MS7.2 has not begun.

## Scope and slices

1. Authorized contextual Namecard and Personal Chat Settings, using existing identity, nickname and mute authority. Deliberate-open bounded projection; Common Rooms means both current members, never historical/pending access or implicit Subroom disclosure.
2. Hall pinned-source presentation and Hall-reference interactions; preserve source navigation, author-only edits and FP3 zero-trace Nuke.
3. Account-private sidebar pins/order: Sandbox fixed, manual pinned order, existing activity order for unpinned items. Shared Subroom order remains separate.
4. Full control, authorization, regression and responsive gate; exact owned-fixture cleanup; focused commits, normal push and canonical deployment/live smoke. Lock only on evidence, then begin a bounded MS7.2 identity/settings slice.

## Baseline / constraints

- Fresh read-only migration verification PASS: all 15 hashes, 23 tables, 146 columns, 71 constraints, 9 enums and declared indexes match Development. Historical 0006 remains unchanged; omitted backfill is NOT rerun.
- Preserve unrelated pre-existing handoff/inheritance/Design Hub/website documentation, experiments and untracked `toskerArt/`. No blanket staging or cleanup.
- Neon remains durable authority; Clerk identity and Ably transport unchanged. Canonical founder review uses Development services, not a newly separated Production stack.
- No media, translation, scheduler, calls, public stranger-profile directory, richer social graph or new brand system.

## Font decision — deferred

Inspected both pages of the supplied Hanoded licence/FAQ and the supplied folder inventory. The document does not establish purchased webfont/app embedding or redistribution rights for Tosker; demo software/webfont use is restricted. No separate purchase grant was supplied. DK Longreach is deferred (licence gate), not a release blocker. Existing typography stays unchanged. No font or licence was copied into the repository, converted, modified or deployed.

## Acceptance

Completed so far (not final release acceptance):

- `verify-fp4-namecard.ts`: nine service groups PASS; synthetic fixtures fully rolled back. Covers unrelated/forged/pending denial, viewer-only nickname projection, exact allowed fields, current overlap, withdrawal, Personal history not granting former Room access, coarse status and bounded overlap.
- `verify-fp4-hall-sidebar.ts`: four-context Hall reference discussion/reactions, source-only author edit, wrong-scope denial, complete Nuke cascades/receipt/reply/Search and note Archive/Restore PASS. Private pins/order/stale conflict/actor isolation/Sandbox+child rejection/revoked target/zero notification writes PASS.
- First service run stalled with no lock-blocked query visible; stopped that process. Guarded cleanup removed only its two Rooms/one child/two messages/two Hall objects/two notifications. Retry with QA-only connection/query timeouts and stage logging passed. No production DB-client/transport change; transient cause not proven.
- Fresh TypeScript, ESLint and production build PASS during implementation; rerun after final edits.
- Fresh normal A/B sign-in; private nickname isolation and exact restoration, all six Personal Settings sections, single-modal round trip and focus return PASS. Legacy identity-frame collision fixed; explicit focus restoration added.
- Hall browser: source-author attribution (not pinner), no redundant title, reference reaction/comment persistence, non-author no edit, author canonical edit and peer Hall refresh PASS. Old-source navigation exposed a React DOM-commit race; target highlighting now waits for the committed message. Rerun PASS: old source loads/highlights/focuses, author Nuke removes peer Hall reference/discussion and survives reload; independent note remains.
- Sidebar browser: pin, Move earlier, native handle-to-handle drag, durable reload, fixed Sandbox, B's private-order isolation and separate normal A sign-in PASS. Native automation drop at a nested row label produced no drop event; explicit handle target produced a real drop and persisted order. No synthetic drag event accepted as browser evidence. Two A pins remain temporarily for QA.
- Responsive320/390 Namecard/Settings bounds and close behavior PASS; 430 screenshots fit but the automated end-of-flow check was interrupted. Further widths pending. Browser session restart/stale Clerk refresh loop recurred; server logs show the known Development token refresh loop, not proof of mismatched keys. Clear only the owned test session's cookies and use normal sign-in; no auth bypass, account mutation or credential change.

Fresh final-candidate results: all six320/390/430/768/1440/1728 Namecard/Settings widths PASS, explicit close controls and desktop Space/Tab/Escape PASS. Room People→one Namecard→Settings return, shared Structure, child switcher, + capability-only disabled boundary and Hall/Sandbox navigation PASS. Personal mute persisted and exact original restored. Real B voluntarily left the owned second QA Room: A's open Namecard removed the overlap without a reload; B had no owner management controls. Nine-group Namecard authorization and21-group retained Room-history suite rerun PASS with exact synthetic cleanup.

Tiny Room/Subroom/Personal A→B browser delivery PASS, requiring actual `tosker:signal` realtime marks (not fallback-only). WHO/context-only workspace activity projection excludes the sent body; peer Nuke invalidation PASS in all three scopes. Exact receipts: Room`8860f2f6-050c-4562-977f-97cf5b6c4cd9`, child`7bd03f25-7ba3-4002-a366-cfec8cb5e777`, Personal`f25ee381-6dd0-4071-b936-436a4f0dde7d`; the latter is explicitly included in cleanup, never its canonical conversation. Both A pins restored to original empty state. TypeScript/lint/build, Drizzle check, all16 migration hashes/current catalog, DB invariants and server-secret/client-bundle scan PASS at final application source; new QA-only tooling gets a further type/lint check.

Final narrow Hall discussion/sidebar menu and collapsed rail bounds/visual inspection PASS; expanded sidebar preference restored. Guarded dry-run then exact local cleanup PASS: two Rooms/one child/65 messages/four Hall objects/two notifications removed. Post-cleanup invariants PASS:6 users/profiles/Sandboxes,2 preserved Rooms/3 memberships,5 Personal conversations,29 messages,9 notes/2 pins,6 accepted connections,32 notifications; duplicate/orphan checks0. Unrelated Hall positions and canonical users/Personal/Sandboxes preserved. Browser-added Personal receipt is explicitly enumerated, not matched by prefix/time. Deleted QA routes must not be rerun. New live fixture utility is separately exact-scoped and dry-run-first.

Still required: canonical deployment/live smoke and conditional lock. Local Clerk stale-session refresh loops required fresh normal profiles; no auth bypass or key changes. This is not a proven product root cause. An inherited browser-harness mode-name collision attempted an old missing FP2 route; renamed the FP4 mode and reran successfully, with no old fixture mutations. Native navigation sometimes exceeded the harness deadline but settled; these interruptions are not counted as passes.

Reduced-motion browser emulation PASS: Namecard transition/animation reduced to0.01ms by the existing contract; native Escape closes. Final owned A/B browser error lists empty. No physical-device, assistive-technology or full production-infrastructure certification is claimed.

## Visible-control matrix

This records implementation status, not a substitute for the acceptance evidence above. Prior FP2/FP3 service/browser evidence is inherited unless a fresh FP4 result is explicitly recorded.

| Control / surface | Status | Authority / behavior |
| --- | --- | --- |
| Personal identity, Friends identity, Room People, message author, Hall attribution | IMPLEMENTED | Shared deliberate-open stable-ID Namecard; absent for unknown/demo identities |
| Namecard Message / Private nickname / Chat Settings / Common Room | IMPLEMENTED | Existing Personal action; viewer-only nickname; scoped Settings; current-overlap Room link |
| Namecard Close / Retry / Back / own Profile | IMPLEMENTED | Native focus/Escape recovery, fresh projection on retry, no duplicate profile editor |
| Personal Settings Overview / Communication | IMPLEMENTED | Real identity/alias, canonical mute; Mark unread stays contextual |
| Personal Settings Media / Files / Links / Privacy | DEFERRED, EXPLICIT | Honest information boundaries; Search works on source text; no fake picker/library/privacy toggle |
| Room Settings Overview / People / Structure / My preferences | IMPLEMENTED | Existing owner/member authority, current people/invites, shared child order, own/inherited mute |
| Room member Leave / owner Remove / invite/share management | IMPLEMENTED | Existing confirmed withdrawal and authorized invitation services; pending never grants access |
| Owner Leave / transfer / Room deletion | INTENTIONALLY ABSENT | No invented ownership or retention policy |
| Personal/Room/Subroom/Sandbox Search / history / source / Latest | IMPLEMENTED | Authorized bounded retrieval; old-source committed highlight fix; drafts and manual unread preserved |
| Mute / Unmute / Mark Chat or Hall unread | IMPLEMENTED | Existing viewer preferences; no notification generated by organization |
| Send / retry / emoji / selected mention / reply / cancel reply | IMPLEMENTED | Existing canonical message, idempotency and member authorization |
| Message React / Copy / Pin to Hall / Edit / Nuke | IMPLEMENTED | Actor-scoped reactions; canonical reference; author-only shared edit/Nuke path |
| Hall New Note / Edit / color / reorder / Archive / Restore / Nuke | IMPLEMENTED | Existing scoped Hall services, confirmation and independent-note lifecycle |
| Hall pinned source / Go to message / author Edit / Unpin | IMPLEMENTED | Source body/author, gold label, no duplicate title; unpin does not remove source |
| Hall-reference reactions / comments / comment reactions | IMPLEMENTED | Existing Hall tables and access checks; distinct from Chat reactions; source Nuke cascade |
| Sidebar Organize / Pin / Unpin / Move / drag handle | IMPLEMENTED | Account-private Neon order; Sandbox fixed; unpinned activity order; shared child order unchanged |
| Room/Subroom switcher / Add Subroom | IMPLEMENTED | Authorized context/owner structural controls; no Subroom under + Add |
| + Add Gizmos / Pages | DEFERRED, EXPLICIT DISABLED | No fake install/runtime action |
| Call / Video / Files & images / Translate / Schedule message | DEFERRED, DEVELOPMENT DISCLOSURE | Existing labelled debt popovers; no permission/device/picker/network-provider side effect; not shipped capabilities |
| Generic Calendar / duplicate pins sidebar / fake file drops | INTENTIONALLY ABSENT | No duplicate capability or false action |
| Account Personal Brand | STATIC PREVIEW | No fake save/apply/theme persistence; MS7.2/MS8 follow-up |

## Debt / identity bridge

[Canonical Namecard contract](IDENTITY-NAMECARD-CONTRACT.md) separates global identity, viewer alias, shared Room identity, contextual presentation and Personal Brand. Richer profile/Room nickname/privacy policy belongs to MS7.2/MS7.3; capability runtime to MS7.5/MS9; private attachments, scheduling and environment/operational hardening remain MS7.6; whole-product visual expression is MS8. Font licence, Common Subrooms and speculative social features are not FP4 blockers. No new provider or secret was provisioned.

## Forward migration

`0015_fp4_sidebar_pins` applied to Development only: three-column account-private table, pair primary key, two cascading FKs and user/order index. SHA256 `fcca3e437519e1188a45065d1c43195c6204edc4504e8c27d1a2b67325ab3077`. All16 hashes and current catalog PASS (24 tables/149 columns/74 constraints/9 enums). Historical0006 and every previous migration untouched.

## Exact retained fixtures / recovery

ID function in `verify-fp4-hall-sidebar.ts`: `f7400000-2026-4000-8000-` + 12-digit hexadecimal integer. Rooms1/5 (`fp4-acceptance`, `fp4-order-check`); child2; conversations3/4/6. Only existing isolated A/B users are participants. Four-context source/reply/note IDs100–133 and bounded Room history600–653 are owned QA records. Canonical A/B Personal `be192eac-38c6-4d46-a6d2-bea19fa324fa` and A Sandbox `7ea32cd4-d805-473a-b4b9-f32d2fb0a35d` must be preserved. `cleanup-fp4-qa.ts` dry-run then `--confirm` has exact target, author/content, external reply and preserved-Hall guards. Do not rerun the setup suite while these fixtures exist. Browser QA must use FP4-prefixed text in owned Rooms so cleanup can distinguish it. Never broaden cleanup by time/name patterns.
