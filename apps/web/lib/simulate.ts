// lib/simulate.ts
//
// The "time machine". The seeded Jul 16 snapshot is the truth; this projects
// HYPOTHETICAL prices forward in time so P&L has something to move against.
//
// Two properties matter for a workshop demo:
//   1. DETERMINISTIC. The same stock at the same horizon always yields the same
//      price. No Math.random(), no reshuffling on every render or reload, so the
//      number you explain on stage is the number on the screen every time.
//   2. GROUNDED. The size of each move is scaled by that stock's OWN 52-week
//      range (its real volatility), so AMC swings more than MSFT, and nothing
//      lands somewhere absurd. It is invented, but it is invented plausibly.

import type { Stock } from "@/data/stocks"

export interface Horizon {
  key: string
  label: string // shown on the control
  long: string // shown in the "Simulated" indicator
  days: number
}

export const HORIZONS: Horizon[] = [
  { key: "now", label: "Live", long: "Jul 16 snapshot", days: 0 },
  { key: "1w", label: "+1W", long: "+1 week", days: 7 },
  { key: "1m", label: "+1M", long: "+1 month", days: 30 },
  { key: "3m", label: "+3M", long: "+3 months", days: 91 },
]

export const DEFAULT_HORIZON = "now"

export function horizonByKey(key: string): Horizon {
  return HORIZONS.find((h) => h.key === key) ?? HORIZONS[0]!
}

// FNV-1a string hash -> 32-bit seed. Same string, same seed, forever.
function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// mulberry32: a tiny, fast, seeded PRNG. Deterministic from its seed.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * The projected price for a stock at a given horizon.
 *
 * horizon "now" returns the exact seeded price (the truth, untouched). Any other
 * horizon draws ONE deterministic return whose magnitude grows with both the
 * stock's own volatility and the square root of elapsed time (the standard way
 * volatility scales), then applies it to the seeded price.
 */
export function projectedPrice(stock: Stock, horizonKey: string): number {
  const horizon = horizonByKey(horizonKey)
  if (horizon.days === 0) return stock.currentPrice

  // Volatility proxy from the stock's real 52-week range, annualized-ish and
  // bounded so a very tight or very wide range can't produce silly moves.
  const rangeVol = (stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow) / stock.currentPrice
  const annualVol = Math.min(1.5, Math.max(0.2, rangeVol))
  const horizonVol = annualVol * Math.sqrt(horizon.days / 365)

  // One deterministic draw in [-1, 1] per (symbol, horizon). Different symbols
  // hash differently, so the 10 stocks fan out into a mix of gains and losses.
  const rng = mulberry32(hashSeed(`${stock.symbol}:${horizonKey}`))
  const z = rng() * 2 - 1

  // Apply, then clamp the return so it stays believable and the price positive.
  const ret = Math.max(-0.55, Math.min(0.75, z * horizonVol * 1.3))
  return Math.max(0.01, round2(stock.currentPrice * (1 + ret)))
}
