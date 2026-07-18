// lib/portfolio.ts
//
// The actual point of the app. Pure functions, no React, no localStorage, no
// dates-from-now. Given a list of trades and the seeded prices, it computes
// what you own, what it cost, and what it is worth. You can check every number
// in here by hand, which is the whole idea.
//
// One principle drives the design: the TRADE LOG is the source of truth. A
// position is never stored and mutated. It is DERIVED by replaying the trades
// in order. That is why you can never end up with a position that no trade
// explains: the position IS the trades, added up.

/** A single executed paper trade. Shares are always positive; `side` carries
 *  the direction. `price` is the seeded price at the moment of the trade. */
export interface Trade {
  id: string
  symbol: string
  side: "buy" | "sell"
  shares: number
  price: number
  timestamp: number // ms since epoch; ordering only, never displayed as "today"
}

/** A holding in one stock, derived from that stock's trades. */
export interface Position {
  symbol: string
  shares: number // shares currently held
  costBasis: number // total $ cost of the shares STILL held
  avgCost: number // costBasis / shares — average price paid per held share
  realizedPnL: number // profit/loss locked in by past sells (does not change with price)
}

/** A position priced against the current seeded market price. */
export interface ValuedPosition extends Position {
  currentPrice: number
  marketValue: number // shares * currentPrice
  unrealizedPnL: number // marketValue - costBasis (still-open, moves with price)
  returnPct: number // unrealizedPnL / costBasis, this stock's own return
}

/**
 * Replay one stock's trades into a single position.
 *
 * The subtle rule lives in the SELL branch. When you sell part of a holding,
 * your AVERAGE COST PER SHARE DOES NOT CHANGE. Selling is not a purchase; it
 * does not re-average anything. What changes is:
 *   - share count goes down
 *   - cost basis goes down by (shares sold * avgCost), i.e. we remove those
 *     shares at the SAME average price the rest were carried at
 *   - realized P&L goes up by (shares sold * (sell price - avgCost)):
 *     that is the profit you actually locked in on the shares you let go.
 *
 * Because cost basis and share count fall together at the same avgCost, avgCost
 * is unchanged after a partial sell. Buys are the only thing that re-average.
 */
export function buildPosition(symbol: string, trades: Trade[]): Position {
  let shares = 0
  let costBasis = 0
  let realizedPnL = 0

  // Chronological replay. Order matters: a sell must see the avgCost that the
  // buys before it established.
  const ordered = trades
    .filter((t) => t.symbol === symbol)
    .sort((a, b) => a.timestamp - b.timestamp)

  for (const t of ordered) {
    if (t.side === "buy") {
      // Buying re-averages: new money and new shares both fold into the basis.
      shares += t.shares
      costBasis += t.shares * t.price
    } else {
      // avgCost BEFORE the sell is the price these shares were carried at.
      const avgCost = shares > 0 ? costBasis / shares : 0
      realizedPnL += t.shares * (t.price - avgCost)
      // Remove the sold shares at that same avgCost, leaving avgCost intact.
      costBasis -= t.shares * avgCost
      shares -= t.shares
    }
  }

  // Clean up floating-point dust so a fully-closed position reads as exactly 0
  // rather than 1e-15 shares worth a fraction of a cent.
  if (Math.abs(shares) < 1e-9) {
    shares = 0
    costBasis = 0
  }

  return {
    symbol,
    shares,
    costBasis,
    avgCost: shares > 0 ? costBasis / shares : 0,
    realizedPnL,
  }
}

/** Price a derived position against the current seeded price. Unrealized P&L
 *  and realized P&L are returned as SEPARATE numbers, never summed into one:
 *  they answer different questions (what if I sold now vs what I already banked). */
export function valuePosition(position: Position, currentPrice: number): ValuedPosition {
  const marketValue = position.shares * currentPrice
  const unrealizedPnL = marketValue - position.costBasis
  return {
    ...position,
    currentPrice,
    marketValue,
    unrealizedPnL,
    // Return % is measured against THIS stock's own cost basis, so a small
    // holding and a large one are compared on equal footing.
    returnPct: position.costBasis > 0 ? (unrealizedPnL / position.costBasis) * 100 : 0,
  }
}

/**
 * Every stock you currently hold (shares > 0), priced and sorted by market
 * value. Symbols you have fully sold out of drop off the list but their
 * realized P&L is not lost: it is recovered per-stock via buildPosition when
 * you look at that stock's detail page.
 */
export function buildHoldings(
  trades: Trade[],
  priceOf: (symbol: string) => number | undefined,
): ValuedPosition[] {
  const symbols = Array.from(new Set(trades.map((t) => t.symbol)))
  return symbols
    .map((symbol) => buildPosition(symbol, trades))
    .filter((p) => p.shares > 0)
    .map((p) => valuePosition(p, priceOf(p.symbol) ?? 0))
    .sort((a, b) => b.marketValue - a.marketValue)
}

/** The starting paper balance. One deposit, no withdrawals, ever. */
export const INITIAL_CASH = 100_000

export interface AccountSummary {
  cash: number
  invested: number // cost basis of everything currently held
  holdingsValue: number // current market value of everything held
  totalValue: number // cash + holdingsValue: the whole account, right now
  totalReturn: number // totalValue - INITIAL_CASH: growth vs the $100,000 you started with
  totalReturnPct: number
}

/**
 * The account, top level. `totalReturn` is deliberately measured against the
 * initial deposit, not by adding realized and unrealized P&L together. It
 * answers one honest question: is the account worth more than the $100,000 it
 * started with? Per-stock realized vs unrealized stays separate on the detail
 * screen, where the distinction actually matters to a decision.
 */
export function summarize(cash: number, holdings: ValuedPosition[]): AccountSummary {
  const invested = holdings.reduce((sum, h) => sum + h.costBasis, 0)
  const holdingsValue = holdings.reduce((sum, h) => sum + h.marketValue, 0)
  const totalValue = cash + holdingsValue
  const totalReturn = totalValue - INITIAL_CASH
  return {
    cash,
    invested,
    holdingsValue,
    totalValue,
    totalReturn,
    totalReturnPct: (totalReturn / INITIAL_CASH) * 100,
  }
}

/** Change in price since the Q2 close (2026-06-30). Both numbers are real and
 *  seeded; this is the one time-series comparison the data actually supports. */
export function sinceQuarterClose(currentPrice: number, quarterClose: number) {
  const change = currentPrice - quarterClose
  return { change, changePct: (change / quarterClose) * 100 }
}
