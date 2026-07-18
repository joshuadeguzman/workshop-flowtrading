// lib/portfolio.test.ts
//
// Unit coverage for the trade-replay math in lib/portfolio.ts. Every input
// and expected output here is computed by hand, mirroring the "you can
// check every number in here by hand" spirit of portfolio.ts itself.

import { describe, it, expect } from "vitest"
import {
  buildPosition,
  valuePosition,
  buildHoldings,
  summarize,
  sinceQuarterClose,
  INITIAL_CASH,
  type Trade,
  type Position,
  type ValuedPosition,
} from "@/lib/portfolio"

describe("buildPosition", () => {
  it("computes a single buy", () => {
    const trades: Trade[] = [
      { id: "1", symbol: "AAPL", side: "buy", shares: 10, price: 200, timestamp: 1 },
    ]
    const pos = buildPosition("AAPL", trades)
    expect(pos.shares).toBe(10)
    expect(pos.costBasis).toBe(2000)
    expect(pos.avgCost).toBe(200)
    expect(pos.realizedPnL).toBe(0)
  })

  it("averages cost across two buys at different prices", () => {
    const trades: Trade[] = [
      { id: "1", symbol: "NVDA", side: "buy", shares: 10, price: 200, timestamp: 1 },
      { id: "2", symbol: "NVDA", side: "buy", shares: 10, price: 300, timestamp: 2 },
    ]
    const pos = buildPosition("NVDA", trades)
    expect(pos.shares).toBe(20)
    expect(pos.costBasis).toBe(5000)
    expect(pos.avgCost).toBe(250)
    expect(pos.realizedPnL).toBe(0)
  })

  it("averages cost across three buys of uneven size", () => {
    const trades: Trade[] = [
      { id: "1", symbol: "MSFT", side: "buy", shares: 5, price: 100, timestamp: 1 },
      { id: "2", symbol: "MSFT", side: "buy", shares: 15, price: 300, timestamp: 2 },
      { id: "3", symbol: "MSFT", side: "buy", shares: 10, price: 200, timestamp: 3 },
    ]
    const pos = buildPosition("MSFT", trades)
    expect(pos.shares).toBe(30)
    expect(pos.costBasis).toBe(7000)
    expect(pos.avgCost).toBeCloseTo(233.3333333333, 6) // 7000 / 30
    expect(pos.realizedPnL).toBe(0)
  })

  it("partial sell does not change average cost", () => {
    const trades: Trade[] = [
      { id: "1", symbol: "NVDA", side: "buy", shares: 10, price: 200, timestamp: 1 },
      { id: "2", symbol: "NVDA", side: "sell", shares: 4, price: 250, timestamp: 2 },
    ]
    const pos = buildPosition("NVDA", trades)
    expect(pos.shares).toBe(6)
    expect(pos.avgCost).toBe(200) // the invariant: unchanged by the sell
    expect(pos.costBasis).toBe(1200) // 6 * 200
    expect(pos.realizedPnL).toBeCloseTo(200) // 4 * (250 - 200)
  })

  it("keeps average cost constant across multiple sequential partial sells", () => {
    const trades: Trade[] = [
      { id: "1", symbol: "TSLA", side: "buy", shares: 20, price: 100, timestamp: 1 },
      { id: "2", symbol: "TSLA", side: "sell", shares: 5, price: 150, timestamp: 2 },
      { id: "3", symbol: "TSLA", side: "sell", shares: 5, price: 80, timestamp: 3 },
    ]
    const pos = buildPosition("TSLA", trades)
    expect(pos.shares).toBe(10)
    expect(pos.costBasis).toBe(1000)
    expect(pos.avgCost).toBe(100) // unchanged through both sells
    expect(pos.realizedPnL).toBeCloseTo(150) // 5*(150-100) + 5*(80-100)
  })

  it("closes a position fully to zero, retaining locked-in realized P&L", () => {
    const trades: Trade[] = [
      { id: "1", symbol: "AMD", side: "buy", shares: 10, price: 200, timestamp: 1 },
      { id: "2", symbol: "AMD", side: "sell", shares: 10, price: 250, timestamp: 2 },
    ]
    const pos = buildPosition("AMD", trades)
    expect(pos.shares).toBe(0)
    expect(pos.costBasis).toBe(0)
    expect(pos.avgCost).toBe(0)
    expect(pos.realizedPnL).toBe(500) // 10 * (250 - 200)
  })

  it("zeroes out floating-point dust on full closure", () => {
    const trades: Trade[] = [
      { id: "1", symbol: "DUST", side: "buy", shares: 0.1, price: 100, timestamp: 1 },
      { id: "2", symbol: "DUST", side: "buy", shares: 0.1, price: 100, timestamp: 2 },
      { id: "3", symbol: "DUST", side: "buy", shares: 0.1, price: 100, timestamp: 3 },
      { id: "4", symbol: "DUST", side: "sell", shares: 0.3, price: 150, timestamp: 4 },
    ]
    const pos = buildPosition("DUST", trades)
    // raw shares before cleanup is ~5.55e-17 (< 1e-9) -> forced to exactly 0
    expect(pos.shares).toBe(0)
    expect(pos.costBasis).toBe(0)
    expect(pos.avgCost).toBe(0)
    expect(pos.realizedPnL).toBeCloseTo(15, 5) // 0.3 * (150 - 100)
  })

  it("guards against NaN when selling a symbol with no prior shares", () => {
    // Documents existing, intentionally-unchanged behavior of buildPosition:
    // the avgCost guard prevents NaN, but shares are allowed to go negative.
    const trades: Trade[] = [
      { id: "1", symbol: "GHOST", side: "sell", shares: 5, price: 100, timestamp: 1 },
    ]
    const pos = buildPosition("GHOST", trades)
    expect(Number.isNaN(pos.avgCost)).toBe(false)
    expect(pos.avgCost).toBe(0)
    expect(pos.costBasis).toBe(0)
    expect(pos.shares).toBe(-5)
    expect(pos.realizedPnL).toBe(500) // 5 * (100 - 0)
  })
})

