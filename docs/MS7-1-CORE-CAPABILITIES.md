# MS7.1 core capability decision ledger

Updated 2026-09-09. Founder correction supersedes the earlier hidden-control inventory. Hidden is a presentation state, not acceptance. `.1–.4` preserved; `.5/.6` backend checkpoint `449caf8`, client integration locally validated separately. No deployment of the expanded wave yet.

## Expected communication contract — focused research

These are product interpretations, not a cloned competitor matrix. Current official help checked September 8; historical release posts establish provenance, not a claim that a feature is newly released.

- Search should retrieve actual history and return the reader to its context. Discord documents scoped filters; Telegram documents source/date/media filters; WhatsApp documents chat search. Tosker needs current-conversation text search first, not their global/filter complexity. [Discord search](https://support.discord.com/hc/en-us/articles/115000468588-How-to-Use-Search-on-Discord), [Telegram filters](https://telegram.org/blog/filters-anonymous-admins-comments?setln=en), [WhatsApp search](https://faq.whatsapp.com/1131773267485499/?cms_platform=web).
- Notification volume and reading state are separate jobs. Discord exposes server and channel notification controls, including a parent mute; Telegram exposes chat-level alerts through header/info menus. Tosker adopts a persistent viewer mute with understandable Room-to-Subroom inheritance, not duration/role/mention sprawl. [Discord notifications](https://support.discord.com/hc/en-us/articles/215253258-Notifications-Settings-101), [Telegram notifications](https://telegram.org/blog/notifications-bots?setln=en).
- WhatsApp's desktop shortcut inventory covers unread, mute, archive, pin, search, replies, edit and attachments: these are ordinary communication operations. Tosker keeps native buttons/overflow/keyboard access; right-click/long-press supplement, never replace, discoverable controls. [WhatsApp shortcuts](https://faq.whatsapp.com/6204576529560565/?cms_platform=windows-desktop).
- Group identity, membership, invite privacy and permissions belong together. Adopt a compact Room management surface, current authorization and explicit destructive confirmation; do not import Discord role/channel sprawl or WhatsApp phone identity/history policy. [Discord permissions](https://discord.com/community/permissions-on-discord-discord), [WhatsApp joining](https://faq.whatsapp.com/1139252413769848/?cms_platform=web).
- Retaining an important message is expected; a second pin sidebar is not required. Hall should retain canonical message references, with source navigation and unpin independent of message deletion. [WhatsApp pinning](https://faq.whatsapp.com/294619079641794/?cms_platform=android&helpref=platform_switcher), [Discord Inbox/context navigation](https://support.discord.com/hc/en-us/articles/360045027712-Inbox-FAQ).
- Translation is useful for the founder's travel/education/cross-border audiences (our audience inference), but needs explicit language/privacy choices. Telegram offers message-context translation with language exclusions. No new translation service is authorized tonight. [Telegram translation](https://telegram.org/blog/notifications-bots?setln=en).

Interaction contract: restrained hover actions plus persistent overflow, native keyboard activation/focus and Escape/focus restoration; pending actions disable duplicate submission/dismissal where unsafe; destructive actions confirm scope; search distinguishes idle/loading/empty/error/results; uploads must show validation/progress/retry, not optimistic fake files. Profile opening uses stable identity, never changes authorship through aliases.

## Decisions

A = implement MS7.1. B = separate foundation/policy, explicitly tracked. C = not necessary for beta, hidden pending founder review. D = reject old mental model. B/C proposals are not silent founder approval of beta completeness.

| Capability / convention | Tosker interpretation | Class | Beta importance / does hiding weaken beta? | Complexity / infrastructure | Milestone / current status |
|---|---|---|---|---|---|
| Conversation Search / history retrieval | Authorized body search, bounded cursor pages, source jump/highlight, keyboard/mobile/error | A | High / yes | Medium / existing Neon | `.5` IMPLEMENTED; scoped DB and A/B browser PASS |
| Mute / chat alerts | Viewer-persistent; Room mute includes children; child mute may add silence, cannot override muted parent; unread/delivery remain | A | High / yes | Medium / additive preferences schema | `.5` IMPLEMENTED; persistence/actor/inheritance PASS |
| Mark unread / personal reminder | Persist viewer-only destination marker; no notification; next consumption clears; bell acknowledgement independent | A | High / yes | Medium / same schema, race tests | `.5` IMPLEMENTED; DB races and browser reload/consumption PASS |
| Room management/settings / group info | Room identity/name/tags; people/invites; Structure; My Room preferences, separate shared vs private settings | A | High / yes | Small–medium / existing services + preferences | `.2/.5` IMPLEMENTED, compact management integrated |
| Member management / permissions | Owner removes member; retain historical content; immediate scoped access withdrawal | A | Essential / yes | Existing Neon/Clerk/Ably | `.2` validated; integrated retest |
| Invitations / revocation | Current valid invite/join/revoke, honest pending/failure, no forged membership | A | Essential / yes | Existing services | `.2` validated; integrated retest |
| Member Leave | Confirmed withdrawal, no data deletion or orphan ownership | A | High / yes | Existing services | `.2` validated |
| Room/chat notification settings | Compact private mute + explanatory delivery/unread behavior, not global settings redesign | A | High / yes | Same viewer preferences | `.5` IMPLEMENTED; global settings MS7.2 |
| Message management | Own edit/delete, reply, reactions, safe links, copy, retry; canonical tombstone/quotes | A | Essential / yes | Existing services | `.1/.4` validated; integrated retest |
| Pin-to-Hall / retained information | First-class reference in each authorized Hall, source jump, unpin preserves original | A | High / yes | Existing Hall/history | IMPLEMENTED; Personal/Room/Subroom/Sandbox real UI source roundtrip PASS |
| Hall archive/restore/delete | Author/owner scope, real archived view, confirmed permanent Nuke | A | High / yes | Existing services | `.3` validated |
| History / link handling | Bounded older/newer/latest; safe HTTP(S); drafts survive navigation | A | Essential / yes | Existing services | `.1/.4` validated |
| Image/file/drag-drop attachments | Real private objects, authorized metadata/downloads, retry/progress/preview | B | High / yes; blocking sub-capability, not solved | Medium–high / private storage provisioning | `.7` reserved; founder provisioning needed below |
| Shared media/files browser | Later Resources projection of authorized attachments, not duplicate storage | B | Useful; uploads matter before gallery | Medium / media foundation | After media; no Resources build now |
| Voice/video/calls | Joinable authorized active Room/Subroom Call context; conditional surface | B | Important later, acceptable current deferral per brief | High / signaling/media provider + device/privacy | Future communication foundation; hidden, no WebRTC |
| Translation | Opt-in per message/Hall, original preserved, target language and privacy explicit | B | Important audience fit, current deferral per brief | Medium–high / reviewed service or native on-device | Future foundation; hidden, no API tonight |
| Owner Leave/delete/transfer | Never orphan Room; retention/transfer policy must be explicit first | B | Important lifecycle; unsafe to invent | Medium / founder policy, existing infra | Founder decision; owner unsafe actions hidden |
| Private chat pin/reorder/archive | Personal organization, distinct from shared Hall retention | C | Useful but not core persistence/member safety; some convenience loss | Medium / private ordering/archive semantics | Proposed post-beta; founder-review item, not implemented |
| Forward/export/bulk-delete/advanced moderation | Do not add broad distribution/destruction/roles without policy | C | Not necessary for this beta | Medium–high / privacy/abuse policy | Post-beta proposal; hidden |
| Generic Calendar header | Schedule is a capability/Gizmo, not a permanent messaging utility | D | No; old control weakens mental model | Future Gizmo runtime | Schedule MS9 |
| Duplicate Pinned Messages sidebar | Hall already retains shared important information | D | No, if Pin-to-Hall works | No extra subsystem | Removed from direction |
| Fake install/starter/Gizmo controls | No installation without functioning capability | C | Not needed for Chat/Room beta | Runtime foundation | MS7.5/MS9; hidden, records retained |
| Room logo/skin/governed brand | Stable Room-owned appearance separate from viewer preferences | B | Later customization, not required tonight | Media + governance | MS7.2/MS10; inheritance doc preserved |

No A capability above becomes a Gizmo. Calls are communication context, not a fake calendar button; Schedule becomes a Gizmo. C proposals and owner/media decisions stay explicit at the founder gate.

## Media provisioning gate — only this capability paused

Local secure boolean check: `BLOB_READ_WRITE_TOKEN` absent; no public Blob token variable. No storage resource or credential was created or changed.

Recommend **Vercel private Blob**, alongside the existing host, subject to founder acceptance of its public-beta status. Private downloads go through Tosker authorization; never publish an unrestricted object URL. Founder action: in the Tosker project's Storage, create a **Private** Development Blob store and connect its server-only `BLOB_READ_WRITE_TOKEN` to Development. Install locally securely, never paste into chat. The canonical founder-review URL currently uses Vercel's Production target with Development services: separately approve connecting that same Development store to this target for review. Future genuine Preview/Production data require separate stores/tokens, not automatic sharing. [Private storage and setup](https://vercel.com/docs/vercel-blob/private-storage).

Current Hobby allowance: 1 GB stored, 10 GB transfer, 10,000 simple and 2,000 advanced operations; Hobby over-limit access is constrained rather than unlimited pay-as-you-go. Pro has included usage then metering. Private delivery also incurs applicable Function/network usage; region and plan affect cost. Confirm dashboard plan/region/budget before provisioning. This is not a promise of zero cost. [Pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing).

Proposed smallest implementation: 10 MB per file, small per-message count, JPEG/PNG/WebP and conservative document allowlist; server-issued short-lived scoped upload permission after current conversation authorization, random object key; validate actual bytes/type/size before finalization (reject active HTML/SVG/executables); durable pending/ready/failed metadata and idempotent message finalization. Neon stores metadata only. Client progress/cancel/retry, selection and drag/drop, no sending pending uploads as accepted messages. Ably invalidates only after durable accepted message. Download endpoint rechecks current Personal/Room/Subroom access every time and streams private content with safe disposition/no shared cache; image preview only validated raster. Deletion uses tombstone + retryable object cleanup; abandoned-upload cleanup and bounded quotas required. Native clients reuse this authorization contract. Antivirus/expanded file formats require separate review; do not advertise scanning that is absent.

## Translation/call architecture bookmarks

Translation: compare reviewed conventional translation providers with browser/native on-device availability when authorized. Provider path sends message content off-platform and needs disclosure, retention/residency review, quotas and per-character cost estimate; on-device support/languages/download footprint vary. Keep original canonical message/Hall text, translation a viewer-language derivative keyed to source version; deletion/edit invalidates it. Manual request, bounded timeout/retry, no silent whole-Room translation or generated messages/unread. Price/provider choice intentionally not invented tonight.

Calls: Room/Subroom scope issues short-lived join grants to an approved future media provider; membership loss revokes access; active Call state may reveal a joinable surface. Manual device permissions and leave/reconnect behavior precede icons. No media transport added now.

## Revised remaining internal map

Final overnight map: `.5` core management → `.6` mentions/navigation → `.7` reserved media → `.8` UX → `.9` integrated/release. See [Chat grammar](MS7-1-CHAT-GRAMMAR.md). Commit boundaries may combine a coherent backend/client integration; they do not fabricate completion of blocked slices.

- `.1–.4`: preserved at `bfb444d`.
- `.5/.6`: implemented backend `449caf8`; client integration has targeted A/B evidence, final gate remains separate.
- `.7`: media foundation reserved/provisioning-gated; no fake controls or fabricated completion.
- `.8`: local UX normalization implemented; eight-width matrix and all-context controls PASS, physical/assistive limits explicit.
- `.9`: integrated abuse/release: fresh A/B chained scenarios, independent completeness + control-function gates, exact cleanup, canonical deploy/live test only after engineering validation and required founder decisions.

Do not mark proposed/unfinished rows implemented. Owner destructive lifecycle policy, private-media provisioning or explicit deferral, and proposed C convenience deferrals require founder review. Do not start MS7.2. Several-second Development latency remains recorded; no security-compromising performance rewrite.
