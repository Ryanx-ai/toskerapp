# Milestone 3 Workspace Contract

Milestone 3 shipped as the locked first-time and desktop-workspace baseline. Production infrastructure remains intentionally local/prototype-only until a later milestone explicitly introduces it.

## Shipped workspace

Desktop keeps one persistent navigation rail and one primary working surface. The Tosker mark is the explicit, keyboard-accessible control for switching the rail between expanded and compact states, and the saved preference is local to the browser. The compact rail keeps destination icons, conversation identity, and the signed-in person's essential controls reachable.

Mobile remains a single-pane communication experience with five primary destinations.

## Reverted workspace experiment

During MS3, Tosker tested an additional top workspace bar, local Back/Forward history, two simultaneous conversation panes, and an edge-hover sidebar reveal. Founder review found that this increased visible chrome and interaction complexity while weakening the clarity of the core communication shell. The experiment was removed before the milestone lock.

That model may be reconsidered later as an optional power-user workspace, but it is not part of the shipped MS3 baseline.

**Product principle:** Add workspace chrome only when it makes the primary communication task more obvious, not merely more capable.

## Prototype states

- **Fresh:** Sandbox only, no fabricated notifications, and direct Start Chat / Create Room actions.
- **Demo:** representative conversations, Rooms, and activity for walkthroughs.
- **Returning:** representative product state while preserving locally created conversations and Rooms.

The state model remains an internal prototype and is not production account architecture. The visible product opens in the representative demo state by default; Fresh remains available for focused first-time testing without adding mode switches to the customer-facing sidebar.
