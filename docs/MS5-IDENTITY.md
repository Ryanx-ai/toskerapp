# MS5 authenticated identity

## Development environment

Clerk Development resource `clerk-blue-clock` (`app_3IoHCMXJybyU8Te6UkXuXthAD4v`)
is connected to the `tosker.app` Vercel project for the Development environment
only. Clerk secrets remain in ignored `.env.local` and Vercel's encrypted
environment configuration.

## Identity contract

Clerk authenticates the human. The verified Clerk user ID is resolved
server-side to one Tosker `users` row; it is never accepted from a request body
and never shown as the public identity. Tosker owns the canonical Profile and
stable TID.

On authenticated access, `ensureToskerAccount` transactionally and idempotently
ensures:

- one User for the Clerk provider subject;
- one Profile with a unique username;
- one stable, random `TID-XXXX-XXXX` public identifier;
- one permanent Sandbox conversation owned by that User; and
- one Sandbox participant row for that User.

The partial unique Sandbox-owner index and ordinary primary/unique constraints
are the final concurrency guard. The bootstrap can be called on every session
without regenerating identity or duplicating the Sandbox.

## User experience and failure behavior

Signed-out visitors see a restrained Tosker entry surface backed by Clerk's
development sign-in/sign-up flows. Signed-in application surfaces receive the
canonical Profile identity. A database/bootstrap failure shows an intentional
retry/sign-out state rather than exposing connection details or rendering the
prototype identity.

The application protects every future data operation at its server boundary;
the global shell gate is presentation, not authorization. Clerk middleware
establishes request auth context, while resource services must call the actor
and authorization helpers themselves.

## MS5.1 verification

A real Clerk Development user completed sign-up, account bootstrap, sign-out,
sign-in, and reload. The same internal User, Profile, TID, and Sandbox remained.
Repeated automated bootstrap execution produced exactly one of each and removed
its temporary verification record afterward.

Production Clerk credentials are not provisioned and MS5 is not deployed to
production. A separate production instance and approved domain configuration
are required at shipment time.
