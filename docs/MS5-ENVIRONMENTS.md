# MS5 environment contract

## Required variables

| Variable | Exposure | Owner | First use |
| --- | --- | --- | --- |
| `DATABASE_URL` | server only | Neon/Vercel | MS5.0 database access |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | browser-safe public key | Clerk/Vercel | MS5.1 auth UI |
| `CLERK_SECRET_KEY` | server only | Clerk/Vercel | MS5.1 auth/session |

`.env.example` is the committed inventory and contains no values. `.env.local`
and all environment-specific local files stay ignored. A `NEXT_PUBLIC_` prefix
is allowed only for information designed to ship to browsers.

## Environment isolation

- **Local:** development Neon branch/database and Clerk development instance.
  Use `.env.local`; standalone migration tooling explicitly loads that file.
- **Preview:** an isolated Neon preview branch and Clerk development instance.
  Never point Preview at the production database.
- **Production:** production Neon branch and Clerk production instance. Changes
  require an explicit migration/release step.

After provider provisioning, pull Development variables with Vercel tooling and
compare key names to `.env.example`. Pulling may overwrite `.env.local`, so do
not keep unrelated hand-written secrets there.

## Migration commands

- `npm run db:generate` generates reviewable SQL from the schema.
- `npm run db:check` checks committed migration consistency without a database.
- `npm run db:migrate` loads `.env.local` and applies pending migrations to that
  explicitly configured database.

The config's fallback URL points only to localhost so offline generation/checks
can run without credentials. A migration without a real configured local URL
must fail rather than reach a shared environment. Never use schema push against
production.
