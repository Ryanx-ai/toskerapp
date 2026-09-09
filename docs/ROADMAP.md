# Tosker roadmap — canonical founder direction

Updated 2026-09-09 by the founder's roadmap-memory/state-alignment brief. This is the single current milestone-order reference; it supersedes early roadmap numbering and old attachment-blocker scheduling. Git and [CODEX-HANDOFF.md](../CODEX-HANDOFF.md) remain authoritative for implemented state and recovery. Historical milestone evidence stays in the handoff and individual milestone records.

## Current state / authorization

- MS6 is COMPLETE AND LOCKED.
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

## Next MS7.1 phase — authorized by the separate continuation directive

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
| MS11 | Desktop packaging |
| MS12 | Native iOS / Android |
| MS13 | Full ToskerWeb creation |
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

Existing website refinement remains parked until authorized; full ToskerWeb is MS13. `toskerArt/` stays untouched/untracked until separately authorized Art work. Roadmap placement does not authorize starting it.
