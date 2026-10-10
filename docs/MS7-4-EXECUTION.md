# MS7.4 execution and recovery

## A — Architecture complete; awaiting approval · 10 October 2026

**STOP at the founder's execution-time gate.** [Architecture decision](MS7-4-ARCHITECTURE-ADR.md) covers Live, active coordination and notification foundations and the nine FP1 selection criteria. Recommended ONE slice: genuine Join/Leave + authorized roster + recovery, without media/email/location. Estimated **9–12h** after the presence capability dependency is resolved, exceeding eight hours. B implementation, C A/B/auth, D responsive/performance and E candidate remain NOT STARTED. No new feature or acceptance pass is implied by checkpoint A.

R commit is `a605dd5`, based on recovery `08e6164`; A is the commit titled `docs: record MS7.4 architecture gate and presence dependency` on `codex/ms74-foundation` (resolve with `git log -1`). Remote main and canonical remain exact `35a6f86182e36a2f31eca84a9280e965d71f17cd`, READY `dpl_4jNvKenubueFoVCm24GVZiUDE3Dg`. Migration count29 and all R database invariants/QA inventory remain unchanged; no DB writes occurred in A. No push or deployment.

### Completed audit and bounded probe

Read existing Live preview, workspace/controller/companion, realtime token/provider/hook, exact-context authorization, Room/Subroom/Personal revocation, profile projection, notification/send/unread/schema, map privacy and rate-limit paths. Primary-source research covers Ably presence/recovery/capabilities/pricing, WebRTC/SFU/mobile capture, LiveKit/Daily and Resend/SES. The UX review informed explicit participation and failure/navigation states; it did not authorize a redesign.

One server-only diagnostic resolved QA A and an authorized retained QA primary conversation using `resolveQaActors` and `scopeForConversation`; a60s token requested `[presence, subscribe]` for only `tosker:live:<that conversation ID>`. **Granted operations were `[subscribe]` only.** No token was saved/printed; no channel connection/enter/publish, participant mutation or provider setting changed. This is a capability dependency, not a passed Live smoke. The local key was tested; no assumption is made about every deployed key.

Founder approval is needed for both the9–12h implementation wave and narrowly enabling existing-key presence on `tosker:live:*`, preserving other restrictions/Free budgets. No procurement is necessary for this proposed FP1. If narrow configuration cannot be represented safely, stop rather than broadening permissions. Future media and email providers remain recommendations only.

### Verification and restart boundary

R recovery checks are complete; final scoped documentation/JSON/diff checks apply to A. No application changes means no new app build or MS7.4 performance figures are claimed. Full future acceptance matrix and proposed measurable budgets are in the ADR. No new fixtures to clean. Retain both founder Rooms listed below. Unrelated WIP stays unstaged.

On resume: read A/ADR and inspect Git; recover exact A commit; verify canonical still FP8 and migrations still29. **Do not start B, change Ably permissions or deploy without the requested founder decision.** Once authorized, validate the real presence grant before implementing; do not replay old MS7.3 disposable fixtures or expensive provider tests. Any production migration/canonical cutover still requires separate approval. MS7.1/MS7.2/MS7.3 LOCKED; MS7.4 GATE1 COMPLETE / architecture awaiting approval; MS8 NOT STARTED.

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
