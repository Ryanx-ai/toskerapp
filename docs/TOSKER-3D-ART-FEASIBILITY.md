# Tosker 3D art feasibility

Date: 2026-09-06. Status: **proposal for founder review, not an approved art specification**.

This study follows the validated MS5 product release `f6089d4d0e14212a2d4e825db62a9d5d62267c75`, deployed as `dpl_B3JYuF7E8PpBh3RN2j5U5apMm4dU` (READY; canonical HTTP 200; authenticated smoke passed). MS5 is locked. This document is the only art-study deliverable. No artwork, models, runtime, dependencies, application changes or changes to `toskerArt/` were made for it. ART-0 requires separate founder approval.

## 1. Executive recommendation

**Conditional go: a geometric 3D authoring system, delivered mostly as ordinary images. Do not build a 3D application shell.**

The strongest metaphor is a collection of **open, modular dioramas**, connected by occasional branching structures. A Room is a place people make useful together; its art should show an activity in progress, not simply a beautifully furnished box. Chat remains the foundation, Hall keeps important information, and Gizmos extend what people can do. Subrooms divide context/audience; they are not extra tools.

Use Blender as the canonical source for one squirrel, a small geometry/material kit, cameras and a minimal rig. Derive static renders and short video from those same masters. Spline is an optional interaction sketchbook, not a second source of truth. Test a small Three.js/React Three Fiber export only when interaction genuinely demonstrates something a picture cannot.

One founder can maintain this **if the system caps novelty**: one mascot, one scene construction grammar, a handful of props and fixed export recipes. One founder cannot reasonably maintain a constantly expanding cast, bespoke animated worlds for every Gizmo, and a communications product simultaneously. Consider specialist help for the master character/rig; use automation for repetitive production, not for deciding identity.

Recommended launch allocation among authored illustrative placements: **90% static 3D renders / 10% pre-rendered motion / 0% realtime**. A later proven allocation might be **85% / 13% / 2%**, with no quota to fill. UI-only and simple 2D surfaces are excluded from these percentages. The requested 80/15/5 hypothesis is too realtime-heavy for Tosker's present utility-first product; five percent of hundreds of surfaces could become many unnecessary canvases.

## 2. Evidence and reference analysis

### Product and historical material inspected

- Live canonical app: signed-out entry/auth, authenticated Room Chat/Hall, Subroom Chat/Hall and restricted access, plus Explore, Friends, Marketplace, Studio, Notifications, Profile, Settings, Help and the creation entry. Desktop and mobile views were examined; MS5 responsive evidence spans 320–1728px. Creation steps, invitation completion and uncommon failure/empty states were additionally inspected in source, not all exercised as fresh live transactions during this study.
- Source: `src/components/{workspace-banner,product-surface,messaging-app,communication-ui,identity-card,join-room,auth-gate,bootstrap-failure}.tsx`, `src/app/globals.css`, routes and `public/brand/`.
- Product context: `docs/VISION.md`, `docs/VIBEGUIDE.md`, `docs/UI-REFERENCES.md`. Their older prototype/milestone statements are historical where they conflict with current code or the founder's current brief.
- Art history: `toskerArt/README.md`, `ART_DIRECTION_V4.md`, `PALETTE_V2.md`, `SURFACE_AUDIT_V4.md`, `FOUNDER_REVIEW_V4_PRODUCTION.md`, `v4-production/CHARACTER_BIBLE.md`; visually inspected character and banner contact sheets in `v4-production/review/contact-sheets/`.
- The inspected V4 review records 47 raster candidates and **zero approved assets**. Its README still names V2 while V4 names a later reset: this is historical exploration, not an integration mandate. A file search found no `.blend`, `.glb`, `.gltf` or `.spline` master in `toskerArt/`. Raster images that look 3D are not reusable 3D production models.

The latest text references Discord/Spline images but does not attach identifiable new image files. The earlier Tosker shell boards and existing V4 sheets are available context; a precise image-by-image critique of missing external reference boards is not claimed. Official Discord and Spline sources supplement the analysis. Reconcile the founder's exact external reference board at ART-0, not by guessing which scene was intended.

### What to learn, what not to copy

| Reference family | Why the approach can work | Distinct Tosker translation | Reject |
| --- | --- | --- | --- |
| Discord/Wumpus brand storytelling | A recurring character and readable activity make an abstract communications service feel social; brand scenes can coexist with actual product demonstrations | Show Tosker carrying, placing and connecting useful objects around shared spaces; alternate art with honest product screenshots | Wumpus proportions, outfit, blurple palette, compositions, gaming-only positioning |
| Simplified interactive character presentation | A strong contour and a few expressive features survive small sizes and limited animation; one responsive action can explain character better than a cinematic loop | Faceted squirrel head/tail, a glance or deliberate placement; accessible button equivalent to pointer response | Cursor-following eyes everywhere, endless idle loops, glossy generic toy faces |
| Spline-like geometric scenes | Simple solids, bevels, controlled materials and a restrained camera can create depth without intricate modeling | Reusable folded wedges, rounded slabs and branch joints; tactile matte surfaces and a local warm accent | Assuming a Spline-looking scene is automatically small or fast; copying a vendor's palette or layout |
| Product-feature storytelling | Showing the same setting evolve makes a capability easier to understand than disconnected illustrations | The same Room gains a map, retained note or shared game prop; functional terms stay in HTML | Art that implies unbuilt live features, voice/AI capabilities or a working Gizmo runtime |
| Historical Tosker V4 | Warm/cool contrast, right-weighted banner composition and inhabitants around shared objects provide continuity | Keep warmth, gathering, facets, and dark copy-safe space | Mandatory cloak/clasp, dense woodland/lantern props, medieval-looking scenery and a large named mythological cast |

