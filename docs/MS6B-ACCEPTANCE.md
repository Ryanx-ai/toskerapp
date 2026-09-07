# MS6B — realtime acceptance / release record

2026-09-07. Baseline `adfea40`. Local acceptance and final TypeScript/ESLint/production rebuild complete. Release/live smoke pending. No MS7.

## Shipped boundary

- Clerk resolves the canonical actor. The no-store, same-origin POST token endpoint rechecks participation AND current Room/Subroom access using `hallScope`. Tokens expire after 10 minutes and fix `clientId` to the actor.
- Exact subscriptions: `tosker:user:<actorId>`, plus the active `tosker:conversation:<conversationId>`. Publish/subscribe is granted only on that context's separate `tosker:typing:<conversationId>`. No client durable publishing or wildcard capabilities.
- The workspace uses one lazy modular Ably connection, closed on unmount/account/context change. Public landing/demo do not initialize it.
- Neon remains authoritative. Message and notification inserts commit atomically before best-effort invalidations. Stable retry IDs prevent duplication after ambiguous acknowledgements. Edits/reactions/deletes reuse canonical fetch/merge.
- Typing is ephemeral: authenticated transport identity, 2-second throttle, 5-second expiry, no offline queue, no Neon records, no status/presence heartbeats. Coarse manually selected profile status stays separate.
- Reconnect/foreground triggers canonical reconciliation. In-flight invalidations are retained; gap catch-up pages up to 500 recent messages. Beyond that, the visible recent window is replaced coherently; durable history is not deleted.
- Private activity signals refresh persisted notifications/unread and affected Hall data. Chat read clearing uses the last rendered canonical message boundary; Hall does not mark Chat read. Notification links preserve Subroom and Hall scope; notification fetch rechecks current authorization.
- Connected Chat/Hall reconcile every 60 seconds, with a 12-second fallback while unavailable. The activity scheduler checks at 12 seconds but fetches at most once per 60 seconds while connected unless signalled. Friends retains its 12-second bridge for existing manual-status metadata, alongside friend-event refresh. No claim of zero polling or a transactional DB/Ably delivery guarantee.

## Verified evidence

- Replacement key is ignored/server-only, exactly publish/subscribe on `tosker:*`. 10-minute token issuance 201; diagnostic revocation 201; revoked token rejected 401/40141. Founder confirms prior exposed credentials rotated/revoked. No replacement credential printed or committed.
- `db:verify-ms6b`: two actor tokens, exact private/channel scopes, real SDK delivery (21–33ms provider signal samples), restricted/stale Subroom access denied, arbitrary channel/private-user subscribe denied, forged durable publish/typing identity denied, removed membership denied, revoked token denied. Fixtures use random IDs and guarded cleanup.
- Isolated real Clerk A/B browsers: Personal, Room and Subroom messages exchanged. A→B Personal ~3.5 seconds; Room ~3.9 seconds pre-click-to-render, including Clerk/Neon fetches. Receiver's new 12-second timers disabled in QA to prove event delivery. These are small development samples, not an SLA.
- Typing visible to the other user and expires after inactivity. Offline B misses A's message, then catches up without reload; hidden tab catches up on becoming visible. Revocation test forces B's normal token reauthorization.
- 55 test messages inserted while B offline; recovery rendered all 55, including first/last, crossing the normal 50-message page. No duplicate visible records.
- Offline B send retains draft; retry succeeds with exactly one DB message. Successful fetch now clears stale load-error copy.
- Chat activity marks Chat while B views Hall; Hall note marks Hall while B views Chat; each clears on viewing the affected surface. B sees persisted Hall note after reload. Own actions create no self-unread.
- 1440×900, 1728×1117, 390×844, 430×932: no horizontal overflow, composer in viewport. Physical mobile keyboards/background OS eviction remain untested.
- TypeScript, ESLint, production build, schema verification (11 migrations, 44 foreign keys), DB invariants, Chat/shared-state regression, MS6A acceptance pass. No schema migration in MS6B.
- The MS6A Hall test had equal initial positions and random-ID tie order; its fixture now supplies positions 0 and 1. Product reorder logic unchanged.
- Replacement credential scan across tracked source and generated static bundles passes. Production npm audit: zero vulnerabilities. Four existing moderate Drizzle/esbuild development-tool findings remain; npm proposes a breaking downgrade, not applied.

## Operations / limits

- Ably Development key added as a Vercel Secret only to existing founder-review production target; that target still uses Development Clerk/Neon. No Preview key/app/DB or true Production stack provisioned.
- Current UI has no membership-removal endpoint. Any future/admin access-removal path MUST commit the removal and call `revokeActorRealtime` before acknowledgement; direct DB edits alone cannot instantly revoke an already-issued provider token. Every content fetch still reauthorizes; short token TTL bounds stale transport credentials.
- No durable outbox: publication failure is credential-safe logged, and canonical fallback/reconnect recovers it. No message body in generic transport signals. No new monitoring provider/paid service.
- Temporary QA profiles outside Git: `/tmp/tosker-ms6b-browser.j01Vkq`, sessions `ms6b-a` / `ms6b-b`; these are credentials, never copy them into the repo. Test-only timer instrumentation resets on full reload.
- Test messages/one Hall note still retained pending exact-content/actor/conversation cleanup after live smoke. Never delete founder content.
- Concurrent unrelated website-planning handoff additions and Art/Web documents are preserved, not part of this realtime patch. `toskerArt/` remains untouched/untracked.

## Release / live smoke

Pending final commit SHA, canonical deployment ID, live two-user results and guarded QA cleanup.
