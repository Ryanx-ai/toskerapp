# MS6B — realtime acceptance / release record

2026-09-07. MS6B implemented, validated, committed, pushed, deployed and live-smoke-tested. No MS7 implementation.

## Final founder attention/discovery patch — release validation

The founder approved the MS7 stress audit and authorized this bounded MS6B closeout, not MS7 implementation. Baseline release below remains historical until the new deployment is recorded.

- Additive Development migration `0011_omniscient_northstar.sql`: `notifications.destination_read_at`. Existing acknowledged rows are backfilled from `read_at`, because historical list-versus-surface intent cannot be reconstructed. 12 migrations / 44 foreign keys verified. No new service or infrastructure.
- Notifications acknowledges only exact rendered recipient-owned IDs. This clears the bell, never destination unread. Chat acknowledges through its canonical rendered message boundary; Hall uses exact activity IDs captured before its content fetch; Requests acknowledges visible pending request rows. Later arrivals and other surfaces/conversations remain independent. One persisted event drives derived surface, rail/parent, Friends and bell attention.
- Private Ably activity refreshes canonical navigation as well as notifications/connections; queued in-flight invalidations are retained. A one-actor, memory-only canonical-response cache prevents attention/navigation flicker across client routes. It is empty for SSR, signed-out and different actors; reload/reconnect re-fetches Neon. No localStorage authority or polling removal.
- Hall note/pin recipients require current Room membership and Subroom visibility, not just stale conversation participation. Scoped Ably auth, typing and durable message model remain unchanged.
- Friends search is a separate contained region: You/Friend/Pending/Request received/Accept/Add, stable user IDs, clear/escape, loading/error/no-match states. Normal All/Online/Requests returns when query clears. Audit identity-recovery, Online filter, accepted dedup and nickname labels are preserved. Shared attention labels, dark search focus, mobile 16px input, primary Save and quiet Cancel reuse existing tokens.
- Local real A/B: request → Friends/Requests/bell/toast; Notifications preserves request attention; acceptance converges in the still-open search result; new Personal conversation appears on the other rail without reload; inactive message attention and active Chat clearing pass. Fresh Room/invite/join and Subroom creation/delivery pass. Hall activity appears while B views Chat; Notifications preserves Hall; Hall and Chat clear separately. Parent does not clear child; child Hall contains no parent notes. Reload preserves attention and contents.
- QA found/fixed authenticated unresolved navigation briefly showing Sandbox/sample content; it now uses neutral loading. Cache regression test covers navigation continuity, actor isolation and cleanup. Input/search screenshots inspected at 1440×900 and 390×844; 320×844 and 720×450 (200% layout equivalent) have no horizontal overflow. Keyboard reaches result action with visible focus; Escape clears discovery. Nickname saves privately and fits 320/390 widths. No physical mobile or screen-reader speech certification.
- Fresh TypeScript, warning-free ESLint, production build, DB/schema/invariants, Chat/shared-state, real Ably scope/revocation tests, `scripts/verify-attention.ts` and `scripts/verify-audit-ui.mjs` pass. Real provider signal sample 17ms, not an end-to-end SLA. Exact secret scan across tracked source and generated client bundles passes. Final live verification and fixture cleanup pending.

Test-only local profiles: `/tmp/tosker-ms6b-lock.2C0l22` (never commit); users tagged `privateMetadata.qaRun=ms6b-lock-0907`. Fixture Room `ms6b-lock-qa-5c467a`, child `79648594-7b5b-4e94-a881-011bc4781db3`, Personal `558746af-8196-4de4-81af-9b52f4521b97`. Delete only this run's exact verified data after live smoke; no founder state reset.

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
- Exact-content/actor/conversation cleanup completed after live smoke and stress audit: 73 MS6B messages and one MS6B Hall note removed, with related fixture notifications/reactions. Separate stress-audit Room/child fixtures were also cleaned. No founder content removed; post-cleanup database invariants pass. Test cleanup has no UI undo.
- Concurrent unrelated website-planning handoff additions and Art/Web documents are preserved, not part of this realtime patch. `toskerArt/` remains untouched/untracked.

## Release / live smoke

- Product commit `a3e94a8bee718f4b43a309ed8cedf0c2d9efc168`, pushed to `origin/main`.
- Deployment `dpl_EG1JiM7p7ANoTPL2K9NrvEUkddCm` READY; canonical alias `https://toskerapp.vercel.app/`; build approximately 38 seconds.
- Normal Clerk sign-in in two isolated browser profiles on canonical: A/B Personal, Room and Subroom delivery passed; typing visible; offline/online reconciliation passed without reload; Chat unread appears while B views Hall. Transport reports connected. Runtime error scan (10-minute window) returned none.
- Founder-authorized post-MS6B stress audit completed, including identity/shared-context/convention research: `docs/MS7-PRODUCT-STRESS-AUDIT.md`. QA cleanup completed. Small audit fixes are validated local WIP, not part of this deployed SHA. STOP for founder review; MS7 implementation remains forbidden until separately authorized.
