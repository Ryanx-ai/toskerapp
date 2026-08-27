# Tosker

Tosker is a messaging-first application built around Rooms: familiar conversation on the surface, with space for much more inside each Room.

Milestone 1 is locked after founder-led information-architecture refinement. The current build validates a persistent, collapsible messaging shell; My Room; personal chats; shared Rooms; a spatial high-signal Hall; session-only message sending; and message-level translation UX. Explore, Marketplace, Studio, Settings, and Help establish future application hierarchy without implementing those products. There is no backend, authentication, persistence, realtime infrastructure, or production translation service.

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
- `/personal/my-room` — private My Room
- `/personal/[slug]` — personal conversation
- `/room/[slug]` — shared Room, opening directly into Chat
- `/room/[slug]/hall` — Room Hall
- `/create` — minimal Create a Room flow

Route changes preserve a persistent shell component while allowing direct links and browser history. On mobile, `/` is the conversation list; selecting a conversation opens a focused surface with a clear back action.

## Structure

- `src/app` — App Router routes, metadata, tokens, and local fonts
- `src/components/messaging-app.tsx` — persistent shell and local interactive messaging
- `src/data/messaging-data.ts` — typed conversations, multilingual messages, translations, and Hall notices
- `public/brand` — founder-supplied canonical SVG identity assets
- `docs` — product vision, vibeguide, UI references, and roadmap

The primary dark-interface logo is `toskerlogo-full-white.svg`; `toskerlogo-icon-main` remains the provisional logomark and favicon candidate. Alternative founder-supplied variants are preserved.
