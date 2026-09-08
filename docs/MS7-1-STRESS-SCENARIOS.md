TOSKER — MS7.1 STRESS SCENARIO SUITE
SHARED ENGINEERING + FOUNDER WALKTHROUGH SCRIPT

Apply this to MS7.1 after each internal patch.

IMPORTANT:

MS7.1 is expected to be a long-running wave.

Version internal patches explicitly:

MS7.1.1
MS7.1.2
MS7.1.3
etc.

Each patch should record:

- scope
- bugs fixed
- behavior changed
- schema changes
- stress tests run
- known debt
- founder-review status

Do not jump to MS7.2.

Use the SAME scenario suite for:
1. Codastra browser/automated acceptance
2. Founder manual walkthrough

The founder should be able to follow the same numbered scenarios later.

==================================================
SCENARIO 01 — SIMPLE PERSONAL CHAT
==================================================

Actors:
User A
User B

Goal:
Basic realtime conversation should feel completely ordinary.

Steps:

1. A opens B’s Personal Chat.
2. B opens A’s Personal Chat.
3. A types.
4. B sees typing.
5. A sends:
   “hey, testing Tosker”
6. B receives immediately.
7. B replies.
8. A receives immediately.
9. Both reload.

Expected:

- no duplicate messages
- order identical
- typing clears
- unread behaves correctly
- active Chat does not retain stale unread
- inactive user gets appropriate attention
- grouping/timestamps remain coherent

==================================================
SCENARIO 02 — RAPID-FIRE CHAT
==================================================

Goal:
Stress ordering and grouping.

Steps:

A rapidly sends:
1
2
3
4
5

B simultaneously sends:
A
B
C
D
E

Expected:

- both users converge to same order
- no duplicates
- no dropped accepted messages
- grouping looks sensible
- sender identity does not repeat unnecessarily
- scrolling remains stable

Repeat with:
20 rapid messages.

==================================================
SCENARIO 03 — FAILED SEND + RETRY
==================================================

Goal:
Failure must not corrupt state.

Steps:

1. B begins replying to A.
2. Temporarily disconnect B.
3. B writes:
   “this should survive”
4. Attempt send.
5. Restore network.
6. Retry.

Expected:

- draft survives
- reply target survives
- no ghost message
- retry creates one canonical message
- quoted source remains correct
- error clears after success

==================================================
SCENARIO 04 — EDIT / REPLY / DELETE INTERACTION
==================================================

Steps:

1. A sends message X.
2. B replies to X.
3. A edits X.
4. Both inspect B’s reply.
5. A deletes X.

Expected:

- edit propagates
- edited state visible
- reply remains associated with canonical message
- deletion becomes correct tombstone
- no broken UI/reference
- B cannot edit/delete A’s message

==================================================
SCENARIO 05 — REACTION PILE-ON
==================================================

Steps:

A sends:
“react to this”

Both users add:
👍

Then:
A adds ❤️
B adds ❤️

A removes 👍.

Expected:

- 👍 2 initially
- ❤️ 2
- after A removes 👍 → 👍 1 belonging to B
- same emoji never renders as duplicate chips
- reload preserves state
- actor list accurate
- current-user selected state accurate

==================================================
SCENARIO 06 — MESSAGE ACTIONS
==================================================

Test:

- right-click
- explicit …
- keyboard
- touch-compatible path where possible

Actions:

- Reply
- Copy
- Edit own
- Delete own

Expected:

- other user does not see edit/delete
- Copy copies actual message text
- menu stays open correctly
- Escape closes
- focus returns
- no dead controls

If Translate/Attachment/etc are not functional:
they should not appear as active beta actions.

==================================================
SCENARIO 07 — LINKS
==================================================

A sends:

https://example.com

Then send:

javascript:alert(1)

Expected:

- valid http/https is safely navigable if linkification ships
- unsafe scheme never becomes executable
- external link treatment clear
- raw text remains correct

==================================================
SCENARIO 08 — LONG MESSAGE
==================================================

Send:
- 500 chars
- 1,500 chars
- very long unbroken string
- multiline text
- emoji-heavy text

Expected:

- no horizontal overflow
- composer remains usable
- message remains readable
- actions still accessible
- mobile survives

==================================================
SCENARIO 09 — LONG HISTORY
==================================================

Seed/test:

100+ messages
then 500+ if practical.

Test:

- initial load
- scroll
- load older
- new message while reading older history
- return to bottom
- reply to old message

Expected:

- no huge jump
- no unbounded rendering degradation
- active new message behavior sensible
- memory/performance acceptable

==================================================
SCENARIO 10 — CREATE ROOM
==================================================

A creates:

“Japan Trip 2027”

Tags:
Just Chilling
Travel
Custom: Osaka

Expected:

- Room persists
- tags persist
- no fake starter Gizmos
- navigation updates immediately
- Room opens cleanly
- no sample content flash

==================================================
SCENARIO 11 — INVITE + JOIN
==================================================

A invites B.

B opens invite.

