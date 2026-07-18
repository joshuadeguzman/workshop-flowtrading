"use client"

// app/stock/[symbol]/page.tsx — Stock detail (the hero screen)
//
// This is where the craft goes. The entry sequence is a single GSAP timeline,
// under 600ms total, that runs ONCE on load and then gets out of the way:
//   - the price counts up from zero
//   - the 52-week marker slides to where today's price sits
//   - the trend line draws itself
//   - the sections stagger in
// Nothing loops, nothing waits for the user. prefers-reduced-motion skips all
// of it and the final, resting state is what SSR already rendered.

import { useRef } from "react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ArrowLeft } from "lucide-react"

import { STOCKS } from "@/data/stocks"
import { asOfDate, marketCap, money } from "@/lib/format"
import { priceSeries } from "@/lib/chart-series"
import { brandAlpha, brandColor } from "@/lib/brands"
import { sinceQuarterClose } from "@/lib/portfolio"
import { Pnl } from "@/components/finance/pnl"
import { RangeBar } from "@/components/finance/range-bar"
import { TrendLine } from "@/components/finance/trend-line"
import { useAccount } from "@/hooks/use-account"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useSimulation } from "@/contexts/simulation"

export default function StockDetailPage() {
  const params = useParams<{ symbol: string }>()
  const symbol = params.symbol?.toUpperCase()
  const found = STOCKS.find((s) => s.symbol === symbol)
  if (!found) notFound()
  // Fresh const so its inferred type is `Stock` (not `Stock | undefined`); this
  // is what lets the GSAP callbacks below reference it without a null check.
  const stock = found

  const { positionFor } = useAccount()
  const { priceOf, isSimulated, horizonLabel } = useSimulation()
  const reduced = useReducedMotion()

  // The active horizon's price drives the hero: the big number, the since-Q2
  // change, the 52-week marker. Real when Live, projected otherwise.
  const price = priceOf(stock.symbol)
  const position = positionFor(stock.symbol)
  const held = position.shares
  const q2 = sinceQuarterClose(price, stock.quarterClose)
  // Deterministic mock chart path, pinned to the real closes. Same every render.
  const series = priceSeries(stock)
  const brand = brandColor(stock.symbol)

  const root = useRef<HTMLDivElement>(null)
  const priceRef = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const priceEl = priceRef.current
      if (reduced) {
        if (priceEl) priceEl.textContent = money(price)
        return
      }

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } })

      // 1. Price counts up from zero (0 -> current price).
      const proxy = { n: 0 }
      tl.to(
        proxy,
        {
          n: price,
          duration: 0.5,
          ease: "power1.out",
          onUpdate: () => {
            if (priceEl) priceEl.textContent = money(proxy.n)
          },
        },
        0,
      )

      // 2. Sections stagger in.
      tl.from("[data-reveal]", { y: 12, opacity: 0, duration: 0.35, stagger: 0.05 }, 0.05)

      // 3. The 52-week marker slides from the middle of the track to position.
      tl.from(".range-marker", { left: "50%", duration: 0.45 }, 0.1)

      // 4. The three trend dots pop in (the line itself rides in with its card).
      tl.from(".trend-dot", { scale: 0, transformOrigin: "center", duration: 0.25, stagger: 0.08 }, 0.35)

      // Safety net: the entry hides content (opacity 0) and reveals it as it
      // plays. rAF pauses in a backgrounded tab, so if this loads unfocused the
      // animation could stall mid-reveal. setTimeout still fires when paused, so
      // we force the timeline to its finished, fully-visible state. Content is
      // never left hidden, no matter what interrupts the animation.
      const safety = setTimeout(() => tl.progress(1), 1200)
      return () => clearTimeout(safety)
    },
    { scope: root, dependencies: [reduced, stock.symbol] },
  )

  return (
    <div ref={root} className="flex flex-col gap-6">
      {/* Full-screen brand wash. Fixed to the viewport, so it fills the whole
          screen behind the content and never shows a hard "cut-off" edge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(115% 75% at 50% -5%, ${brandAlpha(brand, 0.22)}, transparent 62%)`,
        }}
      />
      <Link
        href="/screener"
        className="text-muted-foreground hover:text-foreground -ml-1 inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Markets
      </Link>

      {/* Company + price */}
      <header data-reveal>
        <div className="flex items-center gap-2">
          <h1 className="font-mono text-xl font-semibold">{stock.symbol}</h1>
          <span className="text-muted-foreground truncate text-sm">{stock.name}</span>
        </div>

        <span
          ref={priceRef}
          className="mt-2 block font-mono text-5xl font-semibold tabular-nums"
        >
          {money(price)}
        </span>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Pnl value={q2.change} />
          <span className="text-muted-foreground">·</span>
          <Pnl value={q2.changePct} as="percent" arrow={false} />
          <span className="text-muted-foreground text-xs">
            {isSimulated ? `since Q2 close · simulated ${horizonLabel}` : "since Q2 close (Jun 30)"}
          </span>
        </div>
      </header>

      {/* Price trend, directly under the price. Full-bleed, no card, blended into
          the brand wash. Mock path pinned to the 3 real closes. */}
      <section data-reveal className="-mx-4">
        <TrendLine series={series} color={brand} />
      </section>

      {/* 52-week range */}
      <section data-reveal className="bg-card rounded-xl p-4">
        <RangeBar low={stock.fiftyTwoWeekLow} high={stock.fiftyTwoWeekHigh} current={price} />
      </section>

      {/* Company facts */}
      <section data-reveal>
        <dl className="border-border grid grid-cols-2 gap-y-4 rounded-xl border p-4 sm:grid-cols-4">
          <Fact label="Sector" value={stock.sector} />
          <Fact label="Market cap" value={marketCap(stock.marketCap)} />
          <Fact label="52w high" value={money(stock.fiftyTwoWeekHigh)} mono />
          <Fact label="As of" value={asOfDate(stock.priceAsOf)} />
        </dl>
        {stock.priceAsOf !== "2026-07-16" && (
          <p className="text-muted-foreground mt-2 text-xs">
            Note: this feed lagged. Priced as of {asOfDate(stock.priceAsOf)}, not the Jul 16 snapshot.
          </p>
        )}
      </section>

      {/* Your position in this stock */}
      <section data-reveal className="border-border rounded-xl border p-4">
        <p className="text-muted-foreground mb-3 text-xs">Your position</p>
        {held > 0 ? (
          <dl className="grid grid-cols-2 gap-y-4">
            <Fact label="Shares" value={sharesText(held)} mono />
            <Fact label="Avg cost" value={money(position.avgCost)} mono />
            <Fact label="Market value" value={money(position.marketValue)} mono />
            <Fact label="Unrealized P&L" node={<Pnl value={position.unrealizedPnL} />} />
            {position.realizedPnL !== 0 && (
              <Fact label="Realized P&L (past sells)" node={<Pnl value={position.realizedPnL} />} />
            )}
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            You don&apos;t own {stock.symbol}
            {position.realizedPnL !== 0 ? (
              <>
                {" "}
                right now. Realized from past sells: <Pnl value={position.realizedPnL} />.
              </>
            ) : (
              " yet."
            )}
          </p>
        )}
      </section>

      {/* Sticky Buy/Sell footer — always in thumb reach. Sits above (and covers)
          the mobile tab bar on this drill-down; the back link handles nav. */}
      <div className="border-border/60 bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md">
        <div
          className="mx-auto max-w-3xl px-4 pt-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Link
            href={`/trade/${stock.symbol}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mx-auto flex w-full max-w-[320px] items-center justify-center rounded-lg py-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
          >
            Buy / Sell {stock.symbol}
          </Link>
        </div>
      </div>
    </div>
  )
}

function Fact({
  label,
  value,
  node,
  mono,
}: {
  label: string
  value?: string
  node?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={`mt-0.5 text-sm ${mono ? "font-mono tabular-nums" : ""}`}>{node ?? value}</dd>
    </div>
  )
}

function sharesText(n: number): string {
  return n.toFixed(4).replace(/\.?0+$/, "")
}
