# Tosker public landing — 2026-09-07

Baseline: `51c8daa8`, MS6A product `f6ada068`. Landing is a separate release; MS6B begins only after canonical smoke.

## Route and auth contract

- `/`: semantic, statically prerendered public landing, including for signed-in visitors. No account/DB bootstrap dependency.
- `/app`: former Chats home. App-internal home links and invalidation paths updated.
- Existing Room/Personal/Subroom/Friends/Explore/Profile/Settings/Help/invitation URLs unchanged. Their pages moved verbatim into `(workspace)` with the existing ToskerSessionBoundary. Server authorization/actions remain intact.
- Open Tosker opens existing Clerk sign-in modal; Join Tosker opens sign-up. Both complete at `/app`. Already authenticated visitors enter `/app` directly; no duplicate account creation.
- View landing page: desktop footer near version; Profile and Help for mobile. No added bottom-nav item.

## Source assets and truthfulness

Read ToskerWeb foundation and landing-v1 README/generation prompts; inspected all eleven source assets and the selected composition. Sources: `/Users/ryanc/Desktop/tosker/concepts/landing-v1/`.

Selected real MS6A public-demo captures: `tokyo-chat-wide.png`, `tokyo-hall-wide.png`, 1440×680. Cropped x=290 to remove global sidebar only; lossless WebP masters preserve the real Room UI. No screenshot repainting or generated UI. Captions explicitly identify demo content. Captured poll result is not a claim of a working live poll.

Hero/ending reuse supplied generated concept imagery, optimized as static WebP. They are landing illustrations, not canonical ToskerArt masters. Existing concept silhouette clip/blended ending preserved. Map is labeled Future Gizmo concept / not available; maker illustration is labeled Community vision / contribution tools not available. No Contribute/Download/Developer action, commerce, realtime or functional Gizmo claim.

`scripts/prepare-landing-assets.mjs <concept-directory>` reproduces raster derivatives. Vectors are copied unchanged. No new runtime/dependency. Existing Mermaid/Montserrat/wordmark. Next Image responsive sources, hero preload, lazy below-fold images. No animation dependency or scroll hijack. `toskerArt/` and unrelated Art documents untouched.

## Validation record

- Final TypeScript, ESLint, production build and diff check pass after all QA fixes; root listed static. No package/dependency changes. Six static landing assets total approximately 350 KB before responsive delivery.
- Schema consistency and read-only DB invariant audit pass, zero invalid Sandbox owners/duplicate TIDs/memberships/personal pairs/orphan pins. No migration or DB content mutation in this patch.
- Public sign-in and sign-up modals verified; actual A sign-in via existing Clerk test-email flow completed at `/app` with retained identity/conversations/Rooms. Signed-out `/app` retains AuthGate; demo remains deliberately isolated.
- Signed-in footer → `/` works; mobile Profile → `/` works. Landing remains visible authenticated. Existing shared Room Chat/Hall render with saved content and surface navigation.
- Widths 320/375/390/430/768/1024/1440/1728: no horizontal page overflow or heading overflow, one h1. Full desktop story visually checked; lazy images loaded on scroll. 720×450 equivalent 200% layout checked, not a native browser-zoom claim.
- Mobile screenshot viewer: keyboard Enter opens, scroll region accepts ArrowRight, visible focus, Escape closes and restores trigger focus. Screenshot pixels remain full-size in viewer; inline mobile exhibit offers horizontal inspection. Normal page scroll and skip link verified.
- Existing Personal Chat route also renders saved messages after the layout move. Reduced-motion emulation retains the story and suppresses transitions. Browser error collection remains empty.
- QA found inherited desktop html/body scroll lock; landing-only CSS override fixed it. Original generated `.next/dev` route types referred to moved source paths; cache was moved to a temporary recovery directory and types regenerated, no source discarded.
- One local Clerk refresh-loop warning occurred during old production-server/session reuse before normal sign-in. Fresh normal sign-in succeeded; no browser errors or reproducible auth loop in the new flow. Development-key warning remains expected. Rapid QA scrolling can trigger Next's below-fold LCP suggestion; captures intentionally remain lazy.

## Release

Landing commit `509ee93d31a3a27de0fa90694cb1a1bc101aec65` pushed; canonical deployment `dpl_8QXaXM7Vwoc13LQxgHbC1CaV1Gd9` READY. Public landing and both Clerk flows verified live. Live review measured Hall toolbar contrast below 4.5:1 against the sunset; a bounded follow-up adds a restrained dark translucent backing to Hall controls/mobile scroll guidance. TypeScript, lint, build and diff check rerun green. Final authenticated canonical smoke pending this follow-up deployment; do not start realtime until it passes.

**Final gate PASSED:** contrast commit `332fd168e3623eb01b735d92b833c6c7b2542d5f`, deployment `dpl_6zghoSZVR7Xi4TG6FdFH4abEM9cL` READY and aliased to `https://toskerapp.vercel.app/`. Live A sign-in completed at `/app`, with existing account/Rooms/conversations; footer returned to landing; direct authenticated root reload retained landing and signed-in app CTAs. Live mobile opening and deployed contrast backing verified; browser error collection empty; Vercel runtime-error scan over the prior 15 minutes empty. Local build server remains at localhost:3000. Part B research may proceed; see `MS6B-PROVIDER-DECISION.md` for the founder gate. No realtime code is deployed.

## Known debt

Canonical Vercel production alias still uses Development Clerk/Neon; no Production/Preview DB provisioned. This release does not change that contract. Physical mobile devices/native zoom not exercised. Art is the supplied concept set, not a new ToskerArt system. No analytics, legal destinations or unsupported public workflows invented.
