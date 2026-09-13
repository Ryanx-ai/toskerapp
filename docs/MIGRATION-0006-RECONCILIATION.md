# Migration 0006 history reconciliation

2026-09-13. Founder-approved repository-only repair from baseline `1b14c5659ebac13994c9c6d62fa44a5bbdedefc8`.

## Evidence and exact repair

Case C: Development records a reconstructed historical variant, not the SQL first committed to Git. `0006_strange_otto_octavius.sql` first appeared in `e05eb9cab7ef9622057b1d188d447f5a8cce1c15`; no subsequent historical commit changed it. Installed and historical Drizzle versions are ORM 0.45.2 / Kit 0.31.10. The installed migrator hashes the entire UTF-8 SQL file, including whitespace; statement splitting does not change the checksum input.

- Previously committed SHA-256: `0a7eaec260827928c7c00478092f703d58814a8add54338a42e61087fe0e30fc`.
- Development row id 7, journal timestamp `1788513165332`, recorded SHA-256: `41d5ed1602ac800592de8b441b54ca6a1708f662ee88e34ebd08a35bed1224af`.
- Restored repository SHA-256: `41d5ed1602ac800592de8b441b54ca6a1708f662ee88e34ebd08a35bed1224af` (1,452 bytes, no final newline).

The matching variant omits the `WITH ranked ... UPDATE hall_items ...` position backfill. Every DDL statement is unchanged. The timestamp is the migration journal timestamp (2026-09-04T09:12:45.332Z), not an independent application-time audit. The checksum establishes content identity; it does not establish who applied it or whether the backfill was ever executed separately.

**The omitted historical Hall position backfill was intentionally NOT rerun. Migration 0006 was NOT rerun.** No database migration metadata, schema, user data, later migration, snapshot, or journal was changed. No database rollback or backup/restore operation was needed because this repair issued only read queries. The previous repository bytes remain recoverable in Git.

## Current validity

The omitted statement is a one-time data backfill, not a schema prerequisite. The current Hall create/reorder services maintain ordering; current data has zero invalid positions and zero duplicate active positions within a Hall scope. No forward data migration is warranted. Later migrations and current schema expectations remain unchanged.

Validation after restoration:

- Read-only `scripts/verify-migration-history.mjs`: all **15/15** repository hashes and journal timestamps match Development, including 0014.
- Latest snapshot versus live catalog: **23 tables, 146 columns, 71 primary/foreign/unique/check constraints, 9 enums**; columns/types/nullability/defaults, constraints, enum values and declared index definitions pass. PostgreSQL's separate NOT NULL constraint entries are covered through column nullability.
- `npm run db:check`: migration snapshot chain passes.
- `npm run db:audit-ms5`: passes; 6 users/profiles/Sandboxes, 2 Rooms, 3 memberships, 5 Personal conversations, 28 messages, 8 notes/1 pin, 31 notifications; duplicate/orphan checks zero.
- TypeScript, focused verifier ESLint, and `git diff --check`: pass.

The verifier initially needed catalog-result normalization (Neon enum arrays, PostgreSQL NOT NULL entries, index table qualifiers); those were verifier differences, not database drift. No migration application or database mutation was used to resolve them.

Repeat safely with `./node_modules/.bin/dotenv -e .env.local -- node scripts/verify-migration-history.mjs`. It never invokes migration execution. `drizzle-kit migrate` itself does not enforce historical checksum equality, so a successful ordinary migration run is not a substitute for this check.

## Separate follow-up

The Room-history visibility addendum is independent. Verify current retained history, authorization and join/read semantics using isolated QA fixtures; fix product code only if that contract fails. Do not mix it into this migration-history commit. No push or deployment is needed for this repository-only repair; existing production is unchanged.