Discord's official 2024 brand announcement explicitly connects its refreshed look with friends playing and hanging out, and presents 3D Wumpus/Clyde alongside 2D characters. The transferable lesson is consistent character-to-product storytelling, not that every illustration needs a renderer. These Tosker translations are design judgments, not claims about Discord's internal production pipeline. [Discord brand announcement](https://discord.com/blog/discords-next-chapter).

Spline's own optimization guidance calls out objects, materials, textures, lights, effects and multiple embeds—not just polygon count. A clean-looking reference does not prove a low runtime cost. [Spline scene optimization](https://docs.spline.design/exporting-your-scene/how-to-optimize-your-scene).

## 3. Tosker 3D visual language and minimal tokens

Working description: **folded geometry, shared little worlds, warm points of activity**. This is an internal art description, not new UI copy.

Use a few broad planes and gentle bevels, not triangles added everywhere. Pair angular silhouette breaks with soft contact edges. Objects should look assembled and movable, with recognizable handles, slots and meeting points. Leave air around them. Avoid fur, photorealistic skin, crystalline faces, voxel terrain, black-metal gaming scenery and undifferentiated candy gradients.

The tree is an abstract connective structure, not a lore-heavy location. Technology appears as usable objects—screens, notes, maps—not circuitry painted across everything. Future shared AI must not be represented as an already shipping feature or become the visual theme now.

All numerical tokens below are **starting proposals for ART-0**, not measured final settings. Freeze them only after testing the same asset as a small thumbnail, banner and web export.

| Token | Proposed starting rule |
| --- | --- |
| Scale | One kit unit is the standard platform thickness/prop mounting reference; apply consistent transforms and origins before export |
| Shape | Broad planar masses; one deliberate asymmetric cut or fold; no random facet noise |
| Bevel | Two families: hard-fold edges around 1–2% of local object width; tactile prop edges around 3–5%; preserve silhouette at thumbnail scale |
| Materials | Four core families: matte clay/wood-like solid, paper/ivory, dark screen, emissive accent; surface identity mainly comes from color and roughness |
| Roughness / metalness | Most bodies: roughness 0.65–0.85, metalness 0. Small fittings may use roughness 0.35–0.5; no default chrome or glass |
| Palette | Retain Night `#080D10`, Ivory `#F4EFE6`, Gold `#C89C5D`; use restrained teal, rust and slate. Pink `#FF4F91` and Yellow `#FFD84D` remain scarce accents, subordinate to UI actions |
| Color balance | Usually one base family, one cool supporting family, one warm focal signal; check grayscale separation, not color alone |
| Light rig | Large soft key above/front-left; cool fill around 25–40% of key; optional quiet rim. Proposed key 4000–4500K / fill 6500–7500K in offline rendering; match appearance with reference swatches, not temperatures alone |
| Shadows | Soft grounding/contact shadow; baked for most exports; avoid heavy black ambient occlusion and procedural grain at tiny size |
| Emission | One small accent, ordinarily under 5% of visible image area; no bloom dependency or moving glow behind reading surfaces |
| Camera | Orthographic 45° azimuth / approximately 35.3° elevation for kit comparison and isometric dioramas; one fixed three-quarter character camera. Orthographic cameras have no focal length. Optional marketing perspective uses one tested 50–70mm equivalent preset, not per-image experimentation |
| Framing | Consistent ground line, controlled subject scale, same shadow direction; art-specific crops rather than arbitrary `cover` cropping |
| Color pipeline | One named render/view-transform preset and export color space; compare sRGB reference exports to actual browser screenshots on the dark UI |

Keep a neutral calibration scene in the eventual source kit: squirrel, cube, paper, screen and sphere under the approved camera/light rig. Every future asset should pass beside it. This is proposed production tooling, not created here.

## 4. Reproducible mascot system

The current origami/geometric squirrel mark is the starting identity constraint. Do not directly extrude the logo into a stiff slab; translate its recognizable outline and directional folds into a character that works from several angles. Keep the existing flat logo unchanged.

Proposed invariants to resolve in a turnaround sheet and then lock:

| Feature | Invariant | Allowed variation |
| --- | --- | --- |
| Head | Compact wedge-like cranium, clear cheek/muzzle plane; no furry scalloped contour | Small head tilt and limited cheek deformation |
| Ears | Two pointed folded planes; consistent base spacing and unequal visible angles in three-quarter view | Ear rotation within rig limits, not new ear shapes |
| Eyes | One paired dark-eye construction with restrained ivory contrast; fixed placement in neutral pose | Gaze, lid/brow poses, blink; no independently invented eyes per render |
| Tail | Dominant angular, rising curl derived from the supplied mark; few broad segments and a recognizable outer notch/fold | Joint-driven bend and rotation; preserve volume and characteristic contour |
| Proportion | Head roughly one-third of head-and-body height, compact torso and short limbs; tail approximately as tall as head-and-body as an initial test | Pose changes, not per-scene rescaling of anatomy |
| Limbs | Simple hands/feet with readable grasp/contact, not individual high-detail digits | Carry, point, place, climb; no physics required |
| Palette | Rust/gold body, ivory muzzle/belly, dark eyes; one stable material family | Lighting and a small occasional object accent |
| Costume | None required for recognition; the historical teal cloak is not an invariant | Optional later approved accessory only if silhouette remains clear |
| Expression | Curious, attentive, pleased, concentrating, resting; communicate by pose first | Five small authored face poses, not a full dialogue system |

Production authority must be the **same master mesh + rig + material IDs**, never a fresh prompt. Preserve a low-detail export and a slightly richer offline-render variant derived from that master, not independently remodeled characters. Proposed small rig: root, body/head, ears, simple limb chains, tail chain, eye targets/lids; use rigid transforms where possible and skin only where deformation needs it. Verify limb contacts, tail clearance and interpolation in exported animation.

Acceptance tests: black silhouette at 32/48/96px; recognizable at 24px as a simplified mark variant; front/side/three-quarter agreement; neutral dark/light backgrounds; no costume needed to identify Tosker. The mascot must not resemble a round blue companion with squirrel ears. Large-format expressive character art does not replace small functional icons or every user's profile image.

## 5. Modular environment / Room system

| Candidate | Strength | Failure mode | Recommendation |
| --- | --- | --- | --- |
| Literal cube / cutaway box | Immediate Room metaphor, consistent footprint | Occluding walls, dollhouse repetition, awkward long banners | A special template, not the universal container |
| Floating platform | Open, readable, easy to recompose | Generic game-level island | Useful base with Tosker-specific folds/joins |
| Branch-mounted scene | Distinct narrative link | Forces every work/travel/social scene into a tree; costly at tiny size | Marketing/story connector, removable from product crops |
| Modular open diorama | Flexible silhouette, fewer occlusions, broad reuse | Can drift without fixed scale/camera rules | **Primary system**, often on a beveled slab/platform |
| Abstract glyph/pattern | Excellent tiny identity and scale | Cannot tell a rich activity story alone | Companion system for rail avatars and functional contexts |

First kit: three slab footprints, cube/rounded cube, wedge, folded panel, straight/bent/forked branch segments, socket/joint, leaf cluster, simple stone, opening/frame, sign, screen, seat/table, note tile and map tile. Small props should be assembled from shared parts. Do not start with dozens of landmarks, species or detailed architecture.

Each scene recipe uses a base, at most three distinctive activity props, a shared light preset and optionally Tosker. Keep roughly 70–80% of construction reused; a new category earns one or two unique props, not a new visual grammar.

- Gaming: slab + shared screen + controller abstraction + small colored blocks.
- Trip planning: same slab + folded map + luggage + generic route marker.
- Study: same slab + books + a shared board + note tiles.
- Race-watch Room: track loop + timing-board prop + seats; no unlicensed team marks.
- Market/watchlist Room: chart/board objects and discussion seats; illustrative mock information, not live prices or financial promises.
- Friends: shared table, seats and one personal object; gathering without a mandatory game theme.

Save recipes, seeded palette choices and reusable prop IDs. Do not render unique scenes on account creation or let arbitrary user text become geometry. New capabilities can use the existing generic family until a bespoke prop is justified.

## 6. Yggdrasil / Ratatoskr narrative

Use the founder's mythological inspiration as **brand fiction**, not literal product architecture or a historical retelling. The visible product remains Room, Subroom, Chat, Hall and Gizmos. No Realm, Kingdom, Guild or Quest labels.

Proposed marketing sequence:

1. A small shared platform: Tosker meets people; show an actual Chat screenshot beside it.
2. A branch leads to trip planning: a map tile arrives and a retained note is placed; explain Hall and useful additions.
3. Another branch reveals a game/study variation assembled from the same kit.
4. A smaller connected space demonstrates changing context/audience: explain Subroom separately from adding tools.
5. The branch continues beyond the crop. End with an ordinary clear CTA, not an endless mandatory scroll.

Create the **impression** of an expanding tree using finite, reusable branch segments and three to five authored chapters. Do not load an infinite scene or generate worlds as the user scrolls.

Technical feasibility: good without realtime 3D. HTML sections carry the whole story; static rendered layers plus modest 2D movement can connect chapters. A short pre-rendered character action can play on explicit activation or once when appropriate. Use video for complex lighting or deformation. A single lazy realtime branch can later demonstrate a genuinely user-controlled rearrangement, but free camera orbit and scroll-driven GPU scenery add little explanatory value initially.

Avoid scroll hijacking, forced pinned sections, large camera flights and mandatory time gates. Scrubbing long video via `currentTime` can seek poorly depending on encoding/device; prefer chapter clips or static transitions. An image sequence is a narrowly budgeted experiment, not the default solution. Onboarding gets one optional moment near a real action; Explore gets contained art, not a marketing journey inserted above useful cards.

Mobile, reduced motion, WebGL failure and JavaScript failure must retain the same ordered text, screenshots and static end states. Users can skip the story, navigate by headings and reach every CTA without animation.

## 7. Art surface inventory

Classification is the **recommended delivery**, not a statement that artwork is installed. `L` = inspected live (some transient states additionally source-checked); `S` = source/history inspected; `F` = future surface not implemented. Source owners are existing components, not new integration instructions. Repeated rows sharing a semantic role should share assets rather than create independent production jobs.

| Area / surface | Evidence / current treatment | Classification | Recommended role and guardrail |
| --- | --- | --- | --- |
| Global brand / favicon | L/S; existing origami SVG/PNG marks | STATIC 2D | Preserve supplied marks; no animated favicon or mini renderer |
| Signed-out landing / entry | L; branded text/card, auth buttons | STATIC 3D RENDER | Optional small arrival scene outside form; HTML remains primary |
| Auth modal / verification | L; Clerk-owned form | UI ONLY | No decorative canvas or moving character inside verification |
| Workspace bootstrap / loading | S; text/state and shell | UI ONLY | Lightweight real progress; never delay app until art loads |
| Bootstrap failure | S; retry/sign-out error card | UI ONLY | Clear error/recovery; art not a dependency |
| 404 / unavailable Room | L/S; framework denial/not-found | UI ONLY | Privacy-preserving message; no leaked Room image or membership clue |
| No conversation selected | L/S; greeting and quiet brand mark | STATIC 2D | Small folded trace, no large illustration behind workspace |
| Fresh-account onboarding | S; first-run actions and Sandbox orientation | STATIC 3D RENDER | One optional welcoming object/character composition, dismissible |
| First-use explanation | S/F; inline guidance; future feature teaching | ANIMATED 2D | Only if brief object-to-function movement improves comprehension; static equivalent |
| Sidebar / mobile navigation | L; compact icons, shape-coded identities | UI ONLY | Keep Lucide and existing interaction language; no 3D controls |
| Search / no results | L/S; input, list, quiet text | UI ONLY | No character asset request per search |
| Personal Chat identity / header | L; circular initials and viewer-resolved name | STATIC 2D | Shared user avatar system; do not invent a separate conversation mascot |
| Room avatar / rail identity | L; rounded-square initials, tag | STATIC 2D | Glyph + palette + simple motif; derive from large scene family, not a literal crop |
| Subroom identity | L; inherited visual family, nested row/tag | STATIC 2D | Shared parent palette + distinguishable glyph; no extra full diorama |
| Sandbox identity | L/S; permanent private personal space | STATIC 2D | Stable quiet personal mark; distinguish from shared Room shape |
| Populated Chat background | L; subtle CSS atmosphere | STATIC 2D | Optional extremely quiet derived trace; no detailed scene or motion |
| Empty Personal Chat | S; short text/brand cue | STATIC 3D RENDER | Small two-object meeting cue; disappear once conversation has content |
| Empty Room Chat | L/S; short quiet message | STATIC 3D RENDER | Small open platform, not a whole world behind messages |
| Empty Sandbox | S; private-space invitation | STATIC 3D RENDER | One useful object/quiet character, no privacy implication from background |
| Communication tabs / presence / unread | L; functional controls and dots | UI ONLY | Preserve semantic status marks; no status characters or expressive color ambiguity |
| Hall empty board | L; New Note card and short heading | STATIC 2D | Optional tiny retained-note cue; keep board inviting and functional |
| Hall background / populated board | L; quiet surfaces and editable notes | UI ONLY | No scenic wallpaper; keep pin/comment/reaction contrast and drag clarity |
| Hall note photos / pinned content | L/S; content and deferred media boundary | UI ONLY | User content is not brand art; persistent media dependency remains separate |
| Gizmos / Add picker | L/S; capabilities/options and explanation | STATIC 2D | Simple recognizable capability glyphs; no canvas per option |
| Installed Gizmo tab / status | S; capability labels; runtime not built | UI ONLY | Functional selected/installed state; no decorative badge animation |
| Explore banner | L; WorkspaceBanner gradient and separate art layer | STATIC 3D RENDER | Right-weighted shared-world assembly, contained frame |
| Explore standard Gizmo cards | L; six concept-preview cards | STATIC 3D RENDER | One prop/object cluster per family; keep preview labels honest |
| Explore categories / filters | L; functional pills | UI ONLY | Names and selection state; no new illustration per tag |
| Featured Gizmo / featured Room | F; no distinct featured interactive system | PRE-RENDERED 3D | At most one opt-in short demonstration; poster everywhere else |
| Room/template examples | S/F; prototype concepts, not template runtime | STATIC 3D RENDER | Reuse modular recipe, explicit example label |
| Friends banner | L; standard contained banner | STATIC 3D RENDER | Two simple objects/inhabitants gathered, welcoming and light |
| Friends empty / requests empty | S; short functional guidance | STATIC 2D | Small connection trace if needed; primary action unobstructed |
| Friend rows / namecard avatars | L; initials, nickname/name and coarse status | STATIC 2D | Reuse same person avatar; no activity-derived art |
| Notifications banner | L; standard quiet WorkspaceBanner | STATIC 2D | Restrained folded-paper cue, optional; not a scene |
| Notification empty state | L; short caught-up text | UI ONLY | No celebratory loop every visit |
| Notification rows / toast | L; icon, text, destination | UI ONLY | No new thumbnail fetch for routine activity |
| Profile default DP/avatar | L; circular initials | STATIC 2D | Seeded abstract geometric identities; user upload eventually overrides |
| Profile/namecard decoration | L/S; separate CSS banner | STATIC 3D RENDER | Optional low-detail faceted field, never hides name/TID/status |
| Own-status control | L/S; compact finite select | UI ONLY | Accessible text/icon stays authoritative |
| Create Room chooser | L/S; compact modal options | STATIC 2D | Existing simple marks, no animated miniature worlds |
| Room creation: name stage | S; input/progress | UI ONLY | Do not consume input area with art |
| Room creation: tags/categories | S; optional chips | UI ONLY | No automatic artwork choice based on sensitive inferred interests |
| Room creation: add things | S; optional selectable capabilities | STATIC 2D | Same glyph family as Add picker |
| Room creation: people | S; optional people selection | STATIC 2D | Reuse person avatars, not bespoke invitations art |
| Room creation: ready / invite-share | S; completion, link, QR | STATIC 3D RENDER | Small assembled platform/open doorway; QR/URL remain clean and functional |
| Join invitation page | S; Room mark, inviter, QR/auth/join | STATIC 3D RENDER | Optional default Room scene, subject to access/privacy; generic fallback |
| Invalid / expired invitation | S; unavailable/error path | UI ONLY | Recovery first; do not reveal private metadata through an image |
| Subroom creation | S; compact name/visibility/people form | UI ONLY | Do not confuse separate audience with adding a Gizmo |
| Settings banner | L; quiet shared frame | STATIC 2D | Optional material/shape trace; no moving mechanism |
| Settings sections / account controls | L/S; functional/prototype settings | UI ONLY | Art must not imply disabled preferences work |
| Help banner / help note | L; quiet frame plus brand mark | STATIC 2D | Reuse minimal brand cue rather than new character scene |
| Tutorials / feature walkthrough visuals | F; no complete tutorial system | ANIMATED 2D | Annotated real screenshots, simple highlights, textual steps |
| Marketplace banner | L; concept catalogue and contained frame | STATIC 3D RENDER | Modular shelf/platform idea, not a fantasy bazaar |
| Marketplace artwork / creator examples | L; six prototype tiles | STATIC 3D RENDER | Curated family covers; creator artwork need not impersonate first-party art |
| Marketplace filters / prices / status | L; preview text and pills | UI ONLY | Never let art imply real purchase/ownership |
| Studio banner | L; contained banner | STATIC 3D RENDER | Pieces becoming a useful object; no permanent spinning assembly |
| Studio creation list / types | L; prototype thumbnails and disabled controls | STATIC 2D | Compact glyph/thumbnail reuse; do not add false clickability |
| Marketing hero | F; current root is auth entry, not this experience | STATIC 3D RENDER | Strong static scene and real CTA first |
| Marketing feature sections | F | PRE-RENDERED 3D | Short chapter actions paired with real product views |
| Yggdrasil scroll story | F | PRE-RENDERED 3D | Finite clips + static layers; semantic HTML, no scroll hijack |
| Optional interactive story exhibit | F, later only | REALTIME 3D | One opt-in shared-kit scene, never required for navigation |
| Marketing Room examples | F | STATIC 3D RENDER | Reuse app diorama recipes at larger export sizes |
| Launch/social graphics | F | STATIC 3D RENDER | Existing renders plus editable typography; no text baked into scene master |
| Product screenshots / launch explainers | F | STATIC 2D | Actual product screenshots; no fabricated feature states |
| Campaign motion | F | PRE-RENDERED 3D | Reuse rig/props; explicitly commissioned and user-controlled on web |

No meaningful current surface requires realtime 3D. UI-only is an intentional design decision, not missing art.

## 8. Default profile avatar strategy

Choose **procedural abstract geometric identities**, rendered as tiny static 2D assets or a small deterministic SVG grammar. They belong to Tosker through facets, spacing and palette—not by giving everyone a random animal species.

Proposal: 8 readable central silhouettes × 8 palette pairs × 4 broad motif arrangements = 256 curated combinations. This is a visual variety pool, **not a unique identifier**; collisions are acceptable because names/TIDs remain authoritative. Store a version and seed independently of names, email, gender, ethnicity or behavior. Do not derive public avatar URLs from private identifiers. Renaming or adding a nickname must not silently change the avatar.

At 24–32px, use one central shape and two or three color regions. Ensure circle-safe inset and contrast under presence overlays. Keep initials as fallback when an asset fails. Allow future user-selected variants/uploads without overbuilding an avatar editor now.

Geometric character heads could become a limited optional pack, but a new face/animal for every user increases identity review and rendering work. A whole cast should not block account creation. Never infer a person's demographic traits through avatar generation.

## 9. Default Room identity

Use two coordinated levels: **small square glyph identity** and **larger optional diorama cover**. Do not shrink a complete scene into a 24px sidebar avatar.

The small identity uses a deterministic palette, broad structural glyph and optional initial. Start with roughly 8–12 glyph families and 6–8 accessible palettes; evaluate combinations, not only raw count. The larger cover references a recipe such as generic gathering, planning, making or playing. The owner may later select it; a Room's name is not sent to an image generator by default.

Subrooms retain the parent's palette/shape family but get a distinct inset glyph and existing nested label. Sandbox stays personal/private. Use **circles for people, rounded squares for Rooms/Subrooms**, maintaining the product's shape language and truthful membership controls.

Generate a bounded library offline and reuse it. Room creation should remain a database operation plus an existing asset reference, not a rendering job. Semantic default identities scale to thousands of Rooms without thousands of image files.

## 10. Contained banner system

Current geometry is already useful: live checks at 1440px found the seven default destination banners at x=346, y=24, width=1038px, height=216px. CSS shares a 1180px workspace-content maximum; height can vary with content. At 390px, Explore was x=14, y=14, width=362px, about 202px high, with only a 58px reserved art column. These are observed values, **not a request to freeze all heights**.

Retain `WorkspaceBanner`'s outer frame, copy and separate `aria-hidden` decorative layer. Do not enlarge the banner to accommodate a detailed diorama. Desktop rules for future artwork:

- Use the same orthographic camera/light rig, art weighted to the right, at most one dominant silhouette and two supporting props.
- Keep the left 60–65% calm and low-detail; also reserve the existing bottom-right CTA area. The live Browse action sits in that area on desktop, so a generic right-side full scene is not automatically safe.
- Prefer a transparent render layered on existing CSS tones; reserve space explicitly to prevent layout shift. No baked title, buttons or fake labels.
- Keep soft shadow inside the frame. Use the same ground line and subject scale across Explore/Friends/Marketplace/Studio; quiet destinations may remain 2D.
- Mobile is a separate composition: a cropped tail/fold or one object in the narrow slot, or omit decorative art. Do not miniaturize the complete desktop world behind a wrapping heading.
- Test 1440×900, 1728×1117, 390×844, 430×932 and 200% zoom. If art harms readable text, focus or CTA hit targets, remove art before altering the successful UI geometry.

## 11. Motion language

Use motion to express **pieces assembling into useful shared space**, with a clear start, completion and rest. Proposed timing is art direction, not a universal animation constant.

| Action | Meaning / duration proposal | Boundary |
| --- | --- | --- |
| Look / peek | Attention and curiosity, 0.3–0.6s | One response to an intentional trigger, not eye tracking throughout the app |
| Hop / enter | Movement between contexts, 0.5–0.9s | Short arc, stable camera, no forced page travel |
| Carry / place | Retaining a useful object, 0.8–1.5s | Distinct release/contact and settled final pose |
| Build / snap | Several pieces becoming one capability, 1.5–3s | One small assembly, not a particle explosion |
| Climb / hang | Connect story chapters, 2–4s | Marketing only, authored contact points |
| Rest | Calm final pose | Still frame; no breathing loop required |
| Branch reveal / leaf shift | Suggest continuation, 0.5–1s | Secondary to main action; no continuous ambient animation in Chat/Hall |

Make the static end state explain the same thing. Offer pause/replay for stories and never autoplay audio. Reduced-motion preference should suppress decorative parallax, camera motion and auto-playback, not merely slow them. W3C's Pause/Stop/Hide guidance addresses automatically starting motion lasting more than five seconds alongside other content; give users clear control rather than relying only on an OS preference. [W3C motion control](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [reduced-motion guidance](https://web.dev/articles/prefers-reduced-motion).

## 12. Production pipeline and tool comparison

**Recommended:** Blender master → reviewed exports → images/video for product → optional optimized GLB for one isolated web test. This is a proposed workflow; no tools were installed or files generated.

| Tool / format | Best role | Tradeoff / requirement |
| --- | --- | --- |
| Blender | Canonical mesh/rig, reusable kit, cameras, light/material presets; offline renders and animation | Learning curve and master-model craft; freeze a tested version/export preset |
| Spline | Fast composition/interactivity sketch, optional hosted prototype | Another authoring surface and export/plan constraints; avoid maintaining two full masters |
| Three.js | Minimal custom scene, explicit resource/render lifecycle control | Engineering responsibility for loading, accessibility, fallbacks and disposal |
| React Three Fiber | Optional React integration for the same Three.js scene | Not a separate engine or automatic optimization; keep it out of the shared app shell |
| GLTF / GLB | Portable runtime geometry/material/animation delivery; GLB convenient single asset | Not the source project; unsupported procedural shading/interactivity must be rebuilt or baked |
| Meshopt / gltfpack | Optimize geometry, animation, node structure and optional textures | Inspect output: optimization may merge/remove named nodes used by interaction; preserve required semantic handles |
| Draco | Alternative geometry compression trial | Decoder overhead and decode time may outweigh transfer savings for tiny scenes; compare actual exports |
| Baked lighting / texture atlases | Consistent look and fewer dynamic lights/materials | Static lighting is less flexible; atlases need padding/mip/crop discipline; do not bake moving shadows into moving body textures |
| Static AVIF/WebP, PNG master | Most banners, cards, covers and avatars | Requires intentional crop/size variants; transparency/compression must be visually tested |
| WebM + MP4 fallback | Short pre-rendered 3D actions and richer story lighting | Codec/decode cost, autoplay restrictions, transparency inconsistencies; keep poster and fallback. Prefer opaque clips on a matching background initially |
| Lottie / SVG/CSS motion | Simple derived 2D marks or annotated diagrams | Not a general interchange/runtime for shaded Blender scenes; introduce a player only if measured reuse justifies it |
| Sprite / image sequences | Very short deterministic step/scrub experiment | Large decoded memory and many images; avoid for long scroll narratives |

Blender includes a Khronos glTF importer/exporter; source masters and delivery exports can remain under one production workflow. This does not imply every Blender shader or rig setup transfers unchanged. [Official Blender glTF exporter](https://github.com/KhronosGroup/glTF-Blender-IO).

Spline currently documents basic geometry/color/texture export and position/rotation/scale timeline tracks, while excluding its states/events/interactivity, lighting/environment/fog and several material/animation features from GLTF/GLB. Color/texture export is listed as paid. Therefore a Spline prototype is not a lossless shortcut to an identical Three.js deployment; test export parity before adopting it. Do not purchase a plan in this study. [Spline GLTF/GLB export](https://docs.spline.design/exporting-your-scene/files/exporting-as-gtlf-glb).

For runtime exports, begin with simple metallic-roughness materials, applied geometry and baked animation. Compare uncompressed, Meshopt and Draco **including decoder downloads and decode time**; choose one, not all by default. Three.js exposes Draco, Meshopt and KTX2 loader integration. gltfpack can optimize meshes/animations but may alter structure; protect named interactive nodes. [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [gltfpack production options](https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md).

Produce source `.blend` files in a future approved source store with versioned backups, not inside the current untracked history by assumption. Track source/license provenance, export settings, rig/material versions and review status. Only optimized approved derivatives eventually belong in the application release. Do not assume a cropped historical PNG has transparency, consistent geometry or a usable rig.

## 13. Static / pre-rendered / realtime split

Static is the default when a view communicates identity, welcome, category or atmosphere. Pre-rendered motion is appropriate when a short authored action or complex lighting is the message. Realtime is justified only when **the user's choice changes the spatial result** in a meaningful, bounded way.

| Stage | Static 3D | Pre-rendered | Realtime | Interpretation |
| --- | --- | --- | --- | --- |
| First approved art rollout | 90% | 10% | 0% | Planning allocation of illustrative roles, excluding UI-only/2D; a single clip may serve several placements |
| After a successful interactive POC | ~85% | ~13% | ≤2% | A cap, not a target; one isolated optional story exhibit may be enough |
| Core communication surfaces | Static only where useful | None by default | **Forbidden** | No canvases in Chat/Hall, rail, avatars, inputs, auth or notifications |

The ratio is a product decision, not a benchmark result. There is no 3D implementation to measure yet. Asset counts and exposure frequency matter more than a tidy percentage: one hero loop seen on every navigation can cost more attention and battery than many static cards.

## 14. Future web integration architecture

Keep an eventual art module independent from identity, messaging state and authorization. Components refer to semantic roles—`banner.explore`, `room.default.planning`, `avatar.default.v1`—rather than random filenames. A role may resolve to nothing, a small 2D mark, an image or a gated scene; **the surrounding UI must work with none of them**.

Proposed manifest fields: role, version, review state, aspect ratio/dimensions, desktop/mobile static sources, focal/safe zones, optional poster/video/GLB, reduced-motion fallback, decorative/meaningful classification, alt-text key, bytes, source revision and license/provenance. Do not implement the manifest now.

Future hierarchy could separate `mascot`, `kit`, `rooms`, `gizmos`, `banners`, `avatars`, `marketing` and shared palettes, with source assets outside app bundles. Reuse one approved render through responsive sizes; do not generate duplicate art for every destination size.

Load images with existing Next image patterns and accurate dimensions/sizes. Preserve the current banner's independent decorative slot. Keep meaningful labels and controls in semantic HTML; a canvas is never the only way to activate a feature. A future scene gets a local error boundary and poster fallback, an explicit load/play action and lazy dynamic import in its own route—not in `MessagingApp`, providers or the root layout.

Use hashed/versioned immutable public asset URLs on the existing static/CDN path after approval. Cache public art aggressively but never treat private user media as public brand assets. Keep CDN caches separate from auth data; do not embed private Room names/content into generic generated assets. No new service, database, CDN contract or deployment is required for this proposal.

## 15. Performance strategy and proposed budgets

Budgets below are **acceptance targets for a future prototype**, not observed Tosker 3D performance or quoted library sizes. KiB/MiB refer to binary units. Measure transferred bytes after content encoding separately from decoded memory. Reject the realtime option if it cannot fit; do not raise the limits merely to ship it.

| Item | Initial target / ceiling | Measurement and fallback |
| --- | --- | --- |
| Added initial JS on Chat/Hall/auth/rail | **0 KiB of 3D runtime** | Bundle/network audit; static art may require no new JS |
| Static-first marketing art orchestration | Target ≤10 KiB incremental compressed JS | Reuse CSS/browser primitives; do not add a large animation framework for one transition |
| Optional realtime runtime + loaders/decoders | Target ≤250 KiB compressed, hard review threshold 400 KiB | Actual build split measured; includes Three/R3F and chosen decoder, not GLB/textures; never preloaded from core app routes |
| One optional interactive scene, total first activation | ≤1.5 MiB transferred including runtime and asset payload | Load only after consent/intent; static poster if budget or device gate fails |
| GLB including embedded textures | Target 300–700 KiB; cap 1 MiB | Count external textures separately if not embedded; avoid double-counting embedded data in totals |
| Geometry / draw calls | Target 10k–30k visible triangles, ≤30 calls; review caps 50k / 50 | Profile actual exported scene; material count/overdraw can dominate triangle count |
| Textures | Prefer flat colors; at most two 1K atlases in first scene | Target ≤16 MiB decoded texture memory; no 4K texture for a small prop |
| Scene working memory | Target ≤64 MiB incremental JS/geometry/texture budget | Approximate with supported tooling and device tests; GPU/driver allocations may exceed JS-visible estimates |
| Desktop banner | 80–160 KiB typical compressed render; cap 200 KiB | Export to rendered dimensions at suitable density, not original multi-megapixel board |
| Mobile banner | 30–70 KiB; cap 90 KiB | Separate single-object crop or no art |
| Grid card / avatar | 15–40 KiB per card; ≤8 KiB per tiny avatar; reuse/cache | Lazy-load offscreen cards; initials/glyph fallback |
| Static marketing hero | ≤200 KiB desktop / ≤90 KiB mobile | Prioritize visible poster if it is LCP; do not lazy-load the primary visible image |
| Short motion clip | 3–6s, 24–30fps, ≤1 MiB desktop / ≤500 KiB mobile | Poster first, no auto-download on constrained mode; max one active clip |
| Interactive render loop | Target 60fps while manipulating, stop at rest; below sustained 30fps → static fallback | Cap DPR around 1–1.5; no continuous loop in hidden/offscreen tabs |
| Responsiveness / layout | No attributable layout shift; no added long tasks over 50ms during core interaction; aim ≤200ms input response | Compare repeated cold/warm traces with/without art on the same device/network; do not claim lab result as field p75 |

Illustrative memory math: a 1024×1024 RGBA texture is 4 MiB before mipmaps, approximately 5.33 MiB with a complete mip chain. A 120-frame 512×512 decoded RGBA sequence is about 120 MiB before additional buffers. A small compressed download is not necessarily cheap to hold/render. KTX2/Basis can improve GPU texture delivery, but evaluate decoder/transcode overhead and visual quality for this tiny scene rather than adding it reflexively. [Khronos KTX](https://www.khronos.org/ktx/).

Implementation gates to test later:

- Static content and real CTA render first. Below-fold images/clips use intersection loading; runtime loads only on intentional activation. Do not use hover as the sole load/control mechanism.
- Pause media when hidden/offscreen; release unused scene resources on navigation. On-demand rendering avoids a permanent game loop; reuse geometry/materials and instance repeated objects. [R3F on-demand rendering and reuse](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx).
- Use a poster and conservative `preload` behavior for video, with `playsInline` and silent clips if autoplay is ever approved. Native video lazy-loading support is evolving; do not assume every target browser supports it. Test intersection-driven fallback. [web.dev video loading](https://web.dev/articles/lazy-loading-video).
- Do not rely on universally detecting low-power mode. Default mobile to static; respect reduced motion and Save-Data where available; provide a user toggle and react conservatively to measured slow rendering.
- WebGL unavailable, context loss, failed fetch, denied autoplay, memory pressure or reduced motion → existing static poster and fully usable HTML. Avoid fallback loops that repeatedly recreate a failing canvas.
- Keep a single optional canvas, no dynamic shadows/post-processing at first, no transparent layers stacked across large screen areas. Stop rendering at rest and on backgrounding; dispose geometries/materials/textures and image resources deliberately.
- Acceptance devices: representative midrange Android, iPhone Safari and modest laptop; cold cache/constrained network, keyboard and screen reader, browser zoom, reduced motion, background/foreground, context loss and route-away/back. Current MS5 responsive results do not validate these future 3D budgets.

Realtime 3D is explicitly forbidden in message bubbles, conversation lists, user/Room avatars, Hall note cards, forms, auth, Settings, notifications and repeated catalogue tiles. The marketing exhibit does not justify a hidden runtime in those routes.

## 16. AI-assisted production and founder workload

These are recommended uses with mandatory review, not a claim that an AI-generated mesh is production-ready.

| AI can accelerate | Human authority remains required |
| --- | --- |
| Moodboards, alternative styleframes and prop ideas | Choosing a distinctive direction and rejecting lookalikes |
| Blender scripts for placement, camera variants and batch export | Reviewing scripts in a disposable copy; topology, transforms, naming and reproducibility |
| Procedural recipe/palette variations from approved parts | Curating readable combinations and semantic appropriateness |
| Draft topology/rig suggestions and animation blocking | Master silhouette, topology cleanup, weights, contact points, deformation and export behavior |
| Texture concepts and broad lighting studies | Seam/UV/color consistency, licensing and whether textures are needed at all |
| Render automation, naming, manifest checks, size reports and comparison sheets | Final visual acceptance at actual product sizes and performance approval |
| Adapting an already approved pose/scene through deterministic parameters | Identity invariants and source-version compatibility |

Never repeatedly regenerate the canonical squirrel from text, accept arbitrary generated topology because a front render looks good, or send real private Room content to generation tools. Record source/license provenance and review provider terms before commercial production; this study does not confer rights to third-party characters, branded props or copied compositions.

Needed skills: simple mesh modeling, UV/material basics, camera/light composition, character posing/rigging, export/optimization, browser performance/accessibility and disciplined asset versioning. Ryan need not become a cinematic animator; he needs to be able to assemble, pose, render and reject inconsistent assets.

Planning estimate, not a quote: an experienced artist/developer might prove the small POC in roughly **4–8 focused working days**. A founder learning 3D should budget **several weeks part-time**, with the character/rig the most uncertain portion. After the kit is stable, aim for a simple variant in 1–3 hours and a genuinely new category in a day or two. If every new card takes several bespoke modeling days, reduce the system before scaling it.

## 17. Risks and explicit feasibility answers

The biggest risk is **production consistency becoming a bottleneck**, not whether a browser can display a model. Historical raster boards already show that attractive samples do not provide editable masters or repeatable geometry.

| Question | Verdict |
| --- | --- |
| Is 3D technically feasible? | Yes as an authoring/render system; selective interactive delivery is conditional on an export/device POC |
| Maintainable by one founder? | Yes for a bounded modular kit and static outputs; no for a growing bespoke animated universe alongside core engineering |
| Primary tools? | Blender, ordinary image/video export and existing web image delivery; optional Three/R3F only for one measured scene |
| Blender, Spline or both? | Blender owns the master. Spline is optional for quick spatial/interaction sketches; do not assume lossless roundtrip |
| Where realtime? | At most an opt-in marketing/feature exhibit with meaningful spatial choice; nowhere in critical communication |
| Where static? | Banners, catalogue cards, Room examples/covers and selected empty/onboarding states; keep small identity/control surfaces 2D |
| What should AI automate? | Repetitive placement, render variants, file bookkeeping, draft scripts and constrained ideation |
| What requires manual craft? | Mascot identity, topology/rig, materials/cameras, composition and acceptance decisions |
| First reusable kit? | One squirrel, one platform, one branch joint and a tiny shared-object/prop set; not a large cast |
| Required skills? | Modeling, posing, materials/light/camera, export and runtime budgets; contracting master/rig work is reasonable |
| What would make it fail? | Prompt-dependent identity, fantasy drift, per-card canvases, unreadable crops, export mismatch, absent reduced-motion fallback or art delaying messaging |
| Biggest bottleneck? | Authoring/review of the canonical model and new unique props, followed by crop consistency |
| How stay distinctive? | Recognizable origami-derived tail/head, warm night palette, folded joints and shared-object actions; no competitor silhouettes, palettes, outfits or compositions |
| How scale to hundreds? | Reuse category recipes and static glyphs; allow generic fallback; curate a small first-party set and later creator templates, not hundreds of new mascot scenes |
| Performance cost? | Static costs mostly transfer/decode; motion adds video decode; realtime adds optional runtime, scene memory and GPU work. Section 15 sets unproven prototype limits |
| Smallest proof? | One study-room assembly from the same master exported as a banner, short clip and optional interactive variant; section 19 |

Other risks and controls: a dark scene can disappear on a dim phone (test at actual size/brightness); warm art can compete with pink/gold controls (reserve action accents); procedural variety can imply unique identity when it is not (names/TIDs remain primary); optimizers can remove animated handles (verify output); a vendor-specific scene can lock in delivery costs (preserve masters and a portable export); attractive future scenes can overpromise unbuilt features (label concepts and pair with truthful screenshots).

## 18. Proposed art milestone roadmap

**Proposal only; nothing in this roadmap is started.** Validate export early, before producing a large catalogue.

| Stage | Purpose / deliverable | Dependencies | Validation / exit criterion | Difficulty / indicative experienced effort |
| --- | --- | --- | --- | --- |
| ART-0 | One styleframe plus silhouette/crop studies; agree on what to keep/change from V4 | Founder approval and exact reference board | Tosker recognizable without costume; contemporary rather than fantasy; readable banner/mobile crop | Medium, 1–2 days |
| ART-1 | Reproducible mascot blockout/master, minimal rig and neutral turnaround | ART-0 approval | Same model works in front/side/three-quarter and small silhouette; no prompt-dependent anatomy | High, 3–7 days depending on polish |
| ART-2 | Minimal geometry/material kit and one study-room diorama | ART-1 proportions and token baseline | Same kit can express one alternate activity without changing style; scale/origins/material IDs consistent | Medium, 2–4 days |
| ART-3 | Early export/performance gate: static, short motion and one opt-in web proof | ART-1/2 minimal subset, not full polish | Exported appearance/animation intact; static fallback complete; budgets hold on target device | Medium/high, 1–3 days; overlaps POC work |
| ART-4 | Contained banner presets and responsive derivatives for a few destinations | ART-3 go decision | Existing frame/CTA/text geometry preserved at required viewports; no artwork-induced layout shift | Medium, 1–2 days |
| ART-5 | Default person/Room identity grammar and variation contact sheet | Palette/shape approval | Circle vs square distinction, 24px readability, stable seeds/versioning, accessible combinations | Medium, 1–3 days |
| ART-6 | Small reusable motion set: look, carry/place, hop, rest | Approved rig/export pipeline | Clear end states and contacts, restrained timing, reduced-motion/static equivalent | Medium/high, 2–4 days |
| ART-7 | Three-chapter Yggdrasil storyboard/low-fidelity narrative | Shared kit, banner presets, selected motion | Users understand Room/Subroom/Gizmo distinctions; skip/text path complete; finite asset load | High, 3–5 days |
| ART-8 | Separately authorized web integration experiment | ART-3 device evidence and explicit product approval | Isolated route/component, no messaging runtime regression, accessibility/device evidence and rollback plan | High, 2–4 days |

These are overlapping work estimates, not additive commitments or promised delivery dates. Stop after each approval gate. Scaling to more Rooms/Gizmos follows evidence of cheap variation—not a requirement to finish all stages first.

## 19. One deliberately small proof of concept

**“A study Room comes together.”** One squirrel, one short branch, one open platform, one board, two seats and three note/book blocks. No second character, new cast, detailed tree, landmark or full landing page.

Single authored action: Tosker carries a folded tile onto the branch-mounted platform, places it beside the shared board, and rests. The same canonical scene produces:

1. One static desktop banner and deliberately simplified mobile crop, plus a silhouette thumbnail.
2. One 3–4 second pre-rendered clip with a static end-state poster.
3. One optional lightweight web test in an isolated future playground: an HTML button switches between empty and assembled arrangements; the same result remains visible in a static image with WebGL disabled. Do not add an orbit control just to claim interactivity.

This is **one scene tested through three delivery modes**, not three independently styled projects. Build the static styleframe first and stop if identity fails. Only the minimal ART-1/2 subset is needed to test motion/export; the full master can be refined after the POC passes.

Pass criteria:

- Five informal reviewers can recognize a squirrel and describe people preparing a shared study space; most should not describe it as a fantasy game. This is a small qualitative gate, not statistical research.
- The same head/tail/eye construction survives all outputs; silhouette stays identifiable at 32px and meaningful expression at 96px.
- Banner works inside the existing desktop/mobile frame without changing title/CTA layout. No text is baked into the art.
- Motion has clean contacts, a readable placement action and a complete resting state. Reduced motion is fully static and tells the same story.
- Web output meets section 15's measured transfer/memory/frame and response targets; no render loop at rest or when hidden; keyboard/button and fallback work.
- Swapping the board/books for the kit's map/luggage abstraction creates a coherent second recipe within roughly two hours, without remodeling the squirrel or light rig. This tests reuse, not a second production scene.
- Source, rig, presets and exports reproduce the result after reopening the project. No prompt is required to recover the approved character.

No-go for realtime if export fidelity, device performance or maintenance cost fails; that **does not invalidate static 3D art**. No-go for the visual direction if it remains generic or fantasy-dependent after the bounded style test. Do not keep expanding the scene to compensate.

## 20. Go / no-go recommendation

**GO to request approval for ART-0, not to implementation.** Tosker can plausibly sustain a distinctive geometric world if it is authored from reusable masters and delivered conservatively. The proposed system fits the current contained banners, flat functional icons and person/Room shape language without redesigning the shell.

**NO-GO** to a full realtime tree, a production cast, hundreds of unique dioramas, replacing the UI with 3D, or integrating the existing unapproved raster library now.

Founder decisions before ART-0: approve the contemporary origami-derived squirrel direction (including whether the cloak is discarded), approve the open-diorama system, accept static-first delivery and the small POC cap, and decide whether to commission master-model/rig help. Reference images and styleframes are review inputs; the eventual approved mesh/rig is the repeatable source of truth.

MS5 stays locked. MS6 remains separately authorized. `toskerArt/` stays untouched, untracked and unintegrated.
