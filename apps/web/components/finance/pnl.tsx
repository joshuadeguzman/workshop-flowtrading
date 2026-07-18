// components/finance/pnl.tsx
//
// The most important number in the app, and the one most likely to be
// misread. ~8% of men are red-green colorblind, so color CANNOT be the only
// signal. Every P&L value here carries THREE signals:
//   1. a sign (+ / -)  2. an arrow (▲ / ▼)  3. color (gain / loss)
// Remove the color entirely and the value is still fully readable. Test it in
// greyscale: the sign and arrow do all the work.

import { cn } from "@workspace/ui/lib/utils"

import { arrow, direction, signedMoney, signedPercent } from "@/lib/format"

const TONE = {
  up: "text-gain",
  down: "text-loss",
  flat: "text-muted-foreground",
} as const

interface PnlProps {
  /** The signed value. Its magnitude is displayed; its sign drives direction. */
  value: number
  /** Format as money ($) or a percentage. */
  as?: "money" | "percent"
  /** Hide the arrow (e.g. in very tight table cells where the sign is enough). */
  arrow?: boolean
  className?: string
}

export function Pnl({ value, as = "money", arrow: showArrow = true, className }: PnlProps) {
  const dir = direction(value)
  const text = as === "money" ? signedMoney(value) : signedPercent(value)

  return (
    <span className={cn("font-mono tabular-nums", TONE[dir], className)}>
      {showArrow && dir !== "flat" && (
        // Decorative: the sign already conveys direction to screen readers.
        <span aria-hidden="true" className="mr-0.5 text-[0.85em]">
          {arrow(dir)}
        </span>
      )}
      {text}
    </span>
  )
}

/** The common pairing: dollar P&L and percent side by side, sharing one tone. */
export function PnlPair({
  amount,
  percent,
  className,
}: {
  amount: number
  percent: number
  className?: string
}) {
  const dir = direction(amount)
  return (
    <span className={cn("font-mono tabular-nums", TONE[dir], className)}>
      {dir !== "flat" && (
        <span aria-hidden="true" className="mr-0.5 text-[0.85em]">
          {arrow(dir)}
        </span>
      )}
      {signedMoney(amount)}
      <span className="text-muted-foreground mx-1.5">·</span>
      {signedPercent(percent)}
    </span>
  )
}
