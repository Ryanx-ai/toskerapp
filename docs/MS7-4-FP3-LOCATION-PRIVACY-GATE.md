# FP3 shared snapshots — dedicated privacy/authorization gate

Founder approved the bounded snapshot model in-thread after approving the18–26hour wave. Broad area by default; precise peer Map markers require a separate explicit choice. Manual refresh, absolute five-minute expiry, no background tracking/history, per-context audience and Stop are mandatory.

## Technical gate / implementation contract

Reuse the existing per-user subscribe-only Ably feed for server-authorized ephemeral fan-out. Never put coordinates in presence, generic Room messages, durable tables, request URLs, logs, analytics or retry queues. No new Ably permissions, connections, provider or billing. A single current consent lease per actor stores only an opaque ID, exact conversation/session, precision and expiry—not coordinates, labels or location history. An additive migration requires full private backup, transactional rehearsal and retained-data equality before apply.

Sender token/session lock precedes exact-context scope locks, matching current withdrawal ordering. Room/relationship/scope locks cover recipient authorization through publish. Each recipient is selected server-side using existing `authorizedContext`, never from client-provided IDs. Recipient renders only after metadata-only current lease/source/viewer authorization, and discards on clear, expiry, disconnect, hidden page or context/session change. No replay or server coordinate retrieval. Reconnect requires a new explicit share; a new viewer waits for the sender's next manual snapshot.

Explicit Stop and Room/Subroom/Personal/session revocation invalidate the consent lease and send a coordinate-free clear signal. Retired lease tombstones prevent a late snapshot from resurrecting it. Existing token revocation is retained. Failing critical revocation must not report success. Expiry is enforced server-side and client-side, not a delayed cleanup job. Past disclosure cannot be undone for a recipient that copied it; consent must state this limitation honestly.

SG broad labels use the licensed URA indicative region polygons. Elsewhere, city lookup is explicitly disclosed and sends only rounded coordinates to Geoapify under existing budgets. No precise peer data for broad mode; no street/postcode/address fields. Precise mode retains the same explicit provider disclosure if a city lookup is necessary. Failed broad lookup must not guess an area or silently fall back to precise sharing.

## Evidence and remaining release gate

Code recovery confirms existing token issuance/withdrawal actor locks, exact-context authorization, revocable tokens and server SDK `logLevel:0`. Existing user feeds permit subscribe only for the browser. Ably ephemeral delivery is documented as non-history/non-rewind; it is not a claim of no provider processing. No new provider setting is needed for this design.

**Design gate permits bounded implementation under founder approval; security acceptance remains REQUIRED before release.** Prove start/Stop/expiry, missing consent, precision validation, Sandbox rejection, forged context/actor/lease, stale membership, source/recipient revocation races, session loss, no background updates, reconnection, no persistence/logging and single transport with synthetic QA coordinates. Gate failures stop sharing/release; no fallback to weaker privacy. Keep all founder data untouched.
