# MS7.1 — Chat / Rooms beta hardening

2026-09-08. IN PROGRESS; not deployed or founder-locked. Baseline `c6286b9` (`f005f6d` product). Approved backlog: `MS7-PRODUCT-STRESS-AUDIT.md` and founder MS7.1 brief. No MS7.2–7.5 work.

## Contracts / bounded choices

- Neon remains durable authority; Clerk identity and the existing scoped Ably transport remain. Keep 60s connected reconciliation / 12s unavailable fallback. No new provider, storage or calls.
- Hide unsupported conversation Search, translation, attachments, calls/video/calendar and placeholder utilities. Hide capability installation/starter selection until MS7.5; retain existing records without advertising them as working tools. Optional Mute/manual unread/private Room pin/archive/delete remain absent rather than fake.
- Ordinary members may leave after confirmation. Owners cannot leave or be removed; no ownership transfer, Room deletion or orphaning in this wave.
- Owner-only minimal management: name/tags, members/removal, current invites/revoke, Subroom entry. Preserve existing member invite permission unless source/security findings require a documented change.
- Removal is access withdrawal, not a permanent ban. Rejoin requires a valid invitation; revoke previously accepted invitations for the departing target so a stale accepted token cannot silently restore membership. Unclaimed valid bearer invites remain governed by the existing single-recipient invite contract; owner can revoke them. Explain this in management.
- Membership/participant/Subroom-access removal must be atomic and retain all historical authorship/content. Realtime revocation must finish before reporting success; assess provider failure/retry and join/remove races before enabling controls.
- Hall author: edit/archive/delete own notes. Room owner: archive/delete/restore any note in an accessible Hall. Ordinary member: comment/react/reorder, not destructive actions on another author's note. Archive has a real scoped restore view; permanent deletion needs explicit confirmation. Pin/unpin never deletes original Chat.
- No Room nicknames now. Canonical user IDs retain authorship; future Room display identity is inherited by child contexts and separate from private Friend aliases.

## Slices / status

Shared acceptance and founder walkthrough: [MS7.1 stress scenarios](MS7-1-STRESS-SCENARIOS.md), preserving founder scenario numbers 01–40. Evidence: [numbered results ledger](MS7-1-STRESS-RESULTS.md). Each completed, validated coherent slice receives an internal MS7.1.x version, not a new milestone. Record commit, scope, behavior/bug fixes, schema changes, scenario results, remaining debt and founder-review status for every version. Do not infer browser passes from source checks. Scenarios 39–40 require founder evidence and remain pending until walkthrough. Canonical deployment remains gated on the complete engineering wave.

| Slice | Work | Status |
|---|---|---|
| MS7.1.1 | Safe Chat links; truthful core controls; drafts/retry/loading/date grouping | Local engineering checkpoint validated; full-wave/founder gate remains |
| MS7.1.2 (planned) | Room management, leave/remove/invite lifecycle and authorization | Pending |
| MS7.1.3 (planned) | Hall author/owner policy; archive/restore; pin regression | Pending |
| MS7.1.4 (planned) | Measured delivery path; 100/500+ history; drafts/retry; loading/error | Pending |
| MS7.1.5 (planned) | Shared primitives, headers, menus, responsive/accessibility | Pending |
| MS7.1.6 (planned) | Two-user adverse-path/security/full release gate | Pending |

## Baseline inspection

Two existing isolated authenticated Development browsers inspected canonical before code changes (normal retained Clerk sessions; no auth bypass). Owner Room menu contains Pin/Mark unread/Mute/Manage/Archive/Leave/Nuke; source confirms prototype/no-op behavior. Member Chat Search is an explanatory popover. Voice/video/calendar/settings/media are deferred-looking active controls. Initial Chat briefly shows empty before canonical messages load. Existing scoped Hall/Room/Subroom navigation and attention are preserved, not rewritten. Founder content is not a test fixture.

## Validation / release gate

Candidate MS7.1.1 TS/lint/build, whitespace, 15 safe-link parser cases and read-only UI fixture persistence pass. Partial browser checks are recorded separately in the numbered ledger; this is not full MS7.1 acceptance. Remaining full gate: migration/schema/invariants, real Ably scope/revocation, Chat/Hall/Room service tests, two isolated-user browser abuse, 100/500+ history, 320/375/390/430/768/1024/1440/1728 plus 200% equivalent, focus/menus/destructive confirmation, runtime/secret/dependency checks and exact QA cleanup. Local coherent checkpoints permitted; push/deploy only after full gate. Founder walkthrough precedes MS7.1 lock.

## Future hooks (notes only)

Calls are future joinable active Room/Subroom contexts, authorized by the same membership boundary; no permanent inactive Call tab, signaling/runtime/device access now. Media needs separately authorized object storage, access, retention and quotas; never base64 Postgres or local fake uploads. Gizmos need real first-party runtime before installation is advertised. Public-beta operations still require explicitly authorized environment separation.