describe("valuePosition", () => {
  const basePosition: Position = {
    symbol: "AAPL",
    shares: 10,
    costBasis: 2000,
    avgCost: 200,
    realizedPnL: 0,
  }

  it("computes market value and unrealized P&L for a gain", () => {
    const valued = valuePosition(basePosition, 250)
    expect(valued.marketValue).toBe(2500)
    expect(valued.unrealizedPnL).toBe(500)
    expect(valued.returnPct).toBe(25)
  })

  it("computes a loss correctly", () => {
    const valued = valuePosition(basePosition, 150)
    expect(valued.marketValue).toBe(1500)
    expect(valued.unrealizedPnL).toBe(-500)
    expect(valued.returnPct).toBe(-25)
  })

  it("keeps unrealizedPnL and realizedPnL separate, never summed", () => {
    // This position already carries locked-in realized profit from a prior
    // partial sell (see the "partial sell" case above: 4 shares at a $200
    // avgCost sold at $250 banked $200 of realizedPnL).
    const position: Position = { symbol: "NVDA", shares: 6, costBasis: 1200, avgCost: 200, realizedPnL: 200 }
    const valued = valuePosition(position, 300)
    expect(valued.marketValue).toBe(1800)
    expect(valued.unrealizedPnL).toBe(600) // 1800 - 1200, independent of realizedPnL
    expect(valued.realizedPnL).toBe(200) // passed through unchanged
  })

  it("returns 0% return when cost basis is zero, avoiding divide-by-zero", () => {
    const position: Position = { symbol: "CLOSED", shares: 0, costBasis: 0, avgCost: 0, realizedPnL: 500 }
    const valued = valuePosition(position, 999)
    expect(valued.marketValue).toBe(0)
    expect(valued.unrealizedPnL).toBe(0)
    expect(valued.returnPct).toBe(0)
    expect(Number.isNaN(valued.returnPct)).toBe(false)
    expect(valued.realizedPnL).toBe(500) // still carried through
  })
})

