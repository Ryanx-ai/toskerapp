# Tosker

Tosker is a shared digital room that becomes whatever the people inside it need.

The immediate wedge is simple: **Every event deserves a Tosker.** The product begins event-first, grows room-first, and may eventually support programmable rooms. This repository currently contains the static, founder-reviewable Milestone 1 product world—no backend, authentication, persistence, or realtime messaging.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, npm
- Founder-supplied local Mermaid and Montserrat fonts

## Run and validate

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Validate with `npm run lint`, `npm run typecheck`, and `npm run build`.

## Structure

- `src/app` — routes, metadata, global tokens, and local fonts
- `src/components` — reusable product UI
- `src/data` — typed Milestone 1 mock data
- `public/brand` — founder-supplied SVG identity assets
- `docs` — vision, vibeguide, UI references, and roadmap

## Brand asset map

- Primary full logo: `toskerlogo-full-white.svg` on dark UI; `toskerlogo-full-dark.svg` on light UI
- Primary wordmark: matching `toskerlogo-wordmark-white.svg` / `-dark.svg`
- Primary squirrel/logomark: `toskerlogo-icon-main.svg`
- Light/dark variants: filenames ending in `white` / `dark`
- Favicon/app-icon candidate: `toskerlogo-icon-main` (PNG metadata icon; SVG retained in `public/brand`)

`icon-variation` and `icon1` are retained as founder-supplied alternatives pending hierarchy review.
