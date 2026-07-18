"use client"

// contexts/simulation.tsx
//
// One source of truth for "what time is it in the simulation". The chosen
// horizon lives here, is persisted to localStorage, and is exposed as a
// priceOf(symbol) function so every screen (dashboard valuation, screener,
// detail, trade execution) prices off the SAME projected number. Change the
// horizon once and the whole app re-prices together.
//
// SSR-safe: starts on the real "now" snapshot (matches the server render), then
// reads the persisted horizon after mount.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { STOCKS } from "@/data/stocks"
import { DEFAULT_HORIZON, HORIZONS, horizonByKey, projectedPrice } from "@/lib/simulate"

const STORAGE_KEY = "flowtrading.sim.v1"

interface SimulationValue {
  horizon: string
  setHorizon: (key: string) => void
  priceOf: (symbol: string) => number
  isSimulated: boolean
  horizonLabel: string // e.g. "+1 month" or "Jul 16 snapshot"
  hydrated: boolean
}

const SimulationContext = createContext<SimulationValue | null>(null)

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [horizon, setHorizonState] = useState<string>(DEFAULT_HORIZON)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Deliberate hydration read: localStorage is only available post-mount, so
    // we start on the real snapshot (server-safe) and apply the stored horizon
    // here. Both setState calls are intentional.
    /* eslint-disable react-hooks/set-state-in-effect */
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && HORIZONS.some((h) => h.key === stored)) {
      setHorizonState(stored)
    }
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const setHorizon = useCallback((key: string) => {
    setHorizonState(key)
    window.localStorage.setItem(STORAGE_KEY, key)
  }, [])

  // Precompute every stock's projected price for the active horizon once, so a
  // screen calling priceOf in a loop does no repeated work.
  const priceMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const stock of STOCKS) map[stock.symbol] = projectedPrice(stock, horizon)
    return map
  }, [horizon])

  const value = useMemo<SimulationValue>(() => {
    const meta = horizonByKey(horizon)
    return {
      horizon,
      setHorizon,
      priceOf: (symbol: string) => priceMap[symbol] ?? 0,
      isSimulated: meta.days > 0,
      horizonLabel: meta.long,
      hydrated,
    }
  }, [horizon, setHorizon, priceMap, hydrated])

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
}

export function useSimulation(): SimulationValue {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error("useSimulation must be used within a SimulationProvider")
  return ctx
}
