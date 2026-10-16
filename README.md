# Tosker

**Create a group → Plan together → Go together → Stay connected.**

Tosker is a map-native social coordination app. Rooms provide the shared identity, membership and conversation; Map is the flagship planning surface, with Chat, Board and presence-only Live alongside it. Sandbox stays private, while Personal Chats and authorized Subrooms retain their own boundaries.

## Current release

[Canonical Founder Walk](https://toskerapp.vercel.app) — **MS7.4 FP3 verified**, application `a166934`, 17 October 2026 Singapore. MS7.3 is locked; **MS7.4 remains unlocked pending founder acceptance**. This is a bounded, personal non-commercial development deployment, not production-launch or beta-scale certification.

[Release evidence and rollback](docs/MS7-4-FP3-RELEASE-2026-10-17.md) · [Exact receipt](docs/MS7-4-FP3-VERIFIED-RECEIPT-2026-10-17.json) · [Current documentation index](docs/INDEX.md) · [Recovery handoff](CODEX-HANDOFF.md)

| Capability | Current boundary |
| --- | --- |
| Chat, Rooms, Personal, Sandbox, Board | Authenticated persistent collaboration with context authorization; not the old local-storage-only prototype. |
| Map planning | Collaborative routes, Route-owned Location Cards, independent Map Pins, comments, shared Skip versus private Hide. Users select, preview and explicitly confirm saved places. |
| Search and roads | Worldwide discovery with provider provenance and fallbacks; Walk/Drive remain bounded by implemented region/provider support. Not navigation-safety or worldwide-routing guarantees. |
| Workspace | Map/Board primary surfaces with supported Chat/Live companions and single-surface layouts; responsive focused panes. |
| Live | Avatar-led participant cards, Join/Leave and connection state. **Presence only**—no microphone, camera or Push-to-Talk. |
| Optional location | Single Locate entry, private by default until explicit sharing confirmation; broad default, separately selected precise position, context audience, five-minute expiry and Stop. |
| Future media/movement | FP2B research only. No voice/video integration or continuous/background movement sharing. |

## Privacy and operating limits

Location delivery uses an authorized latest-state API plus content-free Ably notifications. No automatic sharing from Locate, no sharing in Sandbox, no automatic consent renewal and no location-history feature. Membership/session loss, expiry, Stop and failed/late authorization checks remove access; peer display uses a five-second request-start freshness bound.

Durable Vercel Queue cleanup is backed by an independent hourly Neon rescue. Active-row deletion targets 60 seconds after expiry **while infrastructure is healthy**. Outages can delay physical deletion; SQL deletion is not erasure from Neon recovery history/WAL or recipients' devices. The existing six-hour recovery window is disclosed, not silently disabled. [Full retention contract](docs/MS7-4-FP3-DURABLE-CLEANUP.md).

Founder-review caps: 100 new sharing consents/day, 2,000 latest-state reads/day and 30 session checks/10 seconds. At one read per three seconds, this is about **1.67 aggregate viewer-hours/day**, not a 200-user beta. The current capacity attestation expires **21 October 2026, 02:49:57 Singapore**; renewal requires a fresh account-capacity review. Do not reset limits or bypass fail-closed admission.

All providers remain on the existing Free/Hobby allowances. Reassess hosting eligibility at MS14 Commercial Foundation, or immediately if actual commercial activity starts earlier. No permanent production-provider commitment is implied.

## Stack and replaceable boundaries

- Next.js 16 / React 19 / TypeScript; Tailwind CSS 4 and Tosker's existing visual tokens.
- Clerk authentication; Neon PostgreSQL and Drizzle migrations.
- Ably for authorized realtime notification/presence, not durable location payload transport.
- MapLibre renderer; Geoapify discovery/tiles/road adapters remain replaceable. Preserve provider/source attribution and field-level storage rights.
- Vercel application/Queues; independent Neon scheduled cleanup.
- Node.js 24 is the verified release runtime; use the committed npm lockfile.

Server configuration stays server-only: database, Clerk, Ably, invitation encryption and Geoapify search credentials. Only the approved browser Map credential is intentionally public. Never print keys, commit environment files or reuse server secrets in `NEXT_PUBLIC_*`.

## Safe local review

**Do not run ordinary `npm run dev` against this checkout's default environment:** its retained configuration points to the main writable database.

The existing isolated review project contains checked-in schema and synthetic fixtures only, with the specifically approved minimal founder identity link. Credentials and receipts are private/ignored. Recovery starts with:

```sh
git status --short
git log -5 --oneline
node scripts/ms74-fp3-review-runtime.mjs check
```

Only after explicit review authorization, using Node 24 and the existing valid isolated build:

```sh
node scripts/ms74-fp3-review-runtime.mjs start
```

This binds `http://localhost:3000`, checks the exact isolated database and blocks Production cleanup/management credentials. It does not create another database, copy founder data or migrate automatically. Stop with Ctrl-C in the owning terminal. Local sharing tests additionally require the approved bounded synthetic cleanup workflow; do not substitute a laptop worker for Production retention.

For authorized development, affected checks include `npm run typecheck`, `npm run lint`, the repository's scoped test scripts, and the guarded isolated `build` workflow. Review scripts vary in database/fixture scope: read their guards before running them. Never run historical seed/cleanup scripts indiscriminately.

## Release and recovery

Recover [CODEX-HANDOFF.md](CODEX-HANDOFF.md) and the latest dated release first. Check Git/WIP, exact project/environment, database/migrations and immutable evidence. Stage a clean Production artifact without canonical aliases, finish privacy/security/A/B/capacity gates, then promote **that tested artifact**. Never promote a diagnostic build or deploy partially accepted work.

Git documentation commits can be newer than the application SHA. Automatic domain assignment is intentionally paused from the prior rollback/manual-release workflow; a Git push alone is not canonical acceptance. Preserve hosted cleanup consumers/rescue across rollbacks and never roll back migration history or retained founder data blindly.

The local review server is stopped. Retained Founder Walk Rooms remain available on canonical; their purpose and preservation qualifications are in the release report. **Development is stopped for Founder Walk.**

Historical [MS2 README](docs/history/README-MS2-PROTOTYPE.md) is preserved verbatim. Early local-only, no-auth and milestone-order statements describe that prototype, not today's deployed product.
