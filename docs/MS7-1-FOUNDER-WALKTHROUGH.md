# MS7.1 founder walkthrough — candidate preparation

Status: **NOT YET FOUNDER-READY**. The current local continuation still requires the full release gate, canonical deployment and live isolated A/B smoke. This brief prepares review; it does not claim those gates passed or lock MS7.1.

Use the same [numbered stress scenarios](MS7-1-STRESS-SCENARIOS.md) as engineering. Evidence and known gaps are in [the results ledger](MS7-1-STRESS-RESULTS.md). Keep two genuinely separate authenticated users. Do not use real private information for testing; record defects with context, actor, device, expected/actual behavior and reproduction steps.

## Suggested path through the existing suite

1. **Personal Chat — 01–09, 36–38.** Type, send/reply both ways and rapid-fire; reload. Disconnect/retry a reply draft, add/remove shared reactions, edit/delete its source, Copy and open a safe link. Search older history and follow replies: source focus/highlight should explain where you landed, tombstones stay understandable, Latest returns to current messages. Try a canonical @ selection, Escape and keyboard selection; mute then mark unread. Delivery, private reminders and mention alerts must remain distinct.
2. **Rooms and people — 10–19, 29–31.** Create a Room, invite/join twice, rename/tag and inspect members; revoke a link, remove a member, rejoin legitimately and Leave as a member. Use two children and an owner-only child. Unauthorized children must not appear or open. Switch Chat/Hall/children during traffic; parent identity stays obvious. Test the Room after it has many messages/notes, not only while empty. The owner intentionally has no unsafe Leave/Delete/Transfer control.
3. **Hall and attention — 20–28, 35.** Create/edit notes, comment, both react, reorder through drag and keyboard/mobile alternatives. Archive/restore and inspect permissions; cancel then confirm deletion of an expendable own note. Pin Chat → Hall → source → unpin must preserve original Chat. Send Chat/Hall/child activity while the other user is elsewhere: Notifications acknowledgement must not consume destinations, and viewing one surface must not clear another. Background/reconnect; remove access while open and expect safe withdrawal, not private updates.
4. **Reachability and failure — 29, 32–38.** Long names, all header/menu controls, narrow/mobile web, actual browser 200% zoom, Tab/Enter/Space/Escape and focus return. Check physical keyboard/touch and actual clipboard contents where automation could not certify them. Failed mutations should retain safe work and offer recovery without ghost success. Unsupported media/call/translation controls must be absent.
5. **Founder-only — 39–40.** Spend 15–30 minutes using Tosker freely, then ask “Would I actually use this Room for a month?” Record irritation, hesitation, confusing hierarchy/attention, excess clicking/copy and unexpectedly good flows in founder wording. Engineering cannot approve these qualitative scenarios.

## Boundaries to understand before reviewing

- The canonical review target uses Development Clerk/Neon/Ably, not a launch-ready Production stack. Development latency is measured in the ledger; do not infer a provider SLA. Exact current samples will be added after the final run.
- Text Chat, scoped Search, mentions, replies, Mute/manual unread, Room/member/invite management and Hall are core; expected controls must work. Private attachments are unimplemented MS7.6 P-001, not a fake picker. Calls/translation are later; Schedule belongs to the MS9 Gizmo direction. No new AI/media infrastructure in this patch.
- [Owner lifecycle](MS7-1-OWNER-LIFECYCLE-REVIEW.md) requires a separate founder policy decision. Safe absence does not prevent reviewing today's candidate; hiding is not a claim of eventual product completeness.
- Viewport emulation is not physical-device, assistive-technology or OS-background certification. Final engineering evidence must name these limits explicitly.

After walkthrough: synthesize founder defects → bounded founder patch if needed → relevant regression → **Ryan explicitly approves lock**. Do not infer lock from green automated tests or start MS7.2 automatically.
