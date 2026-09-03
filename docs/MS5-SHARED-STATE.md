# MS5 shared Room state

MS5.4 persists the minimum approved Friends, Hall, Gizmo, and notification semantics without adding runtime features.

## Connections

Connections support `pending` and `accepted`. A sorted unique pair key prevents reverse-direction duplicates. Only the requested addressee may accept. Friend identity is resolved from canonical Profiles and TIDs.

## Hall

Room members may create Hall-native notes. Pinning stores a Hall item that references the original message ID; the message stays in Chat and its body is not copied into Hall storage. A unique source-message index makes repeat pinning idempotent.

## Capabilities

The approved starter capabilities are Poll, Schedule, Map, and Board. Membership is checked server-side. The database primary key `(room_id, capability_key)` prevents duplicate installation. This milestone stores installation state only; Gizmo runtime remains out of scope.

## Notifications

Connection requests, connection acceptance, and Hall notes create durable recipient records. The existing Notifications destination reads these minimal records for authenticated users. Delivery, preferences, badges, and rich event payloads remain future work.
