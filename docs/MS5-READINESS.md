# Milestone 5 readiness

Milestone 5 moves Tosker from one-browser prototype state to durable multi-user identity, Rooms, invitations, and communication. This document primes that work; it does not authorize backend implementation.

## Surface classification

| Surface | Class | MS5 expectation |
| --- | --- | --- |
| Sandbox | A | Persist the authenticated user's private conversation. |
| Personal Chat | A | Real participants, authorization, persisted messages. |
| Room Chat | A | Membership-gated persisted messages. |
| Room creation / Invite / Join | A | Server-backed Room, membership and secure invite lifecycle. |
| Profile / Namecard / Settings identity | A | Real User/Profile data and session identity. |
| Friends / Connections | A | Real connection records and lookup contract. |
| Notifications | A | Foundation records for invites, mentions and membership events. |
| Hall | B | Persist `note` and `pinned-message` item types with source references. |
| Add / Gizmos | B | Durable unique Room capability installations; capability runtime later. |
| Search | B | Define authorized search scope; basic server query may follow core persistence. |
| Explore / Marketplace / Studio | C | Remain intentional discovery prototypes until capability commerce/creation waves. |
| Voice / Video | C | Requires presence, WebRTC/signalling, device permissions and call lifecycle; later wave. |
| Calendar | C | Requires provider authorization, event model and time-zone policy; later wave. |
| Room Settings / More | C | Keep clearly prototype until membership administration is deliberately scoped. |
| Placeholder controls without an approved outcome | D | Remove or label as coming later rather than imply working behavior. |

Classes: A becomes real in MS5; B needs a real contract now and implementation later; C remains intentional later capability; D should not remain misleading.

## Recommended architecture

- Keep the existing Next.js App Router application on Vercel.
- Use managed Postgres as the durable system of record with schema migrations and ordinary relational constraints.
- Use a proven authentication provider or auth library with database-backed Tosker profiles. Sessions map to one immutable internal user id; TID is a unique public identifier, not the primary key.
- Authorize every Room, conversation and message operation server-side. Client state is a cache, never the authority.
- Start with request/response persistence plus optimistic UI. Add a managed realtime channel or database-change subscription after the durable message path is proven.
- Store future uploaded media in object storage; keep only metadata and ownership references in Postgres.
- Use transactional outbox/event records later for notifications and integrations rather than coupling core writes to external delivery.

This is deliberately boring infrastructure: one application, one relational database, one identity boundary, and optional managed realtime/storage services as needs become real.

## Minimum entity model

- `User`: id, email/auth subject, TID, createdAt.
- `Profile`: userId, displayName, avatarUrl, status, preferences.
- `Connection`: requesterId, addresseeId, status, createdAt.
- `Room`: id, name, ownerId, createdAt.
- `RoomTag`: roomId, value.
- `RoomMembership`: roomId, userId, role (`owner` or `member`), joinedAt; unique room/user.
- `Invite`: id, tokenHash, roomId, inviterId, optional recipientUserId/contact hint, status, expiresAt, createdAt.
- `Conversation`: id, kind (`sandbox`, `personal`, `room`), optional roomId.
- `ConversationParticipant`: conversationId, userId; unique conversation/user.
- `Message`: id, conversationId, authorId, body, replyToId, createdAt, editedAt.
- `HallItem`: id, roomId, kind (`note`, `pinned-message`), authorId, body/title, optional sourceMessageId, createdAt.
- `RoomCapability`: roomId, capabilityKey, installedById, installedAt; unique room/capability.
- `Notification`: id, userId, type, actorId, roomId/messageId, readAt, createdAt.

## Delivery waves

1. **MS5.0 — Decisions and foundation:** provider selection, threat model, environments, migration tooling, schema and seed strategy.
2. **MS5.1 — Identity:** authentication, User/Profile/TID, sessions, own Namecard and Settings identity.
3. **MS5.2 — Rooms:** Room creation, membership authorization, secure invitation acceptance and cross-session join.
4. **MS5.3 — Communication:** conversations, persisted messages, authorship, timestamps and optimistic sending; then assess realtime.
5. **MS5.4 — Connections and events:** Friends/Connections plus notification records for core events.
6. **MS5.5 — Migration and hardening:** remove authoritative localStorage, import/reset prototype data safely, authorization tests, rate limits, observability and recovery.
7. **Later capability waves:** Hall depth, Gizmo runtimes, media, translation, calendar, calls, Marketplace and Studio.

## Key risks and decisions

- Decide whether invite recipients must authenticate before acceptance or can claim a short-lived guest session that later upgrades. Do not let anonymous links grant unbounded Room access.
- Enforce membership on every read and write, not only in the UI.
- TID lookup needs privacy, enumeration protection and rate limiting.
- Message ordering, idempotency and optimistic reconciliation need stable client-generated ids before realtime.
- Local prototype data must never silently merge across real accounts.
- Voice, video, calendar and Gizmos need explicit contracts and should not inflate the foundational backend wave.

## Recommended first MS5 execution prompt

“Implement MS5.0 only: inspect the locked MS4 repository, compare two boring production-grade Postgres/auth options for this Vercel Next.js app, record the architecture decision, define the initial relational schema and authorization invariants, and prepare environment/migration scaffolding. Do not migrate UI state, enable authentication, or implement product features until the founder approves the architecture checkpoint.”
