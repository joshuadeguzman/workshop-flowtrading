"use client"

// app/history/page.tsx — Trade history
//
// The log behind your positions. Every buy and sell you executed, newest first,
// read straight from the trade log (the same source of truth positions are
// derived from). No P&L here: this screen answers "what did I do", not "how am I
// doing" — realized/unrealized P&L lives on the stock detail page where the
// buy-vs-sell distinction drives a decision. Total is the cash that moved on the
// trade, formatted like all money through lib/format; the Buy/Sell tag carries
// direction, so total stays a neutral figure (green/red is reserved for P&L).

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { STOCKS, type Stock } from "@/data/stocks"
import { money, shares as fmtShares, tradeTime } from "@/lib/format"
import { type Trade } from "@/lib/portfolio"
import { useAccount } from "@/hooks/use-account"

const STOCK_BY: Record<string, Stock> = Object.fromEntries(STOCKS.map((s) => [s.symbol, s]))

export default function HistoryPage() {
  const { trades, hydrated } = useAccount()

  // Newest first. Copy before sorting so we never mutate the hook's array, and
  // fall back to id for the rare same-millisecond tie so order is stable.
  const ordered = [...trades].sort((a, b) =>
    b.timestamp - a.timestamp || b.id.localeCompare(a.id),
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Trade history</h1>
        <p className="text-muted-foreground text-sm">
          Every buy and sell you&apos;ve executed, newest first.
        </p>
      </header>

      {/* Decide "empty" only once hydrated, so a funded log never flashes empty
          on first paint (localStorage is read after mount). */}
      {hydrated && ordered.length === 0 ? (
        <EmptyState />
      ) : (
        <TradeTable trades={ordered} />
      )}
    </div>
  )
}

function TradeTable({ trades }: { trades: Trade[] }) {
  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="history-heading" className="sr-only">
          Executed trades
        </h2>
        {trades.length > 0 && (
          <span className="text-muted-foreground ml-auto font-mono text-xs">
            {trades.length} {trades.length === 1 ? "trade" : "trades"}
          </span>
        )}
      </div>

      {/* Table scrolls horizontally on narrow screens, matching the screener. */}
      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-xs">
              <th className="py-2 pl-3 text-left font-medium">Date</th>
              <th className="py-2 pl-4 text-left font-medium">Side</th>
              <th className="py-2 pl-4 text-left font-medium">Symbol</th>
              <th className="py-2 pr-2 text-right font-medium">Shares</th>
              <th className="py-2 pr-2 text-right font-medium">Price</th>
              <th className="py-2 pr-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const stock = STOCK_BY[t.symbol]
              return (
                <tr key={t.id} className="border-border/60 border-b last:border-b-0">
                  <td className="text-muted-foreground py-2.5 pl-3 font-mono text-xs whitespace-nowrap tabular-nums">
                    {tradeTime(t.timestamp)}
                  </td>
                  <td className="py-2.5 pl-4">
                    <SideTag side={t.side} />
                  </td>
                  <td className="py-2.5 pl-4">
                    <Link
                      href={`/stock/${t.symbol}`}
                      className="rounded-sm font-mono font-semibold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t.symbol}
                    </Link>
                    {stock && (
                      <span className="text-muted-foreground ml-2 hidden text-xs sm:inline">
                        {stock.name}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{fmtShares(t.shares)}</td>
                  <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{money(t.price)}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{money(t.shares * t.price)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// Buy/Sell tag. Neutral by design: green/red are reserved for P&L, so direction
// is carried by the label (and a subtle border/weight), never by gain/loss color.
function SideTag({ side }: { side: Trade["side"] }) {
  const isBuy = side === "buy"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase",
        isBuy
          ? "bg-secondary text-foreground"
          : "border-border text-muted-foreground border",
      )}
    >
      {isBuy ? "Buy" : "Sell"}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="bg-card/40 flex flex-col items-start gap-3 rounded-xl p-6">
      <p className="text-sm font-medium">No trades yet.</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        Once you buy or sell a stock, every execution shows up here as the log behind your positions.
      </p>
      <Link
        href="/screener"
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
      >
        Browse the 10 stocks
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  )
}
