# MS7.2 — Design Hub inheritance / forward memory

## 2026-09-25 FP2 — bounded customization

Personal Brand is shared identity, governed by the existing profile audience: five accent choices, three static banner presets (Glow/Weave/Plain), and optional avatar ring. App Appearance is a separate account-backed viewer preference: Tosker/Iris/Tide action and selected-state accents. Neither changes a Room's theme or another viewer's interface. Native preview → Save and staged reset reuse the profile revision boundary. Functional danger/status/focus colors and Montserrat body/control typography remain protected.

This is a deliberately small foundation for MS8, not its whole-product visual/motion/theme overhaul. MS7.6 retains uploaded media/storage; custom fonts require separate rights/loading decisions. No arbitrary CSS, color picker, font management, animated effects, monetization, per-Room brand variant or LunaVault governance engine. [FP2 evidence and release gate](MS7-2-FP2-FOUNDER-PATCH.md). MS7.2 is not automatically locked; MS7.3 has not started.

## 2026-09-25 FP1 / post-pivot direction

Current execution keeps the warm Tosker palette and existing licensed stack. Compact contextual Namecards, explicit owner editing and useful Profile shortcuts replace oversized utility presentation; Settings uses native stable frames and restrained tonal separation. Long single-line names have deliberate reveal and motion/touch alternatives. Discord is an identity/flow reference, not a skin; fintech references inform spacing/elevation only. No new display font or Art.

HUDL/TethrMap is read-only interaction research: numbered places, list/map coherence, purposeful group context and explicit sharing. Its Swift map model loads mocks; don't inherit its Supabase proposal, neon branding or claim it proves Tosker persistence. [Verified sources and decisions](MS7-2-FP1-PIVOT-RESEARCH.md). Proposed MS7.3 now hosts Map as the first flagship Gizmo; do not wait for a generic MS9 platform, nor build Map during FP1.

Carry people/places/plans/movement into MS8, MS10 and MS11. Preserve BELONG → TALK → SHAPE → CONTRIBUTE → BEGIN as a narrative candidate and test it against the trip-coordination direction at MS11, not a mandate to edit the website now. Current UI must remain useful before whole-product polish. No source-project or `toskerArt/` mutations.

2026-09-15. Founder-authorized documentation, not permission to change Art, Website, source projects or later milestones. This focused tracked addendum complements the existing uncommitted `TOSKER-DESIGN-HUB-MIGRATION.md`; its unrelated content is preserved, not absorbed into MS7.2 commits.

## Typography

DK Longreach remains the founder-preferred semantic DISPLAY/title face. Contact with its creator is **not a licence grant**. No new permission evidence has been supplied after Gate1. Super Bouncer ALL CAPS is the fallback candidate only if its own intended web/deployment rights are verified. Neither candidate is shipped or converted as a workaround. Existing Montserrat/Mermaid stack remains; functional development is not blocked by typography.

Use exactly one licensed primary display face at a time for destination titles, category markers, banners and selected major display moments. Not for message bodies, usernames, user-generated Room names, form inputs, descriptions or utility controls. Secondary expressive headings remain Mermaid/current serif; functional UI/body/Chat remains Montserrat.

Carry this into MS8 whole-product UX and MS10 Art integration. At MS11 ToskerWeb, evaluate typography with approved Tosker Art, responsive scale, scroll choreography, parallax, interactive product demos and chapter transitions; DesignCode/recent.design are craft references, not templates. Preserve **BELONG → TALK → SHAPE → CONTRIBUTE → BEGIN**. Brand display targets include hero/section/feature headlines, selected major navigation/CTA moments, campaign statements and storytelling labels. Body comprehension remains restrained. Padlet-like welcoming/playful/community accessibility is an emotional reference, not typography or visual-system copying.

## Platform priority

Current canonical experience is desktop/laptop Web, with genuinely usable responsive mobile/tablet Web. Founder computer walkthrough is primary acceptance; physical-phone testing is valuable responsive evidence; browser emulation is engineering evidence, not physical-device or screen-reader certification.

Use available width/height and interaction capacity, not device labels: narrow portrait adapts navigation and gutters; adequate landscape progressively restores richer Web density. Stable frame/header/nav/footer, internal content scrolling, native focus, dirty/failure recovery and reachable touch targets remain required. Never remove useful desktop capability just to simplify a narrow screen.

MS12 owns desktop packaging. MS13 owns native-mobile optimization and research into then-current APIs/form factors: phones, large phones, tablets, landscape, foldables, dual-screen/hinged/multi-pane hardware. Keep containers and navigation/context/content separable now; do not invent speculative hardware dimensions or foldable UI during MS7.2.

## Identity boundaries carried forward

Global profile, private alias, parent-Room nickname, Namecard audience, Personal Brand and viewer appearance are separate authorities. MS7.3 Friends/Search must consume the same viewer-resolved identity and audience projections. Seven-character TID lookup contract: trim → ASCII uppercase normalization → exact match, never authorization from knowledge of an ID. Existing-ID transition remains in the implementation gate; no claimed backfill here.

MS7.2's initial Brand capability was a finite identity accent; FP2 extends it with the bounded banner/frame and separate viewer accent described above. Explicit Save/reset/preview and server audience enforcement remain. No arbitrary CSS, font/media upload, Room governance engine, LunaVault engine or new public profile directory. TethrLink/LunaVault are conceptual inheritance, not copied implementation or authority to modify parallel projects.
