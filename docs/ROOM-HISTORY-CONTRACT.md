# Room retained-history contract

Verified 2026-09-13 against FP2 application source, independently after migration-history repair `6da3c75`. **No product-code change was required. MS7.1 remains unlocked; no FP3/MS7.2 work.**

## Product rule

**Current authorization governs retained history access. Membership join time does not define visible history.** History belongs to its Room/Subroom, not an individual membership session. Normal pagination still applies. Historical visibility does not imply historical notification delivery.

| Surface / state | Current behavior | Result |
| --- | --- | --- |
| Parent Room | Later joiner reads retained Chat, replies, reactions, Search and source targets | PASS |
| Parent Hall | Existing notes, comments, note/comment reactions and original Chat pin references remain available | PASS |
| Everyone Subroom | Current member reads older Chat and its own Hall, not another scope's Hall | PASS |
| Selected Subroom | No access before grant; older Chat/Hall available after explicit grant; denied again on loss | PASS |
| Owners Subroom | Non-owner without access receives no history, Search/source or Hall data | PASS |
| Leave / remove / rejoin | Denied while absent; valid rejoin restores parent/everyone retained history, not withdrawn selected access | PASS |

## Boundaries inspected and exercised

`hallScope` requires a conversation participant, current Room membership and current child visibility/access. Chat history/Search, Hall note/comment reads and preferences use that scope. Cursor and reply/source lookups constrain IDs to the same authorized conversation. Room/Subroom page guards independently check current access. None of these history reads filters on membership join or invitation acceptance time.

`grantRoomMembership` grants participants for the parent and currently authorized children. It does not clone messages/notes, change authorship or replay communication notifications. Initial automatic unread is therefore an **empty recipient-event set**, not a timestamp comparison against all stored content. `deriveAttention` consumes recipient notifications plus explicit manual markers; merely revealing history creates neither. Later activity creates recipient events; exact viewed-event acknowledgements clear them. Existing notification history is retained, but `listNotificationsAction` filters conversations by current authorization, including after removal or selected-access loss.

## Regression evidence

Added `scripts/verify-room-history.ts`, using existing isolated Clerk A/B identities and a new, tightly scoped QA Room. Fixture Chat rows deliberately predate membership (54 parent messages across two pages plus two per child). A's Hall notes/comments/reactions/pins use the actual authorization-protected services. B's `joinedAt` is asserted later than fixture content creation. No founder content or identity is edited.

**21 service acceptance groups passed**, covering parent/everyone/selected/owners, later selected grant, full historical paging, reply/reaction/source lookup, Hall isolation, revoked selected access, removed/former members, legitimate rejoin and initial attention. Negatives include pending-only, expired/revoked invite, forged Room/conversation ID, forged cross-scope source/cursor/item, and restricted notification recipient selection. A new post-access Hall note creates one recipient event; old history creates none.

Selected grant/revoke is controlled fixture setup using the existing access/participant tables, not a newly introduced management feature. Withdrawal exercises the real transactional service but stubs only the external Ably revocation dependency to avoid disconnecting B's unrelated conversations; provider revocation is not claimed as a fresh test here (already covered by FP2). The test does not apply migrations or provision anything.

**Canonical browser acceptance passed** with two independently authenticated existing A/B profiles on the unchanged `https://toskerapp.vercel.app` application:

- B renders old parent/everyone Hall notes, pin/source bodies, note reactions and expanded comments/comment reactions.
- Authenticated history, target and Search APIs: parent/everyone 200 with historical source; selected/owners 403 with error-only response and private/no-store headers (no count/latest/title payload).
- Direct selected/owners Chat and Hall pages show 404, without restricted content or composer.
- B loads the older parent page and opens the retained reply source.
- A sends one real new message while B views Hall. Development contains exactly one new parent recipient notification, unread; none of the 54 historical parent messages is replayed. B's Notifications page includes the new message and excludes the withdrawn selected scope.
- Both owned browser error lists empty. Browsers closed after testing. These are bounded desktop functional checks, not a new responsive/realtime/performance audit.

## Cleanup, validation and delivery

The new QA Room `a8ea35b7-59cc-459c-a8ae-3e58186c2a47`, three children and contained Chat/Hall/invites/notifications were removed with exact ID/slug/owner guards and FK cascades. Existing A/B identities and founder Rooms remain. QA Room/children remaining zero; existing Hall invalid/duplicate active positions zero. Temporary test content is intentionally removed, not founder data; fixtures can be recreated by the regression with fresh IDs.

Post-cleanup DB invariants pass with the original counts: 6 users/profiles/Sandboxes, 2 Rooms, 3 memberships, 5 Personal conversations, 28 messages, 8 Hall notes/1 pin, 31 notifications. All 15 migration hashes/timestamps and latest schema catalog still pass. TypeScript, focused test/verifier ESLint and `git diff --check` pass. No application/schema/dependency changes, so no new production build or deployment is required; the browser exercised the existing canonical build. No push/deploy performed by this addendum.

Repeat: `NODE_OPTIONS=--conditions=react-server ./node_modules/.bin/dotenv -e .env.local -- ./node_modules/.bin/tsx scripts/verify-room-history.ts`. Optional `--hold` prints non-secret fixture IDs for browser verification, waits for Enter, then cleans up; do not abandon the held process or rerun its removed URLs. The first harness compile caught a `createdAt` versus `joinedAt` field typo, and a direct CLI invocation needed the explicit local `tsx` path; both were harness-only, fixed before acceptance.

**ROOM HISTORY CONTRACT VERIFIED**