Expected:

- Room identity correct
- owner context correct
- B joins once
- duplicate join prevented
- membership appears without refresh
- both see each other as members where appropriate

Reopen invite.

Expected:
Open Room / Already joined.

==================================================
SCENARIO 12 — ROOM CHAT
==================================================

A/B enter same Room.

A sends message.
B replies.

Then:

B leaves Chat and goes Hall.
A sends again.

Expected:

- realtime delivery
- B gets Chat attention while in Hall
- Hall itself remains unaffected
- opening Chat clears Chat unread only

==================================================
SCENARIO 13 — CREATE SUBROOM
==================================================

A creates:

Gaming

Then:
Trip Planning

Expected sidebar:

Japan Trip 2027
|_ Gaming
|_ Trip Planning

Expected:

- one child level only
- parent remains primary
- switcher works
- no Discord-like category explosion

==================================================
SCENARIO 14 — RESTRICTED SUBROOM
==================================================

A creates owner-only:

“Budget Secret”

B should:

- not see it in rail
- not see it in switcher
- receive 404/intentional denial on exact guessed URL
- not receive its realtime events
- not see unread counts leaking its existence

==================================================
SCENARIO 15 — SWITCH DURING ACTIVITY
==================================================

A sends Room message while B rapidly switches:

Room
→ Subroom
→ Hall
→ parent Room

Expected:

- no message leakage
- no stale content flash
- attention indicators remain scoped
- current destination resolves correctly

==================================================
SCENARIO 16 — LEAVE ROOM
==================================================

Only if Leave ships.

B leaves Room.

Expected:

- Room disappears from B rail
- access revoked immediately
- Subrooms disappear
- Ably access revoked
- guessed URL denied
- historical B messages remain attributed
- A’s Room/content remains intact

Test rejoin only through valid invite/access.

==================================================
SCENARIO 17 — REMOVE MEMBER
==================================================

Only if member removal ships.

A removes B.

Expected:

- B loses access immediately
- navigation updates
- realtime subscription access revoked
- exact Room/Subroom links fail
- historical content stays
- A retains Room
- no stale membership after reload

==================================================
SCENARIO 18 — INVITE REVOCATION
==================================================

Only if revoke ships.

A creates invite.
A revokes invite.
B attempts join.

Expected:
intentional unavailable/revoked state.

No membership created.

==================================================
SCENARIO 19 — ROOM OWNER EDGE CASE
==================================================

Test owner attempting:

Leave Room

Expected:

Do NOT allow accidental orphaning.

Behavior must match approved contract.

If no contract exists:
owner Leave control should not appear.

==================================================
SCENARIO 20 — HALL CREATE
==================================================

A creates:

Title:
Flight Details

Body:
SIN → NRT

Expected:

- B sees Hall attention
- notification arrives
- note appears realtime
- opening Notifications does NOT clear Hall unread
- opening Hall clears Hall unread

==================================================
SCENARIO 21 — HALL COMMENTS + REACTIONS
==================================================

A creates note.

B comments:
“got it”

Both react 🎉 to comment.

Expected:

- comment realtime
- 🎉 2
- removing one leaves other
- reload persists

==================================================
SCENARIO 22 — HALL DRAG / REORDER
==================================================

Create 5 notes.

Move:
5 → 1
3 → 4

Test desktop handle drag.

Test mobile Move earlier/later.

Expected:

- order deterministic
- reload persists
- full-card drag affordance
- text selection does not accidentally reorder
- mobile has non-drag fallback

==================================================
SCENARIO 23 — HALL ARCHIVE / RESTORE
==================================================

Only if Archive ships.

A archives own note.

Expected:

- disappears from active Hall
- appears in archive/recovery surface
- restore works
- realtime sync
- authorization correct

==================================================
SCENARIO 24 — HALL DELETE POLICY
==================================================

Test:

A owns note.
B is ordinary member.

Expected founder default:

B:
- can comment
- can react
- may reorder shared board
- cannot permanently delete A’s note

A:
- can delete own

Room owner:
- can moderate/remove according to approved contract

Test confirmation and reload.

==================================================
SCENARIO 25 — PIN CHAT TO HALL
==================================================

A sends Chat message.

Pin to Hall.

Expected:

- Hall reference created
- original Chat bubble stays

Edit original.

Expected:
reference remains coherent.

Delete original.

Expected:
intentional tombstone/reference behavior.

Unpin.

Expected:
Hall reference removed only.

==================================================
SCENARIO 26 — CHAT + HALL SIMULTANEOUS ATTENTION
==================================================

B sits elsewhere.

A:
1. sends Chat message
2. creates Hall note

Expected B:

Chat ●
Hall ●
Bell ●

B opens Notifications.

Expected:

Chat ●
Hall ●
remain.

B opens Chat.

Expected:

Chat clears
Hall stays.

B opens Hall.

Expected:
Hall clears.

==================================================
SCENARIO 27 — BACKGROUND / RECOVERY
==================================================

B backgrounds tab.

