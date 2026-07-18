"use client"

// app/trade/[symbol]/page.tsx — Buy / Sell
//
// Paper trade at the seeded price. The rules the brief cares about live here:
//   - fractional shares to 4 decimals
//   - the cost is shown BEFORE you confirm (shares x price = total, cash left)
//   - a trade that cannot happen is blocked BEFORE the click: the button is
//     disabled and says why (not enough cash / not enough shares)
//   - one confirm step, because it is paper money
//   - Max on both sides
//   - after a trade, the numbers that changed flash briefly, then settle

import { useRef, useState } from "react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ArrowLeft } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { STOCKS } from "@/data/stocks"
import { asOfDate, money, shares as fmtShares } from "@/lib/format"
import { Pnl } from "@/components/finance/pnl"
import { useAccount } from "@/hooks/use-account"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useSimulation } from "@/contexts/simulation"

type Side = "buy" | "sell"

// Round DOWN so a computed max never rounds up past what you can afford or own.
// Shares carry 4 dp (trading precision); dollar amounts carry 2 dp (cents).
function floor4(n: number): number {
  return Math.floor(n * 1e4) / 1e4
}
function floor2(n: number): number {
  return Math.floor(n * 100) / 100
}

// Pure validation: given the current inputs, can this trade execute, and if not,
// why? Kept as a plain function so the rule reads top to bottom and is testable.
function validate(x: {
  side: Side
  cash: number
  price: number
  sharesNum: number
  total: number
  held: number
  sym: string
}): { canSubmit: boolean; reason: string | null } {
  if (x.side === "buy") {
    // Fractional shares are allowed, so the floor is not "one whole share" but
    // whatever the smallest tradable fraction (0.0001) costs.
    if (floor4(x.cash / x.price) <= 0)
      return { canSubmit: false, reason: `Not enough cash to buy ${x.sym}.` }
    if (x.sharesNum <= 0) return { canSubmit: false, reason: null }
    if (x.total > x.cash + 1e-9)
      return { canSubmit: false, reason: `Not enough cash. You're ${money(x.total - x.cash)} short.` }
    return { canSubmit: true, reason: null }
  }
  // sell
  if (x.held <= 0) return { canSubmit: false, reason: `You don't own any ${x.sym} to sell.` }
  if (x.sharesNum <= 0) return { canSubmit: false, reason: null }
  if (x.sharesNum > x.held + 1e-9)
    return { canSubmit: false, reason: `You only own ${fmtShares(x.held)} ${x.sym}.` }
  return { canSubmit: true, reason: null }
}

