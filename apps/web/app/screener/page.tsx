"use client"

// app/screener/page.tsx — Screener
//
// The 10 stocks in a sortable table: price, since-Q2 %, sector, market cap, and
// the 52-week range as a mini bar. Sort any column, filter by sector, star to a
// watchlist. There is deliberately NO "Q2 change" column beyond since-close:
// quarterOpen/quarterChangePct do not exist in the data and are not faked.

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, Star } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { STOCKS } from "@/data/stocks"
import { marketCap, money } from "@/lib/format"
import { sinceQuarterClose } from "@/lib/portfolio"
import { Pnl } from "@/components/finance/pnl"
import { FeaturedCard } from "@/components/finance/featured-card"
import { MarketMovers } from "@/components/finance/market-movers"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useSimulation } from "@/contexts/simulation"

// Curated trio for the Featured strip. Three vivid, distinct brand colors
// (green / red / orange) so the branded cards read as a set, not a row of grey.
const FEATURED = ["NVDA", "TSLA", "AMZN"]

type SortKey = "symbol" | "price" | "q2" | "sector" | "cap" | "range"
type Dir = "asc" | "desc"

const SECTORS = ["All", ...Array.from(new Set(STOCKS.map((s) => s.sector)))]

// Text columns default to A->Z; number columns default to high->low.
const DEFAULT_DIR: Record<SortKey, Dir> = {
  symbol: "asc",
  sector: "asc",
  price: "desc",
  q2: "desc",
  cap: "desc",
  range: "desc",
}

function rangePos(low: number, high: number, current: number): number {
  return Math.max(0, Math.min(1, (current - low) / (high - low)))
}

