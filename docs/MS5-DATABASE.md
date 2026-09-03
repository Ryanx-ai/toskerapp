# MS5 development database

## Verified development resource

MS5.0B uses the Vercel-managed Neon resource
`neon-byzantine-jacket` (`lucky-queen-41711352`). It is connected to the
`tosker.app` Vercel project for the **Development environment only**. Its
credentials live in ignored `.env.local` and Vercel's encrypted environment
configuration; values must never appear in source, logs, or reports.

Migration `0000_nebulous_unus` is the canonical initial schema migration. Run:

```text
npm run db:migrate
npm run db:verify
```

The verifier makes read-only catalog queries, checks the expected application
tables and critical uniqueness/ordering indexes, confirms foreign keys and the
Drizzle migration record, and counts the empty `users` table. It never prints a
connection string.

## Preview provisioning

Before MS5 code is deployed to Preview, connect Neon Preview Branching so each
preview deployment receives an isolated branch derived from the designated
development/schema baseline. `DATABASE_URL` must be scoped to Preview and must
not equal the Production value. Preview migrations should run against that
branch as an explicit release/CI step, never from application startup or build.

## Production provisioning

Production is intentionally unprovisioned during MS5.0B. Before the approved
MS5 production release:

1. Create or designate a dedicated protected Neon production branch/database.
2. Scope its `DATABASE_URL` only to Vercel Production.
3. Back up/check recovery settings and review the generated SQL.
4. Apply committed migrations explicitly, verify them, and only then promote
   compatible application code.

Random previews and local development must never receive production database
credentials. Production remains on the locked MS4.1 application until founder
approval.
