# AGENTS.md - FlowTrading house rules

These are the working rules for **any AI coding agent** on this repo - Claude
Code, Cursor, Codex, Copilot, Gemini, and friends. This file is the **single
source of truth**; `CLAUDE.md` just points here (`@AGENTS.md`) so Claude Code
reads the same content. Edit this file, not a copy.

FlowTrading is a paper-trading app: virtual cash, buy/sell 10 seeded US stocks,
track per-stock cost basis and P&L. It's a reference project for a Claude Code
workshop, so the code is meant to be **read and explained**, not just run.

---

## Stack (do not deviate)

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (via `@tailwindcss/postcss`; not the v3 plugin)
- **Turborepo monorepo**: `apps/web` (the app) + `packages/ui` (shadcn/`@base-ui`
  primitives, shared `globals.css`)
- **shadcn/ui** primitives (style `base-nova`, built on `@base-ui/react`)
- **GSAP** (+ `@gsap/react`) - the only runtime animation dependency. **No chart
  library**: charts are hand-rolled SVG.
- **lucide-react** for icons
- Client-side only: **no API routes, no server actions, no database, no auth**

## ⚠️ This is not the Next.js in your training data

Next 16 has breaking changes. **Before writing Next-specific code, read the
relevant guide in `apps/web/node_modules/next/dist/docs/`** - or invoke the
`next-best-practices` skill. Specifically:

- Dynamic route `params` and `searchParams` are **Promises** in Server
  Components (`const { slug } = await params`).
- Interactive pages here are Client Components that read the route via
  `useParams()` from `next/navigation` instead - see `app/stock/[symbol]`.
- The **React Compiler is on**. Do not hand-write `useMemo`/`useCallback` the
  compiler would otherwise add; if it warns "could not preserve manual
  memoization", prefer a plain computation and let the compiler handle it.

---

## Commands

Run from the repo root unless noted:

```bash
npm run dev        # turbo dev - all packages
npm run build      # turbo build (Next production build + typecheck)
npm run lint       # eslint across packages
npm run typecheck  # tsc --noEmit
```

- `npm run build`, `lint`, and `typecheck` must all pass clean before you call
  work done.
- **Long-running local dev:** `turbo dev` exits on its own in a detached/no-TTY
  shell. For a persistent server, run `next dev` **directly** from `apps/web`
  (`cd apps/web && npx next dev`) instead of going through turbo.

---

## Architecture & conventions

### Data is ground truth - never invent values

- `apps/web/data/stocks.ts` holds 10 real stocks, snapshot 2026-07-16. **Do not
  generate, round, clean, or "fix" any value.** Attendees check it against real
  quotes. Real quirks are intentional (AMC priced 07-10, GOOGL quarterClose above
  current price, NFLX/AMC genuinely cheap, `history` is only 3 real points).
- `quarterOpen`/`quarterChangePct` are unavailable for every stock - omit any
  feature that would need them; never fill with 0 or an estimate.
- **Simulated / mock data is allowed but must be labeled.** `lib/simulate.ts`
  projects hypothetical future prices (deterministic, seeded per symbol);
  `lib/chart-series.ts` synthesizes a denser chart path pinned to the 3 real
  closes. Both are surfaced with a "simulated / mock" disclaimer. Keep that
  labeling - never present projected numbers as the real snapshot.

### The math lives in `lib/portfolio.ts` (pure, no React)

- Average cost basis across multiple buys; **partial sells do NOT change average
  cost** (only share count and total cost fall, at the same avg price).
- **Realized vs unrealized P&L are separate numbers - never summed into one.**
- Positions are **derived by replaying the trade log**, never stored and mutated.
- Comment *why*, not *what*. This file gets projected on stage.

### Persistence: localStorage only

- `lib/storage.ts` is the **only** module that touches `localStorage`, and every
  access is guarded so it is import-safe during SSR/prerender.
- Hooks (`use-account`, `use-watchlist`, `contexts/simulation`) start from a
  **deterministic empty state** (matches the server render), then read
  localStorage in an effect after mount. This is the #1 way to avoid hydration
  mismatches - get it right. The one `setState`-in-effect that does this is
  intentional and marked with an eslint-disable + comment.
- Same-tab sync uses custom window events (localStorage's native `storage` event
  only fires in other tabs).

### Formatting: money is never hand-rolled

- All currency/percent/share/market-cap formatting goes through
  `lib/format.ts`. Always USD, tabular, signed for P&L, two decimals.
  **`-$0.00` must never appear** (near-zero clamps to a neutral `$0.00`).

### Design system

- **Dark theme is locked** (`<html className="dark">`, no toggle). Off-black
  surfaces, greyscale UI.
