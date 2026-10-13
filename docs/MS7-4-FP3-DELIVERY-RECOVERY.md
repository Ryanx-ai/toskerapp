# FP3 delivery recovery / location architecture

13 October 2026. Recovery base `b5f270a`. Research and bounded diagnostics, not release acceptance.

## R — recovered

Read both founder attachments in full: location architecture investigation and collaborative movement. The latter permits local prototyping of foreground movement at most once per 60 seconds, with a fixed five-minute consent session, but not canonical deployment. The accompanying direct delivery-recovery instruction separately forbids implementing temporary snapshot storage without founder approval and permits release only of a verified privacy-equivalent ephemeral repair. This pass takes the common safe scope: investigate existing delivery, research/propose storage and movement, preserve FP2A. No storage implementation or deployment.

Fresh Vercel alias lookup confirms `toskerapp.vercel.app` → `dpl_BeaJBAwSj33GQzxWzE2HRXj5vcLh`, READY, exact `3e06bf9e5c9ec09ee0c3dedb82e5e7088cc41161`. The immutable rejected FP3 `0264500` deployment remains available for scoped diagnostics, not canonical. Deployment metadata's historical alias list is not authoritative; the fresh alias lookup is. CLI resolves existing `pangea6 / tosker.app` correctly. No new deployment, promotion or provider configuration.

Git source remains original FP3; unrelated design/art/website WIP preserved. Read full incident and execution ledger. Existing consent-only migration0029 remains; fresh read-only verifier passes30 hashes,36tables,260columns,134constraints,15enums. No schema migration or database rollback. Prior founder Sandbox read-marker drift remains a qualification, not rebaselined. Existing QA fixture must pass exact run/owner/creation checks and server-side unique founder TID8V3X7P1 membership before use; no fixture creation or membership edit.

Prior evidence retained unchanged in `MS7-4-FP3-P0-INCIDENT.md`: failed acknowledged ephemeral→remote delivery, working ordinary messages, local/Singapore successes, cold cross-region miss and delayed success. No repetition of fallback/SDK/REST/region candidates. New hypothesis: test whether explicit listener attachment plus actual ordinary/ephemeral receipt confirmation on the recipient feed resolves deployed snapshot delivery. No arbitrary warmup sleep. No precise provider test, no geocoding/routing calls.

## A — readiness diagnostic (pending)

`scripts/investigate-ms74-fp3-readiness.ts` targets only the retained immutable FP3 deployment. Real isolated A/B Clerk sessions and exact application-issued scoped Ably tokens; synthetic public landmark, broad payload only. Both directions, attached and receipt-confirmed modes, plus Stop. Readiness probes contain version/random nonce only, never location or identity payload. Probe originates locally: it proves that recipient path, **not** a distributed Vercel-region readiness barrier. No application instrumentation is deployed.

Anonymous monotonic trace captures subscriber creation, attachment start/ready, probe publish/ACK/receipt, snapshot request/accepted/receipt and Stop request/receipt. Server-internal auth/publish/ACK and UI reconciliation are explicitly unobservable in the unchanged deployment and not fabricated. Twelve seconds is a missing-delivery observation deadline, not a publication delay. Missing deliveries are null, excluded from latency percentiles. Receipts are write-once private files; prior evidence is not overwritten.