export default function TradePage() {
  const params = useParams<{ symbol: string }>()
  const symbol = params.symbol?.toUpperCase()
  const found = STOCKS.find((s) => s.symbol === symbol)
  if (!found) notFound()
  // Fresh const so its inferred type is `Stock` (not `Stock | undefined`); this
  // is what lets the closures below reference it without a null check.
  const stock = found

  const { cash, positionFor, buy, sell, hydrated } = useAccount()
  const { priceOf, isSimulated, horizonLabel } = useSimulation()
  const reduced = useReducedMotion()

  const [side, setSide] = useState<Side>("buy")
  // You can enter the trade as a share count OR a dollar amount. Either way it
  // resolves to a share count, which is what actually executes. Buying defaults
  // to dollars (you think "$500 of NVDA"); selling defaults to shares (you think
  // "sell 3 shares"). Switching side resets to that side's natural default.
  const [mode, setMode] = useState<"shares" | "dollars">("dollars")
  const [amountStr, setAmountStr] = useState("")
  const [receipt, setReceipt] = useState<string | null>(null)

  const sym = stock.symbol
  // Trades execute at the ACTIVE horizon's price (real when Live). This is what
  // lets you buy at the Jul 16 price, jump forward, and watch P&L open up.
  const price = priceOf(sym)
  const position = positionFor(sym)
  const held = position.shares

  const parsed = parseFloat(amountStr)
  const amountNum = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  // In dollars mode, the entered $ buys as many shares as it affords (4 dp).
  const sharesNum = mode === "shares" ? floor4(amountNum) : floor4(amountNum / price)

  const total = sharesNum * price
  // The Max value depends on both the side and the input mode.
  const maxShares = side === "buy" ? floor4(cash / price) : floor4(held)
  const maxDollars = side === "buy" ? floor2(cash) : floor2(held * price)
  const maxValue = mode === "shares" ? maxShares : maxDollars

  // Decide validity and the reason BEFORE any click. `reason` is only shown
  // when the user has actually entered a quantity that cannot execute. Plain
  // computation, not useMemo: it is cheap and the React Compiler memoizes it.
  const { canSubmit, reason } = validate({ side, cash, price, sharesNum, total, held, sym })

  // Highlight the two numbers that change after a trade: cash and your position.
  const cashRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef<HTMLDivElement>(null)
  const highlightKey = useRef(0)

  useGSAP(
    () => {
      if (reduced || highlightKey.current === 0) return
      const targets = [cashRef.current, positionRef.current].filter(Boolean)
      gsap.fromTo(
        targets,
        { backgroundColor: "color-mix(in oklch, var(--foreground) 12%, transparent)" },
        { backgroundColor: "rgba(0,0,0,0)", duration: 0.9, ease: "power2.out" },
      )
    },
    { dependencies: [receipt] },
  )

  function submit() {
    if (!canSubmit) return
    const ok = side === "buy" ? buy(stock.symbol, sharesNum, price) : sell(stock.symbol, sharesNum, price)
    if (!ok) return
    const verb = side === "buy" ? "Bought" : "Sold"
    setReceipt(`${verb} ${fmtShares(sharesNum)} ${stock.symbol} at ${money(price)} · ${money(total)}`)
    setAmountStr("")
    highlightKey.current += 1
  }

  const cashAfter = side === "buy" ? cash - total : cash + total

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/stock/${stock.symbol}`}
        className="text-muted-foreground hover:text-foreground -ml-1 inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {stock.symbol}
      </Link>

      <div>
        <h1 className="text-lg font-semibold">
          Trade <span className="font-mono">{stock.symbol}</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          {stock.name} · <span className="font-mono tabular-nums">{money(price)}</span>{" "}
          <span className="text-xs">
            {isSimulated ? `simulated ${horizonLabel}` : `as of ${asOfDate(stock.priceAsOf)}`}
          </span>
        </p>
      </div>

      {/* Buy / Sell segmented control with a sliding active indicator. */}
      <div role="tablist" aria-label="Trade side" className="border-border relative grid grid-cols-2 rounded-lg border p-1">
        <div
          aria-hidden="true"
          className="bg-secondary absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-md ease-out motion-safe:transition-transform motion-safe:duration-200"
          style={{ transform: side === "sell" ? "translateX(100%)" : "translateX(0)" }}
        />
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={side === s}
            onClick={() => {
              setSide(s)
              setMode(s === "buy" ? "dollars" : "shares")
              setAmountStr("")
              setReceipt(null)
            }}
            className={cn(
              "relative z-10 rounded-md py-1.5 text-sm font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              side === s ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Quantity — enter as shares or as a dollar amount */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div role="group" aria-label="Enter amount as" className="flex gap-1">
            {(["shares", "dollars"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m)
                  setAmountStr("")
                  setReceipt(null)
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  mode === m ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAmountStr(maxValue > 0 ? String(maxValue) : "")}
            disabled={maxValue <= 0}
            className="text-muted-foreground hover:text-foreground rounded-sm font-mono text-xs underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:no-underline"
          >
            Max {mode === "shares" ? fmtShares(maxShares) : money(maxDollars)}
          </button>
        </div>
        <div className="relative">
          {mode === "dollars" && (
            <span
              aria-hidden="true"
              className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 font-mono text-lg"
            >
              $
            </span>
          )}
          <input
            id="amount"
            aria-label={mode === "shares" ? "Number of shares" : "Dollar amount"}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amountStr}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "")
              const ok = mode === "shares" ? /^\d*\.?\d{0,4}$/.test(v) : /^\d*\.?\d{0,2}$/.test(v)
              if (ok) setAmountStr(v)
            }}
            className={cn(
              "border-border bg-card focus-visible:border-ring focus-visible:ring-ring/40 w-full rounded-lg border py-2.5 font-mono text-lg tabular-nums outline-none focus-visible:ring-2",
              mode === "dollars" ? "pr-3 pl-7" : "px-3",
            )}
          />
        </div>
      </div>

      {/* Cost preview — shown before confirming */}
      <dl className="bg-card/40 flex flex-col gap-2 rounded-xl p-4 text-sm">
        <Row label={`${fmtShares(sharesNum || 0)} × ${money(price)}`} value={money(total)} strong />
        <div ref={cashRef} className="-mx-4 rounded px-4">
          <Row
            label={side === "buy" ? "Cash after buy" : "Cash after sell"}
            value={money(cashAfter)}
          />
        </div>
      </dl>

      {/* Reason it can't execute, before the click */}
      {reason && (
        <p role="alert" className="text-loss text-sm">
          {reason}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || !hydrated}
        className={cn(
          "w-full rounded-lg py-3 text-sm font-semibold outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "disabled:pointer-events-none disabled:opacity-40",
        )}
      >
        {side === "buy" ? "Buy" : "Sell"} {stock.symbol}
      </button>

      {receipt && (
        <p className="text-muted-foreground text-center text-sm" aria-live="polite">
          {receipt}
        </p>
      )}

      {/* Your current position in this stock */}
      <div ref={positionRef} className="border-border rounded-xl border p-4">
        <p className="text-muted-foreground mb-3 text-xs">Your position</p>
        {held > 0 ? (
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <Field label="Shares" value={fmtShares(held)} />
            <Field label="Avg cost" value={money(position.avgCost)} />
            <Field label="Market value" value={money(position.marketValue)} />
            <Field
              label="Unrealized P&L"
              node={<Pnl value={position.unrealizedPnL} className="text-sm" />}
            />
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            You don&apos;t own {stock.symbol}
            {position.realizedPnL !== 0 && (
              <>
                {" "}
                right now. Realized so far:{" "}
                <Pnl value={position.realizedPnL} className="text-sm" />
              </>
            )}
            .
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn("text-muted-foreground", strong && "text-foreground")}>{label}</span>
      <span className={cn("font-mono tabular-nums", strong && "font-semibold")}>{value}</span>
    </div>
  )
}

function Field({ label, value, node }: { label: string; value?: string; node?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm tabular-nums">{node ?? value}</dd>
    </div>
  )
}
