# MS7.4 FP3 — recovery and execution ledger

13 October 2026 SGT. Authority: founder FP3 directive, attachment `642e531a-55e9-40ed-ac9b-e23c92308bf0/Pasted text.txt`, read in full. This directive supersedes older wave continuation/deployment authority for FP3.

## Gate status

**R recovered with preservation qualifications; A proposed; STOP before implementation.** Full local scope is estimated at **18–26 engineering hours**, exceeding Section 09's eight-hour gate. Explicit founder time authorization is required. Shared-location implementation additionally requires the dedicated privacy/authorization gate in [architecture](MS7-4-FP3-ARCHITECTURE.md). Canonical deployment requires separate explicit approval. B/C/D/E have NOT begun. No application change, migration, fixture write, provider configuration, push or deployment was made during this recovery.

## R — fresh recovery evidence

- Actual repository `/Users/ryanc/Developer/toskerapp`, branch `codex/ms74-foundation`, starting HEAD `9c9a07a`; local origin/main `3e06bf9e5c9ec09ee0c3dedb82e5e7088cc41161`.
- Fresh Vercel alias/deployment reads: `toskerapp.vercel.app` points to READY `dpl_BeaJBAwSj33GQzxWzE2HRXj5vcLh`, immutable `tosker-jx4c5rym4-pangea6.vercel.app`, exact Git SHA `3e06bf9e5c9ec09ee0c3dedb82e5e7088cc41161`. FP2A live A/B evidence remains in its release receipt/ledger; this recovery did not rerun or claim a new browser acceptance suite.
- Read-only migration verifier: all **29** journal/hash entries pass; catalog matches latest snapshot:35 tables,253 columns,128 constraints,15 enums. No schema change.
- Fresh Vercel metadata only, `decrypt=false`: separate `GEOAPIFY_SEARCH_KEY` **sensitive** entries for Development and Production; separate `NEXT_PUBLIC_GEOAPIFY_MAP_KEY` encrypted configuration entries for Development and Production. `ABLY_API_KEY` sensitive Production entry. No values printed. Local ignored `.env.development.local` mode0600; both Geoapify variables present.
- Replacement Geoapify server-key runtime verification is inherited from FP2A's exact canonical receipt, not repeated here. Browser key untouched. Old exposed server key remains active; **do not revoke without separate explicit founder authorization**. Existing Free plan, restrictions, global/server quotas remain unchanged; dashboard restrictions and account-wide usage were not freshly inspected. No geocoding/routing requests in recovery.
- Fresh existing-credential Ably token-only probe for server-resolved isolated actor A and the owned fixture: exact-context Live operations `presence,subscribe`, no wildcard capability. No realtime connection, presence entry, message or new Clerk session. This proves the requested effective token capability, not every account-level key permission. No key/dashboard/billing changes. Fresh account-wide usage is unverified.
- Read AGENTS, CODEX-HANDOFF, FP2 execution/architecture/provider research and roadmap. Read UI/UX and frontend-design skills, repository design-skills constraints and deployment guidance. Inspected current Map provider/region/routing/Ping, Locate, Live and workspace lifecycle boundaries. Skills are advisory inside existing Tosker tokens/geometry; no new icon package, art system, media controls or design overhaul.

## Protected-data qualification — do not erase

Original `audit-ms74-fp2.ts --verify` **fails**, first at its historical assertion that exactly one retained Map mutation occurred after12October00:00UTC. A read-only, in-memory diagnostic bypassed only that historical count/actor-time assertion to inspect newer changes; it did NOT alter the script, baseline or database and did NOT turn the audit into PASS.

Three retained receipts in that interval are attributed by actor ID to the server-resolved founder:12October05:37:34.970116UTC (known),13October04:48:07.490116UTC and04:48:36.243161UTC (new). Attribution does not prove every changed field's provenance. No coordinate/content payload was printed.

Against immutable FP2 acceptance capture `2026-10-12T15:50:15.433Z`, five protected table hashes differ:

| Table | Before / after rows | Finding |
|---|---:|---|
| conversation_reads |11 /11|Newer founder and other-user read timestamps; previous Sandbox-read qualification remains|
| notifications |48 /48|Changed row contents; exact field-level provenance not yet established|
| trip_mutation_receipts |109 /111|Two additional founder-attributed receipts|
| trip_places |19 /19|Changed retained Map state; preserve|
| trip_plans |5 /5|Changed retained Map state; preserve|

The other29 protected table sets match that capture. Historical FP8 differences remain confined to previously known tables. This is **not a pristine data-preservation pass**. Do not restore older rows, overwrite baseline hashes or classify all differences as QA-owned. Before implementation acceptance capture, inspect remaining field-level attribution and create a separately named, write-once FP3 baseline of current retained data; retain the original FP2 failure/evidence. No data repair is authorized.

## Retained fixtures

Exact TID `8V3X7P1` uniquely resolved server-side; membership verified in all three Rooms. FP1 fixture run/status/ownership validated. No duplicate account, new fixture, membership modification or cleanup.

| Room slug | Purpose / disposition |
|---|---|
| `ms74-fp1-qa-a39d9eea` |A/B Live/workspace fixture with founder and scoped/open children; KEEP for Founder Walk|
| `ms73-founder-review-904a9dea` |Retained Singapore Map review; KEEP|
| `ms73-qa-bfff9475` |Contains founder contributions; PROTECTED, no automatic cleanup|

No disposable FP3 fixture exists or is scheduled for deletion. Any future fixture must include exact founder TID and obey exact ownership/retained-content rules.

## Save-state sequence and boundaries

- **R:** recovery evidence above; preserve all qualifications.
- **A:** proposed architecture, estimate and gates saved; awaiting founder authorization.
- **B:** Map/global discovery/labels/controls only after approval; shared-location work only after dedicated gate.
- **C:** truthful presence-only Live layouts; preserve one workspace transport and existing leases.
- **D:** full local acceptance, security, privacy, responsive and A/B gates; save evidence and failures without baseline rewriting.
- **E:** integrated release candidate; STOP for explicit canonical approval. Never infer deployment authority from earlier FP2A approval.

Unrelated existing WIP preserved: older handoff Design/Website hunks, `docs/CROSS-PROJECT-INHERITANCE.md`, design/art/web documents, `docs/design-hub/`, `docs/research/`, `experiments/`, `toskerArt/`. Only FP3 recovery/architecture/roadmap and the new top handoff section belong to this checkpoint. Do not blanket-stage or push unrelated changes.

**MS7.3 LOCKED; FP1 canonical verified; FP2A canonical verified; FP3 awaiting execution/privacy gates; FP2B research complete/awaiting approval; MS7.4 UNLOCKED; MS8 NOT STARTED.**
