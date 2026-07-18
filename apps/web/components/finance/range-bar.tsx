// components/finance/range-bar.tsx
//
// The 52-week range as something you can FEEL: where does today's price sit
// between the year's low and high? One marker on one track answers it instantly.
// Greyscale only. This is not P&L, so it gets no green or red; the position of
// the marker is the whole message.
//
// Presentational and server-safe. The stock detail page animates the marker on
// entry by targeting `.range-marker` (see that page's GSAP timeline).

import { money } from "@/lib/format"

interface RangeBarProps {
  low: number
  high: number
  current: number
}

export function RangeBar({ low, high, current }: RangeBarProps) {
  // Clamp so a current price that briefly sat outside the trailing 52-week band
  // (data is a snapshot) still renders on the track instead of off the edge.
  const raw = (current - low) / (high - low)
  const pos = Math.max(0, Math.min(1, raw)) * 100

  return (
    <div>
      <div className="text-muted-foreground mb-2 flex items-baseline justify-between font-mono text-[11px]">
        <span>52-week range</span>
        <span className="text-foreground tabular-nums">{money(current)}</span>
      </div>

      <div className="relative h-1.5">
        {/* Track */}
        <div className="bg-secondary absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" />
        {/* Filled portion from low up to current */}
        <div
          className="bg-muted-foreground/60 absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full"
          style={{ width: `${pos}%` }}
        />
        {/* Marker */}
        <div
          className="range-marker border-background bg-foreground absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm"
          style={{ left: `${pos}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="text-muted-foreground mt-2 flex items-baseline justify-between font-mono text-[11px] tabular-nums">
        <span>{money(low)}</span>
        <span>{money(high)}</span>
      </div>
    </div>
  )
}
