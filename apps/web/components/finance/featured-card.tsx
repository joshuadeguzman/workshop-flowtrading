// components/finance/featured-card.tsx
//
// A big, branded stock tile for the discovery surfaces (GoTrade/Robinhood-style).
// The card wears the company's brand color as an ambient wash plus a sparkline
// along the bottom; the price and since-Q2 change sit on top. Presentational:
// the parent passes the horizon-aware price, so the card stays simple.

import Link from "next/link"

import type { Stock } from "@/data/stocks"
import { money } from "@/lib/format"
import { sinceQuarterClose } from "@/lib/portfolio"
import { priceSeries } from "@/lib/chart-series"
import { brandAlpha, brandColor } from "@/lib/brands"
import { Pnl } from "@/components/finance/pnl"
import { Sparkline } from "@/components/finance/sparkline"

export function FeaturedCard({ stock, price }: { stock: Stock; price: number }) {
  const brand = brandColor(stock.symbol)
  const q2 = sinceQuarterClose(price, stock.quarterClose)
  const series = priceSeries(stock)

  return (
    <Link
      href={`/stock/${stock.symbol}`}
      className="group relative flex h-40 flex-col overflow-hidden rounded-2xl bg-card p-4 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
    >
      {/* Brand wash */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: `radial-gradient(120% 110% at 100% 0%, ${brandAlpha(brand, 0.3)}, transparent 58%)` }}
      />
      {/* Sparkline along the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-70">
        <Sparkline series={series} color={brand} />
      </div>

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span className="font-mono text-sm font-semibold">{stock.symbol}</span>
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{stock.name}</p>

        <div className="mt-auto">
          <div className="font-mono text-xl font-semibold tabular-nums">{money(price)}</div>
          <Pnl value={q2.changePct} as="percent" className="text-xs" />
        </div>
      </div>
    </Link>
  )
}
