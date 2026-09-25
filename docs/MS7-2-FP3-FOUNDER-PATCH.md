# MS7.2 FP3 — recovery / signup gate

2026-09-25. Founder execution PDF read in full. FP3 authorized through local acceptance, normal push, canonical deployment and live smoke; MS7.2 must not auto-lock and MS7.3 must not start. Preserve unrelated Art/Web/research/experiments and untouched/untracked `toskerArt/`.

## Recovery

- HEAD `e3228bd`; FP2 application `03b25a2`, foundation `00c9e95`. Main13 ahead; remote main independently read as `5ae54fb0ff7d0dc6ab5d026ada8a69f25e34e70a`.
- Canonical `toskerapp.vercel.app` still aliases READY Git-backed MS7.1 deployment `dpl_8HeaZ9UFjhwJ615VzZSc1iEL6xwp`, same remote SHA. No push/deployment performed.
- Existing local server listens on3000. No server/session/auth configuration changed.
- All20 migration hashes match Development; latest catalog matches25tables/164columns/78constraints/15enums. No migration/schema/data mutation.
- Development invariants PASS:8users/8profiles/8Sandboxes,3Rooms/4memberships,5Personal conversations,29messages,9Hallnotes/2pins,3capabilities,6accepted connections,32notifications; duplicate/orphan checks0.

## Fresh signup verification — human challenge resolved, TID gate FAIL

Read-only Clerk SDK and parameterized Development SQL verified each supplied email has exactly one Clerk account, verified email, one matching Tosker User, populated Profile/username and one permanent Sandbox:

| Founder account | Application UUID | Username | TID contract |
|---|---|---|---|
| ryanchinqf3@gmail.com | d3d151d1-6ff3-459a-9027-bde698ed3288 | ryanchinqf3 | Legacy format; fails `^[A-Z0-9]{7}$` |
| orcxcustoms@gmail.com | 415077dd-5f7d-4917-8c6e-ac772dc80e75 | orcxcustoms | Legacy format; fails `^[A-Z0-9]{7}$` |

No duplicate/partial identity observed. Founder confirms successful normal signup, with human verification on one account; no evidence that the differing challenge behavior is a Tosker defect. Full FP2 registration release gate cannot yet be marked satisfied because both persisted TIDs fail the required canonical contract. No impersonated browser session or password requested.

Root cause is consistent with the verified deployed source: `5ae54fb:src/server/accounts/bootstrap.ts` generates `TID-XXXX-XXXX`; the local MS7.2 generator creates seven characters. Existing-identity bootstrap deliberately preserves the stored TID, so merely logging into the local build will not repair it. The approved historical reset tool is restricted to six explicitly inventoried users; these two new real founder accounts are outside that allowlist. Do not rerun or widen the old reset implicitly.

## Approved repair / FP2 gate closeout

Founder explicitly approved the two-account repair and continuation on2026-09-25. `scripts/ms72-fp3-tid-repair.ts inspect` verified27 UUID foreign keys and25-table fingerprints. Explicit `apply` changed exactly2 legacy TIDs to unique canonical IDs. Fingerprints exclude ONLY these two `users.tid` values; all other fields, rows and every other user's TID remained identical. No accounts deleted, provider calls, schema/migration changes or alias system. A subsequent apply is idempotent, not a rekey operation.

Fresh TypeScript, scoped ESLint, all20 migration hashes/catalog and DB invariants PASS after repair. Founder-performed normal signup plus verified canonical application identity closes the prior **FP2 RELEASE GATE: SATISFIED**. FP2 local acceptance remains complete; canonical release is still pending, explicitly combined with the next validated FP3 candidate. The original failed verification below is retained as history, not an outstanding request.

## Historical decision / remaining execution

Obtain explicit approval to replace ONLY these two founder accounts' legacy public TIDs with unique seven-character values, accepting that copied legacy IDs stop resolving (no aliases under the existing transition policy). Preserve UUIDs, Clerk bindings, profiles, Sandboxes, Rooms, history and every non-TID field. Then use a separately scoped guarded transaction with dependency review and before/after fingerprints, verify collision/uniqueness and identity viability, and close the FP2 gate before FP3 implementation. Re-inventory before release because the old canonical writer remains live until the validated FP3 deployment.

Repair complete; FP3 product implementation, push and deployment remain. Existing useful work preserved. Next: floating shell/depth/collapse; coherent Create Chat focus; supported auth dismissal; trip-focused creation without Map/schema expansion; full visual/functional gate; exact validated Git-backed canonical release and live smoke; Founder Walk3. No automatic milestone lock.
