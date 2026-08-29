# Tosker

## Milestone 2 communication shell

The local prototype now uses one persistent communication model across Sandbox, personal conversations, and Rooms: every space exposes Chat, Hall, and Add; desktop conversation rows can be reordered; message menus support replies and reactions; and the Hall uses a compact, contextual notice-card system. Prototype data is versioned in local storage and remains local-only.

Tosker is a messaging-first application built around Rooms: familiar conversation on the surface, with space for much more inside each Room.

Milestone 1 is locked. Milestone 2 is **in progress / founder review** and adds a complete first-time journey, local prototype Room creation, prototype invitation and Add-to-Room interactions, and believable Explore, Marketplace, Studio, Settings, and Help surfaces. There is still no backend, authentication, realtime infrastructure, payment system, plugin runtime, or production translation service.

## Stack and setup

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, npm
- Founder-supplied local Mermaid and Montserrat fonts

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Validate with `npm run lint`, `npm run typecheck`, and `npm run build`.

## Routes

- `/` — messaging shell and conversation list
- `/personal/my-room` — permanent private Sandbox
- `/friends` — local Friends, requests, TID search, and chat creation prototype
- `/personal/[slug]` — personal conversation
- `/room/[slug]` — shared Room, opening directly into Chat
- `/room/[slug]/hall` — Room Hall
- `/create` — minimal Create a Room flow
- `/explore` — visual capability discovery prototype
- `/marketplace` — visual creator marketplace prototype
- `/studio` — visual creator workspace prototype
- `/settings` and `/help` — lightweight utility shells

Route changes preserve a persistent shell component while allowing direct links and browser history. On mobile, `/` is the conversation list; selecting a conversation opens a focused surface with a clear back action.

## Structure

- `src/app` — App Router routes, metadata, tokens, and local fonts
- `src/components/messaging-app.tsx` — persistent shell and local interactive messaging
- `src/data/messaging-data.ts` — typed conversations, multilingual messages, translations, and Hall notices
- `src/data/prototype-user.ts` — central prototype identity used for personalisation
- `src/lib/prototype-store.ts` — versioned localStorage state for Sandbox messages, local chats and Rooms, tags, pinning, and archives
- `public/brand` — founder-supplied canonical SVG identity assets
- `docs` — product vision, vibeguide, UI references, and roadmap

The primary dark-interface logo is `toskerlogo-full-white.svg`; `toskerlogo-icon-main` remains the provisional logomark and favicon candidate. Alternative founder-supplied variants are preserved.

The sidebar’s clearly labelled **Prototype state** control resets the browser to a fresh account or restores the populated demo. This is walkthrough infrastructure, not production account state.

On desktop, Tosker owns the viewport: navigation and utility regions remain anchored while conversation history, Hall, and product canvases scroll independently. Mobile retains its focused list-to-conversation layout.

Milestone 2.1 adds client-side conversation search, compact reusable conversation rows, contextual actions, attachment placeholders, emoji entry, guarded destructive actions, and predictable chat-scroll behavior. These interactions remain local prototype state unless explicitly described otherwise.

Milestone 2.2 makes the communication rail the persistent application spine. Explore, Friends, Marketplace, Studio, Settings, and Help are workspaces inside that shell. The unified list keeps Sandbox first, uses Room tags as compact metadata, and supports local search and pinning. The pink creation action branches into a Personal Chat flow or a fast optional-step Room flow.
