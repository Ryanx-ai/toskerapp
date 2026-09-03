# ADR 0001: MS5 backend foundation

- Status: accepted for MS5.0A
- Date: 2026-09-03
- Scope: architecture and inactive foundation only

## Decision

Tosker remains one Next.js App Router application on Vercel. Managed Neon
Postgres is the durable system of record, accessed through Drizzle ORM and the
Neon HTTP driver. Drizzle Kit owns versioned SQL migrations. Clerk is the
selected authentication provider for MS5.1; authentication is intentionally
not wired in this checkpoint.

Server Components may read through server-only data functions. Mutations use
Server Actions when they belong to the Tosker web UI and Route Handlers when a
stable HTTP boundary is required (for example an invite link or webhook).
Neither boundary may accept a client-supplied user id as authority. It resolves
the provider session to a Tosker user, then applies resource authorization.

## Why this stack

- Neon is ordinary Postgres, has a native Vercel integration, and supports
  isolated preview branches without adding a second application service.
- Drizzle keeps the relational model and generated SQL reviewable while
  working cleanly with the Neon serverless driver.
- Clerk supplies maintained session and identity infrastructure with separate
  development/preview and production instances through Vercel. Tosker still
  owns its User/Profile/TID and authorization model.
- This is a small, replaceable set of boundaries: identity provider, database,
  application authorization. Realtime and media do not distort the first
  durable write path.

## Identity and public IDs

The Clerk subject is stored as an external auth identity, never used as a
public Tosker identifier. `users.id` is an internal UUID. `users.tid` is a
separate, immutable, unique, shareable, non-sequential handle. MS5.1 will
generate a normalized random TID server-side with sufficient entropy and retry
on the database uniqueness constraint. Internal UUIDs must not appear on
namecards or lookup surfaces.

## Authorization invariants

- Every request resolves the authenticated provider subject to one Tosker
  actor on the server.
- Room reads and writes require a Room membership; owner-only changes require
  both the Room owner and an `owner` membership.
- Conversation reads and writes require an explicit participant. Room
  membership alone does not silently grant access to every future conversation.
- Invite tokens are random secrets; only a one-way token hash is persisted.
  Acceptance is transactional and idempotent. Anonymous links never grant
  unbounded Room access.
- Message author, Hall author, capability installer, and notification actor are
  derived from the server actor, never trusted request fields.
- Pinning a message creates a Hall reference to the source Message; it does not
  copy the message into a second authority.

## Data model guardrails

`Room` is the ownership and membership container. A `Conversation` can point to
a Room but is a separate entity, so a Room is not locked to one conversation.
The schema does not yet implement Subrooms. Gizmos persist as unique Room
capabilities. Automatically collected Files/Links/Photos/Videos remain future
resource collections, not capabilities or conversations.

Application services must create a Room, its owner membership, and its first
conversation/participant rows in one transaction. Database constraints prevent
duplicate memberships, participants, capability installations, TIDs, auth
identities, and invite-token hashes.

## Environments and migrations

- Local development uses a local Neon development branch (or local Postgres)
  through `.env.local`.
- Vercel Preview uses disposable/isolated Neon preview branches and Clerk's
  development instance. It must never use the production database URL.
- Production uses the production Neon branch and Clerk production instance.
- `.env.example` contains names only. Secrets remain in local ignored files and
  environment-scoped Vercel variables.
- Schema changes are generated into `drizzle/`, reviewed, committed, and then
  applied with `npm run db:migrate`. `drizzle-kit push` is not a production
  migration workflow.
- A migration must be applied to the intended isolated environment before its
  application code is promoted. Production migration execution is a deliberate
  release step, not a build side effect.

## Deferred integrations

Realtime begins only after persisted request/response messaging is correct;
the first candidate is a managed channel keyed by authorized conversation id.
Future media uses private Vercel Blob objects with ownership metadata in
Postgres. No realtime, object storage, queues, Subrooms, or plugin runtime is
introduced by this decision.

## Founder provisioning required before MS5.1

1. Install/connect Neon in the `tosker.app` Vercel project and create distinct
   development/preview and production resources (preview branching preferred).
2. Install/connect Clerk to the project, keeping its development instance for
   development/preview and its production instance for production.
3. Pull development variables locally and verify only the names from
   `.env.example`; do not copy production values into preview/local.
4. Approve the chosen sign-in methods and Clerk production-domain plan before
   authentication is enabled. The current `vercel.app` production URL remains
   untouched by MS5.0A.
