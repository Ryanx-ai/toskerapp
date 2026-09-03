# MS4 Room and invitation contract

Milestone 4 defines the local UX contract that Milestone 5 can make durable. It does not define production authentication, permissions, delivery, or token security.

## Product flow

A creator names a Room, may add tags and starter capabilities, may select Friends or enter a username/TID, then receives a Room-specific link and QR surface. A recipient can understand the Room, its owner, and the Join action without first learning the rest of Tosker. Joining adds the Room once to the local communication list and opens its normal Chat/Hall/Add workspace.

## Conceptual entities

- `User`: id, TID/username, display name, avatar identity.
- `Room`: id, name, tags, ownerId, createdAt, starterCapabilities.
- `RoomMembership`: roomId, userId, ownership concept (`owner` or `member`), joinedAt.
- `Invite`: id/token, roomId, inviterId, optional recipient identity, status, createdAt.
- `Conversation`: Room-scoped communication identity and ordering state.
- `Message`: id, conversationId, senderId, body, createdAt.
- `RoomCapability`: roomId, capability key, installedAt. One installation per capability and Room.
- `HallItem`: roomId, kind (`note` or `pinned-message`), author, content/sourceMessageId, createdAt.

## Minimum state semantics

- A Room has one owner and zero or more members.
- Selecting a Friend or entering a username/TID represents an intended invitation, not confirmed delivery.
- Opening a share link represents a pending invitation.
- Joining accepts that invitation and establishes membership.
- Rejoining is idempotent: an existing membership opens the existing Room.
- Starter Gizmos and later Add actions share one installed-capability set; Add installs one item per action and never duplicates an installation.
- A Chat message remains a conversational bubble when pinned. Pinning creates a referenced Hall item; a Hall-created note is a distinct bulletin object.
- Minimum future invite states are `pending` and `accepted`. Add `declined`, `revoked`, or `expired` only when product behavior requires them.

The current prototype stores Room identity, tags, starter capabilities, owner, invited identifiers, and local membership-shaped state in localStorage. MS5 should replace that local representation with authenticated durable entities without changing the approved user journey.