describe("buildHoldings", () => {
  it("drops a fully-closed symbol from holdings and keeps open ones", () => {
    const trades: Trade[] = [
      { id: "1", symbol: "AAPL", side: "buy", shares: 10, price: 150, timestamp: 1 },
      { id: "2", symbol: "NVDA", side: "buy", shares: 5, price: 800, timestamp: 2 },
      { id: "3", symbol: "TSLA", side: "buy", shares: 20, price: 100, timestamp: 3 },
      { id: "4", symbol: "TSLA", side: "sell", shares: 20, price: 120, timestamp: 4 }, // fully closes TSLA
      { id: "5", symbol: "NVDA", side: "buy", shares: 5, price: 820, timestamp: 5 },
    ]
    const priceOf = (symbol: string) => ({ AAPL: 160, NVDA: 900, TSLA: 130 })[symbol as "AAPL" | "NVDA" | "TSLA"] ?? 0
    const holdings = buildHoldings(trades, priceOf)

    expect(holdings).toHaveLength(2)
    expect(holdings.find((h) => h.symbol === "TSLA")).toBeUndefined()

    const nvda = holdings.find((h) => h.symbol === "NVDA")!
    expect(nvda.shares).toBe(10)
    expect(nvda.costBasis).toBe(8100) // 5*800 + 5*820
    expect(nvda.avgCost).toBe(810)
    expect(nvda.marketValue).toBe(9000) // 10 * 900
    expect(nvda.unrealizedPnL).toBe(900) // 9000 - 8100

    const aapl = holdings.find((h) => h.symbol === "AAPL")!
    expect(aapl.marketValue).toBe(1600) // 10 * 160
    expect(aapl.unrealizedPnL).toBe(100) // 1600 - 1500
  })

  it("sorts holdings by market value descending", () => {
    const trades: Trade[] = [
      { id: "1", symbol: "AAA", side: "buy", shares: 10, price: 10, timestamp: 1 },
      { id: "2", symbol: "BBB", side: "buy", shares: 10, price: 10, timestamp: 2 },
      { id: "3", symbol: "CCC", side: "buy", shares: 10, price: 10, timestamp: 3 },
    ]
    const priceOf = (symbol: string) => ({ AAA: 15, BBB: 50, CCC: 30 })[symbol as "AAA" | "BBB" | "CCC"] ?? 0
    const holdings = buildHoldings(trades, priceOf)
    // marketValues: AAA=150, BBB=500, CCC=300
    expect(holdings.map((h) => h.symbol)).toEqual(["BBB", "CCC", "AAA"])
  })
})

describe("summarize", () => {
  it("returns baseline values with no holdings and cash equal to INITIAL_CASH", () => {
    const summary = summarize(INITIAL_CASH, [])
    expect(summary.invested).toBe(0)
    expect(summary.holdingsValue).toBe(0)
    expect(summary.totalValue).toBe(INITIAL_CASH)
    expect(summary.totalReturn).toBe(0)
    expect(summary.totalReturnPct).toBe(0)
  })

  it("computes totalValue and totalReturn against INITIAL_CASH", () => {
    const holdings: ValuedPosition[] = [
      {
        symbol: "NVDA",
        shares: 10,
        costBasis: 8100,
        avgCost: 810,
        realizedPnL: 0,
        currentPrice: 900,
        marketValue: 9000,
        unrealizedPnL: 900,
        returnPct: 11.11,
      },
      {
        symbol: "AAPL",
        shares: 10,
        costBasis: 1500,
        avgCost: 150,
        realizedPnL: 0,
        currentPrice: 160,
        marketValue: 1600,
        unrealizedPnL: 100,
        returnPct: 6.67,
      },
    ]
    const summary = summarize(50000, holdings)
    expect(summary.invested).toBe(9600) // 8100 + 1500
    expect(summary.holdingsValue).toBe(10600) // 9000 + 1600
    expect(summary.totalValue).toBe(60600) // 50000 + 10600
    expect(summary.totalReturn).toBe(-39400) // 60600 - 100000
    expect(summary.totalReturnPct).toBeCloseTo(-39.4)
  })

  it("does not sum realized and unrealized P&L into totalReturn", () => {
    // Cash already reflects a banked profit from a prior full sell; the
    // still-open position below separately carries its own realizedPnL
    // from an earlier partial sell. totalReturn must not double-count it.
    const holdings: ValuedPosition[] = [
      {
        symbol: "NVDA",
        shares: 6,
        costBasis: 1200,
        avgCost: 200,
        realizedPnL: 200,
        currentPrice: 300,
        marketValue: 1800,
        unrealizedPnL: 600,
        returnPct: 50,
      },
    ]
    const summary = summarize(96000, holdings)
    expect(summary.invested).toBe(1200)
    expect(summary.holdingsValue).toBe(1800)
    expect(summary.totalValue).toBe(97800) // 96000 + 1800
    expect(summary.totalReturn).toBe(-2200) // 97800 - 100000, not offset by realizedPnL
    expect(summary.totalReturnPct).toBeCloseTo(-2.2)
  })
})

describe("sinceQuarterClose", () => {
  it("computes a positive change since quarter close", () => {
    const result = sinceQuarterClose(450, 400)
    expect(result.change).toBe(50)
    expect(result.changePct).toBe(12.5)
  })

  it("computes a negative change since quarter close", () => {
    const result = sinceQuarterClose(350, 400)
    expect(result.change).toBe(-50)
    expect(result.changePct).toBe(-12.5)
  })

  it("returns zero change when price is unchanged", () => {
    const result = sinceQuarterClose(400, 400)
    expect(result.change).toBe(0)
    expect(result.changePct).toBe(0)
  })
})
