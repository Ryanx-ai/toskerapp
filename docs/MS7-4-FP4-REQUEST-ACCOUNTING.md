# FP4 server-authoritative request accounting

27 October2026 Singapore. Founder final execution authorization read in full from attachment`b23642bc-8a4a-4b78-a6ac-4501d420384b`. Recovered`8084aadc3133a882d3b615b089371813134a9d45`. This document is the R/A/B accounting ledger, not release acceptance.

## R — recovered baseline

Read-only receipt`.git/ms74-fp4/recovery-1793031737632.json` PASS: retained33migration hashes/timestamps; isolated34; exact founder resolves; protected rows match the original26October FP4 fingerprints under their original exclusions; zero isolated payloads/active shares/workers. No old baseline rewritten. Unrelated Art/Design/Web WIP preserved. Canonical remains FP3`a166934`, and has not been deployed by this wave.

## Contract to implement and verify

- Reuse existing PostgreSQL `map_provider_usage` and `location_cleanup_budget`; no paid service or schema migration for accounting.
- Charge each authenticated logical latest-state read once at the shared service entrypoint, before validation/session/worker/context failures can return. Retry, reconnect, separate tabs/users/workers are new requests. Do not trust client-generated IDs to waive charges.
- Local isolated review enforces800reads/day and20consent attempts/day, below the unchanged hosted2000reads/day and100consents/day. Use databaseUTC day, not device/host locale. Preserve existing rows; normal UTC rollover is not an operator reset.
- Charge consent admission attempts independently of the later transactional cleanup work, so failures do not refund capacity. Existing cleanup reservation remains separately authorized and must not charge the same consent twice.
- Session validation reservations remain bounded30/10seconds across workers. Stop/deletion remains available under exhausted admission quotas; these safety paths never expose peer coordinates.
- Fail closed before peer reads on missing/unavailable/exhausted accounting. Counter output contains no identity, context, coordinates or credentials.
- The unknown26October isolated period must remain held, not initialized as zero or reconstructed from651lower-bound receipts. Verify a later databaseUTC day and counters before live QA. Keep original receipts/hold as historical evidence.
- Verify in uniquely owned isolated shadow tables with actual concurrent SQL and mocked deterministic clock only inside that shadow. Public counters and retained data must be byte-identical before/after. Mocked tests are not hosted capacity/cleanup acceptance.

No implementation at this R checkpoint. Rollback remains unchanged canonical; no database rollback needed. Next: shared accounting implementation → atomic/concurrency/failure/rollover tests → actual available-capacity gate → outstanding live acceptance. Stop on a failed critical boundary, never bypass the hold to make tests pass.
