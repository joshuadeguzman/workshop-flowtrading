"use client"

// hooks/use-account.ts
//
// The React-facing wrapper around the localStorage account. Two rules keep
// hydration safe:
//   1. Initial state is the deterministic EMPTY account ($100,000, no trades) so
//      the server render and the FIRST client render are identical. React only
//      warns when those differ.
//   2. The real localStorage value is read in an effect (after hydration) and
//      then applied. `hydrated` lets a screen wait before deciding, e.g., to
//      show an "empty" state, so a funded account never flashes as empty.

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  INITIAL_CASH,
  buildHoldings,
  buildPosition,
  summarize,
  valuePosition,
  type Trade,
} from "@/lib/portfolio"
import {
  ACCOUNT_EVENT,
  loadAccount,
  notify,
  saveAccount,
  type AccountState,
} from "@/lib/storage"
import { useSimulation } from "@/contexts/simulation"

function newTradeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

export function useAccount() {
  // Holdings are priced off the active simulation horizon, so P&L moves when you
  // travel forward in time. Cost basis still comes from the real prices you
  // executed at, which is exactly what makes unrealized P&L meaningful.
  const { priceOf } = useSimulation()
  const [state, setState] = useState<AccountState>({ cash: INITIAL_CASH, trades: [] })
  const [hydrated, setHydrated] = useState(false)

  // Read persisted state once, after hydration, and stay in sync with any other
  // mounted copy of this hook (nav badge + page) via our same-tab event.
  useEffect(() => {
    const sync = () => setState(loadAccount())
    sync()
    // Deliberate hydration read: localStorage is only available post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true)
    window.addEventListener(ACCOUNT_EVENT, sync)
    return () => window.removeEventListener(ACCOUNT_EVENT, sync)
  }, [])

  const commit = useCallback((next: AccountState) => {
    setState(next)
    saveAccount(next)
    notify(ACCOUNT_EVENT)
  }, [])

  const holdings = useMemo(() => buildHoldings(state.trades, priceOf), [state.trades, priceOf])
  const summary = useMemo(() => summarize(state.cash, holdings), [state.cash, holdings])

  /** The derived position in one symbol, priced. Includes fully-closed symbols
   *  (shares 0) so a stock detail page can still show banked realized P&L. */
  const positionFor = useCallback(
    (symbol: string) => valuePosition(buildPosition(symbol, state.trades), priceOf(symbol) ?? 0),
    [state.trades, priceOf],
  )

  const buy = useCallback(
    (symbol: string, sharesToBuy: number, price: number) => {
      const cost = sharesToBuy * price
      // Guard here too, though the UI disables the button before this is reached.
      if (sharesToBuy <= 0 || cost > state.cash + 1e-9) return false
      const trade: Trade = {
        id: newTradeId(),
        symbol,
        side: "buy",
        shares: sharesToBuy,
        price,
        timestamp: Date.now(),
      }
      commit({ cash: state.cash - cost, trades: [...state.trades, trade] })
      return true
    },
    [state, commit],
  )

  const sell = useCallback(
    (symbol: string, sharesToSell: number, price: number) => {
      const held = buildPosition(symbol, state.trades).shares
      if (sharesToSell <= 0 || sharesToSell > held + 1e-9) return false
      const trade: Trade = {
        id: newTradeId(),
        symbol,
        side: "sell",
        shares: Math.min(sharesToSell, held), // never sell more than held, even with rounding
        price,
        timestamp: Date.now(),
      }
      commit({ cash: state.cash + trade.shares * price, trades: [...state.trades, trade] })
      return true
    },
    [state, commit],
  )

  // Master reset: back to a clean $100,000 account with no trades. Wipes the
  // whole log because the log IS the account; there is nothing else to clear.
  const reset = useCallback(() => {
    commit({ cash: INITIAL_CASH, trades: [] })
  }, [commit])

  return { cash: state.cash, trades: state.trades, holdings, summary, positionFor, buy, sell, reset, hydrated }
}
