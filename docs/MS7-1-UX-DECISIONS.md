# MS7.1.8 bounded UX decisions

Research date: 2026-09-08. This is a small official-source benchmark, not a pixel-copy exercise or a new design system. Implementation and acceptance must be recorded separately below.

## Reading and navigation evidence

- Discord documents contrast, motion and text/typography scaling controls. Takeaway: readable defaults and reduced-motion behavior matter more than squeezing extra rows into a fixed screenshot. [Accessibility](https://discord.com/accessibility), [settings](https://support.discord.com/hc/en-us/articles/1500010454681-Accessibility-Settings-Tab).
- Slack separates global navigation from contextual conversation lists and provides sidebar filtering/customization. Takeaway: reduce irrelevant ladder density without hiding a user's path back or unread context. [Sidebar preferences](https://slack.com/help/articles/212596808-Adjust-your-sidebar-preferences).
- Telegram documents stable locally chosen accent palettes when no custom peer palette exists. Takeaway: deterministic bounded color helps recognition; do not infer demographic identity or copy paid customization. [Accent colors](https://core.telegram.org/api/colors).
- WhatsApp Web explicitly relies on browser/device font settings; Android has chat text-size settings. Takeaway: browser zoom must work; a fixed tiny font is not justified by a dense messaging layout. [Web font size](https://faq.whatsapp.com/463979618911091/?cms_platform=web), [Android font size](https://faq.whatsapp.com/463979618911091/?cms_platform=android).
- Lark's official release index lists cross-page text-size adjustment (V7.38). Takeaway: consistent functional text scale across destinations, not independent miniature controls. [Version updates](https://www.larksuite.com/hc/en-US/categories-detail?category-id=7054521562770210822). Its dynamic help pages were not fully extractable; no exact Lark pixel sizes are claimed.

These sources establish behavior, not an industry-mandated font size. Tosker hypotheses to verify: message/body 15px (16px mobile input), names 14px, navigation 13px, metadata 12px; Montserrat functional text, existing expressive display face only for appropriate destination headings. Avatar bands: rail32, rows36, messages36, communication header40; people circular, shared Rooms rounded-square. Test actual computed styles and clipping at 320/390/1440 plus 200% layout/browser zoom where available.

## Shared identity / belonging

Discord's current Server Tags combine a short non-unique identifier, icon and shared color; its older Guild documentation describes small recurring groups and opt-in representation. Extract recognizability and belonging, not boost monetization, rank systems or a game HUD. [Server Tags](https://support.discord.com/hc/en-us/articles/31444248479639-Server-Tags), [Guilds FAQ](https://support.discord.com/hc/hi-in/articles/23187611406999-Guilds-FAQ).

Decision: deterministic short Room shorthand with stable palette now. Room category labels are a separate icon+color+text classification. Child identities inherit their parent's palette, retain their own readable shorthand/name and an explicit Subroom relationship. No category emoji blobs. A future editable 2–5-character identity tag is deferred: define Unicode grapheme handling, collision/confusability and moderation before adding a schema field; no speculative migration in this slice.

## Bounded implementation contract

- Default person avatar: locally rendered geometric SVG, stable seed from canonical user ID, finite palette, no network generation, no personal-attribute inference. Existing approved image URL takes precedence; broken/absent image falls back safely. Initials are last fallback. No ToskerArt reads/integration or illustration generation.
- Shared primitive should leave room for future curated pack/variant selection without implementing a pack picker, backend or media pipeline.
- Subroom navigation expands for Chat; on other surfaces retain only the active child family when necessary. Parent attention includes currently authorized hidden children. Never manufacture access from client state.
- Conversation transitions show restrained contextual loading, not generic Home, old messages under a new identity or demo state. A loading view must not acknowledge messages.
- Existing modal and control vocabulary: one clear primary action; quiet cancel/back; destructive color reserved for actual destruction; pending actions cannot be dismissed into uncertainty. Empty, loading, denied and failed states remain distinct.

## Implementation / validation status

Implemented in the current client integration: deterministic shared person/Room avatars, approved-photo fallback, separate Room-category preview labels, contextual Subroom disclosure, functional type/avatar scale, shared dark modal fields and pending Subroom guards. Fresh canonical identity supersedes an older in-memory navigation response; no new route-level streaming boundary was added because access-denied HTTP semantics must remain intact. Friends/namecards use the same person primitive. Notifications legacy miniature text was normalized to14/13/12px with wrapping filters; final browser evidence is in the results ledger.

TypeScript, lint and production build passed including the Friends adjustment. Browser `browser-ms718-responsive.mjs` PASS at 320/375/390/430/768/1024/1440/1728 widths for computed type, composer, mention picker, Search and Hall editor. Updated Personal/Room/Subroom/Sandbox Chat/Hall control inventory at 1440/390 PASS. Fresh Room creation/open observer found no generic Home/unavailable frame; scoped empty Chat correctly appears after loading. Physical keyboard/actual 200% zoom are not certified. Existing `.4` history/performance checkpoint remains `bfb444d`; these edits do not reopen its transport architecture.
