---
name: write-tests
description: >
  Add tests to the FlowTrading app - unit tests for the pure portfolio/format
  math, component tests for the UI rules, and Playwright e2e for the four user
  flows. Use when adding or changing logic that deserves a regression guard, or
  to stand up a test suite from scratch (none is installed yet).
---

# Writing tests for FlowTrading

The app ships **without a test runner**. This skill sets one up and points you at
the highest-value things to test. Keep tests **deterministic** - the seeded data
and the simulation (`lib/simulate.ts`, `lib/chart-series.ts`) are seeded on
purpose, so outputs are stable and snapshot-friendly.

## What to test, in priority order

1. **`lib/portfolio.ts` (unit) - the highest value.** Pure functions, and the
   actual point of the app. Cover:
   - average cost across multiple buys
   - the **partial-sell invariant**: sell part of a lot → avg cost unchanged,
     shares and total cost fall
   - **realized vs unrealized** are separate and correct
   - a fully-closed position (sell everything) → clean zero
2. **`lib/format.ts` (unit)** - `-$0.00` never appears; signs and arrows; share
   trimming; market-cap suffixes.
3. **`lib/simulate.ts` / `lib/chart-series.ts` (unit)** - determinism (same input
   → same output) and that the chart series passes through the 3 real closes.
4. **Components (integration)** - `Pnl` renders sign **and** arrow; a gain isn't
   color-only.
5. **The 4 flows (e2e)** - buy in dollars, sell, sort/filter the screener + star a
   watchlist item, switch the simulate horizon and see P&L move.

## Setup - unit & component (Vitest)

```bash
cd apps/web
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

Add to `apps/web/package.json` scripts: `"test": "vitest run"`,
`"test:watch": "vitest"`. Create `apps/web/vitest.config.ts` with the React
plugin, `environment: "jsdom"`, and the `@/*` alias mirroring `tsconfig.json`.
Put tests next to code as `*.test.ts(x)` or under `apps/web/__tests__/`.

Example (the invariant that matters most):

```ts
import { describe, it, expect } from "vitest"
import { buildPosition } from "@/lib/portfolio"

describe("partial sell", () => {
  it("does not change average cost", () => {
    const trades = [
      { id: "1", symbol: "NVDA", side: "buy",  shares: 10, price: 200, timestamp: 1 },
      { id: "2", symbol: "NVDA", side: "sell", shares: 4,  price: 250, timestamp: 2 },
    ] as const
    const pos = buildPosition("NVDA", trades as any)
    expect(pos.shares).toBe(6)
    expect(pos.avgCost).toBe(200)              // unchanged
    expect(pos.realizedPnL).toBeCloseTo(4 * (250 - 200))
  })
})
```

## Setup - e2e (Playwright)

```bash
cd apps/web
npm i -D @playwright/test && npx playwright install chromium
```

Add `apps/web/playwright.config.ts` with a `webServer` that runs
`npx next dev` on port 3000 and `baseURL: "http://localhost:3000"`. Put specs
under `apps/web/e2e/`. Reset state between tests with
`await page.evaluate(() => localStorage.clear())`.

Example flow to assert: open `/trade/NVDA`, switch to **Dollars**, type `5000`,
confirm the preview shows the resolved share count and the cost, buy, then check
the holding shows on `/`.

## Conventions

- Tests are **pure and offline** - no network, no real clock. Never assert against
  live values; assert against the seeded data.
- Don't test the exact synthesized chart *shape*; test its **invariants**
  (deterministic, hits the real closes).
- Run `npm run test` (and `npm run build`) before calling the work done.
