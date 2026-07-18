---
name: next-best-practices
description: >
  Use when writing or debugging Next.js 16 (App Router) code in this repo, or when
  you hit a hydration error, a "params is a Promise" type error, or a Server/Client
  Component boundary problem. Encodes the Next 16 gotchas that bite beginners.
---

# Next.js 16 - the parts that surprise you

This app runs **Next.js 16 + React 19**. Several things changed from the Next.js
in most tutorials and training data. When in doubt, read the vendored docs first:
`apps/web/node_modules/next/dist/docs/`.

## 1. Dynamic route params are async

In a **Server Component** page, `params` and `searchParams` are **Promises**:

```tsx
export default async function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
}
```

In a **Client Component** (this app's interactive pages), read the route with the
hook instead - no awaiting:

```tsx
"use client"
import { useParams } from "next/navigation"
const { symbol } = useParams<{ symbol: string }>()
```

If you see *"'params' is possibly a Promise"* or params coming back as `{}`, this
is why.

## 2. Server Components by default; `'use client'` only on leaves

- Default to Server Components. Add `'use client'` **only** where you need state,
  effects, event handlers, `localStorage`, or GSAP.
- Push interactivity to the smallest leaf. Don't slap `'use client'` on a layout
  and drag the whole tree client-side.

## 3. Hydration mismatches (the #1 beginner bug)

The server render and the **first** client render must be identical. `localStorage`,
`window`, and `Date.now()` don't exist on the server, so:

- Start state from a **deterministic default** that matches SSR (e.g. empty account).
- Read `localStorage` inside `useEffect` **after mount**, then update state.
- Never branch render output on `typeof window`, `Math.random()`, or a live date
  during the initial render.

In this repo, `lib/storage.ts` is the only module that touches `localStorage` and
it is SSR-guarded; the hooks (`use-account`, `use-watchlist`, `contexts/simulation`)
follow the start-empty-then-hydrate pattern. Copy it.

## 4. The React Compiler is on

Next 16 compiles automatic memoization. If ESLint warns *"could not preserve manual
memoization"*, don't fight it - remove the hand-written `useMemo`/`useCallback` and
let the compiler handle it, or hoist the value to a plain `const`.

## 5. This app is client-only - don't reach for the server

No API routes, no server actions, no database, no data fetching. Prices are a
static import (`data/stocks.ts`), not a `fetch`. If a solution wants a route
handler or `async` server data, it's the wrong solution here.

## 6. Small stuff that still matters

- Navigate with `next/link`, images with `next/image`.
- Prefer `async/await` over `.then()` chains; use early returns.
- Keep components small and named-exported.

## Quick triage

| Symptom | Likely cause | Fix |
|---|---|---|
| `params` type error / empty | Awaiting in client, or not awaiting in server | `useParams()` in client; `await params` in server |
| "Hydration failed" / "Text content did not match" | Rendered `localStorage`/`Date`/random on first paint | Start from SSR-safe default, hydrate in `useEffect` |
| ESLint "manual memoization" warning | Fighting the React Compiler | Drop the manual memo or hoist to `const` |
| `window is not defined` | Server touched a browser API | Guard with a check or move into an effect |
