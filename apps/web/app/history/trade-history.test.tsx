// app/history/trade-history.test.tsx
//
// The Trade history screen, rendered through the REAL data path:
//   seeded localStorage  ->  useAccount()  ->  derived, sorted rows.
//
// Nothing is mocked. We seed the trade log the same way a real session would
// (via lib/storage), mount the page inside the real SimulationProvider, and
// assert what a user sees: every trade present, newest first, money formatted
// through lib/format, and a clean empty state before any trade.

import { describe, expect, it, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"

import HistoryPage from "@/app/history/page"
import { SimulationProvider } from "@/contexts/simulation"
import { saveAccount } from "@/lib/storage"
import { INITIAL_CASH, type Trade } from "@/lib/portfolio"
import { tradeTime } from "@/lib/format"

function wrapper({ children }: { children: React.ReactNode }) {
  return <SimulationProvider>{children}</SimulationProvider>
}

function renderHistory() {
  return render(<HistoryPage />, { wrapper })
}

// Two trades on the same symbol, deliberately out of order in the log so the
// page has to sort them: the SELL is newer (higher timestamp) than the BUY.
const BUY: Trade = { id: "a", symbol: "NVDA", side: "buy", shares: 10, price: 100, timestamp: 1000 }
const SELL: Trade = { id: "b", symbol: "NVDA", side: "sell", shares: 4, price: 130, timestamp: 2000 }

beforeEach(() => {
  localStorage.clear()
})

describe("trade history screen", () => {
  it("lists every executed trade, newest first, with money-formatted totals", async () => {
    // Seed the log with the buy first, sell second (order the page must fix).
    saveAccount({ cash: INITIAL_CASH - 10 * 100 + 4 * 130, trades: [BUY, SELL] })
    renderHistory()

    // Wait for the post-hydration read to surface the rows.
    await screen.findByText("Sell")

    // Header + two data rows.
    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(3)

    // Newest first: the SELL (timestamp 2000) is the first data row.
    const first = within(rows[1])
    expect(first.getByText("Sell")).toBeTruthy()
    expect(first.getByText("$520.00")).toBeTruthy() // 4 * 130

    // ...then the older BUY.
    const second = within(rows[2])
    expect(second.getByText("Buy")).toBeTruthy()
    expect(second.getByText("$1,000.00")).toBeTruthy() // 10 * 100

    // Both executions are present and counted.
    expect(screen.getByText("2 trades")).toBeTruthy()
  })

  it("shows a clean empty state before any trade", async () => {
    renderHistory()
    expect(await screen.findByText("No trades yet.")).toBeTruthy()
    // No table is rendered when the log is empty.
    expect(screen.queryByRole("table")).toBeNull()
  })
})

describe("tradeTime formatter", () => {
  it("renders an execution timestamp as a dated, timed string", () => {
    // Noon UTC mid-2026: stays in 2026 in every timezone, and carries a time.
    const out = tradeTime(Date.UTC(2026, 6, 18, 12, 0))
    expect(out).toMatch(/2026/)
    expect(out).toMatch(/:/)
  })
})
