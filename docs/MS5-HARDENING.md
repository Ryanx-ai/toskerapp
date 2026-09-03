# MS5 hardening and handoff

## Source of truth

For authenticated users, Neon Postgres is canonical for identity, Profile/TID, Sandbox, Rooms, memberships, invites, conversations, messages, connections, Room Hall items, Room capabilities, and notifications. The UI never treats hidden controls or a client-supplied user ID as authorization.

## localStorage audit

| Key | Class | Authenticated behavior |
| --- | --- | --- |
| `tosker.sidebar.collapsed` | B — legitimate UI preference | Retained locally; it changes presentation only. |
| `tosker.prototype.v3` | D — explicit prototype/demo state | Retained for the demo implementation, but ignored as authority for authenticated Rooms, messages, Friends, Hall, capabilities, pin/archive/order state, and identity. |
| `tosker.prototype.v2` | C — obsolete migration input | Read only when upgrading older prototype data into the explicit v3 demo store. Never imported into a real account. |
| `tosker.prototype.v1` | C — obsolete migration input | Same one-way demo migration behavior; never imported into Postgres. |

No localStorage key is authoritative authenticated product state.

## Authorization map

| Resource | Actor and authorization |
| --- | --- |
| User/Profile/TID/Sandbox | Clerk subject resolves server-side to exactly one Tosker user. Bootstrap uniqueness and a transaction prevent duplicates. |
| Room/membership | Creator is the server actor. Private routes and operations require server membership; ownership checks require both the owner field and owner membership. |
| Invite | Creation requires membership. Only a SHA-256 token hash is stored. Acceptance requires auth, validates status/expiry, atomically claims the invite, and inserts membership idempotently. |
| Conversation/message | Reads and writes require participant membership. Author is always the server actor. Client UUID is only an idempotency key. |
| Connection | Actor is requester; only the requested addressee can accept. A canonical pair key prevents reverse duplicates. |
| Hall/capability | Room membership is required. Pins must reference a message in that Room conversation. Database uniqueness prevents repeat pin/capability installation. |
| Notification | Core writes choose recipients server-side. Reads are restricted to the authenticated recipient. |

Private Room and personal routes also reject signed-in users without access, rather than falling through to fixture content.

## Security review

- Clerk middleware and server `auth()` provide the authenticated subject; Clerk IDs are never exposed as TIDs.
- `DATABASE_URL` and `CLERK_SECRET_KEY` remain server-only and ignored local environment values. Only the Clerk publishable key is browser-safe.
- Invite tokens use 256 random bits and are stored only as hashes. Route return behavior uses the same local invite path, with no user-controlled external redirect.
- React text rendering is used for messages and profile fields; no `dangerouslySetInnerHTML` path exists.
- Parameterized Drizzle queries are used throughout. Generic UI errors avoid leaking database or authorization detail.
- Unique constraints cover auth identities, TIDs, Sandboxes, Room slugs/memberships, primary Room chats, personal pairs, invite hashes, Hall pins, and capability installs.

Rate limiting for public profile/TID search and invite lookup is the principal security follow-up before broad public launch.

## Interaction and Hall audit

Chat/Hall/Add navigation, contextual Back/close controls, Room creation, invite/join, Friends request/accept/message, notification links, sidebar controls, and header utilities were exercised. Header Search/Voice/Video/Calendar/Settings/More remain explicit concise contract popovers; WebRTC and calendar work remain out of scope. Composer attachment/image/file/emoji controls now explain their later-milestone status. Misleading persisted-message delete/edit controls were removed until those mutations exist. Explore and Marketplace filters now perform their visible filtering action.

Hall has no top-level creation CTA. A dashed `+ New Note` card lives in the responsive board and opens the existing title/body note flow. Native notes persist against Room, Personal, and Sandbox conversations; pinned canonical message references preserve and link back to source Chat. Completion state, note editing/deletion, attached links, manual arrangement, and image attachments are deliberately deferred to a Hall milestone because each needs a product/authorization or media contract rather than a cosmetic local implementation.

## Known MS5 limits / MS6 handoff

- Request/response messaging is durable but not realtime; participants refresh or revisit to observe remote writes.
- Replies and reactions remain presentational prototype behavior and are not persisted.
- Message edit/delete, delivery status, offline queue, presence, typing, read receipts, and attachment storage are deferred.
- Notifications are durable foundation records, without delivery channels, read mutation, preferences, or rich payloads.
- Gizmo installation persists; Gizmo runtime does not exist.
- Preview and production databases are not provisioned. Production remains the locked MS4.1 application.

MS6 should begin from the clean MS5.5 checkpoint with reliable realtime message delivery/reconciliation and explicit persisted reply/reaction contracts. It should not combine that work with Hall depth or media upload.
