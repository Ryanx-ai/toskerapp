# Milestone 3 Workspace Contract

Milestone 3 shipped as the locked first-time and desktop-workspace baseline. Production infrastructure remains intentionally local/prototype-only until a later milestone explicitly introduces it.

## Sidebar

The desktop workspace bar always exposes a keyboard-accessible **Show sidebar** / **Hide sidebar** control. The saved preference is local to the browser. When hidden, a focusable left-edge affordance may reveal the sidebar temporarily; leaving dismisses it and never changes the saved preference.

Mobile does not inherit the desktop top bar, hover reveal, or split workspace.

## Pane model

Tosker supports one primary pane and at most one secondary pane. **Open beside** is available from a conversation context menu on desktop. The latest secondary context replaces the previous one, panes divide the available width evenly, and narrow desktop widths fall back to one visible pane. Closing the primary promotes the secondary.

Chat, Hall, and Add stay available per pane. Pane content scrolls independently.

## Prototype states

- **Fresh:** Sandbox only, no fabricated notifications, and direct Start Chat / Create Room actions.
- **Demo:** representative conversations, Rooms, and activity for walkthroughs.
- **Returning:** representative product state while preserving locally created conversations and Rooms.

These controls are intentionally quiet prototype utilities and are not production account architecture.
