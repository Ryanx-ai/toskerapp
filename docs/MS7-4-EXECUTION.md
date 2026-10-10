# MS7.4 execution and recovery

## R — Recovery and formal MS7.3 lock · 10 October 2026

Founder authority: MS7.4 Live Coordination Foundation directive, attachment `f77eae28-c79c-4846-af3e-6901ddda98a6`. MS7.1, MS7.2 and **MS7.3 LOCKED**. [Durable lock receipt](MS7-3-LOCK-RECEIPT.json). MS8 not started. No application changes during lock.

Recovered HEAD `08e61640ce6a49c8b898b98b2124e60ed8c19d62`; new local branch `codex/ms74-foundation`. Fresh remote main is `35a6f86182e36a2f31eca84a9280e965d71f17cd`. Canonical `https://toskerapp.vercel.app` is still READY Production `dpl_4jNvKenubueFoVCm24GVZiUDE3Dg`, immutable host `tosker-743mjmjfd-pangea6.vercel.app`, exact application SHA. HTTP307 to `/app`, final200. Scoped runtime error/fatal window 06:25:04.118–06:40:04.118 UTC empty. Final FP8 live A/B evidence remains applicable; it was not replayed and no road/geocoding tests were repeated.

### Completed recovery checks

- `git diff --check`, Git HEAD/remote main, application/schema diff against canonical: pass; only recovery documentation/testing differs.
- `scripts/verify-migration-history.mjs`: 29 exact hashes; 35 tables, 253 columns, 128 constraints, 15 enums.
- `scripts/audit-ms73-fp3-ownership.ts --post-cutover`: seven guards; zero orphan/mirror/duplicate-position failures.
- `scripts/audit-fp8-release-recovery.ts --after`: protected founder resolves uniquely; all retained non-fixture table fingerprints match; no database writes. The ignored verification receipt timestamp is refreshed by this audit.
- `scripts/audit-ms5.mjs`: relational invariants pass. 8 users/profiles/Sandboxes, 6 Rooms, 11 memberships, 5 Personal Chats, 34 messages, 12 Board notes, 2 Board pins, 3 capability rows, 6 accepted connections and 48 notifications. Map totals: 5 plans, 8 Routes, 19 cards/memberships, 5 comments, 108 receipts and 2 Map Pins.
- Vercel names/types/targets checked without values: separate browser/server Geoapify credentials assigned to Development and Production; server Production key sensitive. Ably key assigned to Production, existing local Development configuration retained. Database/Clerk assignments preserved. No secrets printed, configuration changed, plan upgraded or provider purchased. Dashboard restrictions and account usage are not newly certified.

### Data and WIP preservation

Retain `ms73-founder-review-904a9dea` for Founder Walk and `ms73-qa-bfff9475` for protected founder-authored content, both containing exact TID `8V3X7P1`. FP8 disposable `ms73-qa-1fed56ad` was already deleted; do not reseed it, repeat deletion or restore its backup. No new MS7.4 fixtures yet.

Unrelated modified `docs/CROSS-PROJECT-INHERITANCE.md`, two older handoff hunks, and untracked design-skill/Art/Web documents, `docs/design-hub/`, `docs/research/`, `experiments/`, `toskerArt/` remain untouched. Stage only explicit MS7.4/lock documentation and the new handoff hunk.

### Recovery instructions and pending gates

Read this ledger and the latest handoff first; verify current branch/HEAD/main/canonical before resuming. R is documentation-only. A must audit Live, coordination and notifications and report the realistic execution estimate before implementation. If material architecture change, new procurement or more than eight hours is needed, stop after A for founder approval. Otherwise only the authorized bounded local slice may proceed through B implementation, C A/B/auth, D responsive/performance and E candidate. No MS7.4 canonical deployment or production migration without further explicit approval; no unfinished push. At R, B–E and all new Live acceptance remain pending.
