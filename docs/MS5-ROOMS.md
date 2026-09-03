# MS5 persistent Rooms and invitations

## Durable flow

The existing five-stage creation flow now submits one authenticated server
action. One database transaction creates the Room, owner membership, tags,
starter capabilities, primary Room conversation, creator participant, and a
14-day invitation. Room slugs include a random suffix and are routing handles,
not access secrets.

Invitation URLs contain a 256-bit opaque token. Postgres stores only its SHA-256
hash. Public invite lookup exposes the minimum Room name, owner display name,
and first tag; membership still requires a Clerk-authenticated actor. The
pending-to-accepted update atomically claims the single-use invite before the
membership and conversation participant are inserted. Repeating acceptance by
the same user is idempotent; another user cannot reuse an accepted token.

Room access derives from `room_memberships`. The authenticated creator is
always assigned as owner by the server; the client cannot submit an owner or
user ID. The owner row, membership, and primary conversation are created in the
same transaction. A partial unique index permits only one primary Room
conversation while still allowing future additional conversations/Subrooms.

## Development verification

Two distinct Clerk Development users were created. User A created `MS5 Shared
Room` with a tag and starter capability. User B opened its secure invitation,
authenticated, joined, reloaded, and reopened the invitation. Database checks
confirmed two unique users/profiles/Sandboxes, one Room, exactly two Room
memberships, one primary Room conversation, both Room participants, and one
accepted invite.

Production remains on MS4.1. No production or Preview database is connected.
