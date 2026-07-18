// components/finance/sparkline.tsx
//
// A tiny, static price line for cards and holding rows. Not interactive (the
// full scrubbable chart lives in trend-line.tsx). Presentational and server-
// safe; a solid low-opacity fill avoids per-instance gradient ids. Greyscale by
// default, or brand-tinted when a color is passed.

import { cn } from "@workspace/ui/lib/utils"
import type { SeriesPoint } from "@/lib/chart-series"

interface SparklineProps {
  series: SeriesPoint[]
  color?: string
  filled?: boolean
  className?: string
}

const PAD = 6

export function Sparkline({ series, color = "currentColor", filled = true, className }: SparklineProps) {
  const closes = series.map((p) => p.close)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const span = max - min || 1

  const coords = series.map((p, i) => ({
    x: (i / (series.length - 1)) * 100,
    y: PAD + (1 - (p.close - min) / span) * (100 - PAD * 2),
  }))

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ")
  const area = `${line} L 100 100 L 0 100 Z`

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("h-full w-full overflow-visible", className)}
      aria-hidden="true"
    >
      {filled && <path d={area} fill={color} fillOpacity={0.12} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