- **Color discipline:** green (`text-gain`) / red (`text-loss`) are for **P&L
  only**. The one sanctioned exception is per-company **brand color** (`lib/brands.ts`)
  used strictly as *ambient* tint on charts and Featured cards - never on chrome,
  buttons, or P&L.
- **P&L accessibility (non-negotiable):** every gain/loss value carries a **sign
  (+/-) AND an arrow (▲/▼)** in addition to color, so it is fully readable in
  greyscale. Use the `Pnl` / `PnlPair` components; do not color a number without
  them.
- Numbers use `font-mono tabular-nums` so digits never shift width.
- Mobile-first; primary actions in thumb reach. Test at 375px.

### Motion (GSAP)

- Everything is local, so everything is **instant**: no spinners, skeletons, or
  fake latency.
- Use `useGSAP` (from `@gsap/react`) with a scoped ref for automatic cleanup.
- **`prefers-reduced-motion` disables all motion** - gate every animation
  (`useReducedMotion` hook, or Tailwind `motion-safe:`).
- Route transitions are **opacity-only** (see `PageTransition` + the
  `ft-page-enter` keyframe). A `transform` on an ancestor turns every `position:
  fixed` descendant into an absolutely-positioned one - which would break the
  stock page's full-screen brand background.
- Nothing loops, autoplays, or bounces.

### Server vs Client components

- Default to **Server Components**. Add `'use client'` only for leaves that need
  interactivity, `localStorage`, GSAP, or the simulation/account/watchlist hooks.
- Keep motion and pointer logic in isolated client leaves.

---

## Folder map (`apps/web`)

```
app/                     App Router. Client pages for interactive screens.
  page.tsx               Portfolio (home): account summary + holdings + featured
  screener/page.tsx      Markets: featured cards, movers, sortable table
  stock/[symbol]/        Stock detail (hero): scrubbable chart, 52w range, position
  trade/[symbol]/        Buy/Sell: shares or dollars, validation, one confirm
components/finance/      All app UI (Pnl, CountUp, TrendLine, Sparkline, nav, ...)
contexts/simulation.tsx  Global "time machine" horizon + horizon-aware priceOf
hooks/                   use-account, use-watchlist, use-reduced-motion
lib/                     portfolio (math), format, storage, simulate, chart-series, brands
data/stocks.ts           Seeded ground-truth data - DO NOT EDIT VALUES
packages/ui/             Shared shadcn primitives + globals.css (theme tokens)
```

---

## Skills & subagents in this repo

Claude Code auto-discovers these under `.claude/`. Other tools can read them as
reference. Reach for them instead of re-deriving the same work.

**Skills** (`.claude/skills/`, invoke as `/<name>`):

| Skill | Use it when |
|---|---|
| `next-best-practices` | Writing/debugging Next 16 code, or a hydration / async-`params` error |
| `adversarial-code-review` | Reviewing a diff or PR against the spec, with a score + optional GitHub comment |
| `write-tests` | Adding unit (portfolio math), integration, or e2e (Playwright) tests |
| `verify-app` | Confirming the app still builds, typechecks, lints, and runs the 4 screens |
| `new-screen` | Scaffolding a new route/screen that follows the app's conventions |
| `e2e-capture` | Driving a flow with Playwright and capturing screenshots + a recording |
| `create-github-issue` | Filing a scoped, templated issue to start a change |
| `create-github-pull-request` | Opening a PR + a fresh-subagent review posted as PR comments |
| `implement-issue` | Taking a GitHub issue ID end to end: build -> verify -> e2e capture -> reviewed PR |

The standard change flow (issue → branch → build → verify → PR → review) is in
[CONTRIBUTING.md](./CONTRIBUTING.md).

**Subagents** (`.claude/agents/`):

| Agent | Purpose |
|---|---|
| `code-reviewer` | Adversarial, scored review (Next 16 + general bugs); can post to a PR |
| `compliance-reviewer` | Enforces these house rules (data integrity, P&L a11y, formatting, no live data) |
| `test-writer` | Writes tests for changed code following `write-tests` |
| `test-runner` | Runs the test suite + build/lint and reports (optionally fixes) failures |

---

## Deploy

- Deploys to **Vercel** from this monorepo. Set the Vercel **Root Directory to
  `apps/web`**. No `basePath`, no static export, no GitHub Actions workflow.
- The workspace root is pinned in `apps/web/next.config.ts` (`turbopack.root`) so
  a stray parent lockfile can't misdirect module resolution.

## Git

- Commits in this repo use the message **`Initial commit`** (workshop convention),
  authored as the engineer - **no AI co-author trailer or tool credit**.

## Never

- Add live market data, API calls, API keys, or a "refresh prices" data provider.
- Add a chart library, a second currency, a theme toggle, or portfolio-theory
  features (allocation, diversification scoring, rebalancing).
- Use em-dashes (`—`) in any user-facing copy or generated text.
- Mutate a position without recording the trade that caused it.