export default function ScreenerPage() {
  const router = useRouter()
  const { has, toggle, hydrated } = useWatchlist()
  const { priceOf } = useSimulation()

  const [sortKey, setSortKey] = useState<SortKey>("cap")
  const [dir, setDir] = useState<Dir>("desc")
  const [sector, setSector] = useState<string>("All")
  const [starredOnly, setStarredOnly] = useState(false)

  const rows = useMemo(() => {
    const enriched = STOCKS.map((s) => {
      // `price` is the active horizon's price (real when Live). Everything
      // derived from "current price" uses it, so the whole table re-prices when
      // you travel in time.
      const price = priceOf(s.symbol)
      return {
        ...s,
        price,
        q2: sinceQuarterClose(price, s.quarterClose).changePct,
        pos: rangePos(s.fiftyTwoWeekLow, s.fiftyTwoWeekHigh, price),
      }
    })

    const filtered = enriched.filter((s) => {
      if (sector !== "All" && s.sector !== sector) return false
      if (starredOnly && !has(s.symbol)) return false
      return true
    })

    const val = (s: (typeof enriched)[number]) => {
      switch (sortKey) {
        case "symbol":
          return s.symbol
        case "sector":
          return s.sector
        case "price":
          return s.price
        case "q2":
          return s.q2
        case "cap":
          return s.marketCap
        case "range":
          return s.pos
      }
    }

    return filtered.sort((a, b) => {
      const av = val(a)
      const bv = val(b)
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return dir === "asc" ? cmp : -cmp
    })
  }, [sortKey, dir, sector, starredOnly, has, priceOf])

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setDir(DEFAULT_DIR[key])
    }
  }

  const featured = FEATURED.map((sym) => STOCKS.find((s) => s.symbol === sym)).filter(
    (s): s is (typeof STOCKS)[number] => Boolean(s),
  )

  // Biggest movers by since-Q2 change, which re-ranks with the active horizon.
  const { gainers, losers } = useMemo(() => {
    const changes = STOCKS.map((s) => ({
      symbol: s.symbol,
      changePct: sinceQuarterClose(priceOf(s.symbol), s.quarterClose).changePct,
    }))
    const sorted = [...changes].sort((a, b) => b.changePct - a.changePct)
    return { gainers: sorted.slice(0, 3), losers: sorted.slice(-3).reverse() }
  }, [priceOf])

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-lg font-semibold">Markets</h1>
        <p className="text-muted-foreground text-sm">
          FlowTrading&apos;s 10 stocks. Tap one to trade.
        </p>
      </div>

      {/* Featured — branded cards. Horizontal scroll on mobile, 3-up on desktop. */}
      <section aria-labelledby="featured-heading" className="flex flex-col gap-3">
        <h2 id="featured-heading" className="text-sm font-medium">
          Featured
        </h2>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {featured.map((s) => (
            <div key={s.symbol} className="w-[68%] shrink-0 snap-start sm:w-auto">
              <FeaturedCard stock={s} price={priceOf(s.symbol)} />
            </div>
          ))}
        </div>
      </section>

      {/* Movers — top gainers and losers by since-Q2 change. */}
      <section aria-labelledby="movers-heading" className="flex flex-col gap-3">
        <h2 id="movers-heading" className="text-sm font-medium">
          Movers
        </h2>
        <MarketMovers gainers={gainers} losers={losers} />
      </section>

      <section aria-labelledby="all-heading" className="flex flex-col gap-3">
        <h2 id="all-heading" className="text-sm font-medium">
          All stocks
        </h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {SECTORS.map((sec) => (
          <button
            key={sec}
            onClick={() => setSector(sec)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              sector === sec
                ? "border-foreground bg-secondary text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {shortSector(sec)}
          </button>
        ))}
        <button
          onClick={() => setStarredOnly((v) => !v)}
          aria-pressed={starredOnly}
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            starredOnly
              ? "border-foreground bg-secondary text-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <Star className={cn("size-3", starredOnly && "fill-current")} aria-hidden="true" />
          Watchlist
        </button>
      </div>

      {/* Table (scrolls horizontally on narrow screens) */}
      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-xs">
              <th className="w-8 py-2 pl-3" aria-label="Watchlist" />
              <Th label="Symbol" col="symbol" sortKey={sortKey} dir={dir} onSort={sortBy} align="left" />
              <Th label="Price" col="price" sortKey={sortKey} dir={dir} onSort={sortBy} />
              <Th label="Since Q2" col="q2" sortKey={sortKey} dir={dir} onSort={sortBy} />
              <Th label="Sector" col="sector" sortKey={sortKey} dir={dir} onSort={sortBy} align="left" />
              <Th label="Mkt cap" col="cap" sortKey={sortKey} dir={dir} onSort={sortBy} />
              <Th label="52w range" col="range" sortKey={sortKey} dir={dir} onSort={sortBy} />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const starred = hydrated && has(s.symbol)
              return (
                <tr
                  key={s.symbol}
                  onClick={() => router.push(`/stock/${s.symbol}`)}
                  className="border-border/60 hover:bg-secondary/40 cursor-pointer border-b last:border-b-0"
                >
                  <td className="py-2.5 pl-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(s.symbol)
                      }}
                      aria-label={starred ? `Remove ${s.symbol} from watchlist` : `Add ${s.symbol} to watchlist`}
                      aria-pressed={starred}
                      className="text-muted-foreground hover:text-foreground rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Star
                        className={cn("size-4", starred && "fill-foreground text-foreground")}
                        aria-hidden="true"
                      />
                    </button>
                  </td>
                  <td className="py-2.5 font-mono font-semibold">{s.symbol}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{money(s.price)}</td>
                  <td className="py-2.5 text-right">
                    <Pnl value={s.q2} as="percent" />
                  </td>
                  <td className="text-muted-foreground py-2.5 pl-4 text-xs">{shortSector(s.sector)}</td>
                  <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{marketCap(s.marketCap)}</td>
                  <td className="py-2.5 pr-3">
                    <MiniRange
                      low={s.fiftyTwoWeekLow}
                      high={s.fiftyTwoWeekHigh}
                      current={s.price}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No stocks match. {starredOnly ? "Your watchlist is empty for this sector." : ""}
          </p>
        )}
      </div>
      </section>
    </div>
  )
}

function Th({
  label,
  col,
  sortKey,
  dir,
  onSort,
  align = "right",
}: {
  label: string
  col: SortKey
  sortKey: SortKey
  dir: Dir
  onSort: (key: SortKey) => void
  align?: "left" | "right"
}) {
  const active = sortKey === col
  return (
    <th className={cn("py-2 font-medium", align === "right" ? "pr-2 text-right" : "pl-4 text-left")}>
      <button
        onClick={() => onSort(col)}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
          align === "right" && "flex-row-reverse",
          active ? "text-foreground" : "hover:text-foreground",
        )}
      >
        {label}
        {active &&
          (dir === "asc" ? (
            <ChevronUp className="size-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3" aria-hidden="true" />
          ))}
      </button>
    </th>
  )
}

function MiniRange({ low, high, current }: { low: number; high: number; current: number }) {
  const pos = rangePos(low, high, current) * 100
  return (
    <div
      className="bg-secondary relative ml-auto h-1 w-16 rounded-full"
      role="img"
      aria-label={`${money(current)} within 52-week range ${money(low)} to ${money(high)}`}
    >
      <div
        className="bg-foreground absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: `${pos}%` }}
      />
    </div>
  )
}

// Compact sector labels so the table breathes.
function shortSector(sector: string): string {
  const map: Record<string, string> = {
    All: "All",
    "Information Technology": "Info Tech",
    "Consumer Discretionary": "Cons. Disc.",
    "Communication Services": "Comm. Svcs",
  }
  return map[sector] ?? sector
}
