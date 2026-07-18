// lib/brands.ts
//
// Per-company accent colors, tuned to read on the dark background. These are
// used ONLY as ambient chart tint (a soft background glow, the area fill, and
// the line stroke on the detail page). They intentionally do NOT touch UI chrome
// or P&L, which stay greyscale / gain-green / loss-red. This is the one place
// the app leans on brand color, GoTrade-style.

const BRAND_COLOR: Record<string, string> = {
  NVDA: "#76b900", // NVIDIA green
  AAPL: "#b8bec7", // Apple silver (near-neutral by design)
  TSLA: "#e82127", // Tesla red
  AMZN: "#ff9900", // Amazon orange
  MSFT: "#3fb0f0", // Microsoft blue
  AMC: "#e0113b", // AMC red
  F: "#3b82f6", // Ford blue, brightened to read on dark
  META: "#4599ff", // Meta blue, brightened
  GOOGL: "#5a9cff", // Google blue, brightened
  NFLX: "#e50914", // Netflix red
}

export function brandColor(symbol: string): string {
  return BRAND_COLOR[symbol] ?? "#e5e7eb"
}

/** Append an 8-bit alpha (0..1) to a #rrggbb hex, e.g. brandAlpha("#76b900", 0.15). */
export function brandAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0")
  return `${hex}${a}`
}
