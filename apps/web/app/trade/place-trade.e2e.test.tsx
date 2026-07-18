// app/trade/place-trade.e2e.test.tsx
//
// End-to-end trade placement, driven through the REAL app code path:
//   useAccount().buy / .sell  ->  trade log  ->  localStorage  ->  derived
//   positions & account summary, priced by the REAL simulation provider.
//
// Nothing is mocked. These exercise the exact functions the Buy/Sell button
// calls, so a green run means "placing a buy/sell trade actually works". Every
// number is hand-checkable, in the spirit of lib/portfolio.ts.

import { describe, expect, it } from "vitest"
import { renderHook, act } from "@testing-library/react"

import { SimulationProvider } from "@/contexts/simulation"
import { useAccount } from "@/hooks/use-account"
import { INITIAL_CASH } from "@/lib/portfolio"
import { STOCKS } from "@/data/stocks"

// useAccount prices holdings off the simulation horizon, so it must run inside
// the real provider. Default horizon is "Live" => priceOf === seeded price.
function wrapper({ children }: { children: React.ReactNode }) {
  return <SimulationProvider>{children}</SimulationProvider>
}

const SYM = "NVDA"
const LIVE_PRICE = STOCKS.find((s) => s.symbol === SYM)!.currentPrice // 207.4, seeded

function mountAccount() {
  return renderHook(() => useAccount(), { wrapper })
}

describe("placing a buy trade", () => {
  it("deducts cash and opens a position at the execution price", () => {
    const { result } = mountAccount()

    let ok = false
    act(() => {
      ok = result.current.buy(SYM, 10, 100)
    })

    expect(ok).toBe(true)
    // Cash fell by exactly shares * price.
    expect(result.current.cash).toBe(INITIAL_CASH - 10 * 100) // 99,000
    // One trade is on the log, and the derived position matches it.
    expect(result.current.trades).toHaveLength(1)
    const pos = result.current.positionFor(SYM)
    expect(pos.shares).toBe(10)
    expect(pos.avgCost).toBe(100)
    expect(pos.costBasis).toBe(1000)
  })

  it("re-averages cost basis across two buys at different prices", () => {
    const { result } = mountAccount()

    act(() => {
      result.current.buy(SYM, 10, 100) // 10 @ 100
    })
    act(() => {
      result.current.buy(SYM, 10, 200) // 10 @ 200
    })

    const pos = result.current.positionFor(SYM)
    expect(pos.shares).toBe(20)
    expect(pos.costBasis).toBe(3000)
    expect(pos.avgCost).toBe(150) // weighted average of 100 and 200
    expect(result.current.cash).toBe(INITIAL_CASH - 3000) // 97,000
  })

  it("rejects a buy that costs more cash than the account holds", () => {
    const { result } = mountAccount()

    let ok = true
    act(() => {
      // 1,000 shares * $207.40 = $207,400 > $100,000 available.
      ok = result.current.buy(SYM, 1000, LIVE_PRICE)
    })

    expect(ok).toBe(false)
    expect(result.current.trades).toHaveLength(0)
    expect(result.current.cash).toBe(INITIAL_CASH) // untouched
  })
})

describe("placing a sell trade", () => {
  it("partial sell: banks realized P&L, returns cash, leaves avg cost unchanged", () => {
    const { result } = mountAccount()

    act(() => {
      result.current.buy(SYM, 10, 100) // avg cost 100
    })
    act(() => {
      result.current.buy(SYM, 10, 200) // avg cost now 150 over 20 shares
    })
    act(() => {
      result.current.sell(SYM, 5, 250) // sell 5 above avg cost
    })

    const pos = result.current.positionFor(SYM)
    expect(pos.shares).toBe(15) // 20 - 5
    expect(pos.avgCost).toBe(150) // selling never re-averages
    expect(pos.costBasis).toBe(2250) // 3000 - 5 * 150
    expect(pos.realizedPnL).toBe(500) // 5 * (250 - 150)
    // Cash: 100,000 - 3,000 (buys) + 1,250 (sell proceeds) = 98,250
    expect(result.current.cash).toBe(INITIAL_CASH - 3000 + 5 * 250)
  })

  it("full round trip closes the position but keeps realized P&L on record", () => {
    const { result } = mountAccount()

    act(() => {
      result.current.buy(SYM, 10, 100)
    })
    act(() => {
      result.current.sell(SYM, 10, 130) // sell everything at a gain
    })

    // No longer in the holdings list...
    expect(result.current.holdings.find((h) => h.symbol === SYM)).toBeUndefined()
    // ...but the closed position still reports the banked profit.
    const pos = result.current.positionFor(SYM)
    expect(pos.shares).toBe(0)
    expect(pos.realizedPnL).toBe(300) // 10 * (130 - 100)
    // Cash back above the starting balance by exactly the profit.
    expect(result.current.cash).toBe(INITIAL_CASH + 300)
  })

  it("rejects selling more shares than are held", () => {
    const { result } = mountAccount()

    act(() => {
      result.current.buy(SYM, 5, 100)
    })
    let ok = true
    act(() => {
      ok = result.current.sell(SYM, 6, 100) // own 5, try to sell 6
    })

    expect(ok).toBe(false)
    expect(result.current.trades).toHaveLength(1) // only the buy
    expect(result.current.positionFor(SYM).shares).toBe(5)
  })
})

describe("valuation and persistence after a trade", () => {
  it("values an open position at the live seeded price", () => {
    const { result } = mountAccount()

    act(() => {
      result.current.buy(SYM, 4, LIVE_PRICE) // buy at the live price
    })

    const pos = result.current.positionFor(SYM)
    expect(pos.currentPrice).toBe(LIVE_PRICE)
    expect(pos.marketValue).toBeCloseTo(4 * LIVE_PRICE, 6)
    expect(pos.unrealizedPnL).toBeCloseTo(0, 6) // bought at the current price
    // Whole-account value is still ~$100,000 (cash simply moved into the stock).
    expect(result.current.summary.totalValue).toBeCloseTo(INITIAL_CASH, 6)
  })

  it("persists the trade so a freshly mounted account reads it back", () => {
    const first = mountAccount()
    act(() => {
      first.result.current.buy(SYM, 3, 100)
    })

    // A brand-new mount (simulating a page reload) must load the same trade
    // from localStorage, not start empty.
    const second = mountAccount()
    expect(second.result.current.trades).toHaveLength(1)
    expect(second.result.current.positionFor(SYM).shares).toBe(3)
    expect(second.result.current.cash).toBe(INITIAL_CASH - 300)
  })
})
