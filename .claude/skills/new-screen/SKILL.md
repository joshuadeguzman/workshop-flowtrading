---
name: new-screen
description: >
  Scaffold a new route/screen in the FlowTrading app that follows the house
  conventions (client boundaries, money formatting, P&L accessibility, motion,
  hydration safety). Use when adding a page like a per-sector view, a trade
  history, or a settings-free extension.
---

# Add a new screen

Follow the patterns already in `apps/web/app` - don't reinvent them.

## 1. Route

- Add a folder under `apps/web/app/<route>/` with a `page.tsx`.
- Dynamic segment? Use `app/<route>/[param]/page.tsx`. If the page is interactive
  (it will be), make it a **Client Component** and read the param with
  `useParams()` - not `await params` (that's for Server Components). See
  `app/stock/[symbol]/page.tsx`.
- Guard a missing entity with `notFound()`, then re-bind to a fresh `const` so its
  type is non-nullable for the closures below (the existing pages do this).

## 2. Data & state - reuse, don't rebuild

- Prices: `useSimulation().priceOf(symbol)` (horizon-aware). Never read
  `stock.currentPrice` directly in a screen - it ignores the simulate horizon.
- Account/positions: `useAccount()` (holdings, summary, `positionFor`, buy/sell).
- Watchlist: `useWatchlist()`.
- Static data: import `STOCKS` from `@/data/stocks`. **Never edit its values.**
- Any `localStorage` goes through `lib/storage.ts` + a hook that starts empty and
  hydrates in an effect - never read storage during render.

## 3. Presentation - the non-negotiables

- **Money/percent/shares** through `@/lib/format` only. No hand-rolled formatting,
  never `-$0.00`.
- **P&L** via `<Pnl>` / `<PnlPair>` - sign + arrow + color, readable in greyscale.
- **Charts** hand-rolled: `<Sparkline>` (static) or `<TrendLine>` (interactive).
  No chart library.
- **Color:** greyscale UI; green/red for P&L only; brand color (`lib/brands.ts`)
  only as ambient chart/card tint.
- `font-mono tabular-nums` for all numbers. Mobile-first, test at 375px.

## 4. Motion (if any)

- `useGSAP` with a scoped ref; gate on `useReducedMotion()`; animate only
  `opacity`/`transform`; nothing loops. Keep entry sequences under ~600ms.

## 5. Navigation

- A top-level destination? Add it to `TABS` in `components/finance/nav.tsx` (it
  renders in both the header and the mobile tab bar). A drill-down (like detail /
  trade) needs no tab - give it a back link and reach it via a `<Link>`.

## 6. Finish

- Run the `verify-app` skill. `npm run build`, `lint`, and `tsc` must be clean and
  the new route must return 200.
