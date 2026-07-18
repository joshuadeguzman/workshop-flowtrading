// lib/format.ts
//
// Every number the user sees passes through here. Money is never formatted by
// hand at the call site: sloppy money ("$1234.5", "-$0.00", "2%") is the single
// fastest way to make a finance app look fake. One place, one set of rules.
//
// All currency is USD. There is no other currency in this app, by design.

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Below this, a value is treated as exactly zero. Guards against "-$0.00" and
// "+0.00%", which appear when a P&L rounds to zero from the negative side.
const ZERO_EPSILON = 0.005 // half a cent

/** Plain money, no sign forced: $1,234.56 */
export function money(value: number): string {
  return USD.format(value)
}

/**
 * Signed money for gains/losses: +$1,234.56 / -$1,234.56.
 * A value that rounds to zero is shown as a neutral $0.00 (never -$0.00,
 * never a misleading + or - on what is really break-even).
 */
export function signedMoney(value: number): string {
  if (Math.abs(value) < ZERO_EPSILON) return USD.format(0)
  const sign = value > 0 ? "+" : "-"
  return `${sign}${USD.format(Math.abs(value))}`
}

/** Signed percentage: +2.34% / -9.81%. Break-even reads as 0.00%. */
export function signedPercent(value: number): string {
  if (Math.abs(value) < 0.005) return "0.00%"
  const sign = value > 0 ? "+" : "-"
  return `${sign}${Math.abs(value).toFixed(2)}%`
}

/**
 * Share counts. Fractional to 4 decimals (the trading precision), but trailing
 * zeros are trimmed so a whole share reads "10" not "10.0000".
 */
export function shares(value: number): string {
  const fixed = value.toFixed(4)
  return fixed.replace(/\.?0+$/, "")
}

/**
 * Market cap, compact: $5.02T, $310.26B, $1.75B.
 * marketCap in the data is a point-in-time approximation, so we never show it
 * to the cent; two significant decimals at trillions/billions scale is honest.
 */
export function marketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  return money(value)
}

/**
 * The direction of a P&L value, decoupled from color. Accessibility depends on
 * this: gain/loss must be legible without color, so callers pair it with a
 * sign and an arrow (see the Pnl component), not just green/red.
 */
export type Direction = "up" | "down" | "flat"

export function direction(value: number): Direction {
  if (Math.abs(value) < ZERO_EPSILON) return "flat"
  return value > 0 ? "up" : "down"
}

/** ▲ / ▼ / (nothing) — the non-color signal for gain vs loss. */
export function arrow(dir: Direction): string {
  if (dir === "up") return "▲"
  if (dir === "down") return "▼"
  return ""
}

/** "Jul 16, 2026" from an ISO date string, rendered in UTC so the seeded
 *  snapshot date never shifts by the viewer's timezone. */
export function asOfDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

/**
 * "Jul 18, 2026, 3:42 PM" for a trade's execution timestamp (ms since epoch).
 * Unlike asOfDate (the seeded snapshot, pinned to UTC), a trade timestamp is a
 * real wall-clock event the user created, so it is shown in the viewer's local
 * time. Only ever rendered after hydration (trades load post-mount), so the
 * locale-dependent output never causes an SSR mismatch.
 */
export function tradeTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
