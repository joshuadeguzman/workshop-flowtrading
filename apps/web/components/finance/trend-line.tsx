"use client"

// components/finance/trend-line.tsx
//
// The price chart, GoTrade-style: full-bleed (no card), brand-tinted, and
// scrubbable. Drag or hover across it and the header readout shows the price and
// date under your finger, with a crosshair and dot tracking the line.
//
// It renders a dense MOCK path (see lib/chart-series and the app-wide disclaimer)
// that still passes through the stock's 3 real closes. The LINE and FILL are an
// SVG stretched to full width; the moving dot and crosshair are HTML overlays
// positioned by percentage, so the horizontal stretch never squashes them.

import { useRef, useState } from "react"

import { asOfDate, money } from "@/lib/format"
import type { SeriesPoint } from "@/lib/chart-series"

const PAD_Y = 12

export function TrendLine({ series, color }: { series: SeriesPoint[]; color: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)

  const closes = series.map((p) => p.close)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const span = max - min || 1

  const coords = series.map((p, i) => {
    const x = (i / (series.length - 1)) * 100
    const y = PAD_Y + (1 - (p.close - min) / span) * (100 - PAD_Y * 2)
    return { x, y }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ")
  const areaPath = `${linePath} L 100 100 L 0 100 Z`

  const end = coords[coords.length - 1]!
  const first = series[0]!
  const last = series[series.length - 1]!

  // Map a pointer x-position to the nearest series index.
  function scrub(clientX: number) {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setActive(Math.round(frac * (series.length - 1)))
  }

  const point = active != null ? series[active]! : null
  const cursor = active != null ? coords[active]! : null

  return (
    <figure className="m-0">
      {/* Readout row: the label, or the scrubbed price/date under the cursor. */}
      <div className="mb-3 flex items-baseline justify-between px-4 font-mono text-[11px]">
        {point ? (
          <>
            <span className="text-muted-foreground">{asOfDate(point.date)}</span>
            <span className="text-foreground tabular-nums">{money(point.close)}</span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Price trend</span>
            <span className="text-muted-foreground/70">simulated</span>
          </>
        )}
      </div>

      <div
        ref={wrapRef}
        className="relative h-40 w-full touch-none"
        onPointerMove={(e) => scrub(e.clientX)}
        onPointerDown={(e) => scrub(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label={`Illustrative price path from ${asOfDate(first.date)} (${money(
            first.close,
          )}) to ${asOfDate(last.date)} (${money(last.close)}). Mock data.`}
          style={{ color }}
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trend-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            className="trend-path"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Crosshair + dot at the scrubbed point */}
        {cursor && (
          <>
            <div
              className="bg-foreground/25 pointer-events-none absolute top-0 bottom-0 w-px"
              style={{ left: `${cursor.x}%` }}
              aria-hidden="true"
            />
            <div
              className="border-background pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{ left: `${cursor.x}%`, top: `${cursor.y}%`, backgroundColor: color }}
              aria-hidden="true"
            />
          </>
        )}

        {/* Resting latest-price marker (hidden while scrubbing) */}
        {!cursor && (
          <span
            className="trend-dot pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${end.x}%`, top: `${end.y}%`, backgroundColor: color }}
            aria-hidden="true"
          />
        )}
      </div>

      <figcaption className="text-muted-foreground mt-2 flex justify-between px-4 font-mono text-[10px] tabular-nums">
        <span>{asOfDate(first.date)}</span>
        <span>{asOfDate(last.date)}</span>
      </figcaption>
    </figure>
  )
}
