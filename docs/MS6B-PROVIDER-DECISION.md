# MS6B — provider decision / founder gate

2026-09-07. **Ably Pub/Sub selected; founder provider gate cleared.** Replacement Development key verified from ignored `.env.local`: exactly publish/subscribe on `tosker:*`, 10-minute token issuance and effective revocation. SDK integration and local two-user acceptance implemented; latest evidence/release status: `MS6B-ACCEPTANCE.md`. The decision and original founder setup instructions below are retained as architecture history, not an active blocker. No credential is recorded here.

Landing prerequisite complete: `509ee93` plus bounded contrast fix `332fd16`, canonical deployment `dpl_6zghoSZVR7Xi4TG6FdFH4abEM9cL` READY. Public CTAs, actual A sign-in to `/app`, signed-in footer return/reload at `/`, responsive landing and runtime scan pass. MS6A remains intact.

## Focused comparison

| Criterion | Ably Pub/Sub — selected | Pusher Channels |
| --- | --- | --- |
| Next/Vercel/Clerk | Server HTTP publishing; Clerk-authenticated endpoint issues short-lived, exact-channel tokens. No socket server on Vercel. | Same serverless fit; Clerk-backed private/presence-channel authorization endpoint. |
| Recovery/delivery | SDK can resume a short interruption (typically around two minutes); longer gaps still need Neon reconciliation. This is not an end-to-end DB/transport transaction guarantee. | Reconnect supported; missed-event history and ordering recovery are application responsibilities. |
| Typing/presence | Native ephemeral messages and identified clients; use only scoped typing, not automatic user status. | Private/presence client events; presence metadata provides authenticated sender identity. |
| SDK weight | Modular/tree-shakable JS SDK; JWT token issuance needs no Ably server SDK. Keep it out of landing bundles. | Browser JS plus HTTP server integration; optional encryption build adds weight. |
| Cost at review date | Free: 200 connections, 200 channels, 6M messages/month. Standard: $29/month plus usage ($2.50/M messages, $1/M connection-minutes, $1/M channel-minutes). | Sandbox: 100 connections, 200k messages/day. Startup: $49/month, 500 connections, 1M messages/day. |
| Region/operations | Global routing and recovery reduce transport operations; channel-minute and fan-out costs need monitoring. | Explicit regional cluster, including `ap1` Singapore; simple fixed-plan budgets. |
| Scaling/lock-in | One user feed plus active conversation/typing subscriptions avoids subscribing to every Room/Subroom. Thin provider adapter and Neon canonical state limit lock-in. | Same subscription discipline possible; more application-owned recovery, proprietary channel/event conventions. |

Decision is an engineering inference from the sources, not a measured latency/bundle benchmark. No honest compressed bundle delta or delivery timing exists until the chosen SDK is integrated. Measure the authenticated route delta in the first slice. Do not adopt Ably Chat/Spaces or migrate Tosker's message model into a vendor product.

