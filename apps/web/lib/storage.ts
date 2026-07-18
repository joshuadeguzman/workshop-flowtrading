// lib/storage.ts
//
// localStorage is the entire persistence layer. Nothing leaves the browser.
// This module is the ONLY place that touches localStorage, and every access is
// guarded so it is safe to import from code that runs during SSR/prerender,
// where `window` does not exist. Callers still read inside effects (see
// use-account), but these guards are the backstop.

import { INITIAL_CASH, type Trade } from "@/lib/portfolio"

// v2: starting balance moved to $100,000. Bumping the key retires any account
// saved under the old $10,000 baseline so everyone starts fresh on the new one.
const ACCOUNT_KEY = "flowtrading.account.v2"
const WATCHLIST_KEY = "flowtrading.watchlist.v1"
const SCREENER_KEY = "flowtrading.screener.v1"

/** Persisted account: starting cash minus buys plus sells, and the full log of
 *  trades that got us there. Positions are derived from `trades`, never stored. */
export interface AccountState {
  cash: number
  trades: Trade[]
}

const EMPTY_ACCOUNT: AccountState = { cash: INITIAL_CASH, trades: [] }

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage
}

export function loadAccount(): AccountState {
  if (!hasStorage()) return EMPTY_ACCOUNT
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY)
    if (!raw) return EMPTY_ACCOUNT
    const parsed = JSON.parse(raw) as AccountState
    // Be defensive: a partially-written or hand-edited blob should degrade to a
    // clean account, not crash the whole app for a workshop beginner.
    if (typeof parsed.cash !== "number" || !Array.isArray(parsed.trades)) {
      return EMPTY_ACCOUNT
    }
    return parsed
  } catch {
    return EMPTY_ACCOUNT
  }
}

export function saveAccount(state: AccountState): void {
  if (!hasStorage()) return
  window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(state))
}

export function loadWatchlist(): string[] {
  if (!hasStorage()) return []
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

export function saveWatchlist(symbols: string[]): void {
  if (!hasStorage()) return
  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(symbols))
}

// The screener's remembered view: which column it's sorted by and in which
// direction, the active sector chip, and whether it's showing the watchlist
// only. Purely UI state, so it lives here and never touches account/trade data.
export type ScreenerSortKey = "symbol" | "price" | "q2" | "sector" | "cap" | "range"
export type ScreenerDir = "asc" | "desc"

export interface ScreenerPrefs {
  sortKey: ScreenerSortKey
  dir: ScreenerDir
  sector: string
  starredOnly: boolean
}

const SORT_KEYS: readonly ScreenerSortKey[] = ["symbol", "price", "q2", "sector", "cap", "range"]

/** Load remembered screener prefs, or `null` when there's nothing valid saved so
 *  the caller keeps its defaults. Every field is validated: a hand-edited or
 *  stale blob should be ignored, not fed into the sort/filter. */
export function loadScreenerPrefs(): ScreenerPrefs | null {
  if (!hasStorage()) return null
  try {
    const raw = window.localStorage.getItem(SCREENER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ScreenerPrefs>
    if (
      !SORT_KEYS.includes(parsed.sortKey as ScreenerSortKey) ||
      (parsed.dir !== "asc" && parsed.dir !== "desc") ||
      typeof parsed.sector !== "string" ||
      typeof parsed.starredOnly !== "boolean"
    ) {
      return null
    }
    return {
      sortKey: parsed.sortKey as ScreenerSortKey,
      dir: parsed.dir,
      sector: parsed.sector,
      starredOnly: parsed.starredOnly,
    }
  } catch {
    return null
  }
}

export function saveScreenerPrefs(prefs: ScreenerPrefs): void {
  if (!hasStorage()) return
  window.localStorage.setItem(SCREENER_KEY, JSON.stringify(prefs))
}

// A same-tab change event. localStorage's native "storage" event only fires in
// OTHER tabs, so we dispatch our own so every mounted hook in THIS tab (e.g. the
// nav badge and the page) re-reads after a trade.
export const ACCOUNT_EVENT = "flowtrading:account-changed"
export const WATCHLIST_EVENT = "flowtrading:watchlist-changed"

export function notify(event: string): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(event))
}
