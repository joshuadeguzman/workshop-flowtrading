# FlowTrading - Workshop guide

Build the whole app in **6 steps**, driving Claude Code with prompts. Each step
has a prompt to give Claude, a **✅ Verify** check, and a **🔧 If you're stuck**
section. Deploy after Step 1, while it's ugly.

> ℹ️ **This repo is the finished reference.** To learn the most, follow along in
> your own clone and let Claude build each piece, then compare against the code
> here. The prompts below are starting points - say them in your own words.

**How to read a step:** the `> What / Why` blockquote tells you the goal, the
fenced block is a prompt you paste into Claude Code, then you verify before moving on.

---

## Before you start

```bash
npm install       # from the repo root
npm run dev       # open http://localhost:3000
```

Open Claude Code in the project folder. It reads **`CLAUDE.md`** automatically, so
it already knows the rules (dark theme, money formatting, no live data, etc.).
You don't need to repeat them.

> 💡 **The golden rule of this workshop:** after Claude makes a change, *look at
> the app in the browser* before asking for the next thing. Small steps, verified
> one at a time, beat one giant prompt.

---

## Step 1 - Scaffold and render the 10 stocks

> **What you build:** the seeded data showing up as a plain list. No styling, no trading.
> **Why it matters:** you want something on screen and deployed before you invest an hour.

The seeded data already lives in `apps/web/data/stocks.ts` - 10 real US stocks,
snapshot Jul 16 2026. **Never edit those values;** attendees check them against
real quotes.

**Prompt Claude Code:**

```
Render the 10 stocks from apps/web/data/stocks.ts on the home page as a plain
unstyled list: symbol, name, and current price. No styling, no trading yet.
It's a Client Component. Keep it simple.
```

**✅ Verify**

- http://localhost:3000 shows all 10 symbols (NVDA, AAPL, TSLA, …) with prices.
- Prices match the file exactly (NVDA `$207.40`, NFLX `$74.35`, AMC `$1.89`).

**🔧 If you're stuck**

- Blank page or a hydration error? Ask Claude: `/next-best-practices` - this Next
  version has breaking changes and the skill covers them.
- Numbers look rounded or "cleaned"? Tell Claude the data is ground truth and must
  render verbatim.

