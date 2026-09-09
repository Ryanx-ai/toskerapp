# MS7.1 modern Chat grammar — bounded contract

Updated 2026-09-09 for the authorized development continuation. `.1–.4` preserved; `.5/.6` backend `449caf8`, client/UX `8b6d29c`; integrated/release `.9` still in progress. The old `.7` media reservation moved to MS7.6 backlog under [ROADMAP.md](ROADMAP.md). No MS7.2 or ToskerBot implementation. The separate development directive has arrived; current fresh evidence is recorded in the results ledger, without an inferred founder lock.

## Focused evidence and interpretation

Group @-selection should be contextual and keyboard/touch usable. WhatsApp documents @ then choose a member, distinct mention attention and mute exceptions. Discord documents mention suggestions in message entry. Telegram's stable mention/reply API demonstrates that targeting is more than matching display text. Tosker adopts authorized Room/Subroom suggestions and canonical user IDs; no global discovery or @everyone. [WhatsApp mentions](https://faq.whatsapp.com/521835819370205/?cms_platform=web), [Discord suggestions](https://support.discord.com/hc/en-us/articles/35692242798743-Mention-Suggestions-FAQ), [Telegram mention model](https://core.telegram.org/api/mentions).

Reply source navigation restores context; it should share Search/Hall's authorized message target, not a second lookup. Source tombstones remain navigable. Telegram describes reply previews navigating to their original messages. [Telegram replies](https://telegram.org/blog/notifications-bots?setln=en).

## Implementation decisions / acceptance, not claimed complete

- **Mentions A, `.6`:** small explicit mention spans in plain text, canonical message → user relation. Composer drafts/retries retain spans; editing text shifts intact spans and drops overwritten tokens, never infers a new target from a name. Send reauthorizes targets against current Room/Subroom membership/access within the same transaction. Bounded 8 suggestions/10 spans, Escape/arrows/Enter, click/touch. No rich-text framework, global user query or bot runtime.
- **Attention:** one message notification per recipient, marked as direct mention where appropriate; no duplicate message+mention records or self attention. Ordinary messages are Messages, not Mentions. Direct mentions may bypass the basic non-critical mute; disclose this compactly. Manual unread/bell acknowledgement remain independent. Edits do not generate new mention notifications; removed mention spans no longer display as targets.
- **Source targeting A, `.6`:** current-conversation UUID route target, always server-authorized. Search/Hall/reply use the same bounded target load, scroll and temporary emphasis. A focused, labelled source plus short status announcement provides orientation beyond color; reduced motion avoids animation and emphasis still expires. No public permalink feature required.
- **Replies:** recent/older, edit/delete race, reload/navigation/offline retry, old window, cross-Room/Subroom denial. Existing quote text must retain author attribution. A deleted source returns its canonical tombstone, never an unrelated message.
- **Grouping/timestamps:** only same author/context/day within 60s; break around replies/tombstones where needed. First item shows author; grouped item still exposes actions/time. Compact time with full timestamp tooltip and edited timestamp; no constant timestamp noise.
- **Unread orientation:** no additional initial New divider in this bounded patch. Notification IDs are a recipient subset, and manual unread has no message position; deriving a precise divider from either would imply accuracy it does not have. Existing Chat/rail attention, held-history + New messages/Latest and canonical read consumption remain. A later divider must capture the actual viewer cursor before consumption, with explicit semantics for unloaded history; no second unread truth was introduced.
- **Author:** no fake click target on avatar/name; richer namecard is MS7.2. Stable author ID/default avatar remains a future entry point.
- **Lifecycle system text:** do not inject join/leave chatter into Chat. Membership/management/activity surfaces already carry current context; preserve historical authorship. Reconsider only with a concrete continuity gap.
- **Composer gate:** Enter/Shift+Enter/IME, mentions vs emoji/Escape, reply/draft/failed retry/long text/focus; new grammar must not regress existing behavior.

## Former MS7.1.7 attachment foundation — moved to MS7.6

Founder explicitly classifies private attachments as [MS7.6 backlog P-001](MS7-6-PROVISIONING-BACKLOG.md), not a current MS7.1 blocker unless future explicit instruction promotes it. Preserve the [prior media assessment](MS7-1-CORE-CAPABILITIES.md#media-provisioning-backlog--ms76) for future authorized work. No provisioning or fake upload controls now; no claim the feature is implemented.

## Remaining release gate

Targeted implementation evidence (2026-09-09): real A/B mention selection/draft/reload/offline retry, exactly one mention notification, direct-mention exception under Room mute, canonical reply and repeated same-URL source highlighting PASS. A/B own edit/delete updates reply text/tombstones; older reply survives history/Hall/reload/offline retry. Focused composer PASS for Escape→clear→retype @, ten stable targets/caret, explicit eleventh rejection without text mutation, feedback clearing and Shift+Enter. No initial New divider or in-Chat lifecycle spam added. Backend checkpoint `449caf8`; UI integration and fresh whole-wave release gate remain separate.

`.5/.6/.8` client integration is committed as `8b6d29c` with targeted A/B and responsive evidence; backend checkpoint is `449caf8`. After separate authorization: recover/test/optimize/finish grammar → identify/classify/document provisioning needs → final `.9` engineering/stress/control gate and exact cleanup → canonical deployment/live verification → founder walkthrough/patch → explicit lock. Media provisioning is no longer a prerequisite. Denied source navigation holds reading state during lookup/failure; explicit Latest recovery exits the hold. No founder-ready/lock claim; physical mobile/screen-reader limitations remain explicit.
