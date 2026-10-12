# MS7.4 FP2 recovery

12 October 2026 SGT. Save state **R**. Research only; no FP2 implementation, migration, push, deployment, procurement or provider configuration is authorized. The current founder brief is `5f4eff8b-8351-4433-9c65-c3c54995203c/Pasted text.txt`, read in full. Its pre-execution gate supersedes earlier FP1 continuation authorizations.

## Canonical and repository

- Fresh remote `refs/heads/main`: `7dc332e84256531f96ccc6a0c971279770fa2431`.
- Fresh Vercel canonical lookup: READY Production `dpl_F8hgv39JpoZv15WRWJH3RSGYr8tc`, same Git SHA, exact alias `toskerapp.vercel.app`, no alias error, region `iad1`. HTTPS follow-redirect probe returned 200.
- Local recovered HEAD: `757d64884b84137c564e65264ac92ccf2342646a`, branch `codex/ms74-foundation`. Differences from canonical are FP1 documentation and the canonical QA scanner correction, not application changes. No reset or checkout performed.
- [FP1 release receipt](MS7-4-FP1-CANONICAL-RECEIPT.json) remains historical evidence: canonical A/B passed, Join samples 821–829ms; three immediate reconnect Board navigations passed. These tests were not rerun for research. Physical mobile certification and the receipt's network/read-marker caveats remain.
- Read AGENTS, all 491 lines of the recovered handoff, roadmap, FP1 receipt, Live ADR, and current workspace/Live/Locate source. Older roadmap/ADR opening statuses lag the final release receipt; the FP2 current-status additions supersede them without erasing history.

## Database and founder state

Read-only migration verification passed all **29 hashes**, with catalog matching **35 tables, 253 columns, 128 constraints and 15 enums**. General integrity passed: 8 users/profiles/Sandboxes, 7 Rooms, 14 memberships, 5 Personal conversations, 35 messages, 13 Board notes, 2 Board pins, 52 notifications. No listed duplicates or orphans. No migration replay, repair, restore or data mutation occurred.

Exact server-side TID `8V3X7P1` resolution is unique. Founder membership is present in all three retained review Rooms:

| Room | Purpose | Disposition |
| --- | --- | --- |
| `ms74-fp1-qa-a39d9eea` | MS7.4 FP1 Founder Review — Live a39d9eea; A/B plus founder, scoped/open children and safe Chat/Board evidence | Keep for Founder Walk |
| `ms73-founder-review-904a9dea` | MS7.3 shared Map review | Protected; keep |
| `ms73-qa-bfff9475` | Earlier Map review containing founder contributions | Protected; never automatic cleanup |

The strict historical retained-data audit is **not an unchanged-data PASS today**. It reports differences in `conversation_reads`, `notifications`, `trip_mutation_receipts`, `trip_places`, and `trip_plans`; the other 30 table fingerprints match. Attribution finds three founder read-marker advances in addition to the two previously documented QA A/B advances. Notification changes include founder read/destination-read fields. A Map card title and its plan revision changed at approximately **2026-10-12 05:37:35 UTC**; the matching new mutation receipt identifies the founder actor and the exact card. Current totals are **19 cards and 109 mutation receipts**, not the old 108 receipts. Preserve this newer state.

The before-migration backup is not a post-FP8 row baseline: its missing `default_title` values and old fixture rows must not be mistaken for new corruption. The exploratory comparison also initially keyed mutation receipts by `id`, but their key is composite; its added-row classifications are invalid and excluded from conclusions. A subsequent timestamp/result/actor query confirms exactly one receipt since the FP1 final audit, belonging to the founder rename. No content or coordinates were copied into this report. Historical baseline files were not rewritten; read-only audit scripts refreshed their ignored result files. No claim that every founder row is unchanged.

## Existing provider verification

Ably source still issues exact-context Live `presence` + `subscribe` only, no Live publish or client wildcard, using current session/scope authorization and existing revocation locks. A fresh **token-only** probe for the retained QA owner's exact conversation returned those two grants on one channel, TTL 60 seconds. No realtime connection, Join, publish, new management token or permission change occurred; no token/key was printed. This proves the local key's effective grant, not an independent reinspection of every Vercel environment.

Ably dashboard currently requires login. Last verified account snapshot is **11 October: Free, 4,012 / 6,000,000 monthly messages, 4 / 200 connections, 15 / 200 channels**. It is not today's usage. Existing scoped management tokens remain recorded as revoked; none recreated.

Geoapify dashboard is accessible: existing `tosker` project is **Free**, two existing keys, **3,000 credits/day**. Settled statistics for **12 September–12 October UTC** show **428 requests / 475 credits**: tiles 273 requests / 69 credits, geocoding 90 / 90, routing 65 / 316. This is a period aggregate, not today's daily remainder. No sample API request was sent. Application sub-budgets remain 120 geocoding reservations/day and 60 conservative road credits/day; tiles are outside those server counters. MapLibre/provider abstraction unchanged.

Vercel connector verifies deployment identity but does not expose account billing/usage. Vercel and Neon dashboard attempts reach sign-in. Their current purchased plans, invoices, compute/transfer totals and account-wide remaining allowances are **unverified**, not zero. Public pricing and observed database inventory must be reported separately. No new login credentials or permissions requested merely to finish research.

## Security incident and remediation gate

Opening the existing Geoapify project unexpectedly landed on its API-key page. Although the key rows were masked, that page's generated request/code example exposed a full credential in the browser tool's returned accessibility text. This was not an intentional reveal action, but **the key did enter this conversation's tool output**. It was not copied into files, commits, application code or another destination. A boolean-only local comparison confirms it is the existing **server `GEOAPIFY_SEARCH_KEY`** in ignored `.env.development.local`, not the browser key. Its value is deliberately absent here.

Treat that server credential as exposed and rotate it through the founder-controlled secret workflow before further implementation/provider QA. Preserve Free plan, quotas, restrictions, separate browser key and environment separation. The prior canonical authorization reused the server credential, so reconcile Development and canonical Production assignments without printing either old or new values. A credential replacement in Vercel does not change the environment captured by an already-running deployment; coordinate exact replacement verification, a narrowly authorized deployment if required, and old-key revocation to avoid silently breaking canonical search/routing. **No rotation, revocation, environment edit or redeployment was performed in this research pass.** Founder remediation authorization/action is required. Do not visit the key page with an unfiltered accessibility snapshot again.

## Preserved unrelated work

Existing modifications: two historical Design Hub/Web handoff hunks and `docs/CROSS-PROJECT-INHERITANCE.md`. Untracked design-skill, Art, Design Hub and parked Web documents, `docs/design-hub/`, `docs/research/`, `experiments/`, and `toskerArt/` remain unrelated. No blanket staging or application editing. No new QA fixture or cleanup required.

## Next save state

R is recovery complete with the above qualifications and credential-remediation gate. A contains the proposed workspace state machine, privacy/lifecycle contract, provider comparison, cost model, estimate and acceptance plan. B implementation, C local acceptance and D release candidate remain **NOT STARTED**. FP1 remains canonical; MS7.1/7.2/7.3 locked, MS7.4 unlocked, MS8 not started.