**➡️ Now [ship it to Vercel](#-ship-it-to-vercel-do-this-after-step-1) before Step 2.**

---

## Step 2 - Dashboard

> **What you build:** the account summary (total value, cash, invested, return) and a holdings list.
> **Why it matters:** it's the home screen, and it forces you to think about how an account is shaped.

**Prompt Claude Code:**

```
Turn the home page into a Dashboard. Show an account summary card with total
value, cash, invested, and total return. Below it, a Holdings list (symbol,
shares, avg cost, current price, P&L in $ and %). Start with $100,000 cash and
no holdings - the empty state should read "you're ready", not "broken".
Hardcode one fake holding first just to see a row render.
```

**✅ Verify**

- The summary shows **$100,000.00** cash and a clean empty state.
- Money is formatted like `$1,234.56`; P&L values carry a **sign and an arrow** (▲/▼), not just color.

**🔧 If you're stuck**

- P&L only colored (no arrow)? That's an accessibility miss - remind Claude every
  gain/loss needs sign **and** arrow (it's in `CLAUDE.md`).
- Numbers jump around as they update? Ask for `tabular-nums`.

**Next → Step 3.**

---

## Step 3 - Buy / Sell, wired to localStorage

> **What you build:** a trade screen that actually changes your cash and holdings.
> **Why it matters:** this is where state and persistence click into place.

**Prompt Claude Code:**

```
Add a Buy/Sell screen at /trade/[symbol]. Trade at the seeded price, fractional
shares to 4 decimals. Let me enter either a share count or a dollar amount, with
a Max button. Show the cost before I confirm (shares x price = total, cash left).
Block trades that can't happen (not enough cash / not enough shares) BEFORE the
click, and say why. Persist everything to localStorage. One confirm step.
```

**✅ Verify**

- Buying reduces cash; the holding appears on the Dashboard after you navigate back.
- Entering more than your cash **disables** the button with a reason like
  "Not enough cash. You're $X short."
- Refresh the page - your position is still there (localStorage).

**🔧 If you're stuck**

- Hydration error after refresh? localStorage can't be read during SSR. Ask Claude
  to read it inside a `useEffect` after mount, starting from an empty default.
  (`/next-best-practices` explains this.)
- `-$0.00` showing up? Tell Claude near-zero P&L must render as a neutral `$0.00`.

**Next → Step 4.**

---

## Step 4 - The portfolio math

> **What you build:** the pure functions behind cost basis and profit/loss.
> **Why it matters:** this is the actual point of the app - and the part worth understanding by hand.

**Prompt Claude Code:**

```
Create lib/portfolio.ts with pure functions (no React). Compute average cost
basis across multiple buys. A partial sell must NOT change the average cost per
share - only the share count and total cost fall. Track realized P&L (locked in
by selling) separately from unrealized P&L (still held) - never sum them into
one number. Derive positions by replaying the trade log. Comment WHY, not what.
```

**✅ Verify**

- Buy 10 shares, sell 4 - the **average cost stays the same**, shares drop to 6.
- Realized and unrealized P&L are shown as two different numbers.

**🔧 If you're stuck**

- Ask Claude to walk you through `lib/portfolio.ts` line by line. If you can't
  explain the partial-sell rule out loud, ask it to re-comment the *why*.

**Next → Step 5.**

---

## Step 5 - Stock detail (the hero screen)

> **What you build:** the screen that makes someone say "you built that in 2 hours?"
> **Why it matters:** it's where craft shows - a real chart, a live 52-week range, motion.

**Prompt Claude Code:**

```
Build the stock detail page at /stock/[symbol]. Big price at the top, then an
interactive price chart (hand-rolled SVG, no chart library), the 52-week range
as a visual marker, company facts, and my position. Add a short GSAP entry
animation (price counts up, sections stagger in, under 600ms). Respect
prefers-reduced-motion. Make the chart scrubbable and tint it with the company's
brand color.
```

**✅ Verify**

- Opening a stock plays a quick entry animation, then settles (nothing loops).
- Hovering/dragging the chart shows the price at that point.
- With OS "reduce motion" on, everything appears instantly - no animation.

**🔧 If you're stuck**

- Chart looks distorted or cut off? Ask Claude to keep dots as HTML overlays (not
  stretched SVG circles) and the brand wash as a full-screen fixed layer.
- Animation janky? Confirm it uses `useGSAP` with cleanup and animates only
  `opacity`/`transform`.

**Next → Step 6.**

---

## Step 6 - Screener

> **What you build:** the discovery screen - featured cards, movers, and a sortable table.
> **Why it matters:** it ties the 10 stocks together and shows off the branded cards.

**Prompt Claude Code:**

```
Build the Markets/screener page. On top: a "Featured" row of 3 branded stock
cards (NVDA, TSLA, AMZN) with sparklines. Then a "Movers" section (top gainers
and losers by since-Q2 change). Then an "All stocks" sortable table: price,
since-Q2 %, sector, market cap, 52-week range. Sort any column, filter by sector,
and a watchlist star saved to localStorage.
```

**✅ Verify**

- Three colorful branded cards up top (green / red / orange).
- Clicking a column header sorts the table; the sector filter narrows it.
- Starred stocks survive a refresh.

**🔧 If you're stuck**

- Featured cards all grey? Ask Claude to tint each with its company brand color
  (used only as ambient chart/card tint, never on P&L).

**🎉 That's the app.** Four screens, real math, deployed.

---

## 🚀 Ship it to Vercel (do this after Step 1)

Deploy while it's still ugly - shipping early is the habit worth building.

1. Create a repo on GitHub and push your project.
2. Go to [vercel.com/new](https://vercel.com/new) and import it.
3. **Set the Root Directory to `apps/web`.** Framework preset: Next.js. Deploy.

No `basePath`, no static export, no Actions. If the build can't find the app,
double-check the Root Directory is `apps/web`.

---

## 🧪 Level up - review your own code with a fresh pair of eyes

The chat that *wrote* your code is the worst reviewer of it - it'll defend its own
bugs. The fix is a **clean-context review**: open a *fresh* Claude Code session (or
a new conversation) and ask it to check your work against what you actually wanted.

```
Review the changes on this branch against these requirements: [paste what the
feature is supposed to do]. Flag spec violations, edge cases, and bugs. Don't
assume the code is correct - try to break it.
```

Ready-made helpers in this repo:

- **`/adversarial-code-review`** - a skill that scores your change against the
  project rubric and can post the review to a GitHub PR.
- **`code-reviewer`** subagent - an adversarial, scored reviewer (fresh context by
  design). Ask Claude: *"run the code-reviewer on my recent changes."*
- **`compliance-reviewer`** subagent - checks the house rules (data integrity, P&L
  accessibility, money formatting, no live data).
- **`/code-review`** - Claude Code's built-in review pass.

> This is the beginner-friendly version of the **adversarial code review** pattern:
> separate the builder from the critic so the critic can be honest. You don't need
> multi-agent machinery to get 90% of the value - just a fresh session.

---

## ✅ Finish line

You've built and deployed a real app: an account, live trades, honest P&L math,
an interactive chart, and a screener - all client-side, all yours.

Want to go further? Try adding a **simulate** control (project prices forward in
time so P&L moves), write a few tests with the `write-tests` skill, or ask the
`code-reviewer` to harden what you built.