Sources: [Ably pricing](https://ably.com/pricing), [Pusher pricing](https://pusher.com/channels/pricing/), [Ably recovery](https://ably.com/docs/connect/states), [Pusher missed-event recovery](https://docs.bird.com/pusher/channels/channels/events/how-can-i-get-missed-messages-after-reconnecting-to-channels), [Pusher ordering](https://docs.bird.com/pusher/channels/channels/events/why-dont-channels-events-arrive-in-order), [Ably modular SDK](https://github.com/ably/ably-js), [Pusher SDK](https://github.com/pusher/pusher-js), [Pusher clusters](https://pusher.com/docs/channels/miscellaneous/clusters/), [Ably architecture](https://ably.com/docs/platform/architecture), [ephemeral messages](https://ably.com/blog/introducing-ephemeral-messages-for-lightweight-updates), [Pusher client events](https://pusher.com/docs/channels/using_channels/events/).

## Exact founder action

1. Create/sign into an Ably account and create a **Pub/Sub app named `tosker-development`**, on the Free plan for the initial two-user acceptance. No paid plan required for this gate.
2. In that app's API Keys, create a server key named `tosker-server-development`, constrained to `tosker:*`, with Publish and Subscribe permissions. Enable **Revocable tokens**. No history/push/admin/presence permissions are needed for the proposed first slice.
3. Store the complete key securely as **`ABLY_API_KEY`** in the project's ignored `.env.local`. Do not paste it into a task, source file or browser bundle. Confirm setup is ready without sharing the value.

`ABLY_API_KEY` is the only required new environment value for this design, **server-only**. No `NEXT_PUBLIC_ABLY_*`, public app key or client secret is required: browsers receive renewable short-lived scoped tokens from Tosker. No env files were edited at this gate. [Token auth](https://ably.com/docs/auth/token), [capabilities](https://ably.com/docs/auth/capabilities), [revocation setup](https://ably.com/docs/auth/revocation).

Environment separation: distinct Ably apps/keys for Development, Preview, Production; do not create the latter two now. Pair each with the matching Clerk/Neon environment. Local acceptance uses `tosker-development`. The current canonical Vercel *production target* still serves Development Clerk/Neon; only after MS6B validation should its environment receive the Development key for the authorized founder-review deployment. That is not a provisioned production data stack. Future real production must get its own three-service isolation; do not give arbitrary previews the Development or Production key.

## Proposed implementation after the gate

- Existing server actions authorize actor → commit Neon state → publish typed invalidation/event with stable IDs. Neon remains the only durable truth. Publish failure must not turn a committed send into a failed-send duplicate: report/observe transport failure and reconcile durable state. Add a bounded durable outbox only if acceptance demonstrates it is required; no new queue service.
- Clerk-authenticated, no-store token endpoint resolves the Tosker actor and reuses `requireConversationParticipant`/Room/Subroom authorization. Exact user-feed and active conversation capabilities only; never client-supplied user identity or broad token wildcard. Fixed `clientId`, revocable short-lived credentials; membership loss must revoke/deny access, not rely on polite clients detaching.
- Subscribe to `tosker:user:<actorId>` for authorized unread/notification invalidations, `tosker:conversation:<id>` for the active context, and separate `tosker:typing:<id>` for ephemeral typing. Clients cannot publish to canonical/user-feed channels. Typing identity comes from authenticated transport identity, not an arbitrary payload field; throttle, expire and clear on disconnect/context switch, with no Neon writes.
- Thin transport adapter feeds the existing canonical fetch/merge path. Stable message UUID dedupe, deterministic `(createdAt,id)` ordering, bounded catch-up on reconnect/resume and coalesced invalidation fetches. Avoid message content in generic notification broadcasts; authorize every data fetch. Do not clear unrelated surface/Subroom unread. Manual Online/Idle/Away/Meeting is independent metadata.
- Keep the existing guarded 12-second bridge while bringing up realtime. Only after disconnect/missed-event/ordering/security acceptance, reduce redundant polling into one controlled reconciliation/fallback path. No parallel uncontrolled loops.
- First reusable QA slice: existing A/B Clerk test users in separate persistent browser profiles (auth state outside Git, restrictive permissions), dedicated exact-ID shared Room/Subroom fixtures, guarded cleanup and current DB verification scripts. No auth bypass and no editing founder content. Then test Personal/Room/Subroom delivery, typing expiry, unauthorized subscribe/forged publish, revoked membership, offline/reconnect, sleep/resume, rapid order, failed send/retry, surface/parent unread and notifications.
- Record measured delivery distributions and reconnect results, not a production SLA. Run TS/lint/build/DB invariants/browser/responsive/runtime/diff checks; separate realtime commit/deploy only after the full gate. No realtime QA is claimed at this provider stop. No MS7, media storage, AI, native or Gizmo SDK.

**Resume:** founder confirms Ably Development app/key is installed securely → verify key permissions/environment without printing it → implement the token/transport and reusable QA foundation as the first coherent MS6B slice.
