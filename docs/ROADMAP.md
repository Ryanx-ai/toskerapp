# Tosker roadmap — canonical founder direction

## Current direction — founder huddle, 2026-09-25

This section supersedes the older destination-led MS7.3/7.4 and HUDL-at-MS9 scheduling below. MS1–6 and MS7.1 remain locked. **MS7.2 FP2 independent local acceptance is complete at application `03b25a2`; not locked or deployed.** Human fresh-signup acceptance is required before push/deploy. No Map/Fleet implementation or next milestone is authorized in this pass. [FP2 state](MS7-2-FP2-FOUNDER-PATCH.md), [FP1 state](MS7-2-FP1-FOUNDER-PATCH.md) and [evidence / pivot proposal](MS7-2-FP1-PIVOT-RESEARCH.md).

| Wave | Proposed revised purpose / preserved boundary |
|---|---|
| MS7.2 FP1 | Complete Profile/Settings/identity/sidebar/performance founder-review build; research pivot only |
| MS7.3 | Collaborative Trips / Map Coordination, replacing standalone Friends/Search wave. Relationships/discovery remain integrated capabilities; Map first flagship Gizmo after approval |
| MS7.4 | Trip Execution / Live Coordination only after shared planning proof; Explore is deferred, not a mandatory beta destination |
| MS7.5 | Product completeness and bounded extensibility: surface/default ordering, proven Map integration; Pages later readiness, no marketplace detour |
| MS7.6 | Existing provisioning/backend/dev hardening backlog, including map/location dependencies after decision |
| MS8 | Whole-product UI/UX around the proven loop |
| MS9 | Generalize proven Gizmo patterns; ToskerBot prototype, not prerequisite to the first Map |
| MS10 / MS11 | Art integration / ToskerWeb (people, places, plans, movement) |
| MS12 / MS13 | Desktop packaging / native adaptive mobile and foldables |
| MS14 / MS15 | Cross-platform destruction / production and account-lifecycle launch priming |
| MS16 / MS17+ | Real-group beta and repeat-trip use / evidence-led expansion |

Location sharing requires separate explicit consent; Room membership never grants tracking consent. No fleet hardware, military-specific workflow, navigation safety claim, PTT/voice/video, SDK, storage or map-provider provisioning now. Founder review still gates the pivot's product scope. Earlier evidence is retained below as historical sequence, not current authorization.

Updated 2026-09-09 by the founder's roadmap-memory/state-alignment brief. This is the single current milestone-order reference; it supersedes early roadmap numbering and old attachment-blocker scheduling. Git and [CODEX-HANDOFF.md](../CODEX-HANDOFF.md) remain authoritative for implemented state and recovery. Historical milestone evidence stays in the handoff and individual milestone records.

## Current state / authorization

2026-09-16 MS7.2 founder decisions implemented locally: gated full Clerk panel; truthful Support; six retained Development TIDs transitioned without aliases. All six users preserved due A/B policy or retained authorship/dependencies. Normal fresh browser registration awaits Clerk human verification; no partial push/deploy. [Closing checkpoint and remaining gate](MS7-2-IMPLEMENTATION.md). Account deletion/full coordinated lifecycle belongs to **MS15 — Production / launch priming**. MS7.1 stays locked; MS7.2 is not locked; MS7.3 not started. This supersedes pending founder-decision requests below, not the historical sequence.

Current override (2026-09-14): founder completed FP3 walkthrough and explicitly pre-authorized lock after FP4 acceptance/live smoke. **MS7.1 is now LOCKED** at live-tested application `f3ab7d017ce92bee34a473fbb22230b26cffdaa4`, READY deployment `dpl_HXkQgqRzL7h7zDk4Bn9F4yRc6qpX`, canonical HTTPS200. [FP4 acceptance/lock record](MS7-1-FP4-FOUNDER-PATCH.md). MS7.2 Profile + Settings is the next authorized bounded development slice; MS7.3+ and new infrastructure are not authorized. Historical September9 state/protocol below is superseded by this lock, not erased.

- MS6 is COMPLETE AND LOCKED.
Current continuation (2026-09-15): **MS7.2 Gate 2 IN PROGRESS**, local validated frame/profile/privacy/Room-identity/Settings/Brand/banner checkpoints; [current implementation and remaining gates](MS7-2-IMPLEMENTATION.md). Founder authorized full MS7.2 through integrated validation and canonical review, but no partial push/deploy. Canonical remains locked FP4. Provider Account safety, monitored Support and existing-TID transition still require resolution; MS7.2 is not founder-ready/locked, and MS7.3+ has not started.

The following bullets retain the historical pre-FP4 state:
- MS7.1 — Chat + Rooms Productization / Beta Hardening — is IN PROGRESS and unlocked. Preserve all local checkpoints, including `428b8aa`, `eda4451`, `b3bd7a1`, `bfb444d`, `449caf8` and `8b6d29c`; re-inspect Git on resume.
- Canonical founder-review product is now MS7.1 checkpoint`fd76555`, deployed READY with live isolated A/B smoke and guarded QA cleanup verified. Engineering development is complete for review; MS7.1 itself remains unlocked pending founder walkthrough39–40, any required patch and explicit approval. The earlier roadmap-alignment pass itself changed no production state.
- The documentation-only alignment pass is complete. The founder's 2026-09-09 MS7.1 development-continuation directive now authorizes resumption through the engineering gate and canonical founder review. No later milestone or automatic lock is authorized. Historical alignment evidence remains documentation-only.

## Provisioning classification during MS7.1–7.5

Assess each discovered dependency and record its reason, not just its provider name:

| Class | Meaning | Action |
|---|---|---|
| A — Current-wave blocker | The service is genuinely required to validate core behavior of the active milestone | Flag the exact dependency and founder action; do not pretend the core behavior is validated |
| B — Provisioning backlog | Useful/important capability whose provisioning would unnecessarily interrupt the current wave | Record for MS7.6; continue independent authorized work |
| C — Post-beta / later infrastructure | Not required for the current beta/product scope | Record separately with the relevant later scope |

Do not defer every backend defect to MS7.6 and do not provision every discovered service immediately. Existing authorization, persistence and core failure-recovery defects remain the active wave's responsibility when they affect its core contract. Classification is not permission to provision.

**Private attachments are explicitly Class B — MS7.6 provisioning backlog**, not a current MS7.1 blocker. The founder may promote them earlier by later explicit instruction. Do not provision now, request a token as a prerequisite to resuming MS7.1, or restore fake uploads. Track them in [the MS7.6 backlog](MS7-6-PROVISIONING-BACKLOG.md).

## Historical MS7.1 phase / review protocol

1. Recover the current validated MS7.1 state from handoff, milestone evidence and Git.
2. Continue testing Chat / Rooms / Hall.
3. Optimize existing behavior.
4. Finish remaining core interaction grammar.
5. Identify likely future infrastructure/service needs.
6. Classify each as current-wave blocker, MS7.6 backlog, or post-beta/later.
7. Document the decisions.
8. Run the full engineering/stress gate.
9. Deploy a canonical founder-review build after the authorized release gate.
10. Then the founder manually walks through the deployed build.

Wave cycle: IMPLEMENT → TEST → OPTIMIZE → IDENTIFY PROVISIONING DEBT → VALIDATE → DEPLOY CANONICAL FOUNDER REVIEW → FOUNDER WALKTHROUGH → FOUNDER PATCH IF REQUIRED → LOCK.

MS7.1 is not locked until engineering is complete, relevant stress scenarios pass, core behavior is coherent, provisioning dependencies are labeled, the canonical founder-review build is live, the founder has walked through it, and the founder explicitly approves lock. Automated QA alone cannot lock it. No automatic advance to the next milestone.

## MS7 sequence

| Milestone | Scope / inheritance | Completion sequence |
|---|---|---|
| MS7.1 | Chat + Rooms | Abuse/validate → canonical founder review → founder walkthrough → lock |
| MS7.2 | Profile + Settings; TethrLink identity/namecards; Luna/LunaVault governance/customization learnings | Stress → canonical founder review → walkthrough → lock |
| MS7.3 | Friends + Search; people discovery, relationships, profile/shared-context integration | Stress → canonical founder review → walkthrough → lock |
| MS7.4 | Explore; truthful discovery and real capability presentation | Stress → canonical founder review → walkthrough → lock |
| MS7.5 | Gizmo Readiness / Product Completeness; product/backend/navigation/permission substrate for real Gizmos | Stress → canonical founder review → walkthrough → lock |
| MS7.6 | Provisioning Backlog + Development / Backend Polish | Resolve accumulated required services → backend/dev sweep → environment/secrets/integration cleanup → validate → walkthrough/lock as appropriate |

MS7.6 covers deliberate Development/beta infrastructure provisioning, appropriate Development/Preview/Production separation, secret handling/rotation/server-only configuration, server boundaries/authorization/persistence/query/migration/realtime/storage consistency, failure recovery and temporary development debt. Include logging, error visibility, health and operational documentation where warranted. It makes the Development/beta backend coherent; **MS15 still owns full production/launch priming**. MS7.6 does not waive current-wave correctness or provision resources automatically.

## After MS7

| Milestone | Direction |
|---|---|
| MS8 | Hardcore whole-product UI/UX polish |
| MS9 | Gizmos + ToskerBot prototype |
| MS10 | Full Tosker Art integration |
| MS11 | Full ToskerWeb creation |
| MS12 | Desktop packaging |
| MS13 | Native iOS / Android, including contemporary landscape/tablet/foldable research |
| MS14 | Hardcore cross-platform destruction testing |
| MS15 | Production / launch priming |
| MS16 | Full Beta launch |
| MS17+ | Scale / adapt / grow, increasingly guided by real-user evidence |

MS9 Gizmos: real capability runtime, first-party launch set, multiplayer state and HUDL inheritance where useful. ToskerBot: native/default multiplayer AI concept, Room-aware; a user asks for help configuring a Room → Tosker proposes Gizmos/structure/actions → an authorized user approves → Tosker executes deterministic application actions. If this delays beta, keep ToskerBot prototype/demo-only and move its full production version post-beta. No AI implementation is authorized by this roadmap.

## Cross-project inheritance

Read [CROSS-PROJECT-INHERITANCE.md](CROSS-PROJECT-INHERITANCE.md) before relevant work. Verify source paths before use; treat them as read-only R&D inputs, never blind merges or permission to mutate source projects.

- TethrLink → MS7.2 identity/namecards.
- Luna/LunaVault → MS7.1/7.2 Room/settings/governance architecture, then later customization/skins.
- HUDL → MS9 collaborative Gizmos.

Founder MS7.2 platform/typography addenda supersede the older MS11–13 order: full ToskerWeb is MS11, desktop packaging MS12, native mobile MS13. Current desktop/laptop Web is primary; responsive tablet/mobile Web is secondary, not a mobile-first redesign. [Design/typography/platform memory](MS7-2-DESIGN-MEMORY.md) preserves the forward direction without implementing later milestones.

Existing website refinement remains parked until authorized. `toskerArt/` stays untouched/untracked until separately authorized Art work. Roadmap placement does not authorize starting it.