A sends several messages and Hall activity.

Return B.

Expected:

- state reconciles
- exactly once
- correct order
- attention state correct
- no stale failure warning

==================================================
SCENARIO 28 — OFFLINE GAP
==================================================

Disconnect B.

A sends:
10 messages

Then:
55 messages test if practical.

Reconnect B.

Expected:

- all canonical messages recovered
- no duplicates
- order correct
- pagination boundary safe

==================================================
SCENARIO 29 — LONG ROOM / USER NAMES
==================================================

Use intentionally long:

Room name
Subroom name
display name

Expected:

- no overlap
- deliberate truncation/wrapping
- full value available in switcher/namecard where appropriate
- no horizontal overflow

==================================================
SCENARIO 30 — EMPTY ROOM
==================================================

Create fresh Room with no activity.

Check:

Chat
Hall
members
Subroom controls

Expected:

- clear quiet empty states
- no sample fixtures
- no excessive description
- obvious next action

==================================================
SCENARIO 31 — BUSY ROOM
==================================================

Simulate:

many Chat messages
many Hall notes
2 Subrooms
multiple unread states

Expected:

- hierarchy remains understandable
- rail does not become chaotic
- current location obvious
- attention guides rather than overwhelms

==================================================
SCENARIO 32 — RESPONSIVE
==================================================

Repeat core flows at:

320
375
390
430
768
1024
1440
1728

Founder should especially test:

- send
- Room switcher
- Subroom ladder
- context menu
- Hall editor
- Hall reorder
- unread dots
- long names
- dialogs

Expected:
no horizontal overflow.

==================================================
SCENARIO 33 — 200% ZOOM
==================================================

Desktop browser at 200%.

Check:

Chat
Room menu
Subroom switcher
Hall
dialogs

Expected:

- functionality remains reachable
- no controls lost
- no modal offscreen
- no unread collision

==================================================
SCENARIO 34 — KEYBOARD
==================================================

Keyboard-only:

- navigate Chat
- composer
- message actions
- emoji picker
- Room switcher
- Hall
- modal
- destructive confirmation

Expected:

- visible focus
- logical sequence
- Escape
- focus restoration

==================================================
SCENARIO 35 — ACCESS LOSS WHILE OPEN
==================================================

B currently inside Room/Subroom.

A removes/revokes access.

Expected B:

- current content stops receiving new events
- next authorized refresh fails closed
- navigation updates
- no private content from continued stale session
- intentional recovery destination

==================================================
SCENARIO 36 — REALTIME LATENCY TRACE
==================================================

Instrument one normal message.

Measure approximately:

A clicks Send
→ server receives
→ Neon commit
→ Ably publish
→ B receives signal
→ authorized fetch completes
→ render

Record each stage.

Do NOT weaken security for speed.

==================================================
SCENARIO 37 — NO-DEAD-CONTROL SWEEP
==================================================

Open every visible:

button
menu
icon
utility
Chat action
Room action
Hall action

For each:

WORKS
or
NOT PRESENT.

No core “Coming Soon”.

==================================================
SCENARIO 38 — ERROR STATES
==================================================

Simulate where safe:

- server fetch failure
- failed send
- invalid invite
- removed membership
- no network
- no search result if Chat search exists

Expected:

LOADING
EMPTY
ERROR
SUCCESS

remain distinguishable.

==================================================
SCENARIO 39 — FOUNDER FREE-PLAY
==================================================

After scripted tests:

Founder uses Tosker freely for 15–30 minutes with two accounts.

Do not follow a checklist.

Notice:

- irritation
- hesitation
- confusion
- unnecessary copy
- weird spacing
- dead ends
- excessive clicking
- places that feel surprisingly good

Record observations separately.

This is qualitative founder UX evidence.

==================================================
SCENARIO 40 — “WOULD I ACTUALLY USE THIS?”
==================================================

Final founder question:

Imagine this Room has existed for one month.

Can I:

- understand where I am?
- understand what changed?
- message naturally?
- retain important information?
- manage membership safely?
- recover from mistakes?
- trust notifications?
- navigate without thinking?
- invite someone confidently?

If any answer is “not really”:
record it before MS7.1 lock.

==================================================
VERSIONING
==================================================

Use internal patch versions:

MS7.1.1
MS7.1.2
MS7.1.3
...

Do not version based on arbitrary time.

Increment only when a coherent patch slice is completed and validated.

For example:

MS7.1.1
Chat/action truthfulness

MS7.1.2
Room lifecycle

MS7.1.3
Hall lifecycle

MS7.1.4
history/performance/error recovery

MS7.1.5
visual/microinteraction normalization

MS7.1.6
full abuse/regression closeout

The exact breakdown may change based on findings.

For every version record:

- commit
- scope
- schema changes
- test scenarios passed
- failures found
- fixes
- deferred issues
- founder-review status

Do NOT deploy canonical after every internal version unless explicitly useful.

Full canonical MS7.1 deployment is for founder walkthrough after the complete wave passes.
