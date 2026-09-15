# Contextual identity / Namecard contract

Established by MS7.1-FP4. This is the bridge into MS7.2, not a public profile directory or a new identity policy.

## MS7.2 Gate 2 current overlay (local, not deployed)

[Implementation/evidence](MS7-2-IMPLEMENTATION.md) supersedes the historical FP4 boundaries below only for the authorized MS7.2 slice. Core UUID/Clerk identity, username/TID immutability under presentation changes, Common Rooms authorization and copied authored text remain unchanged. Optional bio/accent audience defaults self; manual status defaults friends/current co-members. A Personal conversation alone never grants optional fields/status. Server projections enforce self/friends/shared-context before serialization.

Current parent membership nickname is member-owned, max60 UTF-16 units/NFC, blank→global. Owners may reset others but not choose their persona; minimal actor/target/time accountability contains no old nickname. Children inherit; leave clears; rejoin starts blank with a new revision epoch. Room labels resolve nickname→global→safe fallback, while Personal/Friends resolve viewer-private alias→global. Room-opened Namecards carry an authorized Room context and still show canonical identity; private alias remains viewer-only. Normal users cannot change another profile or an identity identifier.

Five finite accents decorate authorized identity framing only, not text/status/other users' app themes. Actor-only banner preferences never reach peer DTOs or alter persisted unread. Content-free existing-channel metadata refresh and foreground/reconnect canonical reads reconcile changes; dirty editors retain snapshots and reject stale writes. Existing six legacy TIDs are unchanged pending transition resolution; do not claim all-seven-character acceptance yet. The historical account-delete/provider boundary is not widened.

## Identity ownership

| Layer | Authority and visibility | Current boundary |
| --- | --- | --- |
| Account identity | Clerk establishes actor; Neon user/profile provides stable ID, display name, username, TID, avatar and coarse manual status | Only owner edits existing profile fields; never expose Clerk subject, email or security data in Namecard |
| Viewer-private alias | Existing accepted connection nickname, resolved for its viewer only | Personal/Friends and Namecard use nickname → canonical name; canonical identity remains visible inside the card |
| Shared Room identity | Current Room membership and existing role/access model | FP4 does not create a shared Room nickname or change other viewers' naming |
| Namecard | Deliberate-open authorized projection of a stable user ID | Modal/sheet shared by Personal header, Friends, Room People, message author and Hall attribution |
| Personal Brand | Future personal expression distinct from account authority | Existing preview is not a saved theme, public profile or upload capability |

## Server projection

`readNamecard` permits self, accepted connection, existing Personal participants or current shared Room membership. Unknown/forged/unrelated targets are denied. Return only explicitly selected presentation fields, this viewer's connection/nickname, an existing Personal conversation reference and bounded current Common Rooms. No broad user record reaches the client.

Common Rooms requires **both current memberships before filtering, ordering or limiting**. Read at most21 to show20 and an honest bounded-results hint. No total of hidden Rooms, former/pending membership, private social graph or implied Subroom disclosure. Personal history does not revive former Room overlap. No Common Subrooms in FP4.

The card fetches on deliberate open, not for every avatar. Only an open, foreground card revalidates on the existing activity signal/12-second fallback; close cancels the view lifecycle. Failure clears the projection and exposes Retry. Actions reauthorize on the server. Older automatic responses cannot overwrite a newer explicit nickname refresh. This is not a new realtime/presence service.

## Interaction

One global stable-ID entry primitive and one card. Native named buttons support keyboard activation; native modal containment/Escape and explicit origin focus restoration cover the Namecard → Chat Settings round trip. Long identity text wraps. Mobile uses existing page gutters, scrollable bounded panels and full-size action targets. Unknown/demo identities remain static, not false affordances.

Message reuses canonical Personal creation; Private nickname reuses the existing accepted-connection mutation. Chat Settings shares the same identity projection and mute authority. Media/Files/Links/Privacy describe truthful limitations, not fake file pickers or indexes.

Hall pinned-source identity refers to the **source author**, not the person who pinned it. Hall reactions/comments belong to the Hall reference; source editing belongs to the canonical Chat message and only its author. Nuke preserves the established zero-trace cascade.

## MS7.2 design inputs / policy gates

Keep global Profile, contextual Namecard, viewer-private alias, Room-shared identity, Personal Brand and account/communication settings distinct. A future profile route can reuse the stable user-ID target; opening a card must not depend on mutable names or slugs.

Plan, do not silently decide: shared Room nickname precedence/permissions; public discoverability; who sees bio/links; block/restrict semantics; username/TID change policy; status privacy; Personal Brand scope and persistence. Common Subrooms requires explicit effective-access design. Rich media/files depend on authorized storage; social feeds, stories/reels, mutual-friend graphs and surveillance-style last-seen are not FP4.

TethrLink informs compact identity/action hierarchy; Luna/LunaVault informs ownership/provenance and scope separation. No source project or visual system is imported. DK Longreach is deferred pending new suitable rights evidence; no supplied font asset is shipped.
