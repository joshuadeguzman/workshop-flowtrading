// lib/chart-series.ts
//
// The seeded data only carries 3 real month-end closes per stock, which makes a
// thin chart. This synthesizes a denser daily-ish path for a nicer-looking line.
// It is MOCK data (see the app-wide disclaimer), with two honesty properties:
//
//   1. It passes EXACTLY through the 3 real closes. Those anchor points are not
//      moved; the invented points only fill the gaps between them.
//   2. It is DETERMINISTIC. Same stock, same path, every render and reload, so
//      the chart you show on stage never reshuffles.
//
// The fill between anchors is a Brownian bridge: a random walk pinned to both
// endpoints, so it wanders like a real price but always lands back on the next
// real close. Its amplitude is scaled by the stock's own 52-week volatility.

import type { Stock } from "@/data/stocks"

export interface SeriesPoint {
  date: string
  close: number
  anchor: boolean // true for the 3 real month-end closes
}

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Standard normal via Box-Muller, from a seeded uniform generator.
function gaussian(rng: () => number): number {
  const u1 = Math.max(1e-9, rng())
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

const DAY_MS = 86_400_000

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)
}

function isoBetween(a: string, b: string, t: number): string {
  const time = Date.parse(`${a}T00:00:00Z`) + t * (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`))
  return new Date(time).toISOString().slice(0, 10)
}

/**
 * A dense, mock price path for the chart, pinned to the stock's 3 real closes.
 * Returns points in chronological order; `anchor` flags the real closes.
 */
export function priceSeries(stock: Stock): SeriesPoint[] {
  const anchors = stock.history
  if (anchors.length < 2) return anchors.map((p) => ({ ...p, anchor: true }))

  const rng = mulberry32(hashSeed(`${stock.symbol}:series`))
  // Cap the volatility so a wild 52-week range can't produce an unreadable path.
  const rangeVol = (stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow) / stock.currentPrice
  const annualVol = Math.min(0.8, Math.max(0.2, rangeVol))
  const dailyVol = (annualVol / Math.sqrt(252)) * 0.7 // 0.7 tames the jaggedness

  const out: SeriesPoint[] = []

  for (let seg = 0; seg < anchors.length - 1; seg++) {
    const a = anchors[seg]!
    const b = anchors[seg + 1]!
    const steps = Math.min(30, Math.max(8, Math.round(daysBetween(a.date, b.date) / 1.5)))

    // Random walk W (W[0] = 0), then a bridge that is zero at both ends.
    const w: number[] = [0]
    for (let k = 1; k <= steps; k++) w[k] = w[k - 1]! + gaussian(rng) * dailyVol
    const wEnd = w[steps]!

    for (let k = 0; k < steps; k++) {
      // last point of a segment is the first of the next, so skip it here
      const t = k / steps
      const bridge = w[k]! - t * wEnd
      const linear = a.close + (b.close - a.close) * t
      const close = Math.max(0.01, Math.round(linear * (1 + bridge) * 100) / 100)
      out.push({
        date: k === 0 ? a.date : isoBetween(a.date, b.date, t),
        close: k === 0 ? a.close : close, // never move a real anchor
        anchor: k === 0,
      })
    }
  }

  // Final real anchor closes the series.
  const last = anchors[anchors.length - 1]!
  out.push({ date: last.date, close: last.close, anchor: true })
  return out
}
