"use client"

// app/page.tsx — Portfolio (home)
//
// Your account up top, then your holdings. No "today's change": the data is a
// single static snapshot, and inventing an intraday series would be a lie. The
// empty state reads "you're ready", not "broken", and shows a few popular names
// to get started. The account hero picks up a faint gain/loss glow so the page
// reflects how you're doing at a glance.

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, RotateCcw } from "lucide-react"

import { STOCKS, type Stock } from "@/data/stocks"
import { direction, money } from "@/lib/format"
import { INITIAL_CASH } from "@/lib/portfolio"
import { priceSeries } from "@/lib/chart-series"
import { brandColor } from "@/lib/brands"
import { CountUp } from "@/components/finance/count-up"
import { Pnl, PnlPair } from "@/components/finance/pnl"
import { Sparkline } from "@/components/finance/sparkline"
import { FeaturedCard } from "@/components/finance/featured-card"
import { useAccount } from "@/hooks/use-account"
import { useSimulation } from "@/contexts/simulation"

const STOCK_BY: Record<string, Stock> = Object.fromEntries(STOCKS.map((s) => [s.symbol, s]))
const POPULAR = ["NVDA", "TSLA", "AMZN"]

export default function DashboardPage() {
  const { summary, holdings, trades, reset, hydrated } = useAccount()
  const { priceOf } = useSimulation()

  const popular = POPULAR.map((sym) => STOCK_BY[sym]).filter((s): s is Stock => Boolean(s))

  return (
    <div className="flex flex-col gap-6">
      <AccountSummary summary={summary} />

      <section aria-labelledby="holdings-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="holdings-heading" className="text-sm font-medium">
            Holdings
          </h2>
          <div className="flex items-baseline gap-3">
            {holdings.length > 0 && (
              <span className="text-muted-foreground font-mono text-xs">
                {holdings.length} {holdings.length === 1 ? "position" : "positions"}
              </span>
            )}
            {/* The log behind these positions. Only offered once there is a
                trade to look at. */}
            {hydrated && trades.length > 0 && (
              <Link
                href="/history"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                History
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {/* Only decide "empty" once hydrated, so a funded account never flashes
            the empty state on first paint. */}
        {hydrated && holdings.length === 0 ? (
          <EmptyState popular={popular} priceOf={priceOf} />
        ) : (
          <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
            {holdings.map((h) => {
              const stock = STOCK_BY[h.symbol]
              return (
                <li key={h.symbol}>
                  <Link
                    href={`/stock/${h.symbol}`}
                    className="hover:bg-secondary/40 focus-visible:bg-secondary/40 flex items-center gap-3 px-4 py-3 outline-none transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{h.symbol}</span>
                        <span className="text-muted-foreground truncate text-xs">{stock?.name}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5 font-mono text-xs tabular-nums">
                        {sharesLabel(h.shares)} @ {money(h.avgCost)}
                      </div>
                    </div>
                    {stock && (
                      <div className="hidden h-8 w-20 shrink-0 sm:block">
                        <Sparkline series={priceSeries(stock)} color={brandColor(h.symbol)} />
                      </div>
                    )}
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm tabular-nums">{money(h.marketValue)}</div>
                      <PnlPair amount={h.unrealizedPnL} percent={h.returnPct} className="mt-0.5 text-xs" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Master reset. Only offered once there is something to reset, and it
          takes two taps so a stray click can't wipe the log. */}
      {hydrated && trades.length > 0 && (
        <div className="flex justify-center pt-2">
          <ResetButton onReset={reset} />
        </div>
      )}
    </div>
  )
}

function AccountSummary({ summary }: { summary: ReturnType<typeof useAccount>["summary"] }) {
  // Faint gain/loss wash behind the hero, so the account's health reads instantly.
  const dir = direction(summary.totalReturn)
  const glow =
    dir === "up" ? "var(--gain)" : dir === "down" ? "var(--loss)" : null

  return (
    <section aria-label="Account summary" className="bg-card relative overflow-hidden rounded-2xl p-5">
      {glow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(90% 75% at 50% 0%, color-mix(in oklch, ${glow} 16%, transparent), transparent 72%)`,
          }}
        />
      )}
      <div className="relative">
        <p className="text-muted-foreground text-xs">Total value</p>
        <CountUp
          value={summary.totalValue}
          format={money}
          className="mt-1 block font-mono text-4xl font-semibold"
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
          <Pnl value={summary.totalReturn} className="text-sm" />
          <span className="text-muted-foreground">·</span>
          <Pnl value={summary.totalReturnPct} as="percent" arrow={false} className="text-sm" />
          <span className="text-muted-foreground text-xs">all time</span>
        </div>

        <dl className="border-border/70 mt-5 grid grid-cols-3 gap-3 border-t pt-4">
          <Stat label="Cash" value={money(summary.cash)} />
          <Stat label="Invested" value={money(summary.invested)} />
          <Stat label="Market value" value={money(summary.holdingsValue)} />
        </dl>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm tabular-nums">{value}</dd>
    </div>
  )
}

function EmptyState({
  popular,
  priceOf,
}: {
  popular: Stock[]
  priceOf: (symbol: string) => number
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card/40 flex flex-col items-start gap-3 rounded-xl p-6">
        <p className="text-sm font-medium">You&apos;re ready to trade.</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          {money(INITIAL_CASH)} in virtual cash is waiting. Pick a stock, buy some shares, and your
          position shows up here.
        </p>
        <Link
          href="/screener"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
        >
          Browse the 10 stocks
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-xs">Popular to start with</p>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {popular.map((s) => (
            <div key={s.symbol} className="w-[68%] shrink-0 snap-start sm:w-auto">
              <FeaturedCard stock={s} price={priceOf(s.symbol)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false)

  // Auto-cancel the armed state so it never lingers as a trap.
  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(t)
  }, [confirming])

  if (confirming) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">Reset to {money(INITIAL_CASH)} and clear all trades?</span>
        <button
          onClick={() => {
            onReset()
            setConfirming(false)
          }}
          className="text-loss rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reset
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-muted-foreground hover:text-foreground rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-sm text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
    >
      <RotateCcw className="size-3.5" aria-hidden="true" />
      Reset account
    </button>
  )
}

// Whole shares read cleanly ("3 shares"); fractions show up to 4 dp.
function sharesLabel(n: number): string {
  const s = n.toFixed(4).replace(/\.?0+$/, "")
  return `${s} ${n === 1 ? "share" : "shares"}`
}
