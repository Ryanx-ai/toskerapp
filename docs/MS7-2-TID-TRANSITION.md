# MS7.2 — TID foundation and existing-user transition gate

2026-09-16. **Founder-approved Development reset APPLIED; lookup/copy implemented and locally validated. Not pushed/deployed.** The historical pre-decision audit below is retained as evidence, not the current directive.

## Approved transition / actual result

Founder explicitly accepts breaking test-era legacy references even if shared; **no alias/compatibility system**. All six existing users were inventoried against all27 foreign-key columns referencing users. They reference UUID `id`, never TID. The only public TID column is `users.tid`; current app routes/invitations/auth remain UUID/slug-based. All four non-A/B identities have authored messages and Personal/shared dependencies; one also owns a Room/Hall content. No account is safely disposable. All six database/Clerk identities retained; credentials untouched.

`scripts/ms72-tid-transition.ts inspect` is read-only. Explicit `apply-development-reset` uses a repeatable-read transaction, exclusive users lock, exact six-user allowlist, existing cryptographic generator, occupied-value collision retry and authoritative unique index. It fingerprints all25 public tables before/after, excluding ONLY `users.tid`; mismatch rolls back. Every non-TID value/relationship remained identical. Six legacy-format values → six unique canonical `[A-Z0-9]{7}` values; zero collisions, zero remaining legacy TIDs. Per-user old-format→new-value mapping was emitted in the scoped recovery tool output; not duplicated into public repository documentation. No historical SQL migration, schema/metadata modification, alias or identifier-derived authorization.

New accounts use the same crypto generator and five-attempt DB-unique bootstrap boundary. Existing IDs remain immutable under normal Profile/status/Brand/Room/private nickname actions. Discovery retains current name/username behavior but its TID branch is now **exact**, trimmed ASCII lowercase-normalized; partial/legacy TID matching removed. Profile/Namecard copy emits precisely the seven stored characters, with accessible success/failure status and manual fallback; no cosmetic ID shortening.

Fresh tests pass generation/forced collision/exhaustion/idempotence and no identifier changes during actor-owned Profile/privacy/Room/Brand service tests. A/B browser tests pass canonical display/copy and exact lowercase/whitespace lookup, rejecting partial/legacy-style lookup. Browser registration through normal Create account reached a human-verification challenge; no temporary Clerk/database user created. **Registration→Profile→Namecard→lookup still needs normal-browser acceptance.** No CAPTCHA/auth bypass was attempted.

Rollout: old canonical code still generates legacy IDs against shared Development infrastructure. No strict format DB constraint was imposed while old writers remain. Before deployment, re-inventory; new unreviewed users cause the explicit reset tool to stop. Recheck after the Git-backed new generator is live. Canonical rollback to old code requires this check again. Do not regenerate already-canonical identifiers or provision compatibility infrastructure. All19 SQL migration hashes/catalog remain aligned.

## Historical pre-decision dependencies (superseded)

- Six current users; zero canonical seven-character TIDs and six legacy TIDs. Fresh post-test counts remain six; no real ID was changed.
- No foreign keys target TID, no other persisted TID columns and no stored Chat message references found in the bounded database audit. User UUID remains relationship/authorization authority.
- Current Room/Subroom/Personal routes, invitation tokens and notification destinations use IDs/slugs, not TIDs. Namecards/Profile/Friends discovery expose the TID string; `findPeopleAction` currently includes legacy substring search.
- `docs/MS5-IDENTITY.md` explicitly described TID as a stable public identifier. Source/demo/documentation examples are not proof that real users never copied their displayed IDs externally. No external-sharing evidence was supplied. Founder has been asked to confirm test-only status or require aliases; do not silently assume references can be broken.
- Canonical deployed old bootstrap still generates legacy format against the same Development database. A strict seven-character DB constraint before accounting for old writers would break sign-up during rollout. Existing relationships do not remove this rollout risk.

## Implemented new-user foundation

`server/accounts/tid.ts` uses Node cryptographic `randomInt` over all36 `A–Z0–9` characters, length7, without deriving identity/account attributes. Extracted the existing bootstrap's bounded five-attempt insert/reread loop without changing its authority: existing provider identities return their existing UUID/TID; new candidates are validated; database TID/provider unique indexes arbitrate conflicts; collision retries and exhaustion are explicit. Normal profile/Room/Brand inputs cannot update TID.

`lib/tid-contract.ts`: canonical `^[A-Z0-9]{7}$`; lookup trims then checks ASCII alphanumeric length7 before uppercase conversion (Unicode case expansion is not accepted). Helper is ready for the existing lookup/copy integration after the transition decision; it does not pretend the currently deployed lookup has changed.

Fresh service tests PASS1000 generated shapes, letters/digits/mixed cases, exact lowercase normalization, whitespace/punctuation/Unicode/length rejection, actual DB collision retry, five-attempt exhaustion and existing actor reuse. Synthetic transaction rolled back. Updated generic bootstrap integration PASS one stable user/profile/Sandbox, new canonical TID and unchanged owner-managed display name when provider name differs; its exact random non-login test identity/Sandbox was cleaned up. No application undo for the disposable fixture; all six real accounts remain untouched.

## Historical conditional proposal (REJECTED by founder; do not implement)

Requires founder resolution, not implemented here:

1. Snapshot/verify the exact current identifier dependency set, including any additional users created by old deployed code since this audit. Preserve each existing public TID as a unique legacy lookup alias tied to the immutable user UUID.
2. Create a NEW forward migration; never edit applied history. Generate canonical seven-character values with cryptographic randomness and bounded DB-unique retry. Preserve all UUID/auth/profile/Room/membership/Chat/Hall relationships. Verify one canonical value per user and alias collision safety.
3. Account for simultaneous old legacy writers until the complete Git-backed release is live. A narrowly scoped compatibility insertion path must return a valid new canonical value even to old bootstrap code; no partially deployed signup failure. Validate relevant QA factories against the new constraint instead of silently weakening it.
4. Existing discovery uses exact normalized canonical lookup; the explicitly grandfathered old aliases may resolve to the same user, displaying only their new canonical TID. Alias knowledge must not grant optional fields, Room access or a conversation. No large sharing or search redesign.
5. Profile/Namecard copy emits exactly7characters with accessible success/failure feedback. Run migration hash/catalog/invariants, collision/lookup/auth tests and browser old/new identity checks, then the full integrated release gate.

If founder confirms the legacy IDs were never externally used, a controlled forward backfill without retained lookup aliases may be appropriate, but still requires the same old-writer rollout guard and relationship validation. Do not cosmetically strip/shorten legacy strings in the UI; that would create incorrect identity references.
