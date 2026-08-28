# Tosker Vision

Tosker is a shared digital Room that becomes whatever the people inside it need.

## Product direction

**Event-first → Room-first → Programmable Rooms**

The interface begins with a mental model people already understand: conversations and Rooms on the left, the current conversation on the right. **Tosker keeps the familiar mental model of messaging software, but expands what can exist inside a Room.** Chat remains the anchor. The innovation happens around it.

Tosker’s current hierarchy is:

- **Tosker:** the application
- **My Room:** a private, permanent personal space
- **Personal:** direct conversations
- **Rooms:** shared group spaces
- **Chat:** ongoing conversation inside a Room
- **Hall:** important shared knowledge that should not disappear in chat
- **Add:** a restrained signal that Rooms can eventually gain capabilities

Trips, events, gaming groups, workshops, weddings, and communities are all Rooms—not separate product architectures.

## Translation

Text translation may eventually detect a message’s language, respect a user’s preferred language, translate individual messages, and optionally translate automatically. The original must always remain accessible. Milestone 1.1 uses predefined examples only; choosing production translation infrastructure is future work.

Realtime voice translation may be explored much later. It is neither implemented nor architected now.

## Platform direction—not current scope

Rooms may eventually support custom appearance, layouts, backgrounds, templates, and added capabilities such as Maps, Plans, Polls, Canvases, Files, Playlists, Games, or Brackets. Developers and designers may one day create Room apps, plugins, skins, templates, visual environments, and interactive experiences for a marketplace.

The governing principle remains:

> Apps extend the Room. Apps do not own the Room.

Tosker remains responsible for canonical Room identity, members, permissions, conversation, and shared context. No runtime, SDK, marketplace, or customisation engine is part of Milestone 1.

## Future product areas

**Explore** may help people discover apps, templates, games, public tools, and useful experiences. The discovery model is unresolved.

**Marketplace** may allow designers and developers to publish plugins, apps, skins, templates, board types, games, and interactive experiences. Users may eventually install, purchase, subscribe, tip, or support creators. Payments are not designed or selected.

**Studio** may become a creation workspace where developers build Tosker apps, designers build skins, creators configure templates, and ordinary people make lightweight interactive experiences.

Milestone 2 gives these three areas believable visual prototypes so the product can be judged holistically. They deliberately contain no installation, publishing, payment, ownership, or runtime architecture.

Potential first-party capabilities include Bulletin/Hall, Kanban, Notes Board, Image Board, Polls, Map, Calendar/Schedule, Files, Playlist, Shared Tasks, and simple games. Tosker must validate which are genuinely needed before becoming a utility suite. Game-runtime architecture is intentionally undecided.

Rooms may eventually support themes, backgrounds, skins, typography, layouts, visual environments, app arrangements, and templates. Designers may publish or sell these, but no customisation engine exists today.

## Communication across borders

Tosker should become especially strong for people communicating across languages, countries, cultures, and time zones. Future translation may include preferred-language settings, automatic text translation, translated announcements, translated Hall and app content, and—much later—voice translation.

A broader research hypothesis is that Tosker may have particular value where communication is fragmented across messaging, social, payments, translation, and utility tools. Future validation may examine Southeast Asia, emerging digital markets, international and student communities, gaming and creator communities, cross-border families and friends, events, and travel groups. This is not yet a geographic target-market claim.

Cross-border finance—shared expenses, requests, event payments, collections, creator payouts, or marketplace purchases—is exploration only. Regulatory, security, compliance, licensing, fraud, and geographic requirements demand separate evaluation; no provider or product commitment exists.

## Permissions

Extensible Rooms will eventually need deliberate controls for owners, admins, moderators, members, guests, app permissions, posting, Hall editing, customisation, installation, and public/private visibility. Permissions should be designed alongside persistence and identity rather than patched in later.

Personal conversations and Rooms must make privacy understandable at a glance. Future access control should define visibility, invitations, posting, Hall editing, installation, export, and removal rights; private Dashboard content stays inaccessible to others by default. Subrooms should inherit or explicitly override parent access rather than creating ambiguous privacy boundaries.

## Brand narrative and future landing page

Ratatoskr moving along the World Tree and connecting distant places is meaningful internal brand inspiration. It may influence illustration, mascot development, brand storytelling, and a future landing-page concept without introducing Norse language or lore into product UI.

The approved future art direction is warm, curious, adventurous, subtly mystical, and occasionally surreal: branches, tiny pathways and doors, floating lights, lanterns, stars, strange plants, hidden objects, and small character moments. This world must never turn the interface into high fantasy, medieval roleplay, a Disney imitation, or children’s software. Ordinary product language remains the anchor.

The founder’s current landing-page idea is **The Climbing Squirrel**: as a visitor scrolls, the supplied Tosker squirrel climbs an illustrated tree, moving between branches that reveal people, Rooms, activities, and increasingly capable shared spaces. Any eventual implementation must remain performant, accessible, responsive, single-page, and understandable without animation. It is not part of Milestone 1.
