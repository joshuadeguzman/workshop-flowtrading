---
name: verify-app
description: >
  Confirm the FlowTrading app is healthy after a change: it builds, typechecks,
  lints, and all four screens actually render. Use as the "did I break it?" check
  before committing or at the end of a workshop step.
---

# Verify the app

Run these in order and stop at the first real failure. Everything is local, so
this is fast.

## 1. Build, typecheck, lint

```bash
cd apps/web
npx next build        # production build + typecheck; must succeed
npx eslint .          # must be clean (0 errors)
npx tsc --noEmit      # must be clean
```

If the build passes but lint warns about "manual memoization", that's the React
Compiler - remove the hand-written memo (see `next-best-practices`).

## 2. Smoke-test the four screens

Start the dev server and confirm each route returns 200:

```bash
cd apps/web && npx next dev &     # or `npm run dev` from the repo root
sleep 3
for path in "/" "/screener" "/stock/NVDA" "/trade/NVDA"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$path -> $code"
done
```

All four should print `200`.

## 3. Eyeball the critical rules (browser)

Open http://localhost:3000 and check the things that silently regress:

- **No hydration error** in the console on first load (the #1 bug - see
  `next-best-practices`).
- **P&L shows a sign and an arrow** (▲/▼), not color alone. Toggle OS "reduce
  motion" - animations should vanish, the app still works.
- **Money looks right:** `$1,234.56`, signed P&L, and **no `-$0.00`** anywhere.
- Switch the simulate horizon (Live → +1M): prices and P&L re-price across the
  Portfolio, Markets, and detail screens.

## 4. Report

State plainly what passed and what failed, with the actual error output for any
failure. Don't claim "done" if the build failed or a screen 500s - say so and
point at the cause.

> ℹ️ If the dev server exits on its own in the background, that's the known
> `turbo dev` behavior - run `npx next dev` directly from `apps/web`.
