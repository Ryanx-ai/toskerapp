# MS5 persistent messaging

MS5.3 moves the Sandbox, primary Room chat, and personal conversations onto the development database. The MS4.1 visual shell remains unchanged.

## Boundaries

- Every history read and message write authenticates the Clerk session on the server.
- The server derives the author from that session and requires a matching `conversation_participants` row.
- Client-provided message UUIDs make a repeated send idempotent through the message primary key.
- Personal conversations use a sorted pair of canonical user IDs as a unique key, so A→B and B→A resolve to one conversation.
- Profile search returns only the minimum identity fields needed to start a chat.

## History

History is ordered by `(created_at, id)` and returned in bounded pages of 50. The action returns an opaque-compatible cursor payload for loading older pages without offset drift.

## Verification

Run `npm run db:verify-chat`. It proves a non-participant cannot cross the conversation authorization boundary and confirms the two-member Room fixture contains persisted messages. Browser QA additionally covers send → reload for Room and personal messages.
