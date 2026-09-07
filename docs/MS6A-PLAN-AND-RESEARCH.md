# MS6A — foundational interaction plan

2026-09-07. Founder-authorized UX/persistence patch; MS5 stays accepted. MS6B realtime requires a separate founder lock. No Tosker Art/ToskerWeb work, media storage, commerce or new service.

## Findings before implementation

Baseline `f38808a`, clean tracked tree, only intentional `toskerArt/`. Canonical authenticated User A inspected on desktop and 390×844. Chat and Room/Subroom navigation work. New Note's backdrop is trapped beneath header/mobile navigation (visually reproduced); separate title/body boxes dominate. Chat reactions append local strings and are not persisted. Authenticated edit/delete absent; reply quotes are optimistic only although `reply_to_id` exists. Translation is supplied demo copy only, no translation provider. Hall note reactions have actor-scoped composite keys; comments lack reactions. Current full-card drag preview is missing. Start Chat searches but does not preload Friends. Create Room uses fixed tags and misleading prototype people selections. Subroom ladder exists only for the selected parent; creation remains under +Add. Marketplace/Studio remain primary destinations.

## Current documented conventions (not copied visual styling)

| Product | Relevant convention | Tosker decision |
| --- | --- | --- |
| Discord | Quick reactions, full picker, right-click/ellipsis actions, counted reactions and participant inspection; click own reaction to remove | One counted chip per emoji, current-user selection, participant labels, quick set plus searchable full Unicode palette; no effects/custom emoji |
| Telegram | Quick reaction and tap/hold selection; Translate in message context after language preference | Context translation entry with honest availability and options, preserve original text |
| WhatsApp | Long-press opens Translate/language choices; own-message Edit is marked and time-limited in WhatsApp | Explicit touch menu plus long-press compatibility; owner-only edit with edited marker. Do not import its arbitrary time limit or claim its on-device translation infrastructure |
| ChatGPT Android | Response buttons/three-dot menu; long-press also supports native text selection | Do not require long-press discovery; keep explicit accessible More and native selection. ArrowUp is a functional Send alternative, not a styling copy |
| Slack | Hover/message actions, emoji picker and reaction toggles; drag/drop and click attachment entry | Shared restrained action vocabulary; attachment boundary explicitly unavailable until storage exists |

Primary sources, accessed 2026-09-07:

- [Discord reactions](https://support.discord.com/hc/en-us/articles/12102061808663-Reactions-and-Super-Reactions-FAQ)
- [Telegram reactions and translation](https://telegram.org/blog/reactions-spoilers-translations)
- [WhatsApp translation](https://blog.whatsapp.com/introducing-message-translations)
- [WhatsApp edit](https://blog.whatsapp.com/now-you-can-edit-your-whatsapp-messages)
- [ChatGPT Android FAQ](https://help.openai.com/en/articles/8142208-chatgpt-android-app-faq)
- [Slack emoji](https://slack.com/help/articles/202931348-Use-emoji-and-reactions), [message edits](https://slack.com/help/articles/202395258-Edit-or-delete-messages), [attachments](https://slack.com/help/articles/201330736-Add-files-to-Slack)
- [Unicode emoji keyboard data](https://unicode.org/Public/emoji/latest/emoji-test.txt) — pinned 17.0 data, platform-native glyphs; no custom emoji ecosystem.

These are vendor-documented conventions, not a claim of hands-on testing every competitor client. Exact actions/platform availability differ.

## Affected boundaries and coherent slices

1. Shared dialog primitive (native top layer), focus restoration/trap, semantic action/emoji primitives, white-on-darkened-pink contrast and icon spacing.
2. Chat UI + server conversation service/actions: counted reactions, quick/full picker and composer insertion, accessible context actions, own edit/delete, persisted reply reference. Existing 12-second foreground polling retained, no new realtime.
3. Hall service/UI: full-card drag image, author Edit, one composed note editor, unavailable attachment dropzone, SVG reaction control and comment reaction persistence.
4. CreationOverlay/connections: accepted Friends and existing conversations, search retained; custom bounded tags and Just Chilling; remove misleading implicit invitation delivery.
5. SurfaceHeader/rail: authorized Room/Subroom switcher, parent-first ladder; +Add capabilities only.
6. Explore is the product umbrella: `/explore` visibly contains Gizmo discovery and future-community previews; its shared section navigation opens Create / Studio at `/explore/create`, containing future creation previews. Marketplace and Studio content are actually nested within Explore, not merely removed destinations. `/marketplace` and `/studio` redirects are separate backwards-compatibility measures, not the IA implementation. No commerce, contribution backend or Developer platform is implemented. Founder clarification reviewed against the current components on 2026-09-07: structure already satisfies this requirement; no Explore rewrite needed.
7. Two-user DB/browser acceptance, responsive/accessibility sweep, typecheck/lint/build/schema checks, checkpoint → push → canonical deployment → smoke → founder walkthrough STOP.

## Persistence and migration

Add message reactions and Hall comment reactions with `(target,user,emoji)` uniqueness and cascading target cleanup. Add message deletion timestamp (tombstone: preserve stable reply/pin addressing without retaining deleted message content); reuse existing edited timestamp/reply ID. Constrain emoji against the standard data set server-side; explicit desired active state makes retries idempotent. Existing finite Hall note reaction schema can remain for compatibility. Custom tags use existing text storage with server normalization/length/count limits. Hall quick edit reuses title/body; author-only updates. Every action derives actor from Clerk and validates current conversation and target scope. Never trust client author/user ID.

No new identity/Room/realtime architecture. Migration is additive and must be applied/verified against existing Development Neon before deployment. Deleted source messages must not leak old body through Hall or reply rendering.

## Accessibility / responsive implications

Dialogs in browser top layer above all stacking contexts, inert background, Escape, focus trap/restore, restrained backdrop. Explicit action buttons on touch and keyboard, native context-click, Shift+F10; long-press supplementary, cancelled on scroll. Counted reactions expose emoji name/count/selected state and participant names; no color-only state. Emoji search/categories paginate DOM rather than mounting thousands of buttons. White foreground requires sufficiently dark magenta, not blindly painting white on bright pink. Full-card drag retains arrow-key/menu reorder path. New Note fields remain separately labeled inside one visual editor. Test 320–1728px, 200% zoom, menu edges, mobile keyboard viewport, no overflow or layout shift. Physical-device limitations must be reported honestly.
