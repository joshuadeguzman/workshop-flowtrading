"use client"

// hooks/use-watchlist.ts
//
// The screener's watchlist. Same hydration discipline as useAccount: start
// empty (matches the server render), load from localStorage in an effect,
// stay in sync across mounted copies via a same-tab event.

import { useCallback, useEffect, useState } from "react"

import { WATCHLIST_EVENT, loadWatchlist, notify, saveWatchlist } from "@/lib/storage"

export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const sync = () => setSymbols(loadWatchlist())
    sync()
    // Deliberate hydration read: localStorage is only available post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true)
    window.addEventListener(WATCHLIST_EVENT, sync)
    return () => window.removeEventListener(WATCHLIST_EVENT, sync)
  }, [])

  const toggle = useCallback((symbol: string) => {
    setSymbols((prev) => {
      const next = prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol]
      saveWatchlist(next)
      notify(WATCHLIST_EVENT)
      return next
    })
  }, [])

  const has = useCallback((symbol: string) => symbols.includes(symbol), [symbols])

  return { symbols, has, toggle, hydrated }
}
